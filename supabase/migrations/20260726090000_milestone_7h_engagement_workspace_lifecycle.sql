begin;

-- Fail closed before replacing the superseded permanent Confirmed-history rule.
do $$
declare bad_ids text;
begin
  select string_agg(id::text, ',' order by id) into bad_ids
  from (
    select a.id
    from public.applications a
    where a.stage='confirmed'
      and not exists(select 1 from public.engagements e where e.application_id=a.id)
    order by a.id limit 20
  ) bad;
  if bad_ids is not null then
    raise exception 'M7H_CONFIRMED_APPLICATION_WITHOUT_ENGAGEMENT:%', bad_ids;
  end if;

  select string_agg(e.id::text, ',' order by e.id) into bad_ids
  from public.engagements e
  join public.applications a on a.id=e.application_id
  where e.status<>'cancelled' and a.stage<>'confirmed';
  if bad_ids is not null then
    raise exception 'M7H_NON_CANCELLED_ENGAGEMENT_WITHOUT_CONFIRMED_APPLICATION:%', bad_ids;
  end if;

  select string_agg(gig_id::text, ',' order by gig_id) into bad_ids
  from (
    select gig_id from public.engagements where status<>'cancelled'
    group by gig_id having count(*)>1 order by gig_id limit 20
  ) bad;
  if bad_ids is not null then
    raise exception 'M7H_MULTIPLE_NON_CANCELLED_ENGAGEMENTS:%', bad_ids;
  end if;

  select string_agg(g.id::text, ',' order by g.id) into bad_ids
  from public.gigs g
  where g.opportunity_lifecycle='filled'
    and (select count(*) from public.engagements e
         where e.gig_id=g.id and e.status<>'cancelled')<>1;
  if bad_ids is not null then
    raise exception 'M7H_FILLED_GIG_WITHOUT_CURRENT_ENGAGEMENT:%', bad_ids;
  end if;

  select string_agg(e.id::text, ',' order by e.id) into bad_ids
  from public.engagements e
  left join public.applications a on a.id=e.application_id and a.gig_id=e.gig_id
  left join public.application_versions av
    on av.application_id=e.application_id
   and av.id=e.accepted_application_version_id
   and av.gig_version_id=e.accepted_gig_version_id
  left join public.selection_requests sr
    on sr.id=e.selection_request_id
   and sr.gig_id=e.gig_id
   and sr.application_id=e.application_id
   and sr.application_version_id=e.accepted_application_version_id
   and sr.gig_version_id=e.accepted_gig_version_id
  where a.id is null or av.id is null or sr.id is null;
  if bad_ids is not null then
    raise exception 'M7H_INVALID_ENGAGEMENT_BINDINGS:%', bad_ids;
  end if;
end;
$$;

drop index if exists public.applications_one_confirmed_per_gig_idx;

alter table public.engagements
  add column lifecycle_version integer not null default 1
    check (lifecycle_version > 0);

-- The existing status/metadata checks already validate every lifecycle projection.
-- This trigger additionally guarantees monotonic controlled lifecycle mutations.
create or replace function private.protect_engagement_mutation()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if tg_op='DELETE' then
    raise exception 'Engagements cannot be physically deleted';
  end if;
  if (new.id,new.gig_id,new.application_id,new.selection_request_id,
      new.client_participant_user_id,new.freelancer_participant_user_id,
      new.accepted_application_version_id,new.accepted_gig_version_id,
      new.accepted_terms_contract_version,new.accepted_terms_snapshot,
      new.snapshot_schema_version,new.confirmed_at)
     is distinct from
     (old.id,old.gig_id,old.application_id,old.selection_request_id,
      old.client_participant_user_id,old.freelancer_participant_user_id,
      old.accepted_application_version_id,old.accepted_gig_version_id,
      old.accepted_terms_contract_version,old.accepted_terms_snapshot,
      old.snapshot_schema_version,old.confirmed_at) then
    raise exception 'Engagement identity and accepted terms are immutable';
  end if;
  if new.lifecycle_version<>old.lifecycle_version+1 then
    raise exception 'M7H_INVALID_LIFECYCLE_VERSION';
  end if;
  return new;
end;
$$;

create table private.engagement_operations (
  actor_user_id uuid not null references public.user_profiles(id) on delete restrict,
  request_id uuid not null,
  operation_kind text not null,
  operation_fingerprint text not null,
  engagement_id uuid references public.engagements(id) on delete restrict,
  gig_id uuid references public.gigs(id) on delete restrict,
  application_id uuid references public.applications(id) on delete restrict,
  reopening_id uuid,
  invitation_id uuid,
  result jsonb not null check (jsonb_typeof(result)='object'),
  created_at timestamptz not null,
  primary key(actor_user_id,request_id)
);
alter table private.engagement_operations enable row level security;
revoke all on private.engagement_operations from public,anon,authenticated,service_role;

create table public.engagement_reopenings (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null unique references public.engagements(id) on delete restrict,
  gig_id uuid not null references public.gigs(id) on delete restrict,
  application_id uuid not null,
  client_actor_user_id uuid not null references public.user_profiles(id) on delete restrict,
  operation_request_id uuid not null,
  reopened_at timestamptz not null,
  constraint engagement_reopenings_application_gig_fk
    foreign key(application_id,gig_id)
    references public.applications(id,gig_id) on delete restrict,
  constraint engagement_reopenings_actor_unique unique(client_actor_user_id,operation_request_id)
);
create index engagement_reopenings_gig_idx on public.engagement_reopenings(gig_id);
alter table public.engagement_reopenings enable row level security;

create table public.application_reconsideration_invitations (
  id uuid primary key default gen_random_uuid(),
  reopening_id uuid not null references public.engagement_reopenings(id) on delete restrict,
  source_engagement_id uuid not null references public.engagements(id) on delete restrict,
  gig_id uuid not null references public.gigs(id) on delete restrict,
  application_id uuid not null,
  invited_application_version_id uuid not null,
  invited_material_gig_version_id uuid not null,
  client_actor_user_id uuid not null references public.user_profiles(id) on delete restrict,
  reason_code text not null check(reason_code in (
    'failed_engagement_reopened','client_reconsideration',
    'freelancer_invited_back','other'
  )),
  reason_explanation text,
  status text not null check(status in (
    'pending','accepted','declined','cancelled','superseded','closed_by_gig_state'
  )),
  response_application_version_id uuid,
  created_at timestamptz not null,
  responded_at timestamptz,
  cancelled_at timestamptz,
  superseded_at timestamptz,
  closed_at timestamptz,
  constraint reconsideration_application_gig_fk
    foreign key(application_id,gig_id)
    references public.applications(id,gig_id) on delete restrict,
  constraint reconsideration_invited_version_fk
    foreign key(application_id,invited_application_version_id)
    references public.application_versions(application_id,id) on delete restrict,
  constraint reconsideration_material_version_fk
    foreign key(gig_id,invited_material_gig_version_id)
    references public.gig_versions(gig_id,id) on delete restrict,
  constraint reconsideration_response_version_fk
    foreign key(application_id,response_application_version_id)
    references public.application_versions(application_id,id) on delete restrict,
  constraint reconsideration_other_reason_check check(
    (reason_code='other' and reason_explanation is not null
      and btrim(reason_explanation)<>'' and char_length(reason_explanation)<=800)
    or (reason_code<>'other' and
      (reason_explanation is null or
       (btrim(reason_explanation)<>'' and char_length(reason_explanation)<=800)))
  ),
  constraint reconsideration_status_metadata_check check(
    (status='pending' and response_application_version_id is null
      and responded_at is null and cancelled_at is null
      and superseded_at is null and closed_at is null)
    or (status in ('accepted','declined') and responded_at is not null
      and cancelled_at is null and superseded_at is null and closed_at is null
      and ((status='accepted')=(response_application_version_id is not null)))
    or (status='cancelled' and cancelled_at is not null
      and response_application_version_id is null and responded_at is null
      and superseded_at is null and closed_at is null)
    or (status='superseded' and superseded_at is not null
      and response_application_version_id is null and responded_at is null
      and cancelled_at is null and closed_at is null)
    or (status='closed_by_gig_state' and closed_at is not null
      and response_application_version_id is null and responded_at is null
      and cancelled_at is null and superseded_at is null)
  )
);
create unique index reconsideration_one_pending_application_idx
on public.application_reconsideration_invitations(application_id)
where status='pending';
create index reconsideration_gig_idx
on public.application_reconsideration_invitations(gig_id,status);
create index reconsideration_freelancer_lookup_idx
on public.application_reconsideration_invitations(application_id,status,created_at desc);
alter table public.application_reconsideration_invitations enable row level security;

alter table private.engagement_operations
  add constraint engagement_operations_reopening_fk
    foreign key(reopening_id) references public.engagement_reopenings(id) on delete restrict,
  add constraint engagement_operations_invitation_fk
    foreign key(invitation_id)
    references public.application_reconsideration_invitations(id) on delete restrict;

create or replace function private.reject_engagement_history_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then raise exception 'M7H_HISTORY_CANNOT_BE_DELETED'; end if;
  if tg_table_name='engagement_reopenings' then
    raise exception 'M7H_REOPENING_IS_IMMUTABLE';
  end if;
  if (new.id,new.reopening_id,new.source_engagement_id,new.gig_id,new.application_id,
      new.invited_application_version_id,new.invited_material_gig_version_id,
      new.client_actor_user_id,new.reason_code,new.reason_explanation,new.created_at)
     is distinct from
     (old.id,old.reopening_id,old.source_engagement_id,old.gig_id,old.application_id,
      old.invited_application_version_id,old.invited_material_gig_version_id,
      old.client_actor_user_id,old.reason_code,old.reason_explanation,old.created_at) then
    raise exception 'M7H_INVITATION_IDENTITY_IMMUTABLE';
  end if;
  return new;
end;
$$;
create trigger protect_engagement_reopening
before update or delete on public.engagement_reopenings
for each row execute function private.reject_engagement_history_mutation();
create trigger protect_reconsideration_invitation
before update or delete on public.application_reconsideration_invitations
for each row execute function private.reject_engagement_history_mutation();
create trigger protect_engagement_operation
before update or delete on private.engagement_operations
for each row execute function private.reject_immutable_row();

grant select on public.engagement_reopenings,
  public.application_reconsideration_invitations to service_role;
revoke insert,update,delete on public.engagement_reopenings,
  public.application_reconsideration_invitations from public,anon,authenticated,service_role;
revoke all on public.engagement_reopenings,
  public.application_reconsideration_invitations from anon,authenticated;

create or replace function private.engagement_hash(parts text[])
returns text language sql immutable strict set search_path='' as $$
  select encode(extensions.digest(array_to_string(parts,E'\x1f'),'sha256'),'hex')
$$;

create or replace function private.engagement_actor_role(
  e public.engagements,p_actor uuid
) returns text language sql stable set search_path='' as $$
  select case when p_actor=e.client_participant_user_id then 'client'
    when p_actor=e.freelancer_participant_user_id then 'freelancer' end
$$;

create or replace function private.engagement_action_token(e public.engagements)
returns text language sql stable set search_path='' as $$
  select private.engagement_hash(array[
    'engagement-action-v1',e.id::text,e.gig_id::text,e.application_id::text,
    e.status,e.lifecycle_version::text,
    coalesce(e.work_started_by_user_id::text,''),
    coalesce(e.completion_requested_by_user_id::text,''),
    coalesce(e.cancellation_requested_by_user_id::text,''),
    coalesce(e.previous_active_status,'')
  ])
$$;

create or replace function private.reopening_action_token(
  g public.gigs,e public.engagements,p_has_reopening boolean
) returns text language sql stable set search_path='' as $$
  select private.engagement_hash(array[
    'engagement-reopen-v1',g.id::text,g.opportunity_lifecycle,
    g.application_intake,g.operational_state,e.id::text,e.status,
    e.lifecycle_version::text,p_has_reopening::text,
    g.current_gig_version_id::text,g.current_material_gig_version_id::text
  ])
$$;

create or replace function private.invitation_action_token(
  g public.gigs,a public.applications,i public.application_reconsideration_invitations
) returns text language sql stable set search_path='' as $$
  select private.engagement_hash(array[
    'reconsideration-action-v1',g.id::text,g.opportunity_lifecycle,
    g.operational_state,g.current_material_gig_version_id::text,
    a.id::text,a.stage,a.current_version_id::text,
    i.id::text,i.status,i.invited_application_version_id::text,
    i.invited_material_gig_version_id::text
  ])
$$;

create or replace function private.engagement_operation_replay(
  p_actor uuid,p_request uuid,p_fingerprint text
) returns jsonb language plpgsql stable set search_path='' as $$
declare op private.engagement_operations%rowtype;
begin
  select * into op from private.engagement_operations
  where actor_user_id=p_actor and request_id=p_request;
  if not found then return null; end if;
  if op.operation_fingerprint<>p_fingerprint then
    raise exception using errcode='P0001',message='M7H_IDEMPOTENCY_CONFLICT';
  end if;
  return op.result || jsonb_build_object('idempotent_replay',true);
end;
$$;

create or replace function private.record_engagement_operation(
  p_actor uuid,p_request uuid,p_kind text,p_fingerprint text,
  p_engagement uuid,p_gig uuid,p_application uuid,p_reopening uuid,
  p_invitation uuid,p_result jsonb,p_now timestamptz
) returns void language sql set search_path='' as $$
  insert into private.engagement_operations(
    actor_user_id,request_id,operation_kind,operation_fingerprint,
    engagement_id,gig_id,application_id,reopening_id,invitation_id,result,created_at
  ) values(
    p_actor,p_request,p_kind,p_fingerprint,p_engagement,p_gig,p_application,
    p_reopening,p_invitation,p_result,p_now
  )
$$;

create or replace function private.engagement_allowed_actions(
  e public.engagements,p_actor uuid,p_reopened boolean
) returns jsonb language plpgsql stable set search_path='' as $$
declare role text:=private.engagement_actor_role(e,p_actor); actions text[]:=array[]::text[];
begin
  if role is null then return '[]'::jsonb; end if;
  if e.status='confirmed' then
    actions:=array['prepare_kickoff','start_work','request_cancellation'];
  elsif e.status='kickoff_pending' then
    actions:=array['start_work','request_cancellation'];
  elsif e.status='in_progress' then
    actions:=array['request_completion','request_cancellation'];
  elsif e.status='completion_pending' then
    actions:=array['request_cancellation'];
    if e.completion_requested_by_user_id<>p_actor then
      actions:=actions||array['confirm_completion','reject_completion'];
    end if;
  elsif e.status='cancellation_pending' then
    if e.cancellation_requested_by_user_id=p_actor then
      actions:=array['withdraw_cancellation'];
    else actions:=array['acknowledge_cancellation']; end if;
  elsif e.status='cancelled' and role='client' and not p_reopened then
    actions:=array['reopen_gig'];
  end if;
  return to_jsonb(actions);
end;
$$;

create or replace function private.engagement_public_result(
  p_engagement_id uuid,p_actor uuid
) returns jsonb language plpgsql stable set search_path='' as $$
declare
  e public.engagements%rowtype; g public.gigs%rowtype;
  av public.application_versions%rowtype; gv public.gig_versions%rowtype;
  role text; reopened boolean; terms jsonb; client_name text; freelancer_name text;
begin
  select * into e from public.engagements where id=p_engagement_id;
  if not found then raise exception using errcode='P0002',message='M7H_ENGAGEMENT_NOT_FOUND'; end if;
  role:=private.engagement_actor_role(e,p_actor);
  if role is null then raise exception using errcode='P0002',message='M7H_ENGAGEMENT_NOT_FOUND'; end if;
  select * into g from public.gigs where id=e.gig_id;
  select * into av from public.application_versions where id=e.accepted_application_version_id;
  select * into gv from public.gig_versions where id=e.accepted_gig_version_id;
  select full_name into client_name from public.user_profiles where id=e.client_participant_user_id;
  select full_name into freelancer_name from public.user_profiles where id=e.freelancer_participant_user_id;
  reopened:=exists(select 1 from public.engagement_reopenings r where r.engagement_id=e.id);
  terms:=jsonb_strip_nulls(jsonb_build_object(
    'accepted_terms_contract_version',e.accepted_terms_contract_version,
    'application_version_id',e.accepted_application_version_id,
    'application_version_number',av.version_number,
    'gig_version_id',e.accepted_gig_version_id,
    'gig_version_number',gv.version_number,
    'client_payment_terms',e.accepted_terms_snapshot->'client_payment_terms',
    'freelancer_proposal',e.accepted_terms_snapshot->'freelancer_proposal',
    'timeline',e.accepted_terms_snapshot->'timeline',
    'availability',e.accepted_terms_snapshot->'availability',
    'included_work',e.accepted_terms_snapshot->'included_work',
    'excluded_work',e.accepted_terms_snapshot->'excluded_work',
    'assumptions',e.accepted_terms_snapshot->'assumptions',
    'estimate_change_factors',e.accepted_terms_snapshot->'estimate_change_factors',
    'scope_notes',case when e.accepted_terms_contract_version>=2
      then e.accepted_terms_snapshot->'scope_notes' end
  ));
  return jsonb_strip_nulls(jsonb_build_object(
    'engagement_id',e.id,'gig_id',e.gig_id,'application_id',e.application_id,
    'selection_request_id',e.selection_request_id,'viewer_role',role,
    'status',e.status,'lifecycle_version',e.lifecycle_version,
    'confirmed_at',e.confirmed_at,
    'gig',jsonb_build_object('id',g.id,'title',g.title,'status',g.status),
    'client',jsonb_build_object('user_id',e.client_participant_user_id,'display_name',client_name),
    'freelancer',jsonb_build_object('user_id',e.freelancer_participant_user_id,'display_name',freelancer_name),
    'accepted_terms',terms,
    'work_started_by_user_id',e.work_started_by_user_id,'work_started_at',e.work_started_at,
    'completion_requested_by_user_id',e.completion_requested_by_user_id,
    'completion_requested_at',e.completion_requested_at,
    'cancellation_requested_by_user_id',e.cancellation_requested_by_user_id,
    'cancellation_requested_at',e.cancellation_requested_at,
    'cancellation_reason_code',e.cancellation_reason_code,
    'cancellation_explanation',e.cancellation_detail->>'explanation',
    'previous_active_status',e.previous_active_status,
    'action_token',private.engagement_action_token(e),
    'reopening_token',case when role='client' and e.status='cancelled' and not reopened
      then private.reopening_action_token(g,e,reopened) end,
    'allowed_actions',private.engagement_allowed_actions(e,p_actor,reopened),
    'reopened',reopened,
    'disclaimers',jsonb_build_array(
      'This immutable snapshot is a platform record, not a legal contract or payment guarantee.',
      'GigMatch does not process payments or provide escrow.',
      'Lifecycle statuses are participant-reported and do not resolve contractual or financial disputes.'
    )
  ));
end;
$$;

create or replace function public.engagement_get(
  p_engagement_id uuid,p_acting_user_id uuid
) returns jsonb language sql security definer set search_path='' as $$
  select private.engagement_public_result(p_engagement_id,p_acting_user_id)
$$;

create or replace function public.engagement_list(
  p_acting_user_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare items jsonb;
begin
  if not exists(select 1 from public.user_profiles up
    where up.id=p_acting_user_id and up.role in ('client','freelancer')) then
    raise exception using errcode='42501',message='M7H_ENGAGEMENT_ACTION_NOT_ALLOWED';
  end if;
  select coalesce(jsonb_agg(private.engagement_public_result(e.id,p_acting_user_id)
    order by (e.status not in ('completed','cancelled')) desc,e.confirmed_at desc,e.id),'[]'::jsonb)
  into items from public.engagements e
  where p_acting_user_id in(e.client_participant_user_id,e.freelancer_participant_user_id);
  return jsonb_build_object('items',items,'count',jsonb_array_length(items));
end;
$$;

create or replace function public.engagement_timeline(
  p_engagement_id uuid,p_acting_user_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.engagements%rowtype; items jsonb;
begin
  select * into e from public.engagements where id=p_engagement_id;
  if not found or private.engagement_actor_role(e,p_acting_user_id) is null then
    raise exception using errcode='P0002',message='M7H_ENGAGEMENT_NOT_FOUND';
  end if;
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'event_id',me.id,'event_type',me.event_type,'actor_role',
      case when me.actor_type='system' then 'system'
        when me.actor_user_id=e.client_participant_user_id then 'client'
        when me.actor_user_id=e.freelancer_participant_user_id then 'freelancer' end,
    'reason_code',me.reason_code,'status_from',me.event_payload->>'status_from',
    'status_to',me.event_payload->>'status_to',
    'lifecycle_version',me.event_payload->'lifecycle_version',
    'occurred_at',me.occurred_at
  )) order by me.occurred_at,me.id),'[]'::jsonb) into items
  from public.marketplace_events me
  where me.engagement_id=e.id and me.event_type in(
    'engagement_created','engagement_kickoff_prepared','engagement_work_started',
    'engagement_completion_requested','engagement_completion_confirmed',
    'engagement_completion_rejected','engagement_cancellation_requested',
    'engagement_cancellation_withdrawn','engagement_cancellation_acknowledged',
    'gig_reopened_after_engagement_cancellation'
  );
  return jsonb_build_object('engagement_id',e.id,'items',items);
end;
$$;

create or replace function public.engagement_transition(
  p_engagement_id uuid,p_acting_user_id uuid,p_action text,
  p_expected_action_token text,p_request_id uuid,
  p_reason_code text default null,p_explanation text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  resolved_gig uuid; resolved_application uuid;
  e public.engagements%rowtype; role text; before_status text; after_status text;
  event_name text; authoritative_now timestamptz; fingerprint text; replay jsonb;
  result jsonb;
begin
  if p_engagement_id is null or p_acting_user_id is null or p_request_id is null
    or btrim(coalesce(p_expected_action_token,''))=''
    or p_action not in(
      'prepare_kickoff','start_work','request_completion','confirm_completion',
      'reject_completion','request_cancellation','withdraw_cancellation',
      'acknowledge_cancellation'
    ) then
    raise exception using errcode='22023',message='M7H_ENGAGEMENT_ACTION_NOT_ALLOWED';
  end if;
  select gig_id,application_id into resolved_gig,resolved_application
    from public.engagements where id=p_engagement_id;
  if resolved_gig is null then raise exception using errcode='P0002',message='M7H_ENGAGEMENT_NOT_FOUND'; end if;
  perform 1 from public.gigs where id=resolved_gig for update;
  if p_action='acknowledge_cancellation' then
    perform 1 from public.applications where id=resolved_application for update;
  end if;
  select * into e from public.engagements where id=p_engagement_id for update;
  role:=private.engagement_actor_role(e,p_acting_user_id);
  if role is null then raise exception using errcode='P0002',message='M7H_ENGAGEMENT_NOT_FOUND'; end if;
  authoritative_now:=clock_timestamp();
  fingerprint:=private.engagement_hash(array[
    'engagement-transition-v1',p_action,e.id::text,
    coalesce(p_reason_code,''),coalesce(btrim(p_explanation),'')
  ]);
  replay:=private.engagement_operation_replay(p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then
    return private.engagement_public_result(e.id,p_acting_user_id)
      ||jsonb_build_object('idempotent_replay',true);
  end if;
  if private.engagement_action_token(e)<>p_expected_action_token then
    raise exception using errcode='40001',message='M7H_STALE_ENGAGEMENT_ACTION';
  end if;
  before_status:=e.status;
  if p_action='prepare_kickoff' and e.status='confirmed' then
    after_status:='kickoff_pending'; event_name:='engagement_kickoff_prepared';
    update public.engagements set status=after_status,lifecycle_version=lifecycle_version+1 where id=e.id;
  elsif p_action='start_work' and e.status in('confirmed','kickoff_pending') then
    after_status:='in_progress'; event_name:='engagement_work_started';
    update public.engagements set status=after_status,work_started_by_user_id=p_acting_user_id,
      work_started_at=authoritative_now,lifecycle_version=lifecycle_version+1 where id=e.id;
  elsif p_action='request_completion' and e.status='in_progress' then
    after_status:='completion_pending'; event_name:='engagement_completion_requested';
    update public.engagements set status=after_status,
      completion_requested_by_user_id=p_acting_user_id,
      completion_requested_at=authoritative_now,lifecycle_version=lifecycle_version+1 where id=e.id;
  elsif p_action in('confirm_completion','reject_completion')
    and e.status='completion_pending'
    and e.completion_requested_by_user_id<>p_acting_user_id then
    after_status:=case when p_action='confirm_completion' then 'completed' else 'in_progress' end;
    event_name:=case when p_action='confirm_completion' then
      'engagement_completion_confirmed' else 'engagement_completion_rejected' end;
    update public.engagements set status=after_status,
      completion_requested_by_user_id=case when p_action='confirm_completion'
        then completion_requested_by_user_id end,
      completion_requested_at=case when p_action='confirm_completion'
        then completion_requested_at end,
      lifecycle_version=lifecycle_version+1 where id=e.id;
  elsif p_action='request_cancellation'
    and e.status in('confirmed','kickoff_pending','in_progress','completion_pending') then
    if p_reason_code not in(
      'scope_could_not_be_agreed','availability_changed','business_needs_changed',
      'mutual_decision','safety_or_policy_concern','other'
    ) or (p_reason_code='other' and btrim(coalesce(p_explanation,''))='')
      or (p_explanation is not null and
        (btrim(p_explanation)='' or char_length(btrim(p_explanation))>800
         or btrim(p_explanation)~'[[:cntrl:]]')) then
      raise exception using errcode='22023',message='M7H_INVALID_CANCELLATION_REASON';
    end if;
    after_status:='cancellation_pending'; event_name:='engagement_cancellation_requested';
    update public.engagements set status=after_status,
      cancellation_requested_by_user_id=p_acting_user_id,
      cancellation_requested_at=authoritative_now,cancellation_reason_code=p_reason_code,
      cancellation_detail=jsonb_strip_nulls(jsonb_build_object(
        'reason_code',p_reason_code,'explanation',nullif(btrim(coalesce(p_explanation,'')),'')
      )),previous_active_status=e.status,lifecycle_version=lifecycle_version+1 where id=e.id;
  elsif p_action='withdraw_cancellation' and e.status='cancellation_pending'
    and e.cancellation_requested_by_user_id=p_acting_user_id then
    after_status:=e.previous_active_status; event_name:='engagement_cancellation_withdrawn';
    update public.engagements set status=after_status,
      cancellation_requested_by_user_id=null,cancellation_requested_at=null,
      cancellation_reason_code=null,cancellation_detail=null,previous_active_status=null,
      lifecycle_version=lifecycle_version+1 where id=e.id;
  elsif p_action='acknowledge_cancellation' and e.status='cancellation_pending'
    and e.cancellation_requested_by_user_id<>p_acting_user_id then
    after_status:='cancelled'; event_name:='engagement_cancellation_acknowledged';
    update public.engagements set status=after_status,lifecycle_version=lifecycle_version+1 where id=e.id;
  else
    if p_action in('confirm_completion','reject_completion')
       and e.completion_requested_by_user_id=p_acting_user_id then
      raise exception using errcode='P0001',message='M7H_SELF_RESOLUTION_NOT_ALLOWED';
    end if;
    if p_action='acknowledge_cancellation'
       and e.cancellation_requested_by_user_id=p_acting_user_id then
      raise exception using errcode='P0001',message='M7H_SELF_ACKNOWLEDGEMENT_NOT_ALLOWED';
    end if;
    raise exception using errcode='P0001',message='M7H_INVALID_ENGAGEMENT_TRANSITION';
  end if;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
    selection_request_id,engagement_id,reason_origin,reason_code,event_payload,occurred_at
  ) values(
    event_name,'participants','user',p_acting_user_id,e.gig_id,e.application_id,
    e.selection_request_id,e.id,
    case when p_action='request_cancellation' then 'engagement_cancellation' end,
    case when p_action='request_cancellation' then p_reason_code end,
    jsonb_build_object('status_from',before_status,'status_to',after_status,
      'actor_role',role,'lifecycle_version',e.lifecycle_version+1),
    authoritative_now
  );
  result:=private.engagement_public_result(e.id,p_acting_user_id)
    ||jsonb_build_object('idempotent_replay',false);
  perform private.record_engagement_operation(
    p_acting_user_id,p_request_id,p_action,fingerprint,e.id,e.gig_id,e.application_id,
    null,null,result,authoritative_now
  );
  return result;
end;
$$;

-- Permit only the exact failed-engagement filled -> active/closed/active projection.
create or replace function private.authorize_selection_fill_projection()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (
    old.opportunity_lifecycle='active' and new.opportunity_lifecycle='filled'
    and new.application_intake='closed' and new.operational_state='active'
  ) or (
    old.opportunity_lifecycle='filled' and new.opportunity_lifecycle='active'
    and new.application_intake='closed' and new.operational_state='active'
    and current_setting('app.engagement_reopening',true)='on'
  ) then
    if (new.id,new.client_id,new.title,new.description,new.tech_category,new.required_skills,
      new.preferred_skills,new.budget_min,new.budget_max,new.difficulty_level,new.seniority_needed,
      new.deliverables,new.work_mode,new.deadline,new.current_gig_version_id,new.current_material_gig_version_id)
      is not distinct from
      (old.id,old.client_id,old.title,old.description,old.tech_category,old.required_skills,
      old.preferred_skills,old.budget_min,old.budget_max,old.difficulty_level,old.seniority_needed,
      old.deliverables,old.work_mode,old.deadline,old.current_gig_version_id,old.current_material_gig_version_id)
    then perform set_config('app.gig_controlled_write','on',true); end if;
  end if;
  return new;
end;
$$;

create or replace function public.engagement_reopen_gig(
  p_engagement_id uuid,p_acting_user_id uuid,p_expected_reopening_token text,
  p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  resolved_gig uuid; resolved_application uuid; g public.gigs%rowtype;
  a public.applications%rowtype; e public.engagements%rowtype; r_id uuid:=gen_random_uuid();
  authoritative_now timestamptz; fingerprint text; replay jsonb; result jsonb;
begin
  select gig_id,application_id into resolved_gig,resolved_application
  from public.engagements where id=p_engagement_id;
  if resolved_gig is null then raise exception using errcode='P0002',message='M7H_ENGAGEMENT_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig for update;
  select * into a from public.applications where id=resolved_application for update;
  select * into e from public.engagements where id=p_engagement_id for update;
  authoritative_now:=clock_timestamp();
  if g.client_id<>p_acting_user_id or e.client_participant_user_id<>p_acting_user_id then
    raise exception using errcode='P0002',message='M7H_ENGAGEMENT_NOT_FOUND';
  end if;
  fingerprint:=private.engagement_hash(array['engagement-reopen-v1',e.id::text]);
  replay:=private.engagement_operation_replay(p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  if private.reopening_action_token(g,e,exists(
    select 1 from public.engagement_reopenings x where x.engagement_id=e.id
  ))<>p_expected_reopening_token then
    raise exception using errcode='40001',message='M7H_STALE_REOPENING_ACTION';
  end if;
  if e.status<>'cancelled' or g.opportunity_lifecycle<>'filled'
    or g.application_intake<>'closed' or g.operational_state<>'active'
    or a.stage<>'confirmed'
    or exists(select 1 from public.engagements x
      where x.gig_id=g.id and x.status<>'cancelled')
    or exists(select 1 from public.engagement_reopenings x where x.engagement_id=e.id) then
    raise exception using errcode='P0001',message='M7H_GIG_REOPEN_NOT_ALLOWED';
  end if;
  insert into public.engagement_reopenings(
    id,engagement_id,gig_id,application_id,client_actor_user_id,
    operation_request_id,reopened_at
  ) values(r_id,e.id,g.id,a.id,p_acting_user_id,p_request_id,authoritative_now);
  perform set_config('app.engagement_reopening','on',true);
  update public.gigs set opportunity_lifecycle='active',
    application_intake='closed',operational_state='active' where id=g.id;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
    engagement_id,event_payload,occurred_at
  ) values(
    'gig_reopened_after_engagement_cancellation','participants','user',
    p_acting_user_id,g.id,a.id,e.id,
    jsonb_build_object('reopening_id',r_id,'status_from','filled',
      'status_to','closed_to_new_applications'),authoritative_now
  );
  result:=jsonb_build_object(
    'reopening_id',r_id,'engagement_id',e.id,'gig_id',g.id,
    'gig_status','closed_to_new_applications','application_intake','closed',
    'idempotent_replay',false
  );
  perform private.record_engagement_operation(
    p_acting_user_id,p_request_id,'reopen_gig',fingerprint,e.id,g.id,a.id,
    r_id,null,result,authoritative_now
  );
  return result;
end;
$$;

create or replace function private.reconsideration_result(
  p_invitation_id uuid,p_actor uuid
) returns jsonb language plpgsql stable set search_path='' as $$
declare
  i public.application_reconsideration_invitations%rowtype;
  a public.applications%rowtype; g public.gigs%rowtype;
  av public.application_versions%rowtype; gv public.gig_versions%rowtype;
  freelancer_user uuid; role text;
begin
  select * into i from public.application_reconsideration_invitations where id=p_invitation_id;
  if not found then raise exception using errcode='P0002',message='M7H_RECONSIDERATION_NOT_FOUND'; end if;
  select * into a from public.applications where id=i.application_id;
  select * into g from public.gigs where id=i.gig_id;
  select fp.user_id into freelancer_user from public.freelancer_profiles fp
    where fp.id=a.freelancer_profile_id;
  role:=case when g.client_id=p_actor then 'client'
    when freelancer_user=p_actor then 'freelancer' end;
  if role is null then raise exception using errcode='P0002',message='M7H_RECONSIDERATION_NOT_FOUND'; end if;
  select * into av from public.application_versions where id=a.current_version_id;
  select * into gv from public.gig_versions where id=g.current_material_gig_version_id;
  return jsonb_strip_nulls(jsonb_build_object(
    'invitation_id',i.id,'reopening_id',i.reopening_id,
    'source_engagement_id',i.source_engagement_id,'gig_id',i.gig_id,
    'application_id',i.application_id,'viewer_role',role,'status',i.status,
    'reason_code',i.reason_code,'reason_explanation',i.reason_explanation,
    'created_at',i.created_at,'responded_at',i.responded_at,
    'invited_application_version_id',i.invited_application_version_id,
    'invited_material_gig_version_id',i.invited_material_gig_version_id,
    'response_application_version_id',i.response_application_version_id,
    'current_application_stage',a.stage,
    'current_application_version_id',a.current_version_id,
    'current_material_gig_version_id',g.current_material_gig_version_id,
    'gig',jsonb_build_object('id',g.id,'title',g.title,'status',g.status),
    'previous_proposal',jsonb_build_object(
      'cover_note',av.cover_note,'proposal',av.proposal_snapshot,
      'timeline',av.timeline_snapshot,'availability',av.availability_snapshot,
      'scope',av.scope_snapshot,'scope_notes',av.scope_notes
    ),
    'current_gig_terms',jsonb_strip_nulls(jsonb_build_object(
      'payment_structure',gv.terms_snapshot->'payment_structure',
      'currency',gv.terms_snapshot->'currency','client_payment',gv.terms_snapshot->'client_payment',
      'scope',gv.terms_snapshot->'scope','deliverables',gv.terms_snapshot->'deliverables',
      'required_skills',gv.terms_snapshot->'required_skills',
      'preferred_skills',gv.terms_snapshot->'preferred_skills',
      'application_deadline',gv.terms_snapshot->'application_deadline',
      'project_deadline',gv.terms_snapshot->'project_deadline'
    )),
    'action_token',private.invitation_action_token(g,a,i),
    'allowed_actions',case
      when i.status<>'pending' then '[]'::jsonb
      when role='client' then '["cancel"]'::jsonb
      when g.opportunity_lifecycle='active' and g.operational_state='active'
        and g.current_material_gig_version_id=i.invited_material_gig_version_id
        and a.current_version_id=i.invited_application_version_id
        and a.stage in('not_selected','withdrawn')
        and not exists(select 1 from public.engagements x where x.gig_id=g.id and x.status<>'cancelled')
      then '["reaffirm","submit_update","decline"]'::jsonb
      else '[]'::jsonb end
  ));
end;
$$;

create or replace function public.reconsideration_get_invitation(
  p_invitation_id uuid,p_acting_user_id uuid
) returns jsonb language sql security definer set search_path='' as $$
  select private.reconsideration_result(p_invitation_id,p_acting_user_id)
$$;

create or replace function public.reconsideration_get_context(
  p_application_id uuid,p_acting_user_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.applications%rowtype; g public.gigs%rowtype; r public.engagement_reopenings%rowtype;
  failed_application uuid; pending_id uuid; eligible boolean; blockers text[]:=array[]::text[];
  freelancer_user uuid; actor_role text;
begin
  select * into a from public.applications where id=p_application_id;
  if not found then raise exception using errcode='P0002',message='M7H_RECONSIDERATION_NOT_FOUND'; end if;
  select * into g from public.gigs where id=a.gig_id;
  select fp.user_id into freelancer_user from public.freelancer_profiles fp
    where fp.id=a.freelancer_profile_id;
  actor_role:=case when g.client_id=p_acting_user_id then 'client'
    when freelancer_user=p_acting_user_id then 'freelancer' end;
  if actor_role is null then
    raise exception using errcode='P0002',message='M7H_RECONSIDERATION_NOT_FOUND';
  end if;
  select * into r from public.engagement_reopenings where gig_id=g.id order by reopened_at desc limit 1;
  select application_id into failed_application from public.engagements where id=r.engagement_id;
  select id into pending_id from public.application_reconsideration_invitations
    where application_id=a.id and status='pending' order by created_at desc limit 1;
  if r.id is null then blockers:=array_append(blockers,'gig_not_reopened_after_cancellation'); end if;
  if g.opportunity_lifecycle<>'active' or g.operational_state<>'active' then
    blockers:=array_append(blockers,'gig_not_active'); end if;
  if exists(select 1 from public.engagements e where e.gig_id=g.id and e.status<>'cancelled') then
    blockers:=array_append(blockers,'engagement_already_exists'); end if;
  if a.stage not in('not_selected','withdrawn') then blockers:=array_append(blockers,'application_not_eligible'); end if;
  if a.id=failed_application then blockers:=array_append(blockers,'failed_engagement_winner_ineligible'); end if;
  if pending_id is not null then blockers:=array_append(blockers,'invitation_already_pending'); end if;
  eligible:=actor_role='client' and cardinality(blockers)=0;
  return jsonb_build_object(
    'application_id',a.id,'gig_id',g.id,'viewer_role',actor_role,
    'eligible',eligible,'blockers',to_jsonb(blockers),
    'pending_invitation_id',pending_id,
    'action_token',case when eligible then private.engagement_hash(array[
      'reconsideration-create-v1',g.id::text,g.current_material_gig_version_id::text,
      a.id::text,a.stage,a.current_version_id::text,r.id::text
    ]) end
  );
end;
$$;

create or replace function public.reconsideration_create_invitation(
  p_application_id uuid,p_acting_user_id uuid,p_expected_action_token text,
  p_request_id uuid,p_reason_code text,p_explanation text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  resolved_gig uuid; g public.gigs%rowtype; a public.applications%rowtype;
  r public.engagement_reopenings%rowtype; e public.engagements%rowtype;
  new_id uuid:=gen_random_uuid(); now_at timestamptz; fingerprint text; replay jsonb;
  expected text; result jsonb;
begin
  select gig_id into resolved_gig from public.applications where id=p_application_id;
  if resolved_gig is null then raise exception using errcode='P0002',message='M7H_RECONSIDERATION_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig for update;
  select * into a from public.applications where id=p_application_id for update;
  select * into r from public.engagement_reopenings where gig_id=g.id order by reopened_at desc limit 1 for update;
  select * into e from public.engagements where id=r.engagement_id for update;
  now_at:=clock_timestamp();
  if g.client_id<>p_acting_user_id then raise exception using errcode='P0002',message='M7H_RECONSIDERATION_NOT_FOUND'; end if;
  fingerprint:=private.engagement_hash(array[
    'reconsideration-create-v1',a.id::text,p_reason_code,coalesce(btrim(p_explanation),'')
  ]);
  replay:=private.engagement_operation_replay(p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  expected:=private.engagement_hash(array[
    'reconsideration-create-v1',g.id::text,g.current_material_gig_version_id::text,
    a.id::text,a.stage,a.current_version_id::text,r.id::text
  ]);
  if expected<>p_expected_action_token then
    raise exception using errcode='40001',message='M7H_STALE_RECONSIDERATION_ACTION';
  end if;
  if p_reason_code not in(
    'failed_engagement_reopened','client_reconsideration','freelancer_invited_back','other'
  ) or (p_reason_code='other' and btrim(coalesce(p_explanation,''))='')
    or r.id is null or e.status<>'cancelled' or a.id=e.application_id
    or a.stage not in('not_selected','withdrawn')
    or g.opportunity_lifecycle<>'active' or g.operational_state<>'active'
    or exists(select 1 from public.engagements x where x.gig_id=g.id and x.status<>'cancelled')
    or exists(select 1 from public.application_reconsideration_invitations x
      where x.application_id=a.id and x.status='pending') then
    raise exception using errcode='P0001',message='M7H_RECONSIDERATION_NOT_ALLOWED';
  end if;
  insert into public.application_reconsideration_invitations(
    id,reopening_id,source_engagement_id,gig_id,application_id,
    invited_application_version_id,invited_material_gig_version_id,
    client_actor_user_id,reason_code,reason_explanation,status,created_at
  ) values(
    new_id,r.id,e.id,g.id,a.id,a.current_version_id,g.current_material_gig_version_id,
    p_acting_user_id,p_reason_code,nullif(btrim(coalesce(p_explanation,'')),''),
    'pending',now_at
  );
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
    engagement_id,reason_origin,reason_code,event_payload,occurred_at
  ) values(
    'reconsideration_invitation_sent','participants','user',p_acting_user_id,
    g.id,a.id,e.id,'reconsideration',p_reason_code,
    jsonb_build_object('invitation_id',new_id,
      'application_version_id',a.current_version_id,
      'material_gig_version_id',g.current_material_gig_version_id),now_at
  );
  result:=private.reconsideration_result(new_id,p_acting_user_id)
    ||jsonb_build_object('idempotent_replay',false);
  perform private.record_engagement_operation(
    p_acting_user_id,p_request_id,'create_invitation',fingerprint,e.id,g.id,a.id,
    r.id,new_id,result,now_at
  );
  return result;
end;
$$;

create or replace function public.reconsideration_cancel_invitation(
  p_invitation_id uuid,p_acting_user_id uuid,p_expected_action_token text,p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.application_reconsideration_invitations%rowtype; g public.gigs%rowtype;
  a public.applications%rowtype; now_at timestamptz; fingerprint text; replay jsonb; result jsonb;
begin
  select * into i from public.application_reconsideration_invitations where id=p_invitation_id;
  if not found then raise exception using errcode='P0002',message='M7H_RECONSIDERATION_NOT_FOUND'; end if;
  select * into g from public.gigs where id=i.gig_id for update;
  select * into a from public.applications where id=i.application_id for update;
  select * into i from public.application_reconsideration_invitations where id=i.id for update;
  now_at:=clock_timestamp();
  if g.client_id<>p_acting_user_id then raise exception using errcode='P0002',message='M7H_RECONSIDERATION_NOT_FOUND'; end if;
  fingerprint:=private.engagement_hash(array['reconsideration-cancel-v1',i.id::text]);
  replay:=private.engagement_operation_replay(p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  if private.invitation_action_token(g,a,i)<>p_expected_action_token then
    raise exception using errcode='40001',message='M7H_STALE_RECONSIDERATION_ACTION';
  end if;
  if i.status<>'pending' then raise exception using errcode='P0001',message='M7H_RECONSIDERATION_NOT_ALLOWED'; end if;
  update public.application_reconsideration_invitations
    set status='cancelled',cancelled_at=now_at where id=i.id;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
    engagement_id,event_payload,occurred_at
  ) values('reconsideration_invitation_cancelled','participants','user',p_acting_user_id,
    g.id,a.id,i.source_engagement_id,jsonb_build_object('invitation_id',i.id),now_at);
  result:=private.reconsideration_result(i.id,p_acting_user_id)
    ||jsonb_build_object('idempotent_replay',false);
  perform private.record_engagement_operation(
    p_acting_user_id,p_request_id,'cancel_invitation',fingerprint,
    i.source_engagement_id,g.id,a.id,i.reopening_id,i.id,result,now_at
  );
  return result;
end;
$$;

create or replace function public.reconsideration_respond_invitation(
  p_invitation_id uuid,p_acting_user_id uuid,p_action text,
  p_expected_action_token text,p_request_id uuid,p_snapshot jsonb default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  i public.application_reconsideration_invitations%rowtype; g public.gigs%rowtype;
  a public.applications%rowtype; freelancer_user uuid; gv public.gig_versions%rowtype;
  av public.application_versions%rowtype; canonical jsonb; inserted record;
  now_at timestamptz; fingerprint text; replay jsonb; result jsonb; event_name text;
begin
  select * into i from public.application_reconsideration_invitations where id=p_invitation_id;
  if not found then raise exception using errcode='P0002',message='M7H_RECONSIDERATION_NOT_FOUND'; end if;
  select * into g from public.gigs where id=i.gig_id for update;
  select * into a from public.applications where id=i.application_id for update;
  perform 1 from public.application_review_states where application_id=a.id for update;
  perform 1 from public.application_qa_threads where application_id=a.id for update;
  perform 1 from public.application_revision_requests where application_id=a.id and status='open' for update;
  select * into i from public.application_reconsideration_invitations where id=i.id for update;
  now_at:=clock_timestamp();
  select fp.user_id into freelancer_user from public.freelancer_profiles fp
    where fp.id=a.freelancer_profile_id;
  if freelancer_user<>p_acting_user_id then
    raise exception using errcode='P0002',message='M7H_RECONSIDERATION_NOT_FOUND';
  end if;
  fingerprint:=private.engagement_hash(array[
    'reconsideration-response-v1',p_action,i.id::text,
    coalesce(p_snapshot::text,'')
  ]);
  replay:=private.engagement_operation_replay(p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  if private.invitation_action_token(g,a,i)<>p_expected_action_token then
    raise exception using errcode='40001',message='M7H_STALE_RECONSIDERATION_ACTION';
  end if;
  if p_action not in('reaffirm','submit_update','decline') or i.status<>'pending'
    or g.opportunity_lifecycle<>'active' or g.operational_state<>'active'
    or g.current_material_gig_version_id<>i.invited_material_gig_version_id
    or a.current_version_id<>i.invited_application_version_id
    or a.stage not in('not_selected','withdrawn')
    or exists(select 1 from public.engagements x where x.gig_id=g.id and x.status<>'cancelled') then
    raise exception using errcode='P0001',message='M7H_RECONSIDERATION_NOT_ALLOWED';
  end if;
  if p_action='decline' then
    update public.application_reconsideration_invitations
      set status='declined',responded_at=now_at where id=i.id;
    event_name:='reconsideration_invitation_declined';
  else
    select * into gv from public.gig_versions where id=g.current_material_gig_version_id;
    if p_action='reaffirm' then
      select * into av from public.application_versions where id=a.current_version_id;
      canonical:=jsonb_strip_nulls(jsonb_build_object(
        'proposal_contract_version',1,'snapshot_schema_version',1,
        'cover_note',av.cover_note,'proposal',av.proposal_snapshot,
        'timeline',av.timeline_snapshot,'availability',av.availability_snapshot,
        'scope',av.scope_snapshot,'scope_notes',av.scope_notes
      ));
    else canonical:=p_snapshot; end if;
    if private.validate_application_snapshot(canonical,gv.terms_snapshot) is not true then
      raise exception using errcode='P0001',message='M7H_RECONSIDERATION_UPDATE_REQUIRED';
    end if;
    select * into inserted from private.insert_application_version(
      a.id,g.id,gv.id,'reconsideration',canonical,p_acting_user_id,now_at
    );
    update public.applications set
      current_version_id=inserted.version_id,stage='under_review',
      last_updated_at=now_at,stage_changed_at=now_at,
      stage_changed_by_actor_type='user',stage_changed_by_user_id=p_acting_user_id,
      stage_reason_origin=null,stage_reason_code=null,stage_reason_payload=null
    where id=a.id;
    update public.application_reconsideration_invitations set
      status='accepted',response_application_version_id=inserted.version_id,
      responded_at=now_at where id=i.id;
    event_name:='reconsideration_invitation_accepted';
  end if;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
    engagement_id,event_payload,occurred_at
  ) values(
    event_name,'participants','user',p_acting_user_id,g.id,a.id,
    i.source_engagement_id,jsonb_strip_nulls(jsonb_build_object(
      'invitation_id',i.id,'response_application_version_id',
      case when p_action='decline' then null else inserted.version_id end,
      'response_kind',p_action
    )),now_at
  );
  result:=private.reconsideration_result(i.id,p_acting_user_id)
    ||jsonb_build_object('idempotent_replay',false);
  perform private.record_engagement_operation(
    p_acting_user_id,p_request_id,'respond_invitation_'||p_action,fingerprint,
    i.source_engagement_id,g.id,a.id,i.reopening_id,i.id,result,now_at
  );
  return result;
end;
$$;

create or replace function private.close_pending_reconsideration_invitations(
  p_gig_id uuid,p_now timestamptz
) returns void language plpgsql set search_path='' as $$
declare invitation_row record;
begin
  for invitation_row in
    select i.id,i.application_id,i.source_engagement_id
    from public.application_reconsideration_invitations i
    where i.gig_id=p_gig_id and i.status='pending'
    order by i.id for update
  loop
    update public.application_reconsideration_invitations
      set status='closed_by_gig_state',closed_at=p_now
      where id=invitation_row.id;
    insert into public.marketplace_events(
      event_type,visibility,actor_type,gig_id,application_id,engagement_id,
      event_payload,occurred_at
    ) values(
      'reconsideration_invitation_cancelled','participants','system',p_gig_id,
      invitation_row.application_id,invitation_row.source_engagement_id,
      jsonb_build_object('invitation_id',invitation_row.id,
        'closure_reason','closed_by_gig_state'),p_now
    );
  end loop;
end;
$$;

-- The preserved shared confirmation authority is amended, not duplicated:
-- historical Confirmed applications backed only by Cancelled engagements do
-- not block a later cycle, while the non-cancelled engagement invariant does.
create or replace function private.confirm_selection_request_core(
  p_selection_request_id uuid,
  p_acting_user_id uuid,
  p_authoritative_now timestamptz,
  p_snapshot_schema_version integer
)
returns jsonb
language plpgsql
set search_path=''
as $$
declare
  resolved_gig_id uuid;
  g public.gigs%rowtype;
  sr public.selection_requests%rowtype;
  a public.applications%rowtype;
  av public.application_versions%rowtype;
  gv public.gig_versions%rowtype;
  freelancer_user_id uuid;
  new_engagement_id uuid:=gen_random_uuid();
  accepted_snapshot jsonb;
  closed_application_id uuid;
begin
  select gig_id into resolved_gig_id
  from public.selection_requests where id=p_selection_request_id;
  if resolved_gig_id is null then
    raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND';
  end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  select * into sr from public.selection_requests where id=p_selection_request_id for update;
  if sr.gig_id<>g.id then raise exception 'Selection request gig changed while acquiring locks'; end if;
  if sr.status<>'pending' then
    raise exception using errcode='P0001',message='M7G_SELECTION_REQUEST_NOT_PENDING';
  end if;
  if sr.expires_at<=p_authoritative_now then
    raise exception using errcode='P0001',message='M7G_SELECTION_REQUEST_EXPIRED';
  end if;
  select * into a from public.applications where id=sr.application_id for update;
  if a.gig_id<>g.id then raise exception 'Selected application does not belong to request gig'; end if;
  if a.stage<>'advanced' then
    raise exception using errcode='P0001',message='M7G_APPLICATION_NOT_ADVANCED';
  end if;
  select fp.user_id into freelancer_user_id from public.freelancer_profiles fp
    where fp.id=a.freelancer_profile_id;
  if freelancer_user_id<>p_acting_user_id then
    raise exception using errcode='42501',message='M7G_SELECTION_REQUEST_NOT_FOUND';
  end if;
  if a.current_version_id<>sr.application_version_id
     or g.current_material_gig_version_id<>sr.gig_version_id then
    raise exception using errcode='P0001',message='M7G_SELECTION_TERMS_CHANGED';
  end if;
  select * into av from public.application_versions where id=sr.application_version_id;
  select * into gv from public.gig_versions where id=sr.gig_version_id and gig_id=g.id;
  if av.application_id<>a.id or av.gig_version_id<>gv.id
     or av.proposal_contract_version<>1 or gv.terms_contract_version<>1
     or (p_snapshot_schema_version>=2 and not private.selection_proposal_ready(av,gv)) then
    raise exception using errcode='P0001',message='M7G_PROPOSAL_NOT_SELECTION_READY';
  end if;
  if sr.commercial_warning_code is not null and (
       sr.commercial_acknowledged_by_user_id<>g.client_id
       or sr.commercial_acknowledged_at is null
     ) then
    raise exception using errcode='P0001',message='M7G_COMMERCIAL_ACKNOWLEDGEMENT_REQUIRED';
  end if;
  if g.opportunity_lifecycle='filled' then
    raise exception using errcode='P0001',message='M7G_GIG_ALREADY_FILLED';
  end if;
  if g.opportunity_lifecycle<>'active' or g.operational_state<>'active' then
    raise exception using errcode='P0001',message='M7G_SELECTION_RESPONSE_NOT_ALLOWED';
  end if;
  if exists(select 1 from public.engagements e
    where e.gig_id=g.id and e.status<>'cancelled') then
    raise exception using errcode='P0001',message='M7G_ENGAGEMENT_ALREADY_EXISTS';
  end if;

  perform x.id from public.applications x
  where x.gig_id=g.id and x.id<>a.id and x.stage in('under_review','advanced')
  order by x.id for update;

  accepted_snapshot:=jsonb_strip_nulls(jsonb_build_object(
    'accepted_terms_contract_version',p_snapshot_schema_version,
    'snapshot_schema_version',p_snapshot_schema_version,
    'captured_at',p_authoritative_now,
    'gig_id',case when p_snapshot_schema_version>=2 then g.id end,
    'application_id',case when p_snapshot_schema_version>=2 then a.id end,
    'selection_request_id',case when p_snapshot_schema_version>=2 then sr.id end,
    'client_participant_user_id',case when p_snapshot_schema_version>=2 then g.client_id end,
    'freelancer_participant_user_id',case when p_snapshot_schema_version>=2 then freelancer_user_id end,
    'application_version_id',av.id,'material_gig_version_id',gv.id,
    'gig_terms_contract_version',gv.terms_contract_version,
    'proposal_contract_version',av.proposal_contract_version,
    'gig_snapshot_schema_version',gv.snapshot_schema_version,
    'proposal_snapshot_schema_version',av.snapshot_schema_version,
    'client_payment_terms',gv.terms_snapshot->'client_payment',
    'freelancer_proposal',av.proposal_snapshot,
    'timeline',av.timeline_snapshot,'availability',av.availability_snapshot,
    'scope',av.scope_snapshot,
    'scope_notes',case when p_snapshot_schema_version>=2 then av.scope_notes end,
    'included_work',av.scope_snapshot->'included_work',
    'excluded_work',av.scope_snapshot->'excluded_work',
    'assumptions',av.scope_snapshot->'assumptions',
    'estimate_change_factors',av.scope_snapshot->'estimate_change_factors',
    'commercial_warning_code',sr.commercial_warning_code,
    'commercial_acknowledgement',case when sr.commercial_warning_code is null then null
      else jsonb_build_object(
        'acknowledged_by_user_id',sr.commercial_acknowledged_by_user_id,
        'acknowledged_at',sr.commercial_acknowledged_at
      ) end
  ));
  update public.selection_requests set
    status='accepted',terminal_at=p_authoritative_now,response_by_user_id=p_acting_user_id
    where id=sr.id;
  update public.applications set
    stage='confirmed',last_updated_at=p_authoritative_now,stage_changed_at=p_authoritative_now,
    stage_changed_by_actor_type='user',stage_changed_by_user_id=p_acting_user_id,
    stage_reason_origin=null,stage_reason_code=null,stage_reason_payload=null
    where id=a.id;
  update public.gigs set opportunity_lifecycle='filled',application_intake='closed',
    operational_state='active' where id=g.id;
  insert into public.engagements(
    id,gig_id,application_id,selection_request_id,
    client_participant_user_id,freelancer_participant_user_id,status,
    accepted_application_version_id,accepted_gig_version_id,
    accepted_terms_contract_version,accepted_terms_snapshot,snapshot_schema_version,confirmed_at
  ) values(
    new_engagement_id,g.id,a.id,sr.id,g.client_id,freelancer_user_id,'confirmed',
    av.id,gv.id,p_snapshot_schema_version,accepted_snapshot,p_snapshot_schema_version,
    p_authoritative_now
  );
  perform private.close_pending_reconsideration_invitations(g.id,p_authoritative_now);
  for closed_application_id in
    update public.applications x set
      stage='not_selected',last_updated_at=p_authoritative_now,
      stage_changed_at=p_authoritative_now,stage_changed_by_actor_type='system',
      stage_changed_by_user_id=null,stage_reason_origin='selection_confirmed',
      stage_reason_code='another_applicant_selected',
      stage_reason_payload=jsonb_build_object('selection_request_id',sr.id)
    where x.gig_id=g.id and x.id<>a.id and x.stage in('under_review','advanced')
    returning x.id
  loop
    insert into public.marketplace_events(
      event_type,visibility,actor_type,gig_id,application_id,
      reason_origin,reason_code,event_payload,occurred_at
    ) values(
      'application_automatically_not_selected','participants','system',
      g.id,closed_application_id,'selection_confirmed','another_applicant_selected',
      jsonb_build_object('selection_request_id',sr.id),p_authoritative_now
    );
  end loop;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
    selection_request_id,engagement_id,event_payload,occurred_at
  ) values
  ('selection_accepted','participants','user',p_acting_user_id,g.id,a.id,sr.id,
    new_engagement_id,jsonb_build_object(
      'application_version_id',av.id,'material_gig_version_id',gv.id
    ),p_authoritative_now),
  ('engagement_created','participants','system',null,g.id,a.id,sr.id,
    new_engagement_id,jsonb_build_object(
      'status','confirmed','snapshot_schema_version',p_snapshot_schema_version,
      'lifecycle_version',1
    ),p_authoritative_now);
  return private.selection_request_result(sr.id,false);
end;
$$;

create or replace function public.selection_get_context(
  p_application_id uuid,p_acting_user_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  a public.applications%rowtype; g public.gigs%rowtype;
  av public.application_versions%rowtype; gv public.gig_versions%rowtype;
  latest_request public.selection_requests%rowtype;
  effective_request_id uuid; open_revision_id uuid; warning_code text;
  actor_role text; blockers text[]:=array[]::text[];
  authoritative_now timestamptz:=clock_timestamp();
begin
  select * into a from public.applications where id=p_application_id;
  if not found then raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND'; end if;
  select * into g from public.gigs where id=a.gig_id;
  select * into av from public.application_versions where id=a.current_version_id;
  select * into gv from public.gig_versions where id=g.current_material_gig_version_id;
  actor_role:=case when g.client_id=p_acting_user_id then 'client'
    when exists(select 1 from public.freelancer_profiles fp
      where fp.id=a.freelancer_profile_id and fp.user_id=p_acting_user_id)
      then 'freelancer' end;
  if actor_role is null then
    raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND';
  end if;
  select * into latest_request from public.selection_requests
    where application_id=a.id order by created_at desc,id desc limit 1;
  select sr.id into effective_request_id from public.selection_requests sr
    where sr.gig_id=g.id and sr.status='pending' and sr.expires_at>authoritative_now
    order by sr.id limit 1;
  select rr.id into open_revision_id from public.application_revision_requests rr
    where rr.application_id=a.id and rr.status='open' order by rr.id limit 1;
  warning_code:=private.selection_warning_code(av.proposal_snapshot,gv.terms_snapshot);
  if a.stage<>'advanced' then blockers:=array_append(blockers,'application_not_advanced'); end if;
  if g.opportunity_lifecycle='filled' then blockers:=array_append(blockers,'gig_already_filled');
  elsif g.opportunity_lifecycle<>'active' or g.operational_state<>'active' then
    blockers:=array_append(blockers,'selection_action_not_allowed'); end if;
  if av.gig_version_id<>g.current_material_gig_version_id then
    blockers:=array_append(blockers,'application_response_to_gig_required'); end if;
  if not private.selection_proposal_ready(av,gv) then
    blockers:=array_append(blockers,'proposal_not_selection_ready'); end if;
  if effective_request_id is not null then
    blockers:=array_append(blockers,'selection_request_already_active'); end if;
  if open_revision_id is not null then
    blockers:=array_append(blockers,'revision_request_blocks_selection'); end if;
  if exists(select 1 from public.engagements e where e.gig_id=g.id and e.status<>'cancelled') then
    blockers:=array_append(blockers,'engagement_already_exists'); end if;
  if latest_request.status='declined'
    and latest_request.decline_disposition='remain_interested'
    and latest_request.application_version_id=a.current_version_id
    and latest_request.gig_version_id=g.current_material_gig_version_id
    and latest_request.commercial_warning_code is not distinct from warning_code then
    blockers:=array_append(blockers,'unchanged_selection_resend_blocked');
  end if;
  if latest_request.status='revision_requested'
    and latest_request.application_version_id=a.current_version_id then
    blockers:=array_append(blockers,'unchanged_selection_resend_blocked');
  end if;
  return jsonb_build_object(
    'application_id',a.id,'gig_id',g.id,'viewer_role',actor_role,
    'application_stage',a.stage,'application_version_id',av.id,
    'application_version_number',av.version_number,
    'material_gig_version_id',gv.id,'material_gig_version_number',gv.version_number,
    'proposal',av.proposal_snapshot,'timeline',av.timeline_snapshot,
    'availability',av.availability_snapshot,'scope',av.scope_snapshot,
    'scope_notes',av.scope_notes,'client_terms',gv.terms_snapshot,
    'commercial_warning_code',warning_code,
    'commercial_acknowledgement_required',warning_code is not null,
    'can_send',actor_role='client' and cardinality(blockers)=0,
    'send_token',case when actor_role='client' then private.selection_send_token(
      g,a,effective_request_id,open_revision_id,warning_code) end,
    'blockers',to_jsonb(blockers),'active_request_id',effective_request_id,
    'latest_request_id',latest_request.id,'authoritative_now',authoritative_now
  );
end;
$$;

create or replace function public.selection_send_request(
  p_application_id uuid,p_acting_user_id uuid,p_duration_hours integer,
  p_expected_send_token text,p_request_id uuid,
  p_commercial_acknowledged boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  resolved_gig_id uuid; g public.gigs%rowtype; a public.applications%rowtype;
  av public.application_versions%rowtype; gv public.gig_versions%rowtype;
  pending_request public.selection_requests%rowtype;
  previous_request public.selection_requests%rowtype;
  open_revision_id uuid; effective_request_id uuid; warning_code text;
  current_token text; fingerprint text; replay jsonb; authoritative_now timestamptz;
  new_request_id uuid:=gen_random_uuid();
begin
  if p_application_id is null or p_acting_user_id is null or p_request_id is null
    or p_duration_hours not in(24,48,72)
    or btrim(coalesce(p_expected_send_token,''))=''
    or p_commercial_acknowledged is null then
    raise exception using errcode='22023',message='M7G_SELECTION_ACTION_NOT_ALLOWED';
  end if;
  select gig_id into resolved_gig_id from public.applications where id=p_application_id;
  if resolved_gig_id is null then
    raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND';
  end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  authoritative_now:=clock_timestamp();
  select * into pending_request from public.selection_requests
    where gig_id=g.id and status='pending' order by id limit 1 for update;
  if pending_request.id is not null then
    pending_request:=private.project_selection_request_expiry_locked(
      pending_request.id,authoritative_now);
  end if;
  select * into a from public.applications where id=p_application_id for update;
  if not found or a.gig_id<>g.id or g.client_id<>p_acting_user_id
    or not exists(select 1 from public.user_profiles up
      where up.id=p_acting_user_id and up.role='client') then
    raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND';
  end if;
  fingerprint:=private.selection_hash(array[
    'send',a.id::text,p_duration_hours::text,p_commercial_acknowledged::text
  ]);
  replay:=private.selection_operation_replay(p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  select * into av from public.application_versions where id=a.current_version_id;
  select * into gv from public.gig_versions where id=g.current_material_gig_version_id;
  select rr.id into open_revision_id from public.application_revision_requests rr
    where rr.application_id=a.id and rr.status='open' order by rr.id limit 1 for update;
  warning_code:=private.selection_warning_code(av.proposal_snapshot,gv.terms_snapshot);
  if pending_request.status='pending' and pending_request.expires_at>authoritative_now then
    effective_request_id:=pending_request.id; end if;
  current_token:=private.selection_send_token(
    g,a,effective_request_id,open_revision_id,warning_code);
  if current_token<>p_expected_send_token then
    raise exception using errcode='40001',message='M7G_STALE_SELECTION_ACTION'; end if;
  if effective_request_id is not null then
    raise exception using errcode='P0001',message='M7G_SELECTION_REQUEST_ALREADY_ACTIVE'; end if;
  if a.stage<>'advanced' then
    raise exception using errcode='P0001',message='M7G_APPLICATION_NOT_ADVANCED'; end if;
  if g.opportunity_lifecycle='filled' then
    raise exception using errcode='P0001',message='M7G_GIG_ALREADY_FILLED'; end if;
  if g.opportunity_lifecycle<>'active' or g.operational_state<>'active' then
    raise exception using errcode='P0001',message='M7G_SELECTION_ACTION_NOT_ALLOWED'; end if;
  if av.gig_version_id<>g.current_material_gig_version_id then
    raise exception using errcode='P0001',message='M7G_APPLICATION_RESPONSE_TO_GIG_REQUIRED'; end if;
  if not private.selection_proposal_ready(av,gv) then
    raise exception using errcode='P0001',message='M7G_PROPOSAL_NOT_SELECTION_READY'; end if;
  if open_revision_id is not null then
    raise exception using errcode='P0001',message='M7G_REVISION_REQUEST_BLOCKS_SELECTION'; end if;
  if warning_code is not null and not p_commercial_acknowledged then
    raise exception using errcode='P0001',message='M7G_COMMERCIAL_ACKNOWLEDGEMENT_REQUIRED'; end if;
  if warning_code is null and p_commercial_acknowledged then
    raise exception using errcode='22023',message='M7G_SELECTION_ACTION_NOT_ALLOWED'; end if;
  if exists(select 1 from public.engagements e where e.gig_id=g.id and e.status<>'cancelled') then
    raise exception using errcode='P0001',message='M7G_ENGAGEMENT_ALREADY_EXISTS'; end if;
  select * into previous_request from public.selection_requests
    where application_id=a.id order by created_at desc,id desc limit 1;
  if previous_request.id is not null
    and previous_request.application_version_id=a.current_version_id
    and previous_request.gig_version_id=g.current_material_gig_version_id
    and previous_request.commercial_warning_code is not distinct from warning_code then
    if previous_request.status='declined'
      and previous_request.decline_disposition='remain_interested' then
      raise exception using errcode='P0001',message='M7G_UNCHANGED_SELECTION_RESEND_BLOCKED';
    elsif previous_request.status='revision_requested' then
      raise exception using errcode='P0001',message='M7G_UNCHANGED_SELECTION_RESEND_BLOCKED';
    elsif previous_request.status='cancelled'
      and previous_request.cancellation_reason_code='gig_cancelled' then
      raise exception using errcode='P0001',message='M7G_UNCHANGED_SELECTION_RESEND_BLOCKED';
    end if;
  end if;
  insert into public.selection_requests(
    id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at,status,previous_selection_request_id,
    commercial_warning_code,commercial_acknowledged_by_user_id,commercial_acknowledged_at
  ) values(
    new_request_id,g.id,a.id,a.current_version_id,g.current_material_gig_version_id,
    p_acting_user_id,authoritative_now,
    authoritative_now+make_interval(hours=>p_duration_hours),'pending',previous_request.id,
    warning_code,case when warning_code is null then null else p_acting_user_id end,
    case when warning_code is null then null else authoritative_now end
  );
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
    selection_request_id,event_payload,occurred_at
  ) values(
    'selection_request_created','participants','user',p_acting_user_id,g.id,a.id,
    new_request_id,jsonb_build_object(
      'application_version_id',a.current_version_id,
      'material_gig_version_id',g.current_material_gig_version_id,
      'duration_hours',p_duration_hours,
      'expires_at',authoritative_now+make_interval(hours=>p_duration_hours),
      'previous_selection_request_id',previous_request.id
    ),authoritative_now
  );
  perform private.record_selection_operation(
    p_acting_user_id,p_request_id,'send',fingerprint,g.id,a.id,new_request_id,
    null,authoritative_now
  );
  return private.selection_request_result(new_request_id,false);
end;
$$;

-- Add invitation consequences to the existing locked mutation authorities
-- without changing their public signatures.
alter function public.manage_gig_edit(uuid,uuid,uuid,jsonb,boolean,text)
  rename to manage_gig_edit_pre_7h;
revoke all on function public.manage_gig_edit_pre_7h(
  uuid,uuid,uuid,jsonb,boolean,text
) from public,anon,authenticated,service_role;

create or replace function public.manage_gig_edit(
  p_gig_id uuid,p_acting_user_id uuid,p_expected_current_gig_version_id uuid,
  p_snapshot jsonb,p_confirm_material_effects boolean default false,
  p_preview_fingerprint text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; now_at timestamptz; invitation_row record;
begin
  result:=public.manage_gig_edit_pre_7h(
    p_gig_id,p_acting_user_id,p_expected_current_gig_version_id,p_snapshot,
    p_confirm_material_effects,p_preview_fingerprint
  );
  if result->>'code'='material_version_created' then
    now_at:=clock_timestamp();
    for invitation_row in
      select i.id,i.application_id,i.source_engagement_id
      from public.application_reconsideration_invitations i
      where i.gig_id=p_gig_id and i.status='pending'
      order by i.id for update
    loop
      update public.application_reconsideration_invitations
        set status='superseded',superseded_at=now_at where id=invitation_row.id;
      insert into public.marketplace_events(
        event_type,visibility,actor_type,gig_id,application_id,engagement_id,
        event_payload,occurred_at
      ) values(
        'reconsideration_invitation_cancelled','participants','system',p_gig_id,
        invitation_row.application_id,invitation_row.source_engagement_id,
        jsonb_build_object('invitation_id',invitation_row.id,
          'closure_reason','material_gig_version_changed'),now_at
      );
    end loop;
  end if;
  return result;
end;
$$;

alter function public.manage_gig_lifecycle(uuid,uuid,text,text,jsonb)
  rename to manage_gig_lifecycle_pre_7h;
revoke all on function public.manage_gig_lifecycle_pre_7h(
  uuid,uuid,text,text,jsonb
) from public,anon,authenticated,service_role;

create or replace function public.manage_gig_lifecycle(
  p_gig_id uuid,p_acting_user_id uuid,p_action text,
  p_reason_code text default null,p_detail jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; now_at timestamptz; invitation_row record;
begin
  result:=public.manage_gig_lifecycle_pre_7h(
    p_gig_id,p_acting_user_id,p_action,p_reason_code,p_detail
  );
  if p_action='cancel' then
    now_at:=clock_timestamp();
    for invitation_row in
      select i.id,i.application_id,i.source_engagement_id
      from public.application_reconsideration_invitations i
      where i.gig_id=p_gig_id and i.status='pending'
      order by i.id for update
    loop
      update public.application_reconsideration_invitations
        set status='closed_by_gig_state',closed_at=now_at where id=invitation_row.id;
      insert into public.marketplace_events(
        event_type,visibility,actor_type,gig_id,application_id,engagement_id,
        event_payload,occurred_at
      ) values(
        'reconsideration_invitation_cancelled','participants','system',p_gig_id,
        invitation_row.application_id,invitation_row.source_engagement_id,
        jsonb_build_object('invitation_id',invitation_row.id,
          'closure_reason','gig_cancelled'),now_at
      );
    end loop;
  end if;
  return result;
end;
$$;

alter function public.review_transition_application(
  uuid,uuid,text,text,integer,jsonb
) rename to review_transition_application_pre_7h;
revoke all on function public.review_transition_application_pre_7h(
  uuid,uuid,text,text,integer,jsonb
) from public,anon,authenticated,service_role;

create or replace function public.review_transition_application(
  p_application_id uuid,p_acting_user_id uuid,p_action text,
  p_expected_review_decision_action_token text,p_advancement_capacity integer,
  p_decision jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; invitation_row record; now_at timestamptz;
begin
  result:=public.review_transition_application_pre_7h(
    p_application_id,p_acting_user_id,p_action,
    p_expected_review_decision_action_token,p_advancement_capacity,p_decision
  );
  if p_action='reopen' then
    now_at:=clock_timestamp();
    for invitation_row in
      select i.id,i.gig_id,i.source_engagement_id
      from public.application_reconsideration_invitations i
      where i.application_id=p_application_id and i.status='pending'
      order by i.id for update
    loop
      update public.application_reconsideration_invitations
        set status='superseded',superseded_at=now_at where id=invitation_row.id;
      insert into public.marketplace_events(
        event_type,visibility,actor_type,gig_id,application_id,engagement_id,
        event_payload,occurred_at
      ) values(
        'reconsideration_invitation_cancelled','participants','system',
        invitation_row.gig_id,p_application_id,invitation_row.source_engagement_id,
        jsonb_build_object('invitation_id',invitation_row.id,
          'closure_reason','application_reopened_by_client'),now_at
      );
    end loop;
  end if;
  return result;
end;
$$;

-- Service-only mutation/read boundary.
revoke all on function public.manage_gig_edit(uuid,uuid,uuid,jsonb,boolean,text),
  public.manage_gig_lifecycle(uuid,uuid,text,text,jsonb),
  public.review_transition_application(uuid,uuid,text,text,integer,jsonb)
from public,anon,authenticated;
revoke all on function public.engagement_get(uuid,uuid),
  public.engagement_list(uuid),public.engagement_timeline(uuid,uuid),
  public.engagement_transition(uuid,uuid,text,text,uuid,text,text),
  public.engagement_reopen_gig(uuid,uuid,text,uuid),
  public.reconsideration_get_context(uuid,uuid),
  public.reconsideration_get_invitation(uuid,uuid),
  public.reconsideration_create_invitation(uuid,uuid,text,uuid,text,text),
  public.reconsideration_cancel_invitation(uuid,uuid,text,uuid),
  public.reconsideration_respond_invitation(uuid,uuid,text,text,uuid,jsonb)
from public,anon,authenticated;

grant execute on function public.engagement_get(uuid,uuid),
  public.engagement_list(uuid),public.engagement_timeline(uuid,uuid),
  public.engagement_transition(uuid,uuid,text,text,uuid,text,text),
  public.engagement_reopen_gig(uuid,uuid,text,uuid),
  public.reconsideration_get_context(uuid,uuid),
  public.reconsideration_get_invitation(uuid,uuid),
  public.reconsideration_create_invitation(uuid,uuid,text,uuid,text,text),
  public.reconsideration_cancel_invitation(uuid,uuid,text,uuid),
  public.reconsideration_respond_invitation(uuid,uuid,text,text,uuid,jsonb)
to service_role;
grant execute on function public.manage_gig_edit(uuid,uuid,uuid,jsonb,boolean,text),
  public.manage_gig_lifecycle(uuid,uuid,text,text,jsonb),
  public.review_transition_application(uuid,uuid,text,text,integer,jsonb)
to service_role;

comment on table private.engagement_operations is
'Immutable idempotency ledger for engagement lifecycle, reopening, and reconsideration mutations.';
comment on table public.engagement_reopenings is
'One-time failed-engagement reopening authority. Reopening preserves historical applications and versions.';
comment on table public.application_reconsideration_invitations is
'Consent-bound invitation aggregate for prior Not Selected or Withdrawn application histories.';

commit;
