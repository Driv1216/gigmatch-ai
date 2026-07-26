-- GigMatch AI Milestone 7E: private shortlist and client review decisions.
-- Global lock order: gig -> effective selection request -> application -> review state -> events.

begin;

create table public.application_review_states (
  application_id uuid primary key,
  gig_id uuid not null,
  is_shortlisted boolean not null default false,
  shortlisted_at timestamptz,
  shortlisted_by_user_id uuid references public.user_profiles(id) on delete restrict,
  review_state_version bigint not null check (review_state_version > 0),
  updated_at timestamptz not null,
  updated_by_user_id uuid references public.user_profiles(id) on delete restrict,
  constraint application_review_states_application_gig_fk
    foreign key (application_id, gig_id)
    references public.applications(id, gig_id) on delete restrict,
  constraint application_review_states_shortlist_metadata_check check (
    (is_shortlisted and shortlisted_at is not null and shortlisted_by_user_id is not null)
    or (not is_shortlisted and shortlisted_at is null and shortlisted_by_user_id is null)
  )
);

create index application_review_states_gig_id_idx
on public.application_review_states (gig_id);

create index application_review_states_active_shortlist_idx
on public.application_review_states (gig_id, shortlisted_at desc, application_id)
where is_shortlisted;

alter table public.application_review_states enable row level security;

revoke all on public.application_review_states from public, anon, authenticated, service_role;
grant select on public.application_review_states to service_role;

create or replace function private.protect_application_review_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Application review states cannot be physically deleted';
  end if;
  if (new.application_id, new.gig_id)
      is distinct from (old.application_id, old.gig_id) then
    raise exception 'Application review-state identity is immutable';
  end if;
  if new.review_state_version <= old.review_state_version then
    raise exception 'Application review-state version must increase';
  end if;
  return new;
end;
$$;

create trigger protect_application_review_state
before update or delete on public.application_review_states
for each row execute function private.protect_application_review_state();

create or replace function private.clear_terminal_application_shortlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stage is distinct from old.stage
     and new.stage in ('confirmed', 'not_selected', 'withdrawn', 'closed_gig_cancelled') then
    update public.application_review_states
    set is_shortlisted = false,
        shortlisted_at = null,
        shortlisted_by_user_id = null,
        review_state_version = review_state_version + 1,
        updated_at = new.stage_changed_at,
        updated_by_user_id = new.stage_changed_by_user_id
    where application_id = new.id
      and gig_id = new.gig_id
      and is_shortlisted;
  end if;
  return new;
end;
$$;

create trigger clear_terminal_application_shortlist
after update of stage on public.applications
for each row execute function private.clear_terminal_application_shortlist();

create or replace function private.review_action_hash(parts text[])
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select encode(extensions.digest(array_to_string(parts, '|', ''), 'sha256'), 'hex')
$$;

create or replace function private.shortlist_review_action_token(
  p_application_id uuid,
  p_stage text,
  p_review_state_version bigint,
  p_lifecycle text,
  p_intake text,
  p_operations text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select private.review_action_hash(array[
    coalesce(p_application_id::text, ''),
    coalesce(p_stage, ''),
    coalesce(p_review_state_version, 0)::text,
    coalesce(p_lifecycle, ''),
    coalesce(p_intake, ''),
    coalesce(p_operations, '')
  ])
$$;

create or replace function private.decision_review_action_token(
  p_application_id uuid,
  p_stage text,
  p_current_version_id uuid,
  p_stage_changed_at timestamptz,
  p_material_gig_version_id uuid,
  p_effective_request_id uuid,
  p_lifecycle text,
  p_intake text,
  p_operations text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select private.review_action_hash(array[
    coalesce(p_application_id::text, ''),
    coalesce(p_stage, ''),
    coalesce(p_current_version_id::text, ''),
    coalesce(floor(extract(epoch from p_stage_changed_at))::bigint, 0)::text,
    coalesce(p_material_gig_version_id::text, ''),
    coalesce(p_effective_request_id::text, ''),
    coalesce(p_lifecycle, ''),
    coalesce(p_intake, ''),
    coalesce(p_operations, '')
  ])
$$;

create or replace function private.valid_review_text(
  p_value text,
  p_maximum integer,
  p_required boolean default false
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value is null then not p_required
    else btrim(p_value) <> ''
      and char_length(btrim(p_value)) <= p_maximum
      and btrim(p_value) !~ '[[:cntrl:]]'
  end
$$;

create or replace function private.valid_review_text_array(
  p_values jsonb,
  p_maximum_count integer,
  p_maximum_length integer,
  p_require_value boolean default false
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_values) = 'array'
    and jsonb_array_length(p_values) <= p_maximum_count
    and (not p_require_value or jsonb_array_length(p_values) > 0)
    and not exists (
      select 1
      from jsonb_array_elements(p_values) item
      where jsonb_typeof(item) <> 'string'
        or not private.valid_review_text(item #>> '{}', p_maximum_length, true)
    )
$$;

create or replace function public.review_set_shortlist(
  p_application_id uuid,
  p_acting_user_id uuid,
  p_shortlisted boolean,
  p_expected_shortlist_action_token text,
  p_shortlist_capacity integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_gig_id uuid;
  locked_gig public.gigs%rowtype;
  locked_application public.applications%rowtype;
  locked_state public.application_review_states%rowtype;
  effective_now timestamptz;
  current_token text;
  active_count integer;
  resulting_version bigint;
begin
  if p_application_id is null or p_acting_user_id is null or p_shortlisted is null
     or btrim(coalesce(p_expected_shortlist_action_token, '')) = ''
     or p_shortlist_capacity not between 1 and 100 then
    raise exception using errcode='22023', message='M7E_REVIEW_ACTION_NOT_ALLOWED';
  end if;

  select a.gig_id into resolved_gig_id
  from public.applications a where a.id = p_application_id;
  if resolved_gig_id is null then
    raise exception using errcode='P0002', message='M7E_APPLICANT_REVIEW_NOT_FOUND';
  end if;

  select g.* into locked_gig
  from public.gigs g where g.id = resolved_gig_id for update;

  select a.* into locked_application
  from public.applications a where a.id = p_application_id for update;

  if not found or locked_application.gig_id <> locked_gig.id
     or locked_gig.client_id <> p_acting_user_id
     or not exists (
       select 1 from public.user_profiles up
       where up.id = p_acting_user_id and up.role = 'client'
     ) then
    raise exception using errcode='P0002', message='M7E_APPLICANT_REVIEW_NOT_FOUND';
  end if;

  select ars.* into locked_state
  from public.application_review_states ars
  where ars.application_id = locked_application.id
  for update;

  if locked_gig.opportunity_lifecycle <> 'active'
     or locked_application.stage not in ('under_review', 'advanced') then
    raise exception using errcode='P0001', message='M7E_REVIEW_ACTION_NOT_ALLOWED';
  end if;

  -- Natural set retries succeed only after current gig/stage authorization.
  if p_shortlisted and locked_state.application_id is not null and locked_state.is_shortlisted then
    return jsonb_build_object(
      'code', 'shortlist_unchanged',
      'application_id', locked_application.id,
      'is_shortlisted', true,
      'review_state_version', locked_state.review_state_version
    );
  end if;
  if not p_shortlisted
     and (locked_state.application_id is null or not locked_state.is_shortlisted) then
    return jsonb_build_object(
      'code', 'shortlist_unchanged',
      'application_id', locked_application.id,
      'is_shortlisted', false,
      'review_state_version', coalesce(locked_state.review_state_version, 0)
    );
  end if;

  current_token := private.shortlist_review_action_token(
    locked_application.id,
    locked_application.stage,
    coalesce(locked_state.review_state_version, 0),
    locked_gig.opportunity_lifecycle,
    locked_gig.application_intake,
    locked_gig.operational_state
  );
  if current_token <> p_expected_shortlist_action_token then
    raise exception using errcode='40001', message='M7E_STALE_REVIEW_ACTION';
  end if;

  effective_now := clock_timestamp();
  if p_shortlisted then
    select count(*) into active_count
    from public.application_review_states ars
    join public.applications a
      on a.id = ars.application_id and a.gig_id = ars.gig_id
    where ars.gig_id = locked_gig.id
      and ars.is_shortlisted
      and a.stage in ('under_review', 'advanced');
    if active_count >= p_shortlist_capacity then
      raise exception using errcode='P0001', message='M7E_SHORTLIST_CAPACITY_REACHED';
    end if;

    if locked_state.application_id is null then
      resulting_version := 1;
      insert into public.application_review_states (
        application_id, gig_id, is_shortlisted, shortlisted_at,
        shortlisted_by_user_id, review_state_version, updated_at, updated_by_user_id
      ) values (
        locked_application.id, locked_gig.id, true, effective_now,
        p_acting_user_id, resulting_version, effective_now, p_acting_user_id
      );
    else
      resulting_version := locked_state.review_state_version + 1;
      update public.application_review_states
      set is_shortlisted = true,
          shortlisted_at = effective_now,
          shortlisted_by_user_id = p_acting_user_id,
          review_state_version = resulting_version,
          updated_at = effective_now,
          updated_by_user_id = p_acting_user_id
      where application_id = locked_application.id;
    end if;

    insert into public.marketplace_events (
      event_type, visibility, actor_type, actor_user_id,
      gig_id, application_id, event_payload, occurred_at
    ) values (
      'application_shortlisted', 'client_private', 'user', p_acting_user_id,
      locked_gig.id, locked_application.id,
      jsonb_build_object('review_state_version', resulting_version), effective_now
    );
  else
    resulting_version := locked_state.review_state_version + 1;
    update public.application_review_states
    set is_shortlisted = false,
        shortlisted_at = null,
        shortlisted_by_user_id = null,
        review_state_version = resulting_version,
        updated_at = effective_now,
        updated_by_user_id = p_acting_user_id
    where application_id = locked_application.id;

    insert into public.marketplace_events (
      event_type, visibility, actor_type, actor_user_id,
      gig_id, application_id, event_payload, occurred_at
    ) values (
      'application_unshortlisted', 'client_private', 'user', p_acting_user_id,
      locked_gig.id, locked_application.id,
      jsonb_build_object('review_state_version', resulting_version), effective_now
    );
  end if;

  return jsonb_build_object(
    'code', case when p_shortlisted then 'application_shortlisted' else 'application_unshortlisted' end,
    'application_id', locked_application.id,
    'is_shortlisted', p_shortlisted,
    'review_state_version', resulting_version
  );
end;
$$;

create or replace function public.review_transition_application(
  p_application_id uuid,
  p_acting_user_id uuid,
  p_action text,
  p_expected_review_decision_action_token text,
  p_advancement_capacity integer,
  p_decision jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_gig_id uuid;
  locked_gig public.gigs%rowtype;
  locked_request public.selection_requests%rowtype;
  locked_application public.applications%rowtype;
  effective_now timestamptz;
  effective_request_id uuid;
  current_token text;
  advanced_count integer;
  primary_reason text;
  additional_reasons jsonb;
  feedback_points jsonb;
  respectful_note text;
  other_explanation text;
  reopen_reason text;
  reopen_explanation text;
  previous_stage text;
  target_stage text;
  event_type text;
  event_payload jsonb;
begin
  if p_application_id is null or p_acting_user_id is null
     or p_action not in ('advance', 'return', 'not_selected', 'reopen')
     or btrim(coalesce(p_expected_review_decision_action_token, '')) = ''
     or p_advancement_capacity not between 1 and 100
     or jsonb_typeof(p_decision) is distinct from 'object' then
    raise exception using errcode='22023', message='M7E_REVIEW_ACTION_NOT_ALLOWED';
  end if;

  select a.gig_id into resolved_gig_id
  from public.applications a where a.id = p_application_id;
  if resolved_gig_id is null then
    raise exception using errcode='P0002', message='M7E_APPLICANT_REVIEW_NOT_FOUND';
  end if;

  select g.* into locked_gig
  from public.gigs g where g.id = resolved_gig_id for update;

  if p_action in ('return', 'not_selected') then
    select sr.* into locked_request
    from public.selection_requests sr
    where sr.gig_id = locked_gig.id
      and sr.application_id = p_application_id
      and sr.status = 'pending'
    order by sr.id
    limit 1
    for update;
  end if;
  effective_now := clock_timestamp();

  select a.* into locked_application
  from public.applications a where a.id = p_application_id for update;

  if not found or locked_application.gig_id <> locked_gig.id
     or locked_gig.client_id <> p_acting_user_id
     or not exists (
       select 1 from public.user_profiles up
       where up.id = p_acting_user_id and up.role = 'client'
     ) then
    raise exception using errcode='P0002', message='M7E_APPLICANT_REVIEW_NOT_FOUND';
  end if;

  if locked_request.id is not null
     and locked_request.application_id = locked_application.id
     and locked_request.expires_at > effective_now then
    effective_request_id := locked_request.id;
  end if;

  current_token := private.decision_review_action_token(
    locked_application.id,
    locked_application.stage,
    locked_application.current_version_id,
    locked_application.stage_changed_at,
    locked_gig.current_material_gig_version_id,
    effective_request_id,
    locked_gig.opportunity_lifecycle,
    locked_gig.application_intake,
    locked_gig.operational_state
  );
  if current_token <> p_expected_review_decision_action_token then
    raise exception using errcode='40001', message='M7E_STALE_REVIEW_ACTION';
  end if;

  if locked_gig.opportunity_lifecycle <> 'active'
     or locked_gig.operational_state <> 'active' then
    raise exception using errcode='P0001', message='M7E_REVIEW_ACTION_NOT_ALLOWED';
  end if;

  previous_stage := locked_application.stage;
  if p_action = 'advance' then
    if previous_stage <> 'under_review' then
      raise exception using errcode='P0001', message='M7E_REVIEW_ACTION_NOT_ALLOWED';
    end if;
    select count(*) into advanced_count
    from public.applications a
    where a.gig_id = locked_gig.id and a.stage = 'advanced';
    if advanced_count >= p_advancement_capacity then
      raise exception using errcode='P0001', message='M7E_ADVANCEMENT_CAPACITY_REACHED';
    end if;
    target_stage := 'advanced';
    event_type := 'application_advanced';
    event_payload := jsonb_build_object(
      'previous_stage', previous_stage,
      'new_stage', target_stage,
      'application_version_id', locked_application.current_version_id,
      'material_gig_version_id', locked_gig.current_material_gig_version_id
    );
  elsif p_action = 'return' then
    if previous_stage <> 'advanced' then
      raise exception using errcode='P0001', message='M7E_REVIEW_ACTION_NOT_ALLOWED';
    end if;
    if effective_request_id is not null then
      raise exception using errcode='P0001', message='M7E_PENDING_SELECTION_BLOCKS_REVIEW_ACTION';
    end if;
    target_stage := 'under_review';
    event_type := 'application_returned_to_review';
    event_payload := jsonb_build_object('previous_stage', previous_stage, 'new_stage', target_stage);
  elsif p_action = 'not_selected' then
    if previous_stage not in ('under_review', 'advanced') then
      raise exception using errcode='P0001', message='M7E_REVIEW_ACTION_NOT_ALLOWED';
    end if;
    if effective_request_id is not null then
      raise exception using errcode='P0001', message='M7E_PENDING_SELECTION_BLOCKS_REVIEW_ACTION';
    end if;
    primary_reason := p_decision ->> 'primary_reason';
    additional_reasons := coalesce(p_decision -> 'additional_reasons', '[]'::jsonb);
    feedback_points := coalesce(p_decision -> 'feedback_points', '[]'::jsonb);
    respectful_note := nullif(btrim(coalesce(p_decision ->> 'respectful_note', '')), '');
    other_explanation := nullif(btrim(coalesce(p_decision ->> 'other_explanation', '')), '');

    if primary_reason not in (
      'required_skills_mismatch', 'experience_level_mismatch',
      'proposal_exceeded_budget', 'timeline_or_availability_mismatch',
      'stronger_overall_match', 'gig_requirements_changed', 'other'
    )
    or jsonb_typeof(additional_reasons) <> 'array'
    or jsonb_array_length(additional_reasons) > 5
    or exists (
      select 1 from jsonb_array_elements_text(additional_reasons) reason
      where reason not in (
        'required_skills_mismatch', 'experience_level_mismatch',
        'proposal_exceeded_budget', 'timeline_or_availability_mismatch',
        'stronger_overall_match', 'gig_requirements_changed', 'other'
      )
    )
    or exists (
      select 1 from jsonb_array_elements_text(additional_reasons) reason
      group by reason having count(*) > 1
    )
    or additional_reasons ? primary_reason
    or not private.valid_review_text_array(
      feedback_points, 5, 500, previous_stage = 'advanced'
    )
    or not private.valid_review_text(respectful_note, 1000, false)
    or not private.valid_review_text(other_explanation, 500, false)
    or ((primary_reason = 'other' or additional_reasons ? 'other') and other_explanation is null)
    or (previous_stage = 'advanced'
      and p_decision -> 'final_decision_confirmed' is distinct from 'true'::jsonb) then
      raise exception using errcode='22023', message='M7E_INVALID_NOT_SELECTED_DECISION';
    end if;

    target_stage := 'not_selected';
    event_type := 'application_not_selected';
    event_payload := jsonb_strip_nulls(jsonb_build_object(
      'previous_stage', previous_stage,
      'new_stage', target_stage,
      'application_version_id', locked_application.current_version_id,
      'additional_reasons', additional_reasons,
      'feedback_points', feedback_points,
      'respectful_note', respectful_note,
      'other_explanation', other_explanation
    ));
  else
    if previous_stage <> 'not_selected'
       or exists (
         select 1 from public.engagements e
         where e.application_id = locked_application.id and e.status <> 'cancelled'
       ) then
      raise exception using errcode='P0001', message='M7E_REVIEW_ACTION_NOT_ALLOWED';
    end if;
    reopen_reason := p_decision ->> 'reason';
    reopen_explanation := nullif(btrim(coalesce(p_decision ->> 'explanation', '')), '');
    if reopen_reason not in (
      'gig_materially_changed', 'failed_engagement_reopened',
      'client_reconsideration', 'freelancer_invited_back', 'other'
    )
    or not private.valid_review_text(reopen_explanation, 1000, false)
    or (reopen_reason = 'other' and reopen_explanation is null) then
      raise exception using errcode='22023', message='M7E_INVALID_REOPEN_DECISION';
    end if;
    target_stage := 'under_review';
    event_type := 'application_reopened';
    event_payload := jsonb_strip_nulls(jsonb_build_object(
      'previous_stage', previous_stage,
      'new_stage', target_stage,
      'reopen_explanation', reopen_explanation
    ));
  end if;

  update public.applications
  set stage = target_stage,
      last_updated_at = effective_now,
      stage_changed_at = effective_now,
      stage_changed_by_actor_type = 'user',
      stage_changed_by_user_id = p_acting_user_id,
      stage_reason_origin = case when target_stage = 'not_selected' then 'client_decision' else null end,
      stage_reason_code = case when target_stage = 'not_selected' then primary_reason else null end,
      stage_reason_payload = case when target_stage = 'not_selected' then event_payload else null end
  where id = locked_application.id;

  insert into public.marketplace_events (
    event_type, visibility, actor_type, actor_user_id,
    gig_id, application_id, reason_origin, reason_code, event_payload, occurred_at
  ) values (
    event_type, 'participants', 'user', p_acting_user_id,
    locked_gig.id, locked_application.id,
    case
      when p_action = 'not_selected' then 'client_decision'
      when p_action = 'reopen' then 'client_reconsideration'
      else null
    end,
    case
      when p_action = 'not_selected' then primary_reason
      when p_action = 'reopen' then reopen_reason
      else null
    end,
    event_payload,
    effective_now
  );

  return jsonb_build_object(
    'code', event_type,
    'application_id', locked_application.id,
    'previous_stage', previous_stage,
    'stage', target_stage
  );
end;
$$;

revoke all on function public.review_set_shortlist(uuid,uuid,boolean,text,integer),
  public.review_transition_application(uuid,uuid,text,text,integer,jsonb)
from public, anon, authenticated;

grant execute on function public.review_set_shortlist(uuid,uuid,boolean,text,integer),
  public.review_transition_application(uuid,uuid,text,text,integer,jsonb)
to service_role;

comment on table public.application_review_states is
'Client-private lazy shortlist state. No browser role has direct read or write privileges.';

comment on function public.review_set_shortlist(uuid,uuid,boolean,text,integer) is
'Backend-only private shortlist mutation. Lock order: gig, application, review state, event.';

comment on function public.review_transition_application(uuid,uuid,text,text,integer,jsonb) is
'Backend-only review transition. Lock order: gig, effective request, application, terminal shortlist cleanup, event.';

commit;
