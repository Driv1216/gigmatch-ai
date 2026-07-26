-- GigMatch AI Milestone 7G: exact-version selection requests and atomic confirmation.
-- Global order: gig -> selection request -> selected application -> remaining applications
-- by UUID -> application child state -> engagement -> events.

begin;

alter table public.selection_requests
  add column response_by_user_id uuid references public.user_profiles(id) on delete restrict,
  add column response_change_categories text[],
  add column response_detail text,
  add constraint selection_requests_response_categories_check check (
    response_change_categories is null
    or (
      cardinality(response_change_categories) between 1 and 6
      and response_change_categories <@ array[
        'scope','budget','payment_structure','timeline','availability','assumptions'
      ]::text[]
    )
  ),
  add constraint selection_requests_response_detail_check check (
    response_detail is null
    or (
      btrim(response_detail) <> ''
      and char_length(btrim(response_detail)) <= 800
      and btrim(response_detail) !~ '[[:cntrl:]]'
    )
  ),
  add constraint selection_requests_response_metadata_check check (
    (status in ('pending','expired','cancelled','invalidated')
      and response_by_user_id is null
      and response_change_categories is null
      and response_detail is null)
    or (status = 'accepted'
      and response_change_categories is null
      and response_detail is null)
    or (status = 'declined'
      and response_change_categories is null)
    or (status = 'revision_requested')
  );

create table private.selection_operations (
  actor_user_id uuid not null references public.user_profiles(id) on delete restrict,
  request_id uuid not null,
  operation_kind text not null check (operation_kind in (
    'send','cancel','accept','decline_remain_interested',
    'decline_withdraw','request_revised_terms'
  )),
  operation_fingerprint text not null check (btrim(operation_fingerprint) <> ''),
  gig_id uuid not null references public.gigs(id) on delete restrict,
  application_id uuid not null,
  selection_request_id uuid not null references public.selection_requests(id) on delete restrict,
  engagement_id uuid references public.engagements(id) on delete restrict,
  created_at timestamptz not null,
  primary key (actor_user_id, request_id),
  constraint selection_operations_application_gig_fk
    foreign key (application_id, gig_id)
    references public.applications(id, gig_id) on delete restrict
);

create index selection_operations_selection_request_idx
on private.selection_operations (selection_request_id);

alter table private.selection_operations enable row level security;
revoke all on private.selection_operations from public, anon, authenticated, service_role;

create or replace function private.reject_selection_operation_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Selection operation ledger rows are immutable';
end;
$$;

create trigger reject_selection_operation_mutation
before update or delete on private.selection_operations
for each row execute function private.reject_selection_operation_mutation();

create or replace function private.selection_hash(p_parts text[])
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select encode(extensions.digest(array_to_string(p_parts, '|', ''), 'sha256'), 'hex')
$$;

create or replace function private.selection_warning_code(
  p_proposal jsonb,
  p_gig_terms jsonb
)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  structure text := p_gig_terms ->> 'payment_structure';
  mode text := p_proposal ->> 'mode';
  proposed_max numeric;
  posted_min numeric;
  posted_max numeric;
  guidance jsonb := p_gig_terms #> '{client_payment,guidance}';
begin
  if structure = 'fixed_price' then
    posted_max := (p_gig_terms #>> '{client_payment,budget,maximum}')::numeric;
    proposed_max := case
      when mode = 'exact_total' then (p_proposal ->> 'exact_total')::numeric
      when mode = 'total_range' then (p_proposal #>> '{total_range,maximum}')::numeric
      else posted_max
    end;
    if proposed_max > posted_max then return 'above_posted_budget'; end if;
  elsif structure = 'hourly' then
    posted_min := (p_gig_terms #>> '{client_payment,hourly_rate,minimum}')::numeric;
    posted_max := (p_gig_terms #>> '{client_payment,hourly_rate,maximum}')::numeric;
    proposed_max := (p_proposal ->> 'requested_hourly_rate')::numeric;
    if proposed_max < posted_min or proposed_max > posted_max then
      return 'outside_posted_hourly_range';
    end if;
  elsif structure = 'open_to_proposals'
        and guidance ->> 'guidance_type' = 'maximum_budget_ceiling'
        and mode = 'proposed_hourly_rate' then
    return 'total_ceiling_not_calculable_for_hourly_proposal';
  end if;
  return null;
exception when others then
  return null;
end;
$$;

create or replace function private.selection_proposal_ready(
  p_version public.application_versions,
  p_gig_version public.gig_versions
)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  canonical jsonb;
  guidance jsonb;
  proposal_max numeric;
begin
  canonical := jsonb_strip_nulls(jsonb_build_object(
    'proposal_contract_version', p_version.proposal_contract_version,
    'snapshot_schema_version', p_version.snapshot_schema_version,
    'cover_note', p_version.cover_note,
    'proposal', p_version.proposal_snapshot,
    'timeline', p_version.timeline_snapshot,
    'availability', p_version.availability_snapshot,
    'scope', p_version.scope_snapshot,
    'scope_notes', p_version.scope_notes
  ));
  if not private.validate_application_snapshot(canonical, p_gig_version.terms_snapshot)
     or p_version.timeline_snapshot ->> 'mode' = 'requires_discussion'
     or (
       p_version.payment_structure = 'fixed_price'
       and p_version.proposal_snapshot ->> 'mode' = 'requires_scope_clarification'
     ) then
    return false;
  end if;
  guidance := p_gig_version.terms_snapshot #> '{client_payment,guidance}';
  if p_version.payment_structure = 'open_to_proposals'
     and guidance ->> 'guidance_type' = 'maximum_budget_ceiling'
     and p_version.proposal_snapshot ->> 'mode' <> 'proposed_hourly_rate' then
    proposal_max := case p_version.proposal_snapshot ->> 'mode'
      when 'estimated_fixed_price_range'
        then (p_version.proposal_snapshot #>> '{fixed_price_range,maximum}')::numeric
      when 'phased_estimate'
        then (select sum((item ->> 'amount')::numeric)
              from jsonb_array_elements(p_version.proposal_snapshot -> 'phases') item)
      when 'initial_discovery_phase'
        then (p_version.proposal_snapshot #>> '{discovery_phase,amount}')::numeric
    end;
    if proposal_max > (guidance ->> 'maximum')::numeric then return false; end if;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.selection_send_token(
  p_gig public.gigs,
  p_application public.applications,
  p_effective_request_id uuid,
  p_open_revision_id uuid,
  p_warning_code text
)
returns text
language sql
stable
set search_path = ''
as $$
  select private.selection_hash(array[
    'selection-send-v1',
    p_gig.id::text,
    p_application.id::text,
    p_application.stage,
    p_application.current_version_id::text,
    p_gig.current_material_gig_version_id::text,
    p_gig.opportunity_lifecycle,
    p_gig.operational_state,
    coalesce(p_effective_request_id::text, ''),
    coalesce(p_open_revision_id::text, ''),
    case when exists (
      select 1 from public.application_versions av
      where av.id = p_application.current_version_id
        and av.gig_version_id = p_gig.current_material_gig_version_id
    ) then 'current' else 'response_required' end,
    coalesce(p_warning_code, '')
  ])
$$;

create or replace function private.selection_management_token(
  p_request public.selection_requests,
  p_gig public.gigs,
  p_application public.applications
)
returns text
language sql
stable
set search_path = ''
as $$
  select private.selection_hash(array[
    'selection-management-v1',
    p_request.id::text,
    p_request.status,
    floor(extract(epoch from p_request.expires_at))::bigint::text,
    p_request.application_version_id::text,
    p_request.gig_version_id::text,
    p_application.current_version_id::text,
    p_application.stage,
    p_gig.current_material_gig_version_id::text,
    p_gig.opportunity_lifecycle,
    p_gig.operational_state,
    p_gig.client_id::text
  ])
$$;

create or replace function private.selection_response_token(
  p_request public.selection_requests,
  p_gig public.gigs,
  p_application public.applications,
  p_open_revision_id uuid,
  p_winner_application_id uuid,
  p_engagement_id uuid
)
returns text
language sql
stable
set search_path = ''
as $$
  select private.selection_hash(array[
    'selection-response-v1',
    p_request.id::text,
    p_request.status,
    floor(extract(epoch from p_request.expires_at))::bigint::text,
    p_request.application_version_id::text,
    p_application.current_version_id::text,
    p_request.gig_version_id::text,
    p_gig.current_material_gig_version_id::text,
    p_application.stage,
    p_gig.opportunity_lifecycle,
    p_gig.operational_state,
    coalesce(p_open_revision_id::text, ''),
    coalesce(p_winner_application_id::text, ''),
    coalesce(p_engagement_id::text, '')
  ])
$$;

create or replace function private.selection_request_result(
  p_request_id uuid,
  p_idempotent_replay boolean default false
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'code', case sr.status
      when 'accepted' then 'selection_request_accepted'
      when 'cancelled' then 'selection_request_cancelled'
      when 'declined' then 'selection_request_declined'
      when 'revision_requested' then 'selection_revision_requested'
      when 'expired' then 'selection_request_expired'
      else 'selection_request_created'
    end,
    'selection_request_id', sr.id,
    'gig_id', sr.gig_id,
    'application_id', sr.application_id,
    'status', sr.status,
    'decline_disposition', sr.decline_disposition,
    'expires_at', sr.expires_at,
    'terminal_at', sr.terminal_at,
    'engagement_id', e.id,
    'engagement_status', e.status,
    'idempotent_replay', p_idempotent_replay
  ))
  from public.selection_requests sr
  left join public.engagements e on e.selection_request_id = sr.id
  where sr.id = p_request_id
$$;

create or replace function private.project_selection_request_expiry_locked(
  p_selection_request_id uuid,
  p_authoritative_now timestamptz
)
returns public.selection_requests
language plpgsql
set search_path = ''
as $$
declare
  target public.selection_requests%rowtype;
begin
  select sr.* into target
  from public.selection_requests sr
  where sr.id = p_selection_request_id
  for update;
  if not found then return null; end if;
  if target.status = 'pending' and target.expires_at <= p_authoritative_now then
    update public.selection_requests
    set status = 'expired', terminal_at = p_authoritative_now
    where id = target.id and status = 'pending'
    returning * into target;
    if found then
      insert into public.marketplace_events (
        event_type, visibility, actor_type, gig_id, application_id,
        selection_request_id, event_payload, occurred_at
      ) values (
        'selection_request_expired', 'participants', 'system',
        target.gig_id, target.application_id, target.id,
        jsonb_build_object('expires_at', target.expires_at), p_authoritative_now
      );
    end if;
  end if;
  return target;
end;
$$;

create or replace function private.selection_operation_replay(
  p_actor_user_id uuid,
  p_request_id uuid,
  p_fingerprint text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  existing private.selection_operations%rowtype;
begin
  select * into existing
  from private.selection_operations
  where actor_user_id = p_actor_user_id and request_id = p_request_id;
  if not found then return null; end if;
  if existing.operation_fingerprint <> p_fingerprint then
    raise exception using errcode = '23505', message = 'M7G_IDEMPOTENCY_CONFLICT';
  end if;
  return private.selection_request_result(existing.selection_request_id, true);
end;
$$;

create or replace function private.record_selection_operation(
  p_actor_user_id uuid,
  p_request_id uuid,
  p_operation_kind text,
  p_fingerprint text,
  p_gig_id uuid,
  p_application_id uuid,
  p_selection_request_id uuid,
  p_engagement_id uuid,
  p_created_at timestamptz
)
returns void
language sql
set search_path = ''
as $$
  insert into private.selection_operations (
    actor_user_id, request_id, operation_kind, operation_fingerprint,
    gig_id, application_id, selection_request_id, engagement_id, created_at
  ) values (
    p_actor_user_id, p_request_id, p_operation_kind, p_fingerprint,
    p_gig_id, p_application_id, p_selection_request_id, p_engagement_id, p_created_at
  )
$$;

create or replace function public.selection_get_context(
  p_application_id uuid,
  p_acting_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.applications%rowtype;
  g public.gigs%rowtype;
  av public.application_versions%rowtype;
  gv public.gig_versions%rowtype;
  latest_request public.selection_requests%rowtype;
  effective_request_id uuid;
  open_revision_id uuid;
  warning_code text;
  actor_role text;
  blockers text[] := array[]::text[];
  authoritative_now timestamptz := clock_timestamp();
begin
  select * into a from public.applications where id = p_application_id;
  if not found then
    raise exception using errcode='P0002', message='M7G_SELECTION_REQUEST_NOT_FOUND';
  end if;
  select * into g from public.gigs where id = a.gig_id;
  select * into av from public.application_versions where id = a.current_version_id;
  select * into gv from public.gig_versions where id = g.current_material_gig_version_id;
  actor_role := case
    when g.client_id = p_acting_user_id then 'client'
    when exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = a.freelancer_profile_id and fp.user_id = p_acting_user_id
    ) then 'freelancer'
    else null
  end;
  if actor_role is null then
    raise exception using errcode='P0002', message='M7G_SELECTION_REQUEST_NOT_FOUND';
  end if;
  select * into latest_request
  from public.selection_requests
  where application_id = a.id
  order by created_at desc, id desc limit 1;
  select sr.id into effective_request_id
  from public.selection_requests sr
  where sr.gig_id = g.id and sr.status = 'pending' and sr.expires_at > authoritative_now
  order by sr.id limit 1;
  select rr.id into open_revision_id
  from public.application_revision_requests rr
  where rr.application_id = a.id and rr.status = 'open'
  order by rr.id limit 1;
  warning_code := private.selection_warning_code(av.proposal_snapshot, gv.terms_snapshot);

  if a.stage <> 'advanced' then blockers := array_append(blockers, 'application_not_advanced'); end if;
  if g.opportunity_lifecycle = 'filled' then blockers := array_append(blockers, 'gig_already_filled');
  elsif g.opportunity_lifecycle <> 'active' or g.operational_state <> 'active' then
    blockers := array_append(blockers, 'selection_action_not_allowed');
  end if;
  if av.gig_version_id <> g.current_material_gig_version_id then
    blockers := array_append(blockers, 'application_response_to_gig_required');
  end if;
  if not private.selection_proposal_ready(av, gv) then
    blockers := array_append(blockers, 'proposal_not_selection_ready');
  end if;
  if effective_request_id is not null then
    blockers := array_append(blockers, 'selection_request_already_active');
  end if;
  if open_revision_id is not null then
    blockers := array_append(blockers, 'revision_request_blocks_selection');
  end if;
  if exists (select 1 from public.applications x where x.gig_id=g.id and x.stage='confirmed')
     or exists (select 1 from public.engagements e where e.gig_id=g.id and e.status<>'cancelled') then
    blockers := array_append(blockers, 'engagement_already_exists');
  end if;
  if latest_request.status = 'declined'
     and latest_request.decline_disposition = 'remain_interested'
     and latest_request.application_version_id = a.current_version_id
     and latest_request.gig_version_id = g.current_material_gig_version_id
     and latest_request.commercial_warning_code is not distinct from warning_code then
    blockers := array_append(blockers, 'unchanged_selection_resend_blocked');
  end if;
  if latest_request.status = 'revision_requested'
     and latest_request.application_version_id = a.current_version_id then
    blockers := array_append(blockers, 'unchanged_selection_resend_blocked');
  end if;

  return jsonb_build_object(
    'application_id', a.id,
    'gig_id', g.id,
    'viewer_role', actor_role,
    'application_stage', a.stage,
    'application_version_id', av.id,
    'application_version_number', av.version_number,
    'material_gig_version_id', gv.id,
    'material_gig_version_number', gv.version_number,
    'proposal', av.proposal_snapshot,
    'timeline', av.timeline_snapshot,
    'availability', av.availability_snapshot,
    'scope', av.scope_snapshot,
    'scope_notes', av.scope_notes,
    'client_terms', gv.terms_snapshot,
    'commercial_warning_code', warning_code,
    'commercial_acknowledgement_required', warning_code is not null,
    'can_send', actor_role = 'client' and cardinality(blockers) = 0,
    'send_token', case when actor_role='client' then private.selection_send_token(
      g, a, effective_request_id, open_revision_id, warning_code
    ) else null end,
    'blockers', to_jsonb(blockers),
    'active_request_id', effective_request_id,
    'latest_request_id', latest_request.id,
    'authoritative_now', authoritative_now
  );
end;
$$;

create or replace function public.selection_get_request(
  p_selection_request_id uuid,
  p_acting_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  sr public.selection_requests%rowtype;
  a public.applications%rowtype;
  g public.gigs%rowtype;
  av public.application_versions%rowtype;
  gv public.gig_versions%rowtype;
  e public.engagements%rowtype;
  actor_role text;
  open_revision_id uuid;
  winner_application_id uuid;
  authoritative_now timestamptz := clock_timestamp();
  derived_status text;
begin
  select * into sr from public.selection_requests where id=p_selection_request_id;
  if not found then raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND'; end if;
  select * into a from public.applications where id=sr.application_id;
  select * into g from public.gigs where id=sr.gig_id;
  actor_role := case
    when g.client_id=p_acting_user_id then 'client'
    when exists(select 1 from public.freelancer_profiles fp
      where fp.id=a.freelancer_profile_id and fp.user_id=p_acting_user_id) then 'freelancer'
    else null
  end;
  if actor_role is null then raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND'; end if;
  select * into av from public.application_versions where id=sr.application_version_id;
  select * into gv from public.gig_versions where id=sr.gig_version_id;
  select * into e from public.engagements where selection_request_id=sr.id;
  select rr.id into open_revision_id from public.application_revision_requests rr
    where rr.application_id=a.id and rr.status='open' order by rr.id limit 1;
  select x.id into winner_application_id from public.applications x
    where x.gig_id=g.id and x.stage='confirmed' order by x.id limit 1;
  derived_status := case when sr.status='pending' and sr.expires_at<=authoritative_now
    then 'expired' else sr.status end;
  return jsonb_strip_nulls(jsonb_build_object(
    'selection_request_id',sr.id,'gig_id',sr.gig_id,'application_id',sr.application_id,
    'viewer_role',actor_role,'status',derived_status,'stored_status',sr.status,
    'created_at',sr.created_at,'expires_at',sr.expires_at,'terminal_at',sr.terminal_at,
    'application_version_id',sr.application_version_id,
    'application_version_number',av.version_number,
    'material_gig_version_id',sr.gig_version_id,
    'material_gig_version_number',gv.version_number,
    'proposal',av.proposal_snapshot,'timeline',av.timeline_snapshot,
    'availability',av.availability_snapshot,'scope',av.scope_snapshot,
    'scope_notes',av.scope_notes,'client_terms',gv.terms_snapshot,
    'commercial_warning_code',sr.commercial_warning_code,
    'commercial_acknowledged_at',sr.commercial_acknowledged_at,
    'decline_disposition',sr.decline_disposition,
    'cancellation_reason_code',sr.cancellation_reason_code,
    'cancellation_detail',sr.cancellation_detail,
    'response_change_categories',sr.response_change_categories,
    'response_detail',sr.response_detail,
    'previous_selection_request_id',sr.previous_selection_request_id,
    'management_token',case when actor_role='client' then
      private.selection_management_token(sr,g,a) else null end,
    'response_token',case when actor_role='freelancer' then
      private.selection_response_token(sr,g,a,open_revision_id,winner_application_id,e.id)
      else null end,
    'engagement',case when e.id is null then null else jsonb_build_object(
      'engagement_id',e.id,'status',e.status,'confirmed_at',e.confirmed_at
    ) end,
    'authoritative_now',authoritative_now
  ));
end;
$$;

create or replace function public.selection_list_requests(
  p_application_id uuid,
  p_acting_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.applications%rowtype;
  g public.gigs%rowtype;
  allowed boolean;
  items jsonb;
  authoritative_now timestamptz := clock_timestamp();
begin
  select * into a from public.applications where id=p_application_id;
  if not found then raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND'; end if;
  select * into g from public.gigs where id=a.gig_id;
  allowed := g.client_id=p_acting_user_id or exists(
    select 1 from public.freelancer_profiles fp
    where fp.id=a.freelancer_profile_id and fp.user_id=p_acting_user_id
  );
  if not allowed then raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND'; end if;
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'selection_request_id',sr.id,
    'status',case when sr.status='pending' and sr.expires_at<=authoritative_now then 'expired' else sr.status end,
    'created_at',sr.created_at,'expires_at',sr.expires_at,'terminal_at',sr.terminal_at,
    'application_version_id',sr.application_version_id,'material_gig_version_id',sr.gig_version_id,
    'decline_disposition',sr.decline_disposition,
    'cancellation_reason_code',sr.cancellation_reason_code,
    'previous_selection_request_id',sr.previous_selection_request_id
  )) order by sr.created_at desc,sr.id desc),'[]'::jsonb) into items
  from public.selection_requests sr where sr.application_id=a.id;
  return jsonb_build_object('application_id',a.id,'items',items,'authoritative_now',authoritative_now);
end;
$$;

create or replace function public.selection_send_request(
  p_application_id uuid,
  p_acting_user_id uuid,
  p_duration_hours integer,
  p_expected_send_token text,
  p_request_id uuid,
  p_commercial_acknowledged boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_gig_id uuid;
  g public.gigs%rowtype;
  a public.applications%rowtype;
  av public.application_versions%rowtype;
  gv public.gig_versions%rowtype;
  pending_request public.selection_requests%rowtype;
  previous_request public.selection_requests%rowtype;
  open_revision_id uuid;
  effective_request_id uuid;
  warning_code text;
  current_token text;
  fingerprint text;
  replay jsonb;
  authoritative_now timestamptz;
  new_request_id uuid := gen_random_uuid();
begin
  if p_application_id is null or p_acting_user_id is null or p_request_id is null
     or p_duration_hours not in (24,48,72)
     or btrim(coalesce(p_expected_send_token,''))=''
     or p_commercial_acknowledged is null then
    raise exception using errcode='22023',message='M7G_SELECTION_ACTION_NOT_ALLOWED';
  end if;
  select gig_id into resolved_gig_id from public.applications where id=p_application_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  authoritative_now:=clock_timestamp();
  select * into pending_request from public.selection_requests
    where gig_id=g.id and status='pending' order by id limit 1 for update;
  if pending_request.id is not null then
    pending_request:=private.project_selection_request_expiry_locked(pending_request.id,authoritative_now);
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
    effective_request_id:=pending_request.id;
  end if;
  current_token:=private.selection_send_token(
    g,a,effective_request_id,open_revision_id,warning_code
  );
  if current_token<>p_expected_send_token then
    raise exception using errcode='40001',message='M7G_STALE_SELECTION_ACTION';
  end if;
  if effective_request_id is not null then
    raise exception using errcode='P0001',message='M7G_SELECTION_REQUEST_ALREADY_ACTIVE';
  end if;
  if a.stage<>'advanced' then
    raise exception using errcode='P0001',message='M7G_APPLICATION_NOT_ADVANCED';
  end if;
  if g.opportunity_lifecycle='filled' then
    raise exception using errcode='P0001',message='M7G_GIG_ALREADY_FILLED';
  end if;
  if g.opportunity_lifecycle<>'active' or g.operational_state<>'active' then
    raise exception using errcode='P0001',message='M7G_SELECTION_ACTION_NOT_ALLOWED';
  end if;
  if av.gig_version_id<>g.current_material_gig_version_id then
    raise exception using errcode='P0001',message='M7G_APPLICATION_RESPONSE_TO_GIG_REQUIRED';
  end if;
  if not private.selection_proposal_ready(av,gv) then
    raise exception using errcode='P0001',message='M7G_PROPOSAL_NOT_SELECTION_READY';
  end if;
  if open_revision_id is not null then
    raise exception using errcode='P0001',message='M7G_REVISION_REQUEST_BLOCKS_SELECTION';
  end if;
  if warning_code is not null and not p_commercial_acknowledged then
    raise exception using errcode='P0001',message='M7G_COMMERCIAL_ACKNOWLEDGEMENT_REQUIRED';
  end if;
  if warning_code is null and p_commercial_acknowledged then
    raise exception using errcode='22023',message='M7G_SELECTION_ACTION_NOT_ALLOWED';
  end if;
  if exists(select 1 from public.applications x where x.gig_id=g.id and x.stage='confirmed') then
    raise exception using errcode='P0001',message='M7G_GIG_ALREADY_FILLED';
  end if;
  if exists(select 1 from public.engagements e where e.gig_id=g.id and e.status<>'cancelled') then
    raise exception using errcode='P0001',message='M7G_ENGAGEMENT_ALREADY_EXISTS';
  end if;
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
  ) values (
    new_request_id,g.id,a.id,a.current_version_id,g.current_material_gig_version_id,
    p_acting_user_id,authoritative_now,
    authoritative_now+make_interval(hours=>p_duration_hours),'pending',previous_request.id,
    warning_code,case when warning_code is null then null else p_acting_user_id end,
    case when warning_code is null then null else authoritative_now end
  );
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
    selection_request_id,event_payload,occurred_at
  ) values (
    'selection_request_created','participants','user',p_acting_user_id,g.id,a.id,
    new_request_id,jsonb_build_object(
      'application_version_id',a.current_version_id,
      'material_gig_version_id',g.current_material_gig_version_id,
      'duration_hours',p_duration_hours,'expires_at',
      authoritative_now+make_interval(hours=>p_duration_hours),
      'previous_selection_request_id',previous_request.id
    ),authoritative_now
  );
  perform private.record_selection_operation(
    p_acting_user_id,p_request_id,'send',fingerprint,g.id,a.id,new_request_id,null,authoritative_now
  );
  return private.selection_request_result(new_request_id,false);
end;
$$;

create or replace function public.selection_cancel_request(
  p_selection_request_id uuid,
  p_acting_user_id uuid,
  p_expected_management_token text,
  p_request_id uuid,
  p_reason_code text,
  p_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_gig_id uuid;
  g public.gigs%rowtype;
  sr public.selection_requests%rowtype;
  a public.applications%rowtype;
  authoritative_now timestamptz;
  fingerprint text;
  replay jsonb;
begin
  if p_selection_request_id is null or p_acting_user_id is null or p_request_id is null
     or btrim(coalesce(p_expected_management_token,''))=''
     or p_reason_code not in (
       'terms_require_review','gig_being_paused','client_withdrew_request','other'
     )
     or (p_reason_code='other' and (
       btrim(coalesce(p_detail,''))='' or char_length(btrim(p_detail))>800
     ))
     or (p_detail is not null and (
       btrim(p_detail)='' or char_length(btrim(p_detail))>800 or btrim(p_detail)~'[[:cntrl:]]'
     )) then
    raise exception using errcode='22023',message='M7G_SELECTION_ACTION_NOT_ALLOWED';
  end if;
  select gig_id into resolved_gig_id from public.selection_requests where id=p_selection_request_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  authoritative_now:=clock_timestamp();
  sr:=private.project_selection_request_expiry_locked(p_selection_request_id,authoritative_now);
  select * into a from public.applications where id=sr.application_id for update;
  if g.client_id<>p_acting_user_id or sr.gig_id<>g.id
     or not exists(select 1 from public.user_profiles up
       where up.id=p_acting_user_id and up.role='client') then
    raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND';
  end if;
  fingerprint:=private.selection_hash(array[
    'cancel',sr.id::text,p_reason_code,coalesce(btrim(p_detail),'')
  ]);
  replay:=private.selection_operation_replay(p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  if sr.status='expired' then return private.selection_request_result(sr.id,false); end if;
  if sr.status<>'pending' then raise exception using errcode='P0001',message='M7G_SELECTION_REQUEST_NOT_PENDING'; end if;
  if private.selection_management_token(sr,g,a)<>p_expected_management_token then
    raise exception using errcode='40001',message='M7G_STALE_SELECTION_MANAGEMENT';
  end if;
  update public.selection_requests set
    status='cancelled',terminal_at=authoritative_now,
    cancellation_reason_code=p_reason_code,
    cancellation_detail=jsonb_strip_nulls(jsonb_build_object(
      'explanation',nullif(btrim(coalesce(p_detail,'')),'')
    ))
  where id=sr.id;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
    selection_request_id,reason_origin,reason_code,event_payload,occurred_at
  ) values (
    'selection_request_cancelled','participants','user',p_acting_user_id,
    g.id,a.id,sr.id,'selection_request_cancellation',p_reason_code,
    jsonb_strip_nulls(jsonb_build_object('detail',nullif(btrim(coalesce(p_detail,'')),''))),
    authoritative_now
  );
  perform private.record_selection_operation(
    p_acting_user_id,p_request_id,'cancel',fingerprint,g.id,a.id,sr.id,null,authoritative_now
  );
  return private.selection_request_result(sr.id,false);
end;
$$;

create or replace function private.confirm_selection_request_core(
  p_selection_request_id uuid,
  p_acting_user_id uuid,
  p_authoritative_now timestamptz,
  p_snapshot_schema_version integer
)
returns jsonb
language plpgsql
set search_path = ''
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
  select gig_id into resolved_gig_id from public.selection_requests where id=p_selection_request_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  select * into sr from public.selection_requests where id=p_selection_request_id for update;
  if sr.gig_id<>g.id then raise exception 'Selection request gig changed while acquiring locks'; end if;
  if sr.status<>'pending' then raise exception using errcode='P0001',message='M7G_SELECTION_REQUEST_NOT_PENDING'; end if;
  if sr.expires_at<=p_authoritative_now then raise exception using errcode='P0001',message='M7G_SELECTION_REQUEST_EXPIRED'; end if;
  select * into a from public.applications where id=sr.application_id for update;
  if a.gig_id<>g.id then raise exception 'Selected application does not belong to request gig'; end if;
  if a.stage<>'advanced' then raise exception using errcode='P0001',message='M7G_APPLICATION_NOT_ADVANCED'; end if;
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
  if g.opportunity_lifecycle='filled' then raise exception using errcode='P0001',message='M7G_GIG_ALREADY_FILLED'; end if;
  if g.opportunity_lifecycle<>'active' or g.operational_state<>'active' then
    raise exception using errcode='P0001',message='M7G_SELECTION_RESPONSE_NOT_ALLOWED';
  end if;
  if exists(select 1 from public.applications x where x.gig_id=g.id and x.stage='confirmed') then
    raise exception using errcode='P0001',message='M7G_GIG_ALREADY_FILLED';
  end if;
  if exists(select 1 from public.engagements e where e.gig_id=g.id and e.status<>'cancelled') then
    raise exception using errcode='P0001',message='M7G_ENGAGEMENT_ALREADY_EXISTS';
  end if;

  perform x.id from public.applications x
  where x.gig_id=g.id and x.id<>a.id and x.stage in ('under_review','advanced')
  order by x.id for update;

  accepted_snapshot:=jsonb_strip_nulls(jsonb_build_object(
    'accepted_terms_contract_version',p_snapshot_schema_version,
    'snapshot_schema_version',p_snapshot_schema_version,
    'captured_at',p_authoritative_now,
    'gig_id',case when p_snapshot_schema_version>=2 then g.id else null end,
    'application_id',case when p_snapshot_schema_version>=2 then a.id else null end,
    'selection_request_id',case when p_snapshot_schema_version>=2 then sr.id else null end,
    'client_participant_user_id',case when p_snapshot_schema_version>=2 then g.client_id else null end,
    'freelancer_participant_user_id',case when p_snapshot_schema_version>=2 then freelancer_user_id else null end,
    'application_version_id',av.id,
    'material_gig_version_id',gv.id,
    'gig_terms_contract_version',gv.terms_contract_version,
    'proposal_contract_version',av.proposal_contract_version,
    'gig_snapshot_schema_version',gv.snapshot_schema_version,
    'proposal_snapshot_schema_version',av.snapshot_schema_version,
    'client_payment_terms',gv.terms_snapshot->'client_payment',
    'freelancer_proposal',av.proposal_snapshot,
    'timeline',av.timeline_snapshot,
    'availability',av.availability_snapshot,
    'scope',av.scope_snapshot,
    'scope_notes',case when p_snapshot_schema_version>=2 then av.scope_notes else null end,
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
  ) values (
    new_engagement_id,g.id,a.id,sr.id,g.client_id,freelancer_user_id,'confirmed',
    av.id,gv.id,p_snapshot_schema_version,accepted_snapshot,p_snapshot_schema_version,p_authoritative_now
  );
  for closed_application_id in
    update public.applications x set
      stage='not_selected',last_updated_at=p_authoritative_now,stage_changed_at=p_authoritative_now,
      stage_changed_by_actor_type='system',stage_changed_by_user_id=null,
      stage_reason_origin='selection_confirmed',stage_reason_code='another_applicant_selected',
      stage_reason_payload=jsonb_build_object('selection_request_id',sr.id)
    where x.gig_id=g.id and x.id<>a.id and x.stage in ('under_review','advanced')
    returning x.id
  loop
    insert into public.marketplace_events(
      event_type,visibility,actor_type,gig_id,application_id,
      reason_origin,reason_code,event_payload,occurred_at
    ) values (
      'application_automatically_not_selected','participants','system',
      g.id,closed_application_id,'selection_confirmed','another_applicant_selected',
      jsonb_build_object('selection_request_id',sr.id),p_authoritative_now
    );
  end loop;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
    selection_request_id,engagement_id,event_payload,occurred_at
  ) values
  ('selection_accepted','participants','user',p_acting_user_id,g.id,a.id,sr.id,new_engagement_id,
    jsonb_build_object('application_version_id',av.id,'material_gig_version_id',gv.id),
    p_authoritative_now),
  ('engagement_created','participants','system',null,g.id,a.id,sr.id,new_engagement_id,
    jsonb_build_object('status','confirmed','snapshot_schema_version',p_snapshot_schema_version),
    p_authoritative_now);
  return private.selection_request_result(sr.id,false);
end;
$$;

create or replace function public.selection_respond_request(
  p_selection_request_id uuid,
  p_acting_user_id uuid,
  p_action text,
  p_expected_response_token text,
  p_request_id uuid,
  p_exact_terms_confirmed boolean default false,
  p_withdrawal_reason_code text default null,
  p_reason_detail text default null,
  p_change_categories text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_gig_id uuid;
  g public.gigs%rowtype;
  sr public.selection_requests%rowtype;
  a public.applications%rowtype;
  freelancer_user_id uuid;
  open_revision_id uuid;
  winner_application_id uuid;
  existing_engagement_id uuid;
  authoritative_now timestamptz;
  fingerprint text;
  replay jsonb;
  operation_kind text;
  result jsonb;
  created_engagement_id uuid;
  withdrawal_detail jsonb;
begin
  if p_selection_request_id is null or p_acting_user_id is null or p_request_id is null
     or btrim(coalesce(p_expected_response_token,''))=''
     or p_action not in ('accept','decline_remain_interested','decline_withdraw','request_revised_terms') then
    raise exception using errcode='22023',message='M7G_SELECTION_RESPONSE_NOT_ALLOWED';
  end if;
  if p_reason_detail is not null and (
    btrim(p_reason_detail)='' or char_length(btrim(p_reason_detail))>800
    or btrim(p_reason_detail)~'[[:cntrl:]]'
  ) then raise exception using errcode='22023',message='M7G_INVALID_SELECTION_DECLINE'; end if;
  if p_action='accept' and not p_exact_terms_confirmed then
    raise exception using errcode='22023',message='M7G_SELECTION_RESPONSE_NOT_ALLOWED';
  end if;
  if p_action='decline_withdraw' and (
    p_withdrawal_reason_code not in (
      'accepted_another_opportunity','no_longer_available','scope_or_terms_no_longer_fit',
      'timeline_changed','budget_expectations_mismatch','gig_changed_materially',
      'personal_circumstances','other'
    ) or (p_withdrawal_reason_code='other' and btrim(coalesce(p_reason_detail,''))='')
  ) then raise exception using errcode='22023',message='M7G_INVALID_SELECTION_DECLINE'; end if;
  if p_action='request_revised_terms' and (
    p_change_categories is null or cardinality(p_change_categories) not between 1 and 6
    or not p_change_categories <@ array[
      'scope','budget','payment_structure','timeline','availability','assumptions'
    ]::text[]
  ) then raise exception using errcode='22023',message='M7G_INVALID_SELECTION_REVISION_REQUEST'; end if;

  select gig_id into resolved_gig_id from public.selection_requests where id=p_selection_request_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  authoritative_now:=clock_timestamp();
  sr:=private.project_selection_request_expiry_locked(p_selection_request_id,authoritative_now);
  select * into a from public.applications where id=sr.application_id for update;
  select fp.user_id into freelancer_user_id from public.freelancer_profiles fp
    where fp.id=a.freelancer_profile_id;
  if freelancer_user_id<>p_acting_user_id or sr.gig_id<>g.id then
    raise exception using errcode='P0002',message='M7G_SELECTION_REQUEST_NOT_FOUND';
  end if;
  operation_kind:=p_action;
  fingerprint:=private.selection_hash(array[
    p_action,sr.id::text,p_exact_terms_confirmed::text,
    coalesce(p_withdrawal_reason_code,''),coalesce(btrim(p_reason_detail),''),
    coalesce(array_to_string(p_change_categories,','),'')
  ]);
  replay:=private.selection_operation_replay(p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  if sr.status='expired' then return private.selection_request_result(sr.id,false); end if;
  if sr.status<>'pending' then
    raise exception using errcode='P0001',message='M7G_SELECTION_RESPONSE_ALREADY_RESOLVED',
      detail=private.selection_request_result(sr.id,false)::text;
  end if;
  select rr.id into open_revision_id from public.application_revision_requests rr
    where rr.application_id=a.id and rr.status='open' order by rr.id limit 1 for update;
  select x.id into winner_application_id from public.applications x
    where x.gig_id=g.id and x.stage='confirmed' order by x.id limit 1;
  select e.id into existing_engagement_id from public.engagements e
    where e.gig_id=g.id and e.status<>'cancelled' order by e.id limit 1 for update;
  if private.selection_response_token(
      sr,g,a,open_revision_id,winner_application_id,existing_engagement_id
    )<>p_expected_response_token then
    raise exception using errcode='40001',message='M7G_STALE_SELECTION_RESPONSE';
  end if;
  if g.opportunity_lifecycle<>'active' or g.operational_state<>'active'
     or a.stage<>'advanced' then
    raise exception using errcode='P0001',message='M7G_SELECTION_RESPONSE_NOT_ALLOWED';
  end if;
  if a.current_version_id<>sr.application_version_id
     or g.current_material_gig_version_id<>sr.gig_version_id then
    raise exception using errcode='P0001',message='M7G_SELECTION_TERMS_CHANGED';
  end if;

  if p_action='accept' then
    result:=private.confirm_selection_request_core(sr.id,p_acting_user_id,authoritative_now,2);
    select e.id into created_engagement_id from public.engagements e where e.selection_request_id=sr.id;
  elsif p_action='decline_remain_interested' then
    update public.selection_requests set
      status='declined',terminal_at=authoritative_now,
      decline_disposition='remain_interested',response_by_user_id=p_acting_user_id,
      response_detail=nullif(btrim(coalesce(p_reason_detail,'')),'')
    where id=sr.id;
    insert into public.marketplace_events(
      event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
      selection_request_id,event_payload,occurred_at
    ) values (
      'selection_request_declined','participants','user',p_acting_user_id,g.id,a.id,sr.id,
      jsonb_build_object('disposition','remain_interested'),authoritative_now
    );
    result:=private.selection_request_result(sr.id,false);
  elsif p_action='decline_withdraw' then
    withdrawal_detail:=jsonb_strip_nulls(jsonb_build_object(
      'explanation',nullif(btrim(coalesce(p_reason_detail,'')),''),
      'after_material_gig_change',false
    ));
    update public.selection_requests set
      status='declined',terminal_at=authoritative_now,
      decline_disposition='withdraw_completely',response_by_user_id=p_acting_user_id,
      response_detail=nullif(btrim(coalesce(p_reason_detail,'')),'')
    where id=sr.id;
    update public.applications set
      stage='withdrawn',last_updated_at=authoritative_now,stage_changed_at=authoritative_now,
      stage_changed_by_actor_type='user',stage_changed_by_user_id=p_acting_user_id,
      stage_reason_origin='freelancer_withdrawal',stage_reason_code=p_withdrawal_reason_code,
      stage_reason_payload=withdrawal_detail
    where id=a.id;
    insert into public.marketplace_events(
      event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
      selection_request_id,reason_origin,reason_code,event_payload,occurred_at
    ) values (
      'selection_request_declined_and_withdrawn','participants','user',p_acting_user_id,
      g.id,a.id,sr.id,'freelancer_withdrawal',p_withdrawal_reason_code,
      jsonb_build_object('disposition','withdraw_completely'),authoritative_now
    );
    result:=private.selection_request_result(sr.id,false);
  else
    update public.selection_requests set
      status='revision_requested',terminal_at=authoritative_now,
      response_by_user_id=p_acting_user_id,
      response_change_categories=(select array_agg(distinct value order by value)
        from unnest(p_change_categories) value),
      response_detail=nullif(btrim(coalesce(p_reason_detail,'')),'')
    where id=sr.id;
    insert into public.marketplace_events(
      event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
      selection_request_id,event_payload,occurred_at
    ) values (
      'selection_revision_requested','participants','user',p_acting_user_id,g.id,a.id,sr.id,
      jsonb_strip_nulls(jsonb_build_object(
        'change_categories',to_jsonb(p_change_categories),
        'detail',nullif(btrim(coalesce(p_reason_detail,'')),'')
      )),authoritative_now
    );
    result:=private.selection_request_result(sr.id,false);
  end if;
  perform private.record_selection_operation(
    p_acting_user_id,p_request_id,operation_kind,fingerprint,g.id,a.id,sr.id,
    created_engagement_id,authoritative_now
  );
  return result;
end;
$$;

-- Preserve the verified 7B entry point while delegating to the same confirmation core.
create or replace function public.confirm_selection_request(
  p_selection_request_id uuid,
  p_acting_user_id uuid
)
returns table (
  selection_request_id uuid,
  engagement_id uuid,
  gig_id uuid,
  application_id uuid,
  request_status text,
  application_stage text,
  gig_status text,
  engagement_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_gig_id uuid;
  sr public.selection_requests%rowtype;
  authoritative_now timestamptz;
  result jsonb;
begin
  if p_selection_request_id is null or p_acting_user_id is null then
    raise exception using errcode='22004',message='Selection request id and acting user id are required';
  end if;
  select x.gig_id into resolved_gig_id from public.selection_requests x
    where x.id=p_selection_request_id;
  if resolved_gig_id is null then
    raise exception using errcode='P0002',message='Selection request not found';
  end if;
  perform 1 from public.gigs where id=resolved_gig_id for update;
  authoritative_now:=clock_timestamp();
  sr:=private.project_selection_request_expiry_locked(p_selection_request_id,authoritative_now);
  if sr.status='expired' then
    raise exception using errcode='P0001',message='Selection request has expired';
  end if;
  result:=private.confirm_selection_request_core(
    p_selection_request_id,p_acting_user_id,authoritative_now,1
  );
  return query select
    (result->>'selection_request_id')::uuid,
    (result->>'engagement_id')::uuid,
    (result->>'gig_id')::uuid,
    (result->>'application_id')::uuid,
    'accepted'::text,'confirmed'::text,'filled'::text,'confirmed'::text;
end;
$$;

-- Add canonical expiry projection to the existing gig lifecycle authority.
create or replace function public.manage_gig_lifecycle(
  p_gig_id uuid,
  p_acting_user_id uuid,
  p_action text,
  p_reason_code text default null,
  p_detail jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.gigs%rowtype;
  current_snapshot jsonb;
  request_row public.selection_requests%rowtype;
  closed_count integer:=0;
  request_affected boolean:=false;
  authoritative_now timestamptz;
begin
  select * into g from public.gigs where id=p_gig_id for update;
  if not found or g.client_id<>p_acting_user_id then
    raise exception using errcode='42501',message='M7CB_NOT_GIG_OWNER';
  end if;
  if g.opportunity_lifecycle<>'active' then
    raise exception using errcode='P0001',message='M7CB_INVALID_GIG_TRANSITION';
  end if;
  authoritative_now:=clock_timestamp();
  select terms_snapshot into current_snapshot from public.gig_versions
    where id=g.current_gig_version_id;
  if p_action='close_intake' then
    if g.application_intake<>'accepting'
       or p_reason_code not in (
         'sufficient_applications_received','moving_to_applicant_review',
         'hiring_timeline_changed','requirements_under_revision','other'
       )
       or (p_reason_code='other' and btrim(coalesce(p_detail->>'explanation',''))='') then
      raise exception using errcode='22023',message='M7CB_INVALID_INTAKE_CLOSURE';
    end if;
    perform private.apply_gig_snapshot_projection(
      g.id,current_snapshot,g.current_gig_version_id,g.current_material_gig_version_id,
      'active','closed',g.operational_state
    );
  elsif p_action='reopen_intake' then
    if g.application_intake<>'closed' then
      raise exception using errcode='P0001',message='M7CB_INVALID_GIG_TRANSITION';
    end if;
    if (current_snapshot->>'application_deadline')::timestamptz<=authoritative_now then
      raise exception using errcode='P0001',message='M7CB_FUTURE_DEADLINE_REQUIRED';
    end if;
    perform private.apply_gig_snapshot_projection(
      g.id,current_snapshot,g.current_gig_version_id,g.current_material_gig_version_id,
      'active','accepting',g.operational_state
    );
  elsif p_action='pause' then
    if g.operational_state<>'active'
       or p_reason_code not in (
         'internal_approval_pending','budget_temporarily_unavailable',
         'requirements_under_revision','hiring_paused','business_delay','other'
       )
       or (p_reason_code='other' and btrim(coalesce(p_detail->>'explanation',''))='') then
      raise exception using errcode='22023',message='M7CB_INVALID_PAUSE';
    end if;
    select * into request_row from public.selection_requests
      where gig_id=g.id and status='pending' order by id limit 1 for update;
    if request_row.id is not null then
      request_row:=private.project_selection_request_expiry_locked(request_row.id,authoritative_now);
    end if;
    if request_row.status='pending' and request_row.expires_at>authoritative_now then
      raise exception using errcode='P0001',message='M7CB_PENDING_SELECTION_BLOCKS_PAUSE';
    end if;
    perform private.apply_gig_snapshot_projection(
      g.id,current_snapshot,g.current_gig_version_id,g.current_material_gig_version_id,
      'active',g.application_intake,'paused'
    );
  elsif p_action='resume' then
    if g.operational_state<>'paused' then
      raise exception using errcode='P0001',message='M7CB_INVALID_GIG_TRANSITION';
    end if;
    perform private.apply_gig_snapshot_projection(
      g.id,current_snapshot,g.current_gig_version_id,g.current_material_gig_version_id,
      'active',g.application_intake,'active'
    );
  elsif p_action='cancel' then
    if p_reason_code not in (
      'opportunity_no_longer_required','budget_no_longer_available',
      'business_priorities_changed','requirements_cannot_be_finalised',
      'posted_in_error','other'
    )
    or btrim(coalesce(p_detail->>'applicant_facing_explanation',''))=''
    or coalesce((p_detail->>'closes_active_records_confirmed')::boolean,false)=false
    or (p_reason_code='other' and btrim(coalesce(p_detail->>'other_explanation',''))='') then
      raise exception using errcode='22023',message='M7CB_INVALID_CANCELLATION';
    end if;
    select * into request_row from public.selection_requests
      where gig_id=g.id and status='pending' order by id limit 1 for update;
    if request_row.id is not null then
      request_row:=private.project_selection_request_expiry_locked(request_row.id,authoritative_now);
    end if;
    perform id from public.applications
      where gig_id=g.id and stage in ('under_review','advanced') order by id for update;
    if request_row.status='pending' and request_row.expires_at>authoritative_now then
      update public.selection_requests set
        status='cancelled',terminal_at=authoritative_now,
        cancellation_reason_code='gig_cancelled',cancellation_detail=p_detail
      where id=request_row.id;
      request_affected:=true;
    end if;
    update public.applications set
      stage='closed_gig_cancelled',last_updated_at=authoritative_now,
      stage_changed_at=authoritative_now,stage_changed_by_actor_type='system',
      stage_changed_by_user_id=null,stage_reason_origin='gig_cancelled',
      stage_reason_code=p_reason_code,stage_reason_payload=p_detail
    where gig_id=g.id and stage in ('under_review','advanced');
    get diagnostics closed_count=row_count;
    perform private.apply_gig_snapshot_projection(
      g.id,current_snapshot,g.current_gig_version_id,g.current_material_gig_version_id,
      'cancelled','closed','active'
    );
  else
    raise exception using errcode='22023',message='M7CB_INVALID_GIG_ACTION';
  end if;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,selection_request_id,
    reason_origin,reason_code,event_payload,occurred_at
  ) values (
    'gig_'||p_action,'participants','user',p_acting_user_id,g.id,
    case when request_affected then request_row.id else null end,
    'client_gig_management',p_reason_code,
    jsonb_build_object(
      'closed_application_count',closed_count,'detail',p_detail,
      'selection_request_affected',request_affected
    ),authoritative_now
  );
  return jsonb_build_object(
    'code',p_action||'_completed','gig_id',g.id,
    'closed_application_count',closed_count,'selection_request_affected',request_affected
  );
end;
$$;

revoke all on function public.selection_get_context(uuid,uuid) from public,anon,authenticated;
revoke all on function public.selection_get_request(uuid,uuid) from public,anon,authenticated;
revoke all on function public.selection_list_requests(uuid,uuid) from public,anon,authenticated;
revoke all on function public.selection_send_request(uuid,uuid,integer,text,uuid,boolean)
  from public,anon,authenticated;
revoke all on function public.selection_cancel_request(uuid,uuid,text,uuid,text,text)
  from public,anon,authenticated;
revoke all on function public.selection_respond_request(
  uuid,uuid,text,text,uuid,boolean,text,text,text[]
) from public,anon,authenticated;
revoke all on function public.confirm_selection_request(uuid,uuid) from public,anon,authenticated;

grant execute on function public.selection_get_context(uuid,uuid) to service_role;
grant execute on function public.selection_get_request(uuid,uuid) to service_role;
grant execute on function public.selection_list_requests(uuid,uuid) to service_role;
grant execute on function public.selection_send_request(uuid,uuid,integer,text,uuid,boolean)
  to service_role;
grant execute on function public.selection_cancel_request(uuid,uuid,text,uuid,text,text)
  to service_role;
grant execute on function public.selection_respond_request(
  uuid,uuid,text,text,uuid,boolean,text,text,text[]
) to service_role;
grant execute on function public.confirm_selection_request(uuid,uuid) to service_role;

comment on function private.project_selection_request_expiry_locked(uuid,timestamptz) is
'Canonical request expiry projector. Caller locks the gig first and supplies one authoritative timestamp.';
comment on function private.confirm_selection_request_core(uuid,uuid,timestamptz,integer) is
'Single exact-version acceptance core shared by legacy 7B and idempotent 7G entry points.';
comment on table private.selection_operations is
'Immutable in-transaction idempotency ledger for selection mutations.';

commit;
