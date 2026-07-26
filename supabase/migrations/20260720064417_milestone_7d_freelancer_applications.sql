-- GigMatch AI Milestone 7D: freelancer application aggregate mutations.
-- Global lock order: gig -> effective selection request -> application -> version -> events.

begin;

alter table public.applications
  add column submission_request_id uuid,
  add column submission_fingerprint text,
  add constraint applications_submission_idempotency_pair_check check (
    (submission_request_id is null and submission_fingerprint is null)
    or (submission_request_id is not null and submission_fingerprint ~ '^[0-9a-f]{64}$')
  );

create unique index applications_submission_request_id_idx
on public.applications (freelancer_profile_id, submission_request_id)
where submission_request_id is not null;

alter table public.application_versions
  add column scope_notes text,
  add constraint application_versions_scope_notes_check check (
    scope_notes is null or btrim(scope_notes) <> ''
  ),
  drop constraint application_versions_origin_check,
  add constraint application_versions_origin_check check (origin in (
    'initial_submission', 'freelancer_edit', 'gig_change_terms_reaffirmed',
    'gig_change_proposal_updated', 'gig_change_reapplication', 'reconsideration'
  ));

create or replace function private.protect_application_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Applications cannot be physically deleted';
  end if;
  if (new.id, new.gig_id, new.freelancer_profile_id, new.submitted_at,
      new.submission_request_id, new.submission_fingerprint)
      is distinct from
     (old.id, old.gig_id, old.freelancer_profile_id, old.submitted_at,
      old.submission_request_id, old.submission_fingerprint) then
    raise exception 'Application identity and submission idempotency fields are immutable';
  end if;
  return new;
end;
$$;

create or replace function private.canonicalize_application_json(value jsonb, p_key text default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  kind text := jsonb_typeof(value);
  result jsonb;
begin
  if kind = 'object' then
    select coalesce(jsonb_object_agg(key, private.canonicalize_application_json(item, key) order by key), '{}'::jsonb)
      into result from jsonb_each(value) entry(key, item);
    return result;
  elsif kind = 'array' then
    select coalesce(jsonb_agg(private.canonicalize_application_json(item, p_key) order by ordinal), '[]'::jsonb)
      into result from jsonb_array_elements(value) with ordinality entry(item, ordinal);
    return result;
  elsif kind = 'string' then
    if p_key in ('exact_total','minimum','maximum','requested_hourly_rate','exact_value',
      'minimum_value','maximum_value','amount','hourly_rate')
      and (value #>> '{}') ~ '^[+-]?[0-9]+([.][0-9]+)?$' then
      return to_jsonb(trim_scale((value #>> '{}')::numeric));
    end if;
    return to_jsonb(regexp_replace(btrim(value #>> '{}'), '\s+', ' ', 'g'));
  elsif kind = 'number' then
    return to_jsonb(trim_scale((value #>> '{}')::numeric));
  end if;
  return value;
end;
$$;

create or replace function private.jsonb_positive_numeric(value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  return jsonb_typeof(value) = 'number' and (value #>> '{}')::numeric > 0;
exception when others then
  return false;
end;
$$;

create or replace function private.jsonb_positive_range(value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  minimum_value numeric;
  maximum_value numeric;
begin
  if jsonb_typeof(value) <> 'object'
     or not private.jsonb_positive_numeric(value -> 'minimum')
     or not private.jsonb_positive_numeric(value -> 'maximum') then
    return false;
  end if;
  minimum_value := (value ->> 'minimum')::numeric;
  maximum_value := (value ->> 'maximum')::numeric;
  return minimum_value <= maximum_value;
exception when others then
  return false;
end;
$$;

create or replace function private.valid_iso_date(value text)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
begin
  perform value::date;
  return value ~ '^\d{4}-\d{2}-\d{2}$';
exception when others then
  return false;
end;
$$;

create or replace function private.valid_application_duration(value jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  mode text := value ->> 'mode';
  unit text := value ->> 'unit';
begin
  if jsonb_typeof(value) <> 'object' or mode not in ('exact', 'range', 'requires_discussion') then
    return false;
  end if;
  if mode = 'requires_discussion' then
    return not (value ?| array['unit', 'exact_value', 'minimum_value', 'maximum_value']);
  end if;
  if unit not in ('days', 'weeks', 'months') then
    return false;
  end if;
  if mode = 'exact' then
    return private.jsonb_positive_numeric(value -> 'exact_value')
      and not (value ?| array['minimum_value', 'maximum_value']);
  end if;
  return private.jsonb_positive_range(jsonb_build_object(
    'minimum', value -> 'minimum_value', 'maximum', value -> 'maximum_value'
  )) and not (value ? 'exact_value');
end;
$$;

create or replace function private.application_terms_token(p_gig_id uuid, p_gig_version_id uuid)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select encode(extensions.digest(p_gig_id::text || ':' || p_gig_version_id::text, 'sha256'), 'hex')
$$;

create or replace function private.application_version_token(p_application_id uuid, p_application_version_id uuid)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select encode(extensions.digest(p_application_id::text || ':' || p_application_version_id::text, 'sha256'), 'hex')
$$;

create or replace function private.validate_application_snapshot(snapshot jsonb, gig_snapshot jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  proposal jsonb := snapshot -> 'proposal';
  timeline jsonb := snapshot -> 'timeline';
  availability jsonb := snapshot -> 'availability';
  scope jsonb := snapshot -> 'scope';
  structure text := gig_snapshot ->> 'payment_structure';
  currency_code text := gig_snapshot ->> 'currency';
  mode text := proposal ->> 'mode';
  client_payment jsonb := gig_snapshot -> 'client_payment';
  proposed_max numeric;
  posted_min numeric;
  posted_max numeric;
  populated integer;
  phase jsonb;
begin
  if private.validate_supported_gig_snapshot(gig_snapshot) is not true
     or jsonb_typeof(snapshot) <> 'object'
     or snapshot - array['proposal_contract_version','snapshot_schema_version','cover_note','proposal','timeline','availability','scope','scope_notes'] <> '{}'::jsonb
     or snapshot ->> 'proposal_contract_version' <> '1'
     or snapshot ->> 'snapshot_schema_version' <> '1'
     or btrim(coalesce(snapshot ->> 'cover_note', '')) = ''
     or jsonb_typeof(proposal) <> 'object'
     or proposal ->> 'proposal_contract_version' <> '1'
     or proposal ->> 'snapshot_schema_version' <> '1'
     or proposal ->> 'payment_structure' <> structure
     or proposal ->> 'currency' <> currency_code
     or not private.valid_application_duration(timeline)
     or jsonb_typeof(availability) <> 'object'
     or not private.valid_iso_date(availability ->> 'available_from')
     or jsonb_typeof(scope) <> 'object'
     or scope - array['included_work','excluded_work','assumptions','estimate_change_factors'] <> '{}'::jsonb
     or jsonb_typeof(scope -> 'included_work') <> 'array'
     or jsonb_typeof(scope -> 'excluded_work') <> 'array'
     or jsonb_typeof(scope -> 'assumptions') <> 'array'
     or jsonb_typeof(scope -> 'estimate_change_factors') <> 'array'
     or (snapshot ? 'scope_notes' and jsonb_typeof(snapshot -> 'scope_notes') not in ('string', 'null')) then
    return false;
  end if;

  if structure = 'fixed_price' then
    if mode not in ('comfortable_within_posted_budget','exact_total','total_range','requires_scope_clarification') then
      return false;
    end if;
    if mode = 'exact_total' and not private.jsonb_positive_numeric(proposal -> 'exact_total') then return false; end if;
    if mode = 'total_range' and not private.jsonb_positive_range(proposal -> 'total_range') then return false; end if;
    if mode in ('comfortable_within_posted_budget','requires_scope_clarification')
       and (proposal ? 'exact_total' or proposal ? 'total_range') then return false; end if;
    if mode = 'exact_total' and proposal ? 'total_range' then return false; end if;
    if mode = 'total_range' and proposal ? 'exact_total' then return false; end if;
    posted_max := (client_payment #>> '{budget,maximum}')::numeric;
    proposed_max := case
      when mode = 'exact_total' then (proposal ->> 'exact_total')::numeric
      when mode = 'total_range' then (proposal #>> '{total_range,maximum}')::numeric
      else posted_max
    end;
    if proposed_max > posted_max and btrim(coalesce(proposal ->> 'above_budget_explanation', '')) = '' then
      return false;
    end if;
  elsif structure = 'hourly' then
    if not private.jsonb_positive_numeric(proposal -> 'requested_hourly_rate')
       or not private.jsonb_positive_range(proposal -> 'weekly_availability_hours')
       or not private.valid_iso_date(proposal ->> 'available_from')
       or proposal ->> 'rate_flexibility' not in ('fixed','negotiable','depends_on_weekly_commitment')
       or not private.jsonb_positive_range(availability -> 'weekly_hours') then
      return false;
    end if;
    posted_min := (client_payment #>> '{hourly_rate,minimum}')::numeric;
    posted_max := (client_payment #>> '{hourly_rate,maximum}')::numeric;
    if ((proposal ->> 'requested_hourly_rate')::numeric < posted_min
        or (proposal ->> 'requested_hourly_rate')::numeric > posted_max)
       and btrim(coalesce(proposal ->> 'out_of_range_explanation', '')) = '' then
      return false;
    end if;
  elsif structure = 'open_to_proposals' then
    if mode not in ('estimated_fixed_price_range','proposed_hourly_rate','phased_estimate','initial_discovery_phase')
       or jsonb_array_length(scope -> 'included_work') = 0
       or jsonb_array_length(scope -> 'excluded_work') = 0
       or jsonb_array_length(scope -> 'assumptions') = 0
       or jsonb_array_length(scope -> 'estimate_change_factors') = 0 then
      return false;
    end if;
    populated := (proposal ? 'fixed_price_range')::integer
      + (proposal ? 'hourly_rate')::integer
      + (proposal ? 'phases')::integer
      + (proposal ? 'discovery_phase')::integer;
    if populated <> 1 then return false; end if;
    if mode = 'estimated_fixed_price_range' and not private.jsonb_positive_range(proposal -> 'fixed_price_range') then return false; end if;
    if mode = 'proposed_hourly_rate' and not private.jsonb_positive_numeric(proposal -> 'hourly_rate') then return false; end if;
    if mode = 'phased_estimate' then
      if jsonb_typeof(proposal -> 'phases') <> 'array' or jsonb_array_length(proposal -> 'phases') = 0 then return false; end if;
      for phase in select value from jsonb_array_elements(proposal -> 'phases') loop
        if btrim(coalesce(phase ->> 'name','')) = ''
           or not private.jsonb_positive_numeric(phase -> 'amount')
           or not private.valid_application_duration(phase -> 'duration')
           or phase #>> '{duration,mode}' = 'requires_discussion' then return false; end if;
      end loop;
    end if;
    if mode = 'initial_discovery_phase' then
      phase := proposal -> 'discovery_phase';
      if jsonb_typeof(phase) <> 'object' or btrim(coalesce(phase ->> 'scope','')) = ''
         or not private.jsonb_positive_numeric(phase -> 'amount')
         or not private.valid_application_duration(phase -> 'duration')
         or phase #>> '{duration,mode}' = 'requires_discussion' then return false; end if;
    end if;
    if client_payment #>> '{guidance,guidance_type}' = 'maximum_budget_ceiling'
       and mode <> 'proposed_hourly_rate' then
      posted_max := (client_payment #>> '{guidance,maximum}')::numeric;
      proposed_max := case
        when mode = 'estimated_fixed_price_range' then (proposal #>> '{fixed_price_range,maximum}')::numeric
        when mode = 'initial_discovery_phase' then (proposal #>> '{discovery_phase,amount}')::numeric
        else (select sum((item ->> 'amount')::numeric) from jsonb_array_elements(proposal -> 'phases') item)
      end;
      if proposed_max > posted_max then return false; end if;
    end if;
  else
    return false;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.insert_application_version(
  p_application_id uuid,
  p_gig_id uuid,
  p_gig_version_id uuid,
  p_origin text,
  p_snapshot jsonb,
  p_acting_user_id uuid,
  p_created_at timestamptz
)
returns table(version_id uuid, version_number integer)
language plpgsql
set search_path = ''
as $$
begin
  version_id := gen_random_uuid();
  select coalesce(max(av.version_number), 0) + 1 into version_number
  from public.application_versions av where av.application_id = p_application_id;
  insert into public.application_versions(
    id, application_id, gig_id, version_number, gig_version_id, origin,
    snapshot_schema_version, cover_note, proposal_snapshot, timeline_snapshot,
    availability_snapshot, scope_snapshot, scope_notes, created_by_user_id, created_at
  ) values (
    version_id, p_application_id, p_gig_id, version_number, p_gig_version_id, p_origin,
    1, p_snapshot ->> 'cover_note', p_snapshot -> 'proposal', p_snapshot -> 'timeline',
    p_snapshot -> 'availability', p_snapshot -> 'scope', nullif(p_snapshot ->> 'scope_notes', ''),
    p_acting_user_id, p_created_at
  );
  return next;
end;
$$;

create or replace function private.resolve_freelancer_profile(p_acting_user_id uuid)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare profile_id uuid;
begin
  select fp.id into profile_id
  from public.user_profiles up
  join public.freelancer_profiles fp on fp.user_id = up.id
  where up.id = p_acting_user_id and up.role = 'freelancer';
  if profile_id is null then
    raise exception using errcode='42501', message='M7D_FREELANCER_PROFILE_REQUIRED';
  end if;
  return profile_id;
end;
$$;

create or replace function public.submit_application(
  p_gig_id uuid,
  p_acting_user_id uuid,
  p_submission_request_id uuid,
  p_expected_material_terms_token text,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_id uuid;
  expected_version public.gig_versions%rowtype;
  locked_gig public.gigs%rowtype;
  existing public.applications%rowtype;
  canonical jsonb;
  fingerprint text;
  effective_now timestamptz;
  application_id uuid := gen_random_uuid();
  inserted_version record;
begin
  if p_gig_id is null or p_acting_user_id is null or p_submission_request_id is null
     or btrim(coalesce(p_expected_material_terms_token,'')) = '' then
    raise exception using errcode='22023', message='M7D_INVALID_APPLICATION_SNAPSHOT';
  end if;
  profile_id := private.resolve_freelancer_profile(p_acting_user_id);
  select gv.* into expected_version from public.gig_versions gv
  where gv.gig_id = p_gig_id
    and private.application_terms_token(gv.gig_id, gv.id) = p_expected_material_terms_token;
  if not found then raise exception using errcode='40001', message='M7D_STALE_GIG_TERMS'; end if;
  canonical := private.canonicalize_application_json(p_snapshot);
  if not private.validate_application_snapshot(canonical, expected_version.terms_snapshot) then
    raise exception using errcode='22023', message='M7D_INVALID_FINANCIAL_PROPOSAL';
  end if;
  fingerprint := encode(extensions.digest(jsonb_build_object(
    'freelancer_profile_id', profile_id, 'gig_id', p_gig_id,
    'expected_material_gig_version_id', expected_version.id, 'snapshot', canonical
  )::text, 'sha256'), 'hex');

  select a.* into existing from public.applications a
  where a.freelancer_profile_id = profile_id and a.submission_request_id = p_submission_request_id;
  if found then
    if existing.submission_fingerprint <> fingerprint then
      raise exception using errcode='23505', message='M7D_IDEMPOTENCY_KEY_REUSED';
    end if;
    return jsonb_build_object('code','application_submitted','application_id',existing.id,
      'idempotent_replay',true);
  end if;

  select g.* into locked_gig from public.gigs g where g.id = p_gig_id for update;
  if not found then raise exception using errcode='P0002', message='M7D_GIG_NOT_APPLICATION_READY'; end if;
  if locked_gig.current_material_gig_version_id <> expected_version.id then
    raise exception using errcode='40001', message='M7D_STALE_GIG_TERMS';
  end if;
  effective_now := clock_timestamp();
  if locked_gig.opportunity_lifecycle <> 'active'
     or locked_gig.application_intake <> 'accepting'
     or locked_gig.operational_state <> 'active'
     or expected_version.terms_contract_version <> 1
     or private.validate_supported_gig_snapshot(expected_version.terms_snapshot) is not true then
    raise exception using errcode='P0001', message='M7D_GIG_NOT_APPLICATION_READY';
  end if;
  if (expected_version.terms_snapshot ->> 'application_deadline')::timestamptz <= effective_now then
    raise exception using errcode='P0001', message='M7D_APPLICATION_DEADLINE_PASSED';
  end if;

  select a.* into existing from public.applications a
  where a.freelancer_profile_id = profile_id and a.submission_request_id = p_submission_request_id;
  if found then
    if existing.submission_fingerprint <> fingerprint then
      raise exception using errcode='23505', message='M7D_IDEMPOTENCY_KEY_REUSED';
    end if;
    return jsonb_build_object('code','application_submitted','application_id',existing.id,
      'idempotent_replay',true);
  end if;
  if exists(select 1 from public.applications a where a.gig_id=p_gig_id and a.freelancer_profile_id=profile_id) then
    raise exception using errcode='23505', message='M7D_APPLICATION_ALREADY_EXISTS';
  end if;

  insert into public.applications(
    id,gig_id,freelancer_profile_id,stage,current_version_id,
    submitted_at,last_updated_at,stage_changed_at,stage_changed_by_actor_type,
    stage_changed_by_user_id,submission_request_id,submission_fingerprint
  ) values (
    application_id,p_gig_id,profile_id,'under_review',gen_random_uuid(),
    effective_now,effective_now,effective_now,'user',p_acting_user_id,
    p_submission_request_id,fingerprint
  );
  select * into inserted_version from private.insert_application_version(
    application_id,p_gig_id,expected_version.id,'initial_submission',canonical,p_acting_user_id,effective_now
  );
  update public.applications set current_version_id=inserted_version.version_id where id=application_id;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,event_payload,occurred_at
  ) values (
    'application_submitted','participants','user',p_acting_user_id,p_gig_id,application_id,
    jsonb_build_object('application_version_id',inserted_version.version_id,'version_number',1,
      'gig_version_id',expected_version.id),effective_now
  );
  return jsonb_build_object('code','application_submitted','application_id',application_id,
    'version_number',1,'idempotent_replay',false);
end;
$$;

create or replace function public.create_application_version(
  p_application_id uuid,
  p_acting_user_id uuid,
  p_expected_application_version_token text,
  p_snapshot jsonb
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare profile_id uuid; resolved_gig_id uuid; g public.gigs; request_row public.selection_requests;
  app_row public.applications; gv public.gig_versions; canonical jsonb; effective_now timestamptz; inserted record;
begin
  profile_id:=private.resolve_freelancer_profile(p_acting_user_id);
  select gig_id into resolved_gig_id from public.applications where id=p_application_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7D_APPLICATION_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  select * into request_row from public.selection_requests
    where gig_id=g.id and status='pending' order by id limit 1 for update;
  effective_now:=clock_timestamp();
  select * into app_row from public.applications where id=p_application_id for update;
  if not found or app_row.freelancer_profile_id<>profile_id then raise exception using errcode='P0002',message='M7D_APPLICATION_NOT_FOUND'; end if;
  if private.application_version_token(app_row.id,app_row.current_version_id)<>p_expected_application_version_token then
    raise exception using errcode='40001',message='M7D_STALE_APPLICATION_VERSION'; end if;
  if app_row.stage not in ('under_review','advanced') or g.opportunity_lifecycle in ('filled','cancelled') then
    raise exception using errcode='P0001',message='M7D_APPLICATION_EDIT_NOT_ALLOWED'; end if;
  if app_row.current_version_id is distinct from (select id from public.application_versions
      where id=app_row.current_version_id and gig_version_id=g.current_material_gig_version_id) then
    raise exception using errcode='P0001',message='M7D_RESPONSE_TO_UPDATED_GIG_REQUIRED'; end if;
  select * into gv from public.gig_versions where id=g.current_material_gig_version_id;
  canonical:=private.canonicalize_application_json(p_snapshot);
  if not private.validate_application_snapshot(canonical,gv.terms_snapshot) then
    raise exception using errcode='22023',message='M7D_INVALID_FINANCIAL_PROPOSAL'; end if;
  if request_row.id is not null and request_row.expires_at>effective_now and request_row.application_id=app_row.id then
    update public.selection_requests set status='invalidated',terminal_at=effective_now,
      invalidation_reason='application_version_changed' where id=request_row.id;
    insert into public.marketplace_events(event_type,visibility,actor_type,actor_user_id,gig_id,
      application_id,selection_request_id,event_payload,occurred_at)
    values('selection_request_invalidated_by_application_edit','participants','user',p_acting_user_id,g.id,
      app_row.id,request_row.id,jsonb_build_object('reason','application_version_changed'),effective_now);
  end if;
  select * into inserted from private.insert_application_version(app_row.id,g.id,gv.id,
    'freelancer_edit',canonical,p_acting_user_id,effective_now);
  update public.applications set current_version_id=inserted.version_id,last_updated_at=effective_now where id=app_row.id;
  insert into public.marketplace_events(event_type,visibility,actor_type,actor_user_id,gig_id,application_id,event_payload,occurred_at)
  values('application_version_created','participants','user',p_acting_user_id,g.id,app_row.id,
    jsonb_build_object('application_version_id',inserted.version_id,'version_number',inserted.version_number,
      'gig_version_id',gv.id,'origin','freelancer_edit'),effective_now);
  return jsonb_build_object('code','application_version_created','application_id',app_row.id,
    'version_number',inserted.version_number);
end;
$$;

create or replace function public.respond_to_application_gig_change(
  p_application_id uuid,
  p_acting_user_id uuid,
  p_action text,
  p_expected_application_version_token text,
  p_expected_material_terms_token text,
  p_snapshot jsonb default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare profile_id uuid; resolved_gig_id uuid; g public.gigs; request_row public.selection_requests;
  app_row public.applications; current_av public.application_versions; gv public.gig_versions;
  canonical jsonb; effective_now timestamptz; inserted record; origin_value text;
begin
  if p_action not in ('reaffirm','update') then raise exception using errcode='22023',message='M7D_INVALID_APPLICATION_SNAPSHOT'; end if;
  profile_id:=private.resolve_freelancer_profile(p_acting_user_id);
  select gig_id into resolved_gig_id from public.applications where id=p_application_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7D_APPLICATION_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  select * into request_row from public.selection_requests where gig_id=g.id and status='pending' order by id limit 1 for update;
  effective_now:=clock_timestamp();
  select * into app_row from public.applications where id=p_application_id for update;
  if not found or app_row.freelancer_profile_id<>profile_id then raise exception using errcode='P0002',message='M7D_APPLICATION_NOT_FOUND'; end if;
  if private.application_version_token(app_row.id,app_row.current_version_id)<>p_expected_application_version_token then
    raise exception using errcode='40001',message='M7D_STALE_APPLICATION_VERSION'; end if;
  if private.application_terms_token(g.id,g.current_material_gig_version_id)<>p_expected_material_terms_token then
    raise exception using errcode='40001',message='M7D_GIG_TERMS_CHANGED_AGAIN'; end if;
  select * into current_av from public.application_versions where id=app_row.current_version_id;
  if current_av.gig_version_id=g.current_material_gig_version_id then raise exception using errcode='P0001',message='M7D_NO_UPDATED_GIG_RESPONSE_REQUIRED'; end if;
  if app_row.stage not in ('under_review','advanced') or g.opportunity_lifecycle in ('filled','cancelled') then
    raise exception using errcode='P0001',message='M7D_APPLICATION_EDIT_NOT_ALLOWED'; end if;
  select * into gv from public.gig_versions where id=g.current_material_gig_version_id;
  if p_action='reaffirm' then
    canonical:=jsonb_build_object('proposal_contract_version',1,'snapshot_schema_version',1,
      'cover_note',current_av.cover_note,'proposal',current_av.proposal_snapshot,
      'timeline',current_av.timeline_snapshot,'availability',current_av.availability_snapshot,
      'scope',current_av.scope_snapshot,'scope_notes',current_av.scope_notes);
    origin_value:='gig_change_terms_reaffirmed';
    if not private.validate_application_snapshot(canonical,gv.terms_snapshot) then
      raise exception using errcode='P0001',message='M7D_EXISTING_PROPOSAL_INCOMPATIBLE_WITH_UPDATED_TERMS'; end if;
  else
    canonical:=private.canonicalize_application_json(p_snapshot);
    origin_value:='gig_change_proposal_updated';
    if not private.validate_application_snapshot(canonical,gv.terms_snapshot) then
      raise exception using errcode='22023',message='M7D_INVALID_FINANCIAL_PROPOSAL'; end if;
  end if;
  if request_row.id is not null and request_row.expires_at>effective_now and request_row.application_id=app_row.id then
    update public.selection_requests set status='invalidated',terminal_at=effective_now,
      invalidation_reason='application_version_changed' where id=request_row.id;
    insert into public.marketplace_events(event_type,visibility,actor_type,actor_user_id,gig_id,
      application_id,selection_request_id,event_payload,occurred_at)
    values('selection_request_invalidated_by_application_edit','participants','user',p_acting_user_id,g.id,
      app_row.id,request_row.id,jsonb_build_object('reason','application_version_changed'),effective_now);
  end if;
  select * into inserted from private.insert_application_version(app_row.id,g.id,gv.id,
    origin_value,canonical,p_acting_user_id,effective_now);
  update public.applications set current_version_id=inserted.version_id,last_updated_at=effective_now where id=app_row.id;
  insert into public.marketplace_events(event_type,visibility,actor_type,actor_user_id,gig_id,application_id,event_payload,occurred_at)
  values(case when p_action='reaffirm' then 'updated_gig_terms_reaffirmed' else 'application_proposal_updated_for_gig_change' end,
    'participants','user',p_acting_user_id,g.id,app_row.id,
    jsonb_build_object('application_version_id',inserted.version_id,'version_number',inserted.version_number,
      'gig_version_id',gv.id,'origin',origin_value),effective_now);
  return jsonb_build_object('code',case when p_action='reaffirm' then 'updated_gig_terms_reaffirmed' else 'proposal_updated_for_gig_change' end,
    'application_id',app_row.id,'version_number',inserted.version_number);
end;
$$;

create or replace function public.withdraw_application(
  p_application_id uuid,
  p_acting_user_id uuid,
  p_expected_application_version_token text,
  p_reason_code text,
  p_explanation text default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare profile_id uuid; resolved_gig_id uuid; g public.gigs; request_row public.selection_requests;
  app_row public.applications; effective_now timestamptz; detail jsonb;
begin
  if p_reason_code not in ('accepted_another_opportunity','no_longer_available','scope_or_terms_no_longer_fit',
    'timeline_changed','budget_expectations_mismatch','gig_changed_materially','personal_circumstances','other')
    or (p_reason_code='other' and btrim(coalesce(p_explanation,''))='') then
    raise exception using errcode='22023',message='M7D_APPLICATION_WITHDRAWAL_NOT_ALLOWED'; end if;
  profile_id:=private.resolve_freelancer_profile(p_acting_user_id);
  select gig_id into resolved_gig_id from public.applications where id=p_application_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7D_APPLICATION_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  select * into request_row from public.selection_requests where gig_id=g.id and status='pending' order by id limit 1 for update;
  effective_now:=clock_timestamp();
  select * into app_row from public.applications where id=p_application_id for update;
  if not found or app_row.freelancer_profile_id<>profile_id then raise exception using errcode='P0002',message='M7D_APPLICATION_NOT_FOUND'; end if;
  if private.application_version_token(app_row.id,app_row.current_version_id)<>p_expected_application_version_token then
    raise exception using errcode='40001',message='M7D_STALE_APPLICATION_VERSION'; end if;
  if request_row.id is not null and request_row.expires_at>effective_now and request_row.application_id=app_row.id then
    raise exception using errcode='P0001',message='M7D_PENDING_SELECTION_BLOCKS_APPLICATION_WITHDRAWAL'; end if;
  if app_row.stage not in ('under_review','advanced') or g.opportunity_lifecycle in ('filled','cancelled') then
    raise exception using errcode='P0001',message='M7D_APPLICATION_WITHDRAWAL_NOT_ALLOWED'; end if;
  detail:=jsonb_strip_nulls(jsonb_build_object('explanation',nullif(btrim(coalesce(p_explanation,'')),''),
    'after_material_gig_change',(select gig_version_id<>g.current_material_gig_version_id from public.application_versions where id=app_row.current_version_id)));
  update public.applications set stage='withdrawn',last_updated_at=effective_now,stage_changed_at=effective_now,
    stage_changed_by_actor_type='user',stage_changed_by_user_id=p_acting_user_id,
    stage_reason_origin='freelancer_withdrawal',stage_reason_code=p_reason_code,stage_reason_payload=detail
    where id=app_row.id;
  insert into public.marketplace_events(event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
    reason_origin,reason_code,event_payload,occurred_at)
  values('application_withdrawn','participants','user',p_acting_user_id,g.id,app_row.id,
    'freelancer_withdrawal',p_reason_code,jsonb_build_object('application_version_id',app_row.current_version_id,
      'after_material_gig_change',detail->'after_material_gig_change'),effective_now);
  return jsonb_build_object('code','application_withdrawn','application_id',app_row.id);
end;
$$;

create or replace function public.reapply_application_after_gig_change(
  p_application_id uuid,
  p_acting_user_id uuid,
  p_expected_application_version_token text,
  p_expected_material_terms_token text,
  p_snapshot jsonb
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare profile_id uuid; resolved_gig_id uuid; g public.gigs; request_row public.selection_requests;
  app_row public.applications; old_gv public.gig_versions; gv public.gig_versions; canonical jsonb;
  effective_now timestamptz; inserted record;
begin
  profile_id:=private.resolve_freelancer_profile(p_acting_user_id);
  select gig_id into resolved_gig_id from public.applications where id=p_application_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7D_APPLICATION_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  select * into request_row from public.selection_requests where gig_id=g.id and status='pending' order by id limit 1 for update;
  effective_now:=clock_timestamp();
  select * into app_row from public.applications where id=p_application_id for update;
  if not found or app_row.freelancer_profile_id<>profile_id then raise exception using errcode='P0002',message='M7D_APPLICATION_NOT_FOUND'; end if;
  if private.application_version_token(app_row.id,app_row.current_version_id)<>p_expected_application_version_token then
    raise exception using errcode='40001',message='M7D_STALE_APPLICATION_VERSION'; end if;
  if private.application_terms_token(g.id,g.current_material_gig_version_id)<>p_expected_material_terms_token then
    raise exception using errcode='40001',message='M7D_GIG_TERMS_CHANGED_AGAIN'; end if;
  select old_version.* into old_gv from public.application_versions av
    join public.gig_versions old_version on old_version.id=av.gig_version_id where av.id=app_row.current_version_id;
  select * into gv from public.gig_versions where id=g.current_material_gig_version_id;
  if app_row.stage<>'withdrawn' or gv.version_number<=old_gv.version_number
     or g.opportunity_lifecycle<>'active' or g.application_intake<>'accepting' or g.operational_state<>'active'
     or gv.terms_contract_version<>1 or private.validate_supported_gig_snapshot(gv.terms_snapshot) is not true
     or (gv.terms_snapshot->>'application_deadline')::timestamptz<=effective_now
     or exists(select 1 from public.engagements e where e.application_id=app_row.id and e.status<>'cancelled')
     or (request_row.id is not null and request_row.expires_at>effective_now and request_row.application_id=app_row.id) then
    raise exception using errcode='P0001',message='M7D_REAPPLICATION_NOT_ALLOWED'; end if;
  canonical:=private.canonicalize_application_json(p_snapshot);
  if not private.validate_application_snapshot(canonical,gv.terms_snapshot) then
    raise exception using errcode='22023',message='M7D_INVALID_FINANCIAL_PROPOSAL'; end if;
  select * into inserted from private.insert_application_version(app_row.id,g.id,gv.id,
    'gig_change_reapplication',canonical,p_acting_user_id,effective_now);
  update public.applications set stage='under_review',current_version_id=inserted.version_id,
    last_updated_at=effective_now,stage_changed_at=effective_now,stage_changed_by_actor_type='user',
    stage_changed_by_user_id=p_acting_user_id,stage_reason_origin=null,stage_reason_code=null,stage_reason_payload=null
    where id=app_row.id;
  insert into public.marketplace_events(event_type,visibility,actor_type,actor_user_id,gig_id,application_id,event_payload,occurred_at)
  values('application_reapplied_after_gig_change','participants','user',p_acting_user_id,g.id,app_row.id,
    jsonb_build_object('application_version_id',inserted.version_id,'version_number',inserted.version_number,
      'gig_version_id',gv.id,'origin','gig_change_reapplication'),effective_now);
  return jsonb_build_object('code','application_reapplied_after_gig_change','application_id',app_row.id,
    'version_number',inserted.version_number);
end;
$$;

revoke all on function public.submit_application(uuid,uuid,uuid,text,jsonb),
  public.create_application_version(uuid,uuid,text,jsonb),
  public.respond_to_application_gig_change(uuid,uuid,text,text,text,jsonb),
  public.withdraw_application(uuid,uuid,text,text,text),
  public.reapply_application_after_gig_change(uuid,uuid,text,text,jsonb)
from public,anon,authenticated;

grant execute on function public.submit_application(uuid,uuid,uuid,text,jsonb),
  public.create_application_version(uuid,uuid,text,jsonb),
  public.respond_to_application_gig_change(uuid,uuid,text,text,text,jsonb),
  public.withdraw_application(uuid,uuid,text,text,text),
  public.reapply_application_after_gig_change(uuid,uuid,text,text,jsonb)
to service_role;

comment on function public.submit_application(uuid,uuid,uuid,text,jsonb) is
'Backend-only idempotent submission. Lock order: gig, application/version, event.';
comment on function public.create_application_version(uuid,uuid,text,jsonb) is
'Backend-only complete application edit. Lock order: gig, request, application, version, events.';
comment on function public.respond_to_application_gig_change(uuid,uuid,text,text,text,jsonb) is
'Backend-only changed-gig response. Lock order: gig, request, application, version, event.';
comment on function public.withdraw_application(uuid,uuid,text,text,text) is
'Backend-only withdrawal. Lock order: gig, request, application, event.';
comment on function public.reapply_application_after_gig_change(uuid,uuid,text,text,jsonb) is
'Backend-only material-change reapplication. Lock order: gig, request, application, version, event.';

commit;
