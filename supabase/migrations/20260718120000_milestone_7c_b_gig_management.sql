-- GigMatch AI Milestone 7C-B: backend-authoritative publishing, versioning, and lifecycle.
-- Lock order: gig -> effective selection request -> applications by UUID -> events.

begin;

create or replace function private.validate_supported_gig_snapshot(snapshot jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(snapshot) = 'object'
    and snapshot ->> 'terms_contract_version' = '1'
    and snapshot ->> 'snapshot_schema_version' = '1'
    and snapshot ->> 'payment_structure' in ('fixed_price', 'hourly', 'open_to_proposals')
    and snapshot ->> 'currency' ~ '^[A-Z]{3}$'
    and btrim(coalesce(snapshot ->> 'title', '')) <> ''
    and btrim(coalesce(snapshot ->> 'description', '')) <> ''
    and btrim(coalesce(snapshot #>> '{scope,tech_category}', '')) <> ''
    and jsonb_typeof(snapshot -> 'client_payment') = 'object'
    and snapshot #>> '{client_payment,payment_structure}' = snapshot ->> 'payment_structure'
    and snapshot #>> '{client_payment,currency}' = snapshot ->> 'currency'
    and jsonb_typeof(snapshot -> 'required_skills') = 'array'
    and jsonb_array_length(snapshot -> 'required_skills') > 0
    and jsonb_typeof(snapshot -> 'preferred_skills') = 'array'
    and jsonb_typeof(snapshot -> 'deliverables') = 'array'
    and jsonb_array_length(snapshot -> 'deliverables') > 0
    and btrim(coalesce(snapshot ->> 'experience_requirement', '')) <> ''
    and snapshot ->> 'work_mode' in ('remote', 'hybrid', 'onsite')
    and snapshot ->> 'application_deadline' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
    and (
      snapshot -> 'project_deadline' is null
      or jsonb_typeof(snapshot -> 'project_deadline') = 'null'
      or snapshot ->> 'project_deadline' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
    )
    and case snapshot ->> 'payment_structure'
      when 'fixed_price' then jsonb_typeof(snapshot #> '{client_payment,budget}') = 'object'
      when 'hourly' then jsonb_typeof(snapshot #> '{client_payment,hourly_rate}') = 'object'
        and jsonb_typeof(coalesce(snapshot #> '{client_payment,weekly_commitment_hours}', snapshot #> '{client_payment,weekly_commitment}')) = 'object'
        and jsonb_typeof(snapshot #> '{client_payment,engagement_duration}') = 'object'
      when 'open_to_proposals' then jsonb_typeof(snapshot #> '{client_payment,guidance}') = 'object'
        and btrim(coalesce(snapshot #>> '{client_payment,preferred_proposal_form}', '')) <> ''
      else false
    end
$$;

create or replace function private.normalized_text(value text)
returns text language sql immutable set search_path = ''
as $$ select lower(regexp_replace(btrim(coalesce(value, '')), '\s+', ' ', 'g')) $$;

create or replace function private.normalized_text_array(value jsonb)
returns jsonb language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by item), '[]'::jsonb)
  from (select distinct private.normalized_text(value_item) item from jsonb_array_elements_text(coalesce(value, '[]')) value_item) normalized
$$;

create or replace function private.gig_material_terms(snapshot jsonb)
returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_build_object(
    'title', private.normalized_text(snapshot ->> 'title'),
    'description', private.normalized_text(snapshot ->> 'description'),
    'scope', snapshot -> 'scope',
    'client_payment', snapshot -> 'client_payment',
    'payment_structure', snapshot -> 'payment_structure',
    'currency', snapshot -> 'currency',
    'required_skills', private.normalized_text_array(snapshot -> 'required_skills'),
    'preferred_skills', private.normalized_text_array(snapshot -> 'preferred_skills'),
    'experience_requirement', private.normalized_text(snapshot ->> 'experience_requirement'),
    'difficulty_level', snapshot -> 'difficulty_level',
    'work_mode', snapshot -> 'work_mode',
    'location_requirements', snapshot -> 'location_requirements',
    'weekly_commitment', snapshot -> 'weekly_commitment',
    'expected_duration', snapshot -> 'expected_duration',
    'application_deadline', snapshot -> 'application_deadline',
    'project_deadline', snapshot -> 'project_deadline',
    'deliverables', private.normalized_text_array(snapshot -> 'deliverables'),
    'assumptions', private.normalized_text_array(snapshot -> 'assumptions')
  )
$$;

create or replace function private.gig_changed_fields(previous_snapshot jsonb, candidate_snapshot jsonb)
returns text[] language sql immutable set search_path = ''
as $$
  select coalesce(array_agg(key order by key), '{}')
  from (
    select key from (
      select jsonb_object_keys(previous_snapshot - array['version_kind','terms_contract_version','snapshot_schema_version']) key
      union
      select jsonb_object_keys(candidate_snapshot - array['version_kind','terms_contract_version','snapshot_schema_version']) key
    ) keys
    where previous_snapshot -> key is distinct from candidate_snapshot -> key
  ) changed
$$;

create or replace function private.gig_edit_preview_locked(locked_gig public.gigs, candidate jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  display_snapshot jsonb;
  material_snapshot jsonb;
  fields text[];
  material boolean;
  affected_count integer;
  request_effect text;
  fingerprint text;
begin
  select terms_snapshot into display_snapshot from public.gig_versions where id = locked_gig.current_gig_version_id;
  select terms_snapshot into material_snapshot from public.gig_versions where id = locked_gig.current_material_gig_version_id;
  fields := private.gig_changed_fields(display_snapshot, candidate);
  material := private.gig_material_terms(material_snapshot) is distinct from private.gig_material_terms(candidate);
  select case when material then count(*) else 0 end into affected_count
  from public.applications where gig_id = locked_gig.id and stage in ('under_review', 'advanced');
  request_effect := case when material and exists (
    select 1 from public.selection_requests
    where gig_id = locked_gig.id and status = 'pending' and expires_at > statement_timestamp()
  ) then 'will_be_invalidated' else 'none' end;
  fingerprint := md5(jsonb_build_object(
    'gig_id', locked_gig.id, 'current', locked_gig.current_gig_version_id,
    'candidate', candidate, 'changed_fields', fields, 'affected_count', affected_count,
    'selection_request_effect', request_effect
  )::text);
  return jsonb_build_object(
    'code', case when cardinality(fields) = 0 then 'no_effective_change'
      when material and (affected_count > 0 or request_effect <> 'none') then 'material_change_confirmation_required'
      else 'ready' end,
    'expected_current_gig_version_id', locked_gig.current_gig_version_id,
    'is_material', material,
    'changed_fields', to_jsonb(fields),
    'affected_application_count', affected_count,
    'selection_request_effect', request_effect,
    'preview_fingerprint', fingerprint
  );
end;
$$;

-- Controlled RPCs set this transaction-local flag so the compatibility trigger
-- projects status but does not manufacture a legacy version alongside the real one.
create or replace function private.sync_gig_marketplace_state_and_legacy_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_version_id uuid;
  new_version_number integer;
  requested_status text;
  terms_changed boolean;
begin
  if tg_op = 'INSERT' then
    requested_status := coalesce(new.status, 'draft');
    if new.opportunity_lifecycle is null or new.application_intake is null or new.operational_state is null then
      case requested_status
        when 'draft' then new.opportunity_lifecycle := 'draft'; new.application_intake := 'closed'; new.operational_state := 'active';
        when 'open' then new.opportunity_lifecycle := 'active'; new.application_intake := 'accepting'; new.operational_state := 'active';
        when 'closed' then new.opportunity_lifecycle := 'active'; new.application_intake := 'closed'; new.operational_state := 'active';
        else raise exception 'Legacy gig input status must be draft, open, or closed';
      end case;
    elsif new.status is not null and new.status is distinct from private.gig_product_status(new.opportunity_lifecycle, new.application_intake, new.operational_state) then
      raise exception 'Gig status conflicts with authoritative marketplace state';
    end if;
    new.status := private.gig_product_status(new.opportunity_lifecycle, new.application_intake, new.operational_state);
    if new.current_gig_version_id is not null or new.current_material_gig_version_id is not null then
      if new.current_gig_version_id is null or new.current_material_gig_version_id is null then raise exception 'Both gig version pointers are required together'; end if;
      return new;
    end if;
    new_version_id := gen_random_uuid();
    new.current_gig_version_id := new_version_id; new.current_material_gig_version_id := new_version_id;
    insert into public.gig_versions (id,gig_id,version_number,snapshot_schema_version,terms_snapshot,changed_fields,created_by_actor_type,created_at)
    values (new_version_id,new.id,1,1,private.legacy_gig_terms_snapshot(new),array['legacy_compatibility_insert'],'system',coalesce(new.created_at,now()));
    return new;
  end if;
  if current_setting('app.gig_controlled_write', true) = 'on' then
    new.status := private.gig_product_status(new.opportunity_lifecycle, new.application_intake, new.operational_state);
    return new;
  end if;
  if old.opportunity_lifecycle <> 'draft' then
    raise exception using errcode = '42501', message = 'M7CB_PUBLISHED_GIG_DIRECT_WRITE_FORBIDDEN';
  end if;
  if new.status is distinct from old.status then
    raise exception using errcode = '42501', message = 'M7CB_DIRECT_PUBLICATION_FORBIDDEN';
  end if;
  if (new.opportunity_lifecycle,new.application_intake,new.operational_state,new.current_gig_version_id,new.current_material_gig_version_id)
    is distinct from (old.opportunity_lifecycle,old.application_intake,old.operational_state,old.current_gig_version_id,old.current_material_gig_version_id) then
    raise exception using errcode = '42501', message = 'M7CB_AUTHORITATIVE_STATE_DIRECT_WRITE_FORBIDDEN';
  end if;
  new.status := 'draft';
  terms_changed := (new.title,new.description,new.tech_category,new.required_skills,new.preferred_skills,new.budget_min,new.budget_max,new.difficulty_level,new.seniority_needed,new.deliverables,new.work_mode,new.deadline)
    is distinct from (old.title,old.description,old.tech_category,old.required_skills,old.preferred_skills,old.budget_min,old.budget_max,old.difficulty_level,old.seniority_needed,old.deliverables,old.work_mode,old.deadline);
  if terms_changed then
    select coalesce(max(version_number),0)+1 into new_version_number from public.gig_versions where gig_id=new.id;
    new_version_id := gen_random_uuid();
    insert into public.gig_versions (id,gig_id,version_number,snapshot_schema_version,terms_snapshot,changed_fields,created_by_actor_type,created_at)
    values (new_version_id,new.id,new_version_number,1,private.legacy_gig_terms_snapshot(new),array['legacy_draft_update'],'system',now());
    new.current_gig_version_id := new_version_id; new.current_material_gig_version_id := new_version_id;
  end if;
  return new;
end;
$$;

create or replace function private.apply_gig_snapshot_projection(gig_id uuid, snapshot jsonb, display_id uuid, material_id uuid,
  lifecycle text, intake text, operations text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform set_config('app.gig_controlled_write','on',true);
  update public.gigs set
    title = snapshot ->> 'title', description = snapshot ->> 'description',
    tech_category = snapshot #>> '{scope,tech_category}',
    required_skills = array(select jsonb_array_elements_text(snapshot -> 'required_skills')),
    preferred_skills = array(select jsonb_array_elements_text(snapshot -> 'preferred_skills')),
    budget_min = coalesce((snapshot #>> '{client_payment,budget,minimum}')::numeric::integer,(snapshot #>> '{client_payment,hourly_rate,minimum}')::numeric::integer),
    budget_max = coalesce((snapshot #>> '{client_payment,budget,maximum}')::numeric::integer,(snapshot #>> '{client_payment,hourly_rate,maximum}')::numeric::integer),
    difficulty_level = nullif(snapshot ->> 'difficulty_level',''),
    seniority_needed = snapshot ->> 'experience_requirement',
    deliverables = array(select jsonb_array_elements_text(snapshot -> 'deliverables')),
    work_mode = snapshot ->> 'work_mode', deadline = (snapshot ->> 'application_deadline')::timestamptz,
    current_gig_version_id = display_id, current_material_gig_version_id = material_id,
    opportunity_lifecycle = lifecycle, application_intake = intake, operational_state = operations,
    updated_at = statement_timestamp()
  where id = gig_id;
end;
$$;

create or replace function public.manage_gig_publish(p_gig_id uuid,p_acting_user_id uuid,p_expected_current_gig_version_id uuid,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare g public.gigs; n integer; v uuid := gen_random_uuid(); candidate jsonb;
begin
  select * into g from public.gigs where id=p_gig_id for update;
  if not found or g.client_id<>p_acting_user_id then raise exception using errcode='42501',message='M7CB_NOT_GIG_OWNER'; end if;
  if g.opportunity_lifecycle<>'draft' then raise exception using errcode='P0001',message='M7CB_INVALID_GIG_TRANSITION'; end if;
  if g.current_gig_version_id<>p_expected_current_gig_version_id then raise exception using errcode='40001',message='M7CB_STALE_GIG_VERSION'; end if;
  if not private.validate_supported_gig_snapshot(p_snapshot) then raise exception using errcode='22023',message='M7CB_INVALID_TERMS_CONTRACT'; end if;
  if (p_snapshot->>'application_deadline')::timestamptz<=statement_timestamp() then raise exception using errcode='22023',message='M7CB_FUTURE_DEADLINE_REQUIRED'; end if;
  select coalesce(max(version_number),0)+1 into n from public.gig_versions where gig_id=g.id;
  candidate := jsonb_set(jsonb_set(jsonb_set(p_snapshot,'{version_kind}','"initial_product_version"'),'{terms_contract_version}','1'),'{snapshot_schema_version}','1');
  insert into public.gig_versions(id,gig_id,version_number,snapshot_schema_version,terms_snapshot,changed_fields,created_by_actor_type,created_by_user_id)
  values(v,g.id,n,1,candidate,array['initial_publication'],'user',p_acting_user_id);
  perform private.apply_gig_snapshot_projection(g.id,candidate,v,v,'active','accepting','active');
  insert into public.marketplace_events(event_type,visibility,actor_type,actor_user_id,gig_id,event_payload)
  values('gig_published','participants','user',p_acting_user_id,g.id,jsonb_build_object('new_display_version_id',v,'new_material_version_id',v,'version_number',n));
  return jsonb_build_object('code','published','gig_id',g.id,'current_gig_version_id',v,'current_material_gig_version_id',v,'version_number',n);
end;
$$;

create or replace function public.manage_gig_upgrade(p_gig_id uuid,p_acting_user_id uuid,p_expected_current_gig_version_id uuid,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare g public.gigs; current_contract integer; n integer; v uuid:=gen_random_uuid(); candidate jsonb;
begin
  select * into g from public.gigs where id=p_gig_id for update;
  if not found or g.client_id<>p_acting_user_id then raise exception using errcode='42501',message='M7CB_NOT_GIG_OWNER'; end if;
  select terms_contract_version into current_contract from public.gig_versions where id=g.current_material_gig_version_id;
  if current_contract<>0 or g.opportunity_lifecycle<>'active' then raise exception using errcode='P0001',message='M7CB_INVALID_GIG_TRANSITION'; end if;
  if g.current_gig_version_id<>p_expected_current_gig_version_id then raise exception using errcode='40001',message='M7CB_STALE_GIG_VERSION'; end if;
  if exists(select 1 from public.applications where gig_id=g.id) or exists(select 1 from public.selection_requests where gig_id=g.id) or exists(select 1 from public.engagements where gig_id=g.id) then
    raise exception using errcode='P0001',message='M7CB_LEGACY_DEPENDENCY_RECONCILIATION_REQUIRED';
  end if;
  if not private.validate_supported_gig_snapshot(p_snapshot) then raise exception using errcode='22023',message='M7CB_INVALID_TERMS_CONTRACT'; end if;
  if (p_snapshot->>'application_deadline')::timestamptz<=statement_timestamp() then raise exception using errcode='22023',message='M7CB_FUTURE_DEADLINE_REQUIRED'; end if;
  select coalesce(max(version_number),0)+1 into n from public.gig_versions where gig_id=g.id;
  candidate:=jsonb_set(jsonb_set(jsonb_set(p_snapshot,'{version_kind}','"initial_product_version"'),'{terms_contract_version}','1'),'{snapshot_schema_version}','1');
  insert into public.gig_versions(id,gig_id,version_number,snapshot_schema_version,terms_snapshot,changed_fields,created_by_actor_type,created_by_user_id)
  values(v,g.id,n,1,candidate,array['legacy_contract_upgrade'],'user',p_acting_user_id);
  perform private.apply_gig_snapshot_projection(g.id,candidate,v,v,'active',g.application_intake,g.operational_state);
  insert into public.marketplace_events(event_type,visibility,actor_type,actor_user_id,gig_id,event_payload)
  values('gig_contract_upgraded','participants','user',p_acting_user_id,g.id,jsonb_build_object('previous_display_version_id',g.current_gig_version_id,'new_display_version_id',v,'new_material_version_id',v,'version_number',n));
  return jsonb_build_object('code','upgraded','gig_id',g.id,'current_gig_version_id',v,'current_material_gig_version_id',v,'version_number',n);
end;
$$;

create or replace function public.preview_gig_edit(p_gig_id uuid,p_acting_user_id uuid,p_expected_current_gig_version_id uuid,p_snapshot jsonb)
returns jsonb language plpgsql security definer stable set search_path = ''
as $$
declare g public.gigs;
begin
  select * into g from public.gigs where id=p_gig_id;
  if not found or g.client_id<>p_acting_user_id then raise exception using errcode='42501',message='M7CB_NOT_GIG_OWNER'; end if;
  if g.opportunity_lifecycle<>'active' then raise exception using errcode='P0001',message='M7CB_INVALID_GIG_TRANSITION'; end if;
  if g.current_gig_version_id<>p_expected_current_gig_version_id then raise exception using errcode='40001',message='M7CB_STALE_GIG_VERSION'; end if;
  if not private.validate_supported_gig_snapshot(p_snapshot) then raise exception using errcode='22023',message='M7CB_INVALID_TERMS_CONTRACT'; end if;
  if (select terms_snapshot->>'application_deadline' from public.gig_versions where id=g.current_gig_version_id) is distinct from p_snapshot->>'application_deadline'
    and (p_snapshot->>'application_deadline')::timestamptz<=statement_timestamp() then raise exception using errcode='22023',message='M7CB_FUTURE_DEADLINE_REQUIRED'; end if;
  return private.gig_edit_preview_locked(g,p_snapshot);
end;
$$;

create or replace function public.manage_gig_edit(p_gig_id uuid,p_acting_user_id uuid,p_expected_current_gig_version_id uuid,p_snapshot jsonb,p_confirm_material_effects boolean default false,p_preview_fingerprint text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare g public.gigs; preview jsonb; n integer; v uuid:=gen_random_uuid(); candidate jsonb; material boolean; fields text[]; new_material uuid;
begin
  select * into g from public.gigs where id=p_gig_id for update;
  if not found or g.client_id<>p_acting_user_id then raise exception using errcode='42501',message='M7CB_NOT_GIG_OWNER'; end if;
  if g.opportunity_lifecycle<>'active' then raise exception using errcode='P0001',message='M7CB_INVALID_GIG_TRANSITION'; end if;
  if g.current_gig_version_id<>p_expected_current_gig_version_id then raise exception using errcode='40001',message='M7CB_STALE_GIG_VERSION'; end if;
  if not private.validate_supported_gig_snapshot(p_snapshot) then raise exception using errcode='22023',message='M7CB_INVALID_TERMS_CONTRACT'; end if;
  if (select terms_snapshot->>'application_deadline' from public.gig_versions where id=g.current_gig_version_id) is distinct from p_snapshot->>'application_deadline'
    and (p_snapshot->>'application_deadline')::timestamptz<=statement_timestamp() then raise exception using errcode='22023',message='M7CB_FUTURE_DEADLINE_REQUIRED'; end if;
  preview:=private.gig_edit_preview_locked(g,p_snapshot);
  if preview->>'code'='no_effective_change' then raise exception using errcode='P0001',message='M7CB_NO_EFFECTIVE_CHANGE'; end if;
  if preview->>'code'='material_change_confirmation_required' and not p_confirm_material_effects then
    raise exception using errcode='P0001',message='M7CB_MATERIAL_CHANGE_CONFIRMATION_REQUIRED',detail=preview::text;
  end if;
  if preview->>'code'='material_change_confirmation_required' and p_preview_fingerprint is distinct from preview->>'preview_fingerprint' then
    raise exception using errcode='P0001',message='M7CB_MATERIAL_CHANGE_CONSEQUENCES_CHANGED',detail=preview::text;
  end if;
  material:=(preview->>'is_material')::boolean;
  select array_agg(value order by value) into fields from jsonb_array_elements_text(preview->'changed_fields') value;
  select coalesce(max(version_number),0)+1 into n from public.gig_versions where gig_id=g.id;
  candidate:=jsonb_set(jsonb_set(jsonb_set(p_snapshot,'{version_kind}',to_jsonb(case when material then 'material_change' else 'minor_correction' end)),'{terms_contract_version}','1'),'{snapshot_schema_version}','1');
  insert into public.gig_versions(id,gig_id,version_number,snapshot_schema_version,terms_snapshot,changed_fields,created_by_actor_type,created_by_user_id)
  values(v,g.id,n,1,candidate,fields,'user',p_acting_user_id);
  new_material:=case when material then v else g.current_material_gig_version_id end;
  if material then
    update public.selection_requests set status='invalidated',terminal_at=statement_timestamp(),invalidation_reason='gig_version_changed'
    where gig_id=g.id and status='pending' and expires_at>statement_timestamp();
  end if;
  perform private.apply_gig_snapshot_projection(g.id,candidate,v,new_material,g.opportunity_lifecycle,g.application_intake,g.operational_state);
  insert into public.marketplace_events(event_type,visibility,actor_type,actor_user_id,gig_id,event_payload)
  values('gig_version_created','participants','user',p_acting_user_id,g.id,jsonb_build_object(
    'previous_display_version_id',g.current_gig_version_id,'previous_material_version_id',g.current_material_gig_version_id,
    'new_display_version_id',v,'new_material_version_id',new_material,'changed_fields',fields,
    'is_material',material,'affected_application_count',(preview->>'affected_application_count')::integer,
    'selection_request_effect',preview->>'selection_request_effect'));
  return preview || jsonb_build_object('code',case when material then 'material_version_created' else 'minor_version_created' end,'current_gig_version_id',v,'current_material_gig_version_id',new_material,'version_number',n);
end;
$$;

create or replace function public.manage_gig_lifecycle(p_gig_id uuid,p_acting_user_id uuid,p_action text,p_reason_code text default null,p_detail jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare g public.gigs; current_snapshot jsonb; active_request public.selection_requests; closed_count integer:=0;
begin
  select * into g from public.gigs where id=p_gig_id for update;
  if not found or g.client_id<>p_acting_user_id then raise exception using errcode='42501',message='M7CB_NOT_GIG_OWNER'; end if;
  if g.opportunity_lifecycle<>'active' then raise exception using errcode='P0001',message='M7CB_INVALID_GIG_TRANSITION'; end if;
  select terms_snapshot into current_snapshot from public.gig_versions where id=g.current_gig_version_id;
  if p_action='close_intake' then
    if g.application_intake<>'accepting' or p_reason_code not in ('sufficient_applications_received','moving_to_applicant_review','hiring_timeline_changed','requirements_under_revision','other') or (p_reason_code='other' and btrim(coalesce(p_detail->>'explanation',''))='') then raise exception using errcode='22023',message='M7CB_INVALID_INTAKE_CLOSURE'; end if;
    perform private.apply_gig_snapshot_projection(g.id,current_snapshot,g.current_gig_version_id,g.current_material_gig_version_id,'active','closed',g.operational_state);
  elsif p_action='reopen_intake' then
    if g.application_intake<>'closed' then raise exception using errcode='P0001',message='M7CB_INVALID_GIG_TRANSITION'; end if;
    if (current_snapshot->>'application_deadline')::timestamptz<=statement_timestamp() then raise exception using errcode='P0001',message='M7CB_FUTURE_DEADLINE_REQUIRED'; end if;
    perform private.apply_gig_snapshot_projection(g.id,current_snapshot,g.current_gig_version_id,g.current_material_gig_version_id,'active','accepting',g.operational_state);
  elsif p_action='pause' then
    if g.operational_state<>'active' or p_reason_code not in ('internal_approval_pending','budget_temporarily_unavailable','requirements_under_revision','hiring_paused','business_delay','other') or (p_reason_code='other' and btrim(coalesce(p_detail->>'explanation',''))='') then raise exception using errcode='22023',message='M7CB_INVALID_PAUSE'; end if;
    if exists(select 1 from public.selection_requests where gig_id=g.id and status='pending' and expires_at>statement_timestamp()) then raise exception using errcode='P0001',message='M7CB_PENDING_SELECTION_BLOCKS_PAUSE'; end if;
    perform private.apply_gig_snapshot_projection(g.id,current_snapshot,g.current_gig_version_id,g.current_material_gig_version_id,'active',g.application_intake,'paused');
  elsif p_action='resume' then
    if g.operational_state<>'paused' then raise exception using errcode='P0001',message='M7CB_INVALID_GIG_TRANSITION'; end if;
    perform private.apply_gig_snapshot_projection(g.id,current_snapshot,g.current_gig_version_id,g.current_material_gig_version_id,'active',g.application_intake,'active');
  elsif p_action='cancel' then
    if p_reason_code not in ('opportunity_no_longer_required','budget_no_longer_available','business_priorities_changed','requirements_cannot_be_finalised','posted_in_error','other')
      or btrim(coalesce(p_detail->>'applicant_facing_explanation',''))='' or coalesce((p_detail->>'closes_active_records_confirmed')::boolean,false)=false
      or (p_reason_code='other' and btrim(coalesce(p_detail->>'other_explanation',''))='') then raise exception using errcode='22023',message='M7CB_INVALID_CANCELLATION'; end if;
    select * into active_request from public.selection_requests where gig_id=g.id and status='pending' and expires_at>statement_timestamp() for update;
    perform id from public.applications where gig_id=g.id and stage in ('under_review','advanced') order by id for update;
    if active_request.id is not null then update public.selection_requests set status='cancelled',terminal_at=statement_timestamp(),cancellation_reason_code='gig_cancelled',cancellation_detail=p_detail where id=active_request.id; end if;
    update public.applications set stage='closed_gig_cancelled',last_updated_at=statement_timestamp(),stage_changed_at=statement_timestamp(),stage_changed_by_actor_type='system',stage_changed_by_user_id=null,stage_reason_origin='gig_cancelled',stage_reason_code=p_reason_code,stage_reason_payload=p_detail where gig_id=g.id and stage in ('under_review','advanced');
    get diagnostics closed_count=row_count;
    perform private.apply_gig_snapshot_projection(g.id,current_snapshot,g.current_gig_version_id,g.current_material_gig_version_id,'cancelled','closed','active');
  else raise exception using errcode='22023',message='M7CB_INVALID_GIG_ACTION';
  end if;
  insert into public.marketplace_events(event_type,visibility,actor_type,actor_user_id,gig_id,selection_request_id,reason_origin,reason_code,event_payload)
  values('gig_'||p_action,'participants','user',p_acting_user_id,g.id,active_request.id,'client_gig_management',p_reason_code,
    jsonb_build_object('closed_application_count',closed_count,'detail',p_detail));
  return jsonb_build_object('code',p_action||'_completed','gig_id',g.id,'closed_application_count',closed_count,'selection_request_affected',active_request.id is not null);
end;
$$;

-- Browser authority is now limited to draft columns and draft rows. The policy
-- evaluates the trigger-produced row, so an attempted direct publication fails.
drop policy if exists "Clients can insert their own gigs" on public.gigs;
drop policy if exists "Clients can update their own gigs" on public.gigs;
create policy "Clients can insert their own genuine drafts" on public.gigs for insert to authenticated
with check ((select auth.uid())=client_id and opportunity_lifecycle='draft' and application_intake='closed' and operational_state='active' and status='draft' and exists(select 1 from public.user_profiles where id=(select auth.uid()) and role='client'));
create policy "Clients can update their own genuine drafts" on public.gigs for update to authenticated
using ((select auth.uid())=client_id and opportunity_lifecycle='draft' and exists(select 1 from public.user_profiles where id=(select auth.uid()) and role='client'))
with check ((select auth.uid())=client_id and opportunity_lifecycle='draft' and application_intake='closed' and operational_state='active' and status='draft');

revoke insert, update, delete on public.gigs from authenticated;
grant insert (id,client_id,title,description,tech_category,required_skills,preferred_skills,budget_min,budget_max,difficulty_level,seniority_needed,deliverables,work_mode,deadline,status,created_at,updated_at) on public.gigs to authenticated;
grant update (title,description,tech_category,required_skills,preferred_skills,budget_min,budget_max,difficulty_level,seniority_needed,deliverables,work_mode,deadline,updated_at) on public.gigs to authenticated;

revoke all on function public.manage_gig_publish(uuid,uuid,uuid,jsonb), public.manage_gig_upgrade(uuid,uuid,uuid,jsonb), public.preview_gig_edit(uuid,uuid,uuid,jsonb), public.manage_gig_edit(uuid,uuid,uuid,jsonb,boolean,text), public.manage_gig_lifecycle(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.manage_gig_publish(uuid,uuid,uuid,jsonb), public.manage_gig_upgrade(uuid,uuid,uuid,jsonb), public.preview_gig_edit(uuid,uuid,uuid,jsonb), public.manage_gig_edit(uuid,uuid,uuid,jsonb,boolean,text), public.manage_gig_lifecycle(uuid,uuid,text,text,jsonb) to service_role;

comment on function public.manage_gig_edit(uuid,uuid,uuid,jsonb,boolean,text) is 'Backend-only complete snapshot edit. Lock order: gig, request, applications by UUID, events.';
comment on function public.manage_gig_lifecycle(uuid,uuid,text,text,jsonb) is 'Backend-only lifecycle actions. Lock order: gig, request, applications by UUID, events.';

commit;
