-- GigMatch AI Milestone 7B: versioned marketplace persistence, RLS, and atomic confirmation.
-- Global lock order for every marketplace database function:
-- gig -> selection request -> selected application -> remaining applications by id -> engagement.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Historical `closed` had only a generic UI label and no auditable filled/cancelled
-- discriminator. Never silently reinterpret existing rows. The exception is a
-- deterministic unresolved-row report and aborts the migration before backfill.
do $$
declare
  unresolved_ids text;
begin
  select string_agg(id::text, ', ' order by id)
  into unresolved_ids
  from (select id from public.gigs where status = 'closed' order by id limit 100) unresolved;

  if unresolved_ids is not null then
    raise exception using
      errcode = 'P0001',
      message = 'M7B_UNRESOLVED_LEGACY_CLOSED_GIGS',
      detail = format('Resolve legacy closed gig ids before migration: %s', unresolved_ids),
      hint = 'Classify each row explicitly; do not assume filled, cancelled, or intake-closed.';
  end if;
end;
$$;

create or replace function private.array_has_no_duplicates(input_values text[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select cardinality(input_values) = (select count(distinct item) from unnest(input_values) item)
$$;

create or replace function private.reject_immutable_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only and cannot be %', tg_table_name, lower(tg_op);
end;
$$;

create table public.gig_versions (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null,
  version_number integer not null check (version_number > 0),
  version_kind text generated always as (terms_snapshot ->> 'version_kind') stored not null,
  terms_contract_version integer generated always as ((terms_snapshot ->> 'terms_contract_version')::integer) stored not null,
  snapshot_schema_version integer not null check (snapshot_schema_version > 0),
  terms_snapshot jsonb not null check (jsonb_typeof(terms_snapshot) = 'object'),
  changed_fields text[] not null default '{}',
  payment_structure text generated always as (terms_snapshot ->> 'payment_structure') stored not null,
  currency text generated always as (terms_snapshot ->> 'currency') stored,
  created_by_actor_type text not null check (created_by_actor_type in ('user', 'system')),
  created_by_user_id uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint gig_versions_actor_check check (
    (created_by_actor_type = 'user' and created_by_user_id is not null)
    or (created_by_actor_type = 'system' and created_by_user_id is null)
  ),
  constraint gig_versions_kind_check check (
    version_kind in ('legacy_import', 'initial_product_version', 'material_change', 'minor_correction')
  ),
  constraint gig_versions_contract_check check (
    (terms_contract_version = 0 and version_kind = 'legacy_import')
    or terms_contract_version = 1
  ),
  constraint gig_versions_snapshot_version_check check (
    terms_snapshot ? 'snapshot_schema_version'
    and terms_snapshot ->> 'snapshot_schema_version' = snapshot_schema_version::text
  ),
  constraint gig_versions_changed_fields_unique check (private.array_has_no_duplicates(changed_fields)),
  constraint gig_versions_critical_projection_check check (
    (terms_contract_version = 0 and payment_structure = 'legacy_unspecified' and currency is null)
    or (
      terms_contract_version = 1
      and payment_structure in ('fixed_price', 'hourly', 'open_to_proposals')
      and currency ~ '^[A-Z]{3}$'
    )
  ),
  constraint gig_versions_gig_version_number_key unique (gig_id, version_number),
  constraint gig_versions_gig_id_id_key unique (gig_id, id),
  constraint gig_versions_gig_fk foreign key (gig_id) references public.gigs(id)
    on delete restrict deferrable initially deferred
);

create index gig_versions_gig_id_idx on public.gig_versions (gig_id);

alter table public.gigs
  add column opportunity_lifecycle text,
  add column application_intake text,
  add column operational_state text,
  add column current_gig_version_id uuid,
  add column current_material_gig_version_id uuid;

update public.gigs
set opportunity_lifecycle = case status when 'draft' then 'draft' when 'open' then 'active' end,
    application_intake = case status when 'draft' then 'closed' when 'open' then 'accepting' end,
    operational_state = 'active';

insert into public.gig_versions (
  id,
  gig_id,
  version_number,
  snapshot_schema_version,
  terms_snapshot,
  changed_fields,
  created_by_actor_type,
  created_at
)
select
  gen_random_uuid(),
  g.id,
  1,
  1,
  jsonb_build_object(
    'version_kind', 'legacy_import',
    'terms_contract_version', 0,
    'snapshot_schema_version', 1,
    'payment_structure', 'legacy_unspecified',
    'currency', null,
    'title', g.title,
    'description', g.description,
    'scope', jsonb_build_object('tech_category', g.tech_category),
    'client_payment', jsonb_build_object(
      'payment_structure', 'legacy_unspecified',
      'budget_min', g.budget_min,
      'budget_max', g.budget_max
    ),
    'required_skills', to_jsonb(coalesce(g.required_skills, '{}')),
    'preferred_skills', to_jsonb(coalesce(g.preferred_skills, '{}')),
    'experience_requirement', g.seniority_needed,
    'difficulty_level', g.difficulty_level,
    'work_mode', g.work_mode,
    'location_requirements', null,
    'weekly_commitment', null,
    'application_deadline', g.deadline,
    'project_deadline', g.deadline,
    'deliverables', to_jsonb(coalesce(g.deliverables, '{}')),
    'assumptions', jsonb_build_array('Imported from the pre-Milestone-7 gig schema; terms may be incomplete.')
  ),
  array['legacy_import'],
  'system',
  g.created_at
from public.gigs g;

update public.gigs g
set current_gig_version_id = v.id,
    current_material_gig_version_id = v.id
from public.gig_versions v
where v.gig_id = g.id and v.version_number = 1;

alter table public.gigs drop constraint if exists gigs_status_check;
alter table public.gigs alter column status drop default;
alter table public.gigs
  alter column opportunity_lifecycle set not null,
  alter column application_intake set not null,
  alter column operational_state set not null,
  alter column current_gig_version_id set not null,
  alter column current_material_gig_version_id set not null,
  add constraint gigs_opportunity_lifecycle_check
    check (opportunity_lifecycle in ('draft', 'active', 'filled', 'cancelled')),
  add constraint gigs_application_intake_check
    check (application_intake in ('accepting', 'closed')),
  add constraint gigs_operational_state_check
    check (operational_state in ('active', 'paused')),
  add constraint gigs_marketplace_state_check check (
    (opportunity_lifecycle = 'draft' and application_intake = 'closed' and operational_state = 'active')
    or (opportunity_lifecycle = 'active')
    or (opportunity_lifecycle in ('filled', 'cancelled') and application_intake = 'closed' and operational_state = 'active')
  ),
  add constraint gigs_status_projection_check
    check (status in ('draft', 'open', 'paused', 'closed_to_new_applications', 'filled', 'cancelled')),
  add constraint gigs_id_current_display_version_fk
    foreign key (id, current_gig_version_id)
    references public.gig_versions(gig_id, id)
    on delete restrict deferrable initially deferred,
  add constraint gigs_id_current_material_version_fk
    foreign key (id, current_material_gig_version_id)
    references public.gig_versions(gig_id, id)
    on delete restrict deferrable initially deferred;

-- Backfilled non-empty databases have deferred FK trigger events at this point.
-- Flush them before later ALTER TABLE statements, then restore the aggregate-
-- creation default for future cyclic parent/version inserts.
set constraints all immediate;
set constraints all deferred;

create index gigs_current_gig_version_id_idx on public.gigs (current_gig_version_id);
create index gigs_current_material_gig_version_id_idx on public.gigs (current_material_gig_version_id);

create or replace function private.gig_product_status(
  lifecycle text,
  intake text,
  operations text
)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when lifecycle = 'draft' then 'draft'
    when lifecycle = 'filled' then 'filled'
    when lifecycle = 'cancelled' then 'cancelled'
    when operations = 'paused' then 'paused'
    when intake = 'closed' then 'closed_to_new_applications'
    else 'open'
  end
$$;

create or replace function private.legacy_gig_terms_snapshot(g public.gigs)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'version_kind', 'legacy_import',
    'terms_contract_version', 0,
    'snapshot_schema_version', 1,
    'payment_structure', 'legacy_unspecified',
    'currency', null,
    'title', g.title,
    'description', g.description,
    'scope', jsonb_build_object('tech_category', g.tech_category),
    'client_payment', jsonb_build_object(
      'payment_structure', 'legacy_unspecified',
      'budget_min', g.budget_min,
      'budget_max', g.budget_max
    ),
    'required_skills', to_jsonb(coalesce(g.required_skills, '{}')),
    'preferred_skills', to_jsonb(coalesce(g.preferred_skills, '{}')),
    'experience_requirement', g.seniority_needed,
    'difficulty_level', g.difficulty_level,
    'work_mode', g.work_mode,
    'location_requirements', null,
    'weekly_commitment', null,
    'application_deadline', g.deadline,
    'project_deadline', g.deadline,
    'deliverables', to_jsonb(coalesce(g.deliverables, '{}')),
    'assumptions', jsonb_build_array('Created through the pre-Milestone-7 compatibility path; Milestone-7 selection is disabled.')
  )
$$;

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
        when 'draft' then
          new.opportunity_lifecycle := 'draft'; new.application_intake := 'closed'; new.operational_state := 'active';
        when 'open' then
          new.opportunity_lifecycle := 'active'; new.application_intake := 'accepting'; new.operational_state := 'active';
        when 'closed' then
          new.opportunity_lifecycle := 'active'; new.application_intake := 'closed'; new.operational_state := 'active';
        else raise exception 'Legacy gig input status must be draft, open, or closed';
      end case;
    elsif new.status is not null and new.status is distinct from private.gig_product_status(
      new.opportunity_lifecycle, new.application_intake, new.operational_state
    ) then
      raise exception 'Gig status conflicts with authoritative marketplace state';
    end if;

    new.status := private.gig_product_status(new.opportunity_lifecycle, new.application_intake, new.operational_state);
    if new.current_gig_version_id is not null or new.current_material_gig_version_id is not null then
      if new.current_gig_version_id is null or new.current_material_gig_version_id is null then
        raise exception 'Both gig version pointers are required together';
      end if;
      -- Controlled aggregate creation supplies both pre-generated pointers and
      -- inserts the referenced immutable version(s) later in the same deferred transaction.
      return new;
    end if;
    new_version_id := gen_random_uuid();
    new.current_gig_version_id := new_version_id;
    new.current_material_gig_version_id := new_version_id;
    insert into public.gig_versions (
      id, gig_id, version_number, snapshot_schema_version, terms_snapshot,
      changed_fields, created_by_actor_type, created_at
    ) values (
      new_version_id, new.id, 1, 1, private.legacy_gig_terms_snapshot(new),
      array['legacy_compatibility_insert'], 'system', coalesce(new.created_at, now())
    );
    return new;
  end if;

  if new.status is distinct from old.status
     and new.opportunity_lifecycle is not distinct from old.opportunity_lifecycle
     and new.application_intake is not distinct from old.application_intake
     and new.operational_state is not distinct from old.operational_state then
    case new.status
      when 'draft' then
        new.opportunity_lifecycle := 'draft'; new.application_intake := 'closed'; new.operational_state := 'active';
      when 'open' then
        new.opportunity_lifecycle := 'active'; new.application_intake := 'accepting'; new.operational_state := 'active';
      when 'closed' then
        new.opportunity_lifecycle := 'active'; new.application_intake := 'closed'; new.operational_state := 'active';
      else raise exception 'Direct product-state writes are forbidden';
    end case;
  elsif (new.opportunity_lifecycle, new.application_intake, new.operational_state)
        is distinct from (old.opportunity_lifecycle, old.application_intake, old.operational_state)
        and new.status is distinct from old.status
        and new.status is distinct from private.gig_product_status(
          new.opportunity_lifecycle, new.application_intake, new.operational_state
        ) then
    raise exception 'Gig status conflicts with authoritative marketplace state';
  end if;

  new.status := private.gig_product_status(new.opportunity_lifecycle, new.application_intake, new.operational_state);
  terms_changed := (new.title, new.description, new.tech_category, new.required_skills,
    new.preferred_skills, new.budget_min, new.budget_max, new.difficulty_level,
    new.seniority_needed, new.deliverables, new.work_mode, new.deadline)
    is distinct from
    (old.title, old.description, old.tech_category, old.required_skills,
    old.preferred_skills, old.budget_min, old.budget_max, old.difficulty_level,
    old.seniority_needed, old.deliverables, old.work_mode, old.deadline);

  if terms_changed then
    select coalesce(max(version_number), 0) + 1 into new_version_number
    from public.gig_versions where gig_id = new.id;
    new_version_id := gen_random_uuid();
    insert into public.gig_versions (
      id, gig_id, version_number, snapshot_schema_version, terms_snapshot,
      changed_fields, created_by_actor_type, created_at
    ) values (
      new_version_id, new.id, new_version_number, 1, private.legacy_gig_terms_snapshot(new),
      array['legacy_compatibility_update'], 'system', now()
    );
    new.current_gig_version_id := new_version_id;
    new.current_material_gig_version_id := new_version_id;
  end if;
  return new;
end;
$$;

create trigger sync_gig_marketplace_state_and_legacy_version
before insert or update on public.gigs
for each row execute function private.sync_gig_marketplace_state_and_legacy_version();

create trigger reject_gig_version_mutation
before update or delete on public.gig_versions
for each row execute function private.reject_immutable_row();

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs(id) on delete restrict,
  freelancer_profile_id uuid not null references public.freelancer_profiles(id) on delete restrict,
  stage text not null check (stage in (
    'under_review', 'advanced', 'confirmed', 'not_selected', 'withdrawn', 'closed_gig_cancelled'
  )),
  current_version_id uuid not null,
  submitted_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  stage_changed_at timestamptz not null default now(),
  stage_changed_by_actor_type text not null check (stage_changed_by_actor_type in ('user', 'system')),
  stage_changed_by_user_id uuid references public.user_profiles(id) on delete restrict,
  stage_reason_origin text,
  stage_reason_code text,
  stage_reason_payload jsonb,
  constraint applications_gig_freelancer_key unique (gig_id, freelancer_profile_id),
  constraint applications_id_gig_id_key unique (id, gig_id),
  constraint applications_id_current_version_key unique (id, current_version_id),
  constraint applications_actor_check check (
    (stage_changed_by_actor_type = 'user' and stage_changed_by_user_id is not null)
    or (stage_changed_by_actor_type = 'system' and stage_changed_by_user_id is null)
  ),
  constraint applications_time_check check (
    last_updated_at >= submitted_at and stage_changed_at >= submitted_at
  ),
  constraint applications_reason_payload_check check (
    stage_reason_payload is null or jsonb_typeof(stage_reason_payload) = 'object'
  ),
  constraint applications_stage_reason_check check (
    (stage in ('under_review', 'advanced', 'confirmed')
      and stage_reason_origin is null and stage_reason_code is null and stage_reason_payload is null)
    or (stage = 'not_selected'
      and stage_reason_origin in ('client_decision', 'selection_confirmed')
      and stage_reason_code is not null
      and stage_reason_payload is not null
      and (
        (stage_reason_origin = 'selection_confirmed'
          and stage_reason_code = 'another_applicant_selected'
          and stage_changed_by_actor_type = 'system')
        or (stage_reason_origin = 'client_decision'
          and stage_reason_code <> 'another_applicant_selected')
      ))
    or (stage = 'withdrawn'
      and stage_reason_origin = 'freelancer_withdrawal'
      and stage_reason_code is not null
      and stage_reason_payload is not null)
    or (stage = 'closed_gig_cancelled'
      and stage_reason_origin = 'gig_cancelled'
      and stage_reason_code is not null
      and stage_reason_payload is not null)
  )
);

create unique index applications_one_confirmed_per_gig_idx
on public.applications (gig_id) where stage = 'confirmed';
create index applications_gig_id_idx on public.applications (gig_id);
create index applications_freelancer_profile_id_idx on public.applications (freelancer_profile_id);
create index applications_stage_idx on public.applications (stage);
create index applications_current_version_id_idx on public.applications (current_version_id);

create table public.application_versions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  gig_id uuid not null,
  version_number integer not null check (version_number > 0),
  gig_version_id uuid not null,
  origin text not null check (origin in (
    'initial_submission', 'freelancer_edit', 'gig_change_terms_reaffirmed',
    'gig_change_proposal_updated', 'reconsideration'
  )),
  proposal_contract_version integer generated always as ((proposal_snapshot ->> 'proposal_contract_version')::integer) stored not null,
  snapshot_schema_version integer not null check (snapshot_schema_version > 0),
  cover_note text not null check (btrim(cover_note) <> ''),
  proposal_snapshot jsonb not null check (jsonb_typeof(proposal_snapshot) = 'object'),
  timeline_snapshot jsonb not null check (jsonb_typeof(timeline_snapshot) = 'object'),
  availability_snapshot jsonb not null check (jsonb_typeof(availability_snapshot) = 'object'),
  scope_snapshot jsonb not null check (jsonb_typeof(scope_snapshot) = 'object'),
  payment_structure text generated always as (proposal_snapshot ->> 'payment_structure') stored not null,
  currency text generated always as (proposal_snapshot ->> 'currency') stored not null,
  created_by_user_id uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint application_versions_application_id_id_key unique (application_id, id),
  constraint application_versions_application_id_id_gig_version_key unique (application_id, id, gig_version_id),
  constraint application_versions_id_gig_id_key unique (id, gig_id),
  constraint application_versions_application_number_key unique (application_id, version_number),
  constraint application_versions_contract_check check (proposal_contract_version > 0),
  constraint application_versions_snapshot_version_check check (
    proposal_snapshot ? 'snapshot_schema_version'
    and proposal_snapshot ->> 'snapshot_schema_version' = snapshot_schema_version::text
  ),
  constraint application_versions_projection_check check (
    payment_structure in ('fixed_price', 'hourly', 'open_to_proposals')
    and currency ~ '^[A-Z]{3}$'
  ),
  constraint application_versions_application_gig_fk
    foreign key (application_id, gig_id) references public.applications(id, gig_id)
    on delete restrict deferrable initially deferred,
  constraint application_versions_gig_version_fk
    foreign key (gig_id, gig_version_id) references public.gig_versions(gig_id, id)
    on delete restrict deferrable initially deferred
);

alter table public.applications
  add constraint applications_current_version_fk
  foreign key (id, current_version_id)
  references public.application_versions(application_id, id)
  on delete restrict deferrable initially deferred;

create index application_versions_application_id_idx on public.application_versions (application_id);
create index application_versions_gig_id_idx on public.application_versions (gig_id);
create index application_versions_gig_version_id_idx on public.application_versions (gig_version_id);

create or replace function private.enforce_application_version_chronology()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  previous_number integer;
  previous_created_at timestamptz;
begin
  perform 1 from public.applications where id = new.application_id for update;
  select version_number, created_at
  into previous_number, previous_created_at
  from public.application_versions
  where application_id = new.application_id
  order by version_number desc
  limit 1;

  if previous_number is null then
    if new.version_number <> 1 then
      raise exception 'First application version must have version_number 1';
    end if;
  else
    if new.version_number <> previous_number + 1 then
      raise exception 'Application version_number must increment by exactly one';
    end if;
    if new.created_at < previous_created_at then
      raise exception 'Application version created_at cannot move backwards';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_application_version_chronology
before insert on public.application_versions
for each row execute function private.enforce_application_version_chronology();

create or replace function private.protect_application_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Applications cannot be physically deleted';
  end if;
  if (new.id, new.gig_id, new.freelancer_profile_id, new.submitted_at)
      is distinct from (old.id, old.gig_id, old.freelancer_profile_id, old.submitted_at) then
    raise exception 'Application identity fields are immutable';
  end if;
  return new;
end;
$$;

create trigger protect_application_mutation
before update or delete on public.applications
for each row execute function private.protect_application_mutation();

create trigger reject_application_version_mutation
before update or delete on public.application_versions
for each row execute function private.reject_immutable_row();

create table public.selection_requests (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null,
  application_id uuid not null,
  application_version_id uuid not null,
  gig_version_id uuid not null,
  created_by_user_id uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in (
    'pending', 'accepted', 'declined', 'revision_requested', 'expired', 'cancelled', 'invalidated'
  )),
  terminal_at timestamptz,
  decline_disposition text check (decline_disposition in ('remain_interested', 'withdraw_completely')),
  cancellation_reason_code text,
  cancellation_detail jsonb,
  invalidation_reason text check (invalidation_reason in ('application_version_changed', 'gig_version_changed')),
  previous_selection_request_id uuid references public.selection_requests(id) on delete restrict,
  commercial_warning_code text,
  commercial_acknowledged_by_user_id uuid references public.user_profiles(id) on delete restrict,
  commercial_acknowledged_at timestamptz,
  constraint selection_requests_application_gig_fk
    foreign key (application_id, gig_id) references public.applications(id, gig_id) on delete restrict,
  constraint selection_requests_gig_version_fk
    foreign key (gig_id, gig_version_id) references public.gig_versions(gig_id, id) on delete restrict,
  constraint selection_requests_exact_version_fk
    foreign key (application_id, application_version_id, gig_version_id)
    references public.application_versions(application_id, id, gig_version_id) on delete restrict,
  constraint selection_requests_time_check check (
    expires_at > created_at
    and (terminal_at is null or terminal_at >= created_at)
    and (commercial_acknowledged_at is null or commercial_acknowledged_at >= created_at)
  ),
  constraint selection_requests_cancellation_detail_check check (
    cancellation_detail is null or jsonb_typeof(cancellation_detail) = 'object'
  ),
  constraint selection_requests_acknowledgement_check check (
    (commercial_warning_code is null
      and commercial_acknowledged_by_user_id is null
      and commercial_acknowledged_at is null)
    or (commercial_warning_code is not null
      and commercial_acknowledged_by_user_id is not null
      and commercial_acknowledged_at is not null)
  ),
  constraint selection_requests_terminal_metadata_check check (
    (status = 'pending' and terminal_at is null and decline_disposition is null
      and cancellation_reason_code is null and cancellation_detail is null and invalidation_reason is null)
    or (status = 'declined' and terminal_at is not null and decline_disposition is not null
      and cancellation_reason_code is null and cancellation_detail is null and invalidation_reason is null)
    or (status = 'cancelled' and terminal_at is not null and cancellation_reason_code is not null
      and cancellation_detail is not null and decline_disposition is null and invalidation_reason is null)
    or (status = 'invalidated' and terminal_at is not null and invalidation_reason is not null
      and decline_disposition is null and cancellation_reason_code is null and cancellation_detail is null)
    or (status in ('accepted', 'expired', 'revision_requested') and terminal_at is not null
      and decline_disposition is null and cancellation_reason_code is null
      and cancellation_detail is null and invalidation_reason is null)
  )
);

create unique index selection_requests_one_pending_per_gig_idx
on public.selection_requests (gig_id) where status = 'pending';
create index selection_requests_gig_id_idx on public.selection_requests (gig_id);
create index selection_requests_application_id_idx on public.selection_requests (application_id);
create index selection_requests_status_idx on public.selection_requests (status);
create index selection_requests_expires_at_idx on public.selection_requests (expires_at);

create or replace function private.protect_selection_request_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Selection requests cannot be physically deleted';
  end if;
  if (new.id, new.gig_id, new.application_id, new.application_version_id,
      new.gig_version_id, new.created_by_user_id, new.created_at, new.expires_at,
      new.previous_selection_request_id, new.commercial_warning_code,
      new.commercial_acknowledged_by_user_id, new.commercial_acknowledged_at)
      is distinct from
     (old.id, old.gig_id, old.application_id, old.application_version_id,
      old.gig_version_id, old.created_by_user_id, old.created_at, old.expires_at,
      old.previous_selection_request_id, old.commercial_warning_code,
      old.commercial_acknowledged_by_user_id, old.commercial_acknowledged_at) then
    raise exception 'Selection request bindings and acknowledgement are immutable';
  end if;
  return new;
end;
$$;

create trigger protect_selection_request_mutation
before update or delete on public.selection_requests
for each row execute function private.protect_selection_request_mutation();

create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null,
  application_id uuid not null,
  selection_request_id uuid not null unique references public.selection_requests(id) on delete restrict,
  client_participant_user_id uuid not null references public.user_profiles(id) on delete restrict,
  freelancer_participant_user_id uuid not null references public.user_profiles(id) on delete restrict,
  status text not null check (status in (
    'confirmed', 'kickoff_pending', 'in_progress', 'completion_pending',
    'completed', 'cancellation_pending', 'cancelled'
  )),
  accepted_application_version_id uuid not null,
  accepted_gig_version_id uuid not null,
  accepted_terms_contract_version integer not null check (accepted_terms_contract_version > 0),
  accepted_terms_snapshot jsonb not null check (jsonb_typeof(accepted_terms_snapshot) = 'object'),
  snapshot_schema_version integer not null check (snapshot_schema_version > 0),
  confirmed_at timestamptz not null,
  work_started_by_user_id uuid references public.user_profiles(id) on delete restrict,
  work_started_at timestamptz,
  completion_requested_by_user_id uuid references public.user_profiles(id) on delete restrict,
  completion_requested_at timestamptz,
  cancellation_requested_by_user_id uuid references public.user_profiles(id) on delete restrict,
  cancellation_requested_at timestamptz,
  cancellation_reason_code text,
  cancellation_detail jsonb,
  previous_active_status text check (previous_active_status in (
    'confirmed', 'kickoff_pending', 'in_progress', 'completion_pending'
  )),
  constraint engagements_distinct_participants_check
    check (client_participant_user_id <> freelancer_participant_user_id),
  constraint engagements_application_gig_fk
    foreign key (application_id, gig_id) references public.applications(id, gig_id) on delete restrict,
  constraint engagements_exact_version_fk
    foreign key (application_id, accepted_application_version_id, accepted_gig_version_id)
    references public.application_versions(application_id, id, gig_version_id) on delete restrict,
  constraint engagements_snapshot_version_check check (
    accepted_terms_snapshot ? 'snapshot_schema_version'
    and accepted_terms_snapshot ? 'accepted_terms_contract_version'
    and accepted_terms_snapshot ->> 'snapshot_schema_version' = snapshot_schema_version::text
    and accepted_terms_snapshot ->> 'accepted_terms_contract_version' = accepted_terms_contract_version::text
  ),
  constraint engagements_actor_pairs_check check (
    ((work_started_by_user_id is null) = (work_started_at is null))
    and ((completion_requested_by_user_id is null) = (completion_requested_at is null))
    and ((cancellation_requested_by_user_id is null) = (cancellation_requested_at is null))
  ),
  constraint engagements_participant_actors_check check (
    (work_started_by_user_id is null or work_started_by_user_id in (client_participant_user_id, freelancer_participant_user_id))
    and (completion_requested_by_user_id is null or completion_requested_by_user_id in (client_participant_user_id, freelancer_participant_user_id))
    and (cancellation_requested_by_user_id is null or cancellation_requested_by_user_id in (client_participant_user_id, freelancer_participant_user_id))
  ),
  constraint engagements_timestamps_check check (
    (work_started_at is null or work_started_at >= confirmed_at)
    and (completion_requested_at is null or completion_requested_at >= coalesce(work_started_at, confirmed_at))
    and (cancellation_requested_at is null or cancellation_requested_at >= coalesce(completion_requested_at, work_started_at, confirmed_at))
  ),
  constraint engagements_status_metadata_check check (
    (status in ('confirmed', 'kickoff_pending')
      and work_started_at is null and completion_requested_at is null and cancellation_requested_at is null
      and cancellation_reason_code is null and cancellation_detail is null and previous_active_status is null)
    or (status = 'in_progress' and work_started_at is not null
      and completion_requested_at is null and cancellation_requested_at is null
      and cancellation_reason_code is null and cancellation_detail is null and previous_active_status is null)
    or (status in ('completion_pending', 'completed') and work_started_at is not null
      and completion_requested_at is not null
      and cancellation_requested_at is null and cancellation_reason_code is null
      and cancellation_detail is null and previous_active_status is null)
    or (status in ('cancellation_pending', 'cancelled') and cancellation_requested_at is not null
      and cancellation_reason_code is not null and cancellation_detail is not null
      and previous_active_status is not null
      and (
        (previous_active_status in ('confirmed', 'kickoff_pending')
          and work_started_at is null and completion_requested_at is null)
        or (previous_active_status = 'in_progress'
          and work_started_at is not null and completion_requested_at is null)
        or (previous_active_status = 'completion_pending'
          and work_started_at is not null and completion_requested_at is not null)
      ))
  ),
  constraint engagements_cancellation_detail_check check (
    cancellation_detail is null or jsonb_typeof(cancellation_detail) = 'object'
  )
);

create unique index engagements_one_non_cancelled_per_gig_idx
on public.engagements (gig_id) where status <> 'cancelled';
create index engagements_gig_id_idx on public.engagements (gig_id);
create index engagements_application_id_idx on public.engagements (application_id);
create index engagements_selection_request_id_idx on public.engagements (selection_request_id);
create index engagements_client_participant_idx on public.engagements (client_participant_user_id);
create index engagements_freelancer_participant_idx on public.engagements (freelancer_participant_user_id);
create index engagements_status_idx on public.engagements (status);

create or replace function private.protect_engagement_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Engagements cannot be physically deleted';
  end if;
  if (new.id, new.gig_id, new.application_id, new.selection_request_id,
      new.client_participant_user_id, new.freelancer_participant_user_id,
      new.accepted_application_version_id, new.accepted_gig_version_id,
      new.accepted_terms_contract_version, new.accepted_terms_snapshot,
      new.snapshot_schema_version, new.confirmed_at)
      is distinct from
     (old.id, old.gig_id, old.application_id, old.selection_request_id,
      old.client_participant_user_id, old.freelancer_participant_user_id,
      old.accepted_application_version_id, old.accepted_gig_version_id,
      old.accepted_terms_contract_version, old.accepted_terms_snapshot,
      old.snapshot_schema_version, old.confirmed_at) then
    raise exception 'Engagement identity and accepted terms are immutable';
  end if;
  return new;
end;
$$;

create trigger protect_engagement_mutation
before update or delete on public.engagements
for each row execute function private.protect_engagement_mutation();

create table public.marketplace_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  event_schema_version integer not null default 1 check (event_schema_version > 0),
  visibility text not null check (visibility in (
    'participants', 'client_private', 'freelancer_private', 'admin_internal'
  )),
  actor_type text not null check (actor_type in ('user', 'system')),
  actor_user_id uuid references public.user_profiles(id) on delete restrict,
  gig_id uuid references public.gigs(id) on delete restrict,
  application_id uuid references public.applications(id) on delete restrict,
  selection_request_id uuid references public.selection_requests(id) on delete restrict,
  engagement_id uuid references public.engagements(id) on delete restrict,
  reason_origin text,
  reason_code text,
  event_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(event_payload) = 'object'),
  occurred_at timestamptz not null default now(),
  constraint marketplace_events_actor_check check (
    (actor_type = 'user' and actor_user_id is not null)
    or (actor_type = 'system' and actor_user_id is null)
  ),
  constraint marketplace_events_anchored_check check (
    gig_id is not null or application_id is not null or selection_request_id is not null or engagement_id is not null
  ),
  constraint marketplace_events_required_refs_check check (
    (event_type not in ('selection_accepted', 'engagement_created', 'application_automatically_not_selected'))
    or (event_type in ('selection_accepted', 'engagement_created')
      and gig_id is not null and application_id is not null
      and selection_request_id is not null and engagement_id is not null)
    or (event_type = 'application_automatically_not_selected'
      and gig_id is not null and application_id is not null)
  ),
  constraint marketplace_events_payload_safety_check check (
    not (event_payload ?| array[
      'proposal_snapshot', 'accepted_terms_snapshot', 'raw_resume_text', 'raw_gig_parse',
      'contact_value', 'password', 'otp', 'access_token', 'service_role', 'embedding', 'raw_semantic_text', 'secret'
    ])
  )
);

create index marketplace_events_gig_id_idx on public.marketplace_events (gig_id);
create index marketplace_events_application_id_idx on public.marketplace_events (application_id);
create index marketplace_events_selection_request_id_idx on public.marketplace_events (selection_request_id);
create index marketplace_events_engagement_id_idx on public.marketplace_events (engagement_id);
create index marketplace_events_visibility_idx on public.marketplace_events (visibility);
create index marketplace_events_occurred_at_idx on public.marketplace_events (occurred_at);

create trigger reject_marketplace_event_mutation
before update or delete on public.marketplace_events
for each row execute function private.reject_immutable_row();

-- Small boolean-only SECURITY DEFINER helpers keep policy queries non-recursive.
create or replace function private.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid()) and exists (
    select 1 from public.user_profiles up
    where up.id = p_user_id and up.role = 'admin'
  )
$$;

create or replace function private.owns_gig(p_user_id uuid, p_target_gig_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid()) and exists (
    select 1 from public.gigs g
    where g.id = p_target_gig_id and g.client_id = p_user_id
  )
$$;

create or replace function private.owns_application(p_user_id uuid, p_target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid()) and exists (
    select 1
    from public.applications a
    join public.freelancer_profiles fp on fp.id = a.freelancer_profile_id
    where a.id = p_target_application_id and fp.user_id = p_user_id
  )
$$;

create or replace function private.is_engagement_participant(p_user_id uuid, p_target_engagement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid()) and exists (
    select 1 from public.engagements e
    where e.id = p_target_engagement_id
      and p_user_id in (e.client_participant_user_id, e.freelancer_participant_user_id)
  )
$$;

create or replace function private.can_read_gig_version(p_user_id uuid, p_target_gig_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid()) and (
    private.is_admin(p_user_id)
    or exists (
      select 1 from public.gig_versions gv
      join public.gigs g on g.id = gv.gig_id
      where gv.id = p_target_gig_version_id and g.client_id = p_user_id
    )
    or exists (
      select 1
      from public.application_versions av
      join public.applications a on a.id = av.application_id
      join public.freelancer_profiles fp on fp.id = a.freelancer_profile_id
      where av.gig_version_id = p_target_gig_version_id and fp.user_id = p_user_id
    )
  )
$$;

create or replace function private.can_read_marketplace_event(
  p_user_id uuid,
  p_event_visibility text,
  p_target_gig_id uuid,
  p_target_application_id uuid,
  p_target_engagement_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_user_id is distinct from (select auth.uid()) then false
    when private.is_admin(p_user_id) then true
    when p_event_visibility = 'admin_internal' then false
    when p_event_visibility = 'client_private' then private.owns_gig(p_user_id, p_target_gig_id)
    when p_event_visibility = 'freelancer_private' then
      private.owns_application(p_user_id, p_target_application_id)
      or private.is_engagement_participant(p_user_id, p_target_engagement_id)
    when p_event_visibility = 'participants' then
      private.owns_gig(p_user_id, p_target_gig_id)
      or private.owns_application(p_user_id, p_target_application_id)
      or private.is_engagement_participant(p_user_id, p_target_engagement_id)
    else false
  end
$$;

alter table public.gig_versions enable row level security;
alter table public.applications enable row level security;
alter table public.application_versions enable row level security;
alter table public.selection_requests enable row level security;
alter table public.engagements enable row level security;
alter table public.marketplace_events enable row level security;

create policy "Participants can read relevant gig versions"
on public.gig_versions for select to authenticated
using (private.can_read_gig_version((select auth.uid()), id));

create policy "Participants can read relevant applications"
on public.applications for select to authenticated
using (
  private.is_admin((select auth.uid()))
  or private.owns_gig((select auth.uid()), gig_id)
  or private.owns_application((select auth.uid()), id)
);

create policy "Participants can read relevant application versions"
on public.application_versions for select to authenticated
using (
  private.is_admin((select auth.uid()))
  or private.owns_gig((select auth.uid()), gig_id)
  or private.owns_application((select auth.uid()), application_id)
);

create policy "Participants can read relevant selection requests"
on public.selection_requests for select to authenticated
using (
  private.is_admin((select auth.uid()))
  or private.owns_gig((select auth.uid()), gig_id)
  or private.owns_application((select auth.uid()), application_id)
);

create policy "Participants can read relevant engagements"
on public.engagements for select to authenticated
using (
  private.is_admin((select auth.uid()))
  or private.owns_gig((select auth.uid()), gig_id)
  or (select auth.uid()) in (client_participant_user_id, freelancer_participant_user_id)
);

create policy "Participants can read visibility-scoped events"
on public.marketplace_events for select to authenticated
using (private.can_read_marketplace_event(
  (select auth.uid()), visibility, gig_id, application_id, engagement_id
));

revoke all on public.gig_versions, public.applications, public.application_versions,
  public.selection_requests, public.engagements, public.marketplace_events
  from public, anon, authenticated, service_role;
grant select on public.gig_versions, public.applications, public.application_versions,
  public.selection_requests, public.engagements, public.marketplace_events
  to authenticated, service_role;

grant usage on schema private to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;
grant execute on function private.owns_gig(uuid, uuid) to authenticated;
grant execute on function private.owns_application(uuid, uuid) to authenticated;
grant execute on function private.is_engagement_participant(uuid, uuid) to authenticated;
grant execute on function private.can_read_gig_version(uuid, uuid) to authenticated;
grant execute on function private.can_read_marketplace_event(uuid, text, uuid, uuid, uuid) to authenticated;

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
  locked_gig public.gigs%rowtype;
  locked_request public.selection_requests%rowtype;
  locked_application public.applications%rowtype;
  immutable_application_version public.application_versions%rowtype;
  immutable_gig_version public.gig_versions%rowtype;
  freelancer_user_id uuid;
  new_engagement_id uuid := gen_random_uuid();
  accepted_at timestamptz;
  accepted_snapshot jsonb;
  closed_application_id uuid;
begin
  if p_selection_request_id is null or p_acting_user_id is null then
    raise exception using errcode = '22004', message = 'Selection request id and acting user id are required';
  end if;

  -- Resolve only the lock key; make no state decision before the gig lock.
  select sr.gig_id into resolved_gig_id
  from public.selection_requests sr
  where sr.id = p_selection_request_id;
  if resolved_gig_id is null then
    raise exception using errcode = 'P0002', message = 'Selection request not found';
  end if;

  -- Mandatory global lock order begins here.
  select g.* into strict locked_gig
  from public.gigs g
  where g.id = resolved_gig_id
  for update;

  select sr.* into strict locked_request
  from public.selection_requests sr
  where sr.id = p_selection_request_id
  for update;

  if locked_request.gig_id <> locked_gig.id then
    raise exception 'Selection request gig changed while acquiring locks';
  end if;
  if locked_request.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'Selection request is not pending';
  end if;
  accepted_at := clock_timestamp();
  if accepted_at >= locked_request.expires_at then
    raise exception using errcode = 'P0001', message = 'Selection request has expired';
  end if;

  select a.* into strict locked_application
  from public.applications a
  where a.id = locked_request.application_id
  for update;

  if locked_application.gig_id <> locked_gig.id then
    raise exception 'Selected application does not belong to the request gig';
  end if;
  if locked_application.stage <> 'advanced' then
    raise exception using errcode = 'P0001', message = 'Application must be advanced before confirmation';
  end if;

  select fp.user_id into strict freelancer_user_id
  from public.freelancer_profiles fp
  where fp.id = locked_application.freelancer_profile_id;
  if freelancer_user_id <> p_acting_user_id then
    raise exception using errcode = '42501', message = 'Acting user does not own the selected freelancer application';
  end if;
  if locked_application.current_version_id <> locked_request.application_version_id then
    raise exception using errcode = 'P0001', message = 'Selection request references a stale application version';
  end if;

  select av.* into strict immutable_application_version
  from public.application_versions av
  where av.id = locked_request.application_version_id;
  if immutable_application_version.application_id <> locked_application.id
     or immutable_application_version.gig_version_id <> locked_request.gig_version_id then
    raise exception 'Selection request version binding is inconsistent';
  end if;
  if locked_request.gig_version_id <> locked_gig.current_material_gig_version_id then
    raise exception using errcode = 'P0001', message = 'Selection request references a stale material gig version';
  end if;

  select gv.* into strict immutable_gig_version
  from public.gig_versions gv
  where gv.id = locked_request.gig_version_id and gv.gig_id = locked_gig.id;
  if immutable_gig_version.terms_contract_version <> 1 then
    raise exception using errcode = 'P0001', message = 'Gig terms contract version is not selection eligible';
  end if;
  if immutable_application_version.proposal_contract_version <> 1 then
    raise exception using errcode = 'P0001', message = 'Proposal contract version is not supported';
  end if;
  if locked_request.commercial_warning_code is not null
     and (locked_request.commercial_acknowledged_by_user_id is null
       or locked_request.commercial_acknowledged_at is null) then
    raise exception using errcode = 'P0001', message = 'Commercial acknowledgement is required';
  end if;
  if locked_request.commercial_acknowledged_by_user_id is not null
     and locked_request.commercial_acknowledged_by_user_id <> locked_gig.client_id then
    raise exception using errcode = 'P0001', message = 'Commercial acknowledgement must belong to the gig client';
  end if;
  if locked_gig.opportunity_lifecycle <> 'active' then
    raise exception using errcode = 'P0001', message = 'Gig is not active';
  end if;
  if locked_gig.operational_state = 'paused' then
    raise exception using errcode = 'P0001', message = 'Paused gigs cannot confirm selection';
  end if;
  if exists (
    select 1 from public.applications a
    where a.gig_id = locked_gig.id and a.stage = 'confirmed'
  ) then
    raise exception using errcode = '23505', message = 'Gig already has a confirmed application';
  end if;
  if exists (
    select 1 from public.engagements e
    where e.gig_id = locked_gig.id and e.status <> 'cancelled'
  ) then
    raise exception using errcode = '23505', message = 'Gig already has a non-cancelled engagement';
  end if;

  -- Remaining active applications are locked in deterministic UUID order.
  perform a.id
  from public.applications a
  where a.gig_id = locked_gig.id
    and a.id <> locked_application.id
    and a.stage in ('under_review', 'advanced')
  order by a.id
  for update;

  accepted_snapshot := jsonb_build_object(
    'accepted_terms_contract_version', 1,
    'snapshot_schema_version', 1,
    'captured_at', accepted_at,
    'application_version_id', immutable_application_version.id,
    'material_gig_version_id', immutable_gig_version.id,
    'gig_terms_contract_version', immutable_gig_version.terms_contract_version,
    'proposal_contract_version', immutable_application_version.proposal_contract_version,
    'gig_snapshot_schema_version', immutable_gig_version.snapshot_schema_version,
    'proposal_snapshot_schema_version', immutable_application_version.snapshot_schema_version,
    'client_payment_terms', immutable_gig_version.terms_snapshot -> 'client_payment',
    'freelancer_proposal', immutable_application_version.proposal_snapshot,
    'timeline', immutable_application_version.timeline_snapshot,
    'availability', immutable_application_version.availability_snapshot,
    'scope', immutable_application_version.scope_snapshot,
    'included_work', immutable_application_version.scope_snapshot -> 'included_work',
    'excluded_work', immutable_application_version.scope_snapshot -> 'excluded_work',
    'assumptions', immutable_application_version.scope_snapshot -> 'assumptions',
    'estimate_change_factors', immutable_application_version.scope_snapshot -> 'estimate_change_factors',
    'commercial_warning_code', locked_request.commercial_warning_code,
    'commercial_acknowledgement', case
      when locked_request.commercial_warning_code is null then null
      else jsonb_build_object(
        'acknowledged_by_user_id', locked_request.commercial_acknowledged_by_user_id,
        'acknowledged_at', locked_request.commercial_acknowledged_at
      )
    end
  );

  update public.selection_requests
  set status = 'accepted', terminal_at = accepted_at
  where id = locked_request.id;

  update public.applications
  set stage = 'confirmed',
      last_updated_at = accepted_at,
      stage_changed_at = accepted_at,
      stage_changed_by_actor_type = 'user',
      stage_changed_by_user_id = p_acting_user_id,
      stage_reason_origin = null,
      stage_reason_code = null,
      stage_reason_payload = null
  where id = locked_application.id;

  update public.gigs
  set opportunity_lifecycle = 'filled',
      application_intake = 'closed',
      operational_state = 'active'
  where id = locked_gig.id;

  insert into public.engagements (
    id, gig_id, application_id, selection_request_id,
    client_participant_user_id, freelancer_participant_user_id, status,
    accepted_application_version_id, accepted_gig_version_id,
    accepted_terms_contract_version, accepted_terms_snapshot,
    snapshot_schema_version, confirmed_at
  ) values (
    new_engagement_id, locked_gig.id, locked_application.id, locked_request.id,
    locked_gig.client_id, freelancer_user_id, 'confirmed',
    immutable_application_version.id, immutable_gig_version.id,
    1, accepted_snapshot, 1, accepted_at
  );

  for closed_application_id in
    update public.applications as closing_application
    set stage = 'not_selected',
        last_updated_at = accepted_at,
        stage_changed_at = accepted_at,
        stage_changed_by_actor_type = 'system',
        stage_changed_by_user_id = null,
        stage_reason_origin = 'selection_confirmed',
        stage_reason_code = 'another_applicant_selected',
        stage_reason_payload = jsonb_build_object('selection_request_id', locked_request.id)
    where closing_application.gig_id = locked_gig.id
      and closing_application.id <> locked_application.id
      and closing_application.stage in ('under_review', 'advanced')
    returning closing_application.id
  loop
    insert into public.marketplace_events (
      event_type, visibility, actor_type, gig_id, application_id,
      reason_origin, reason_code, event_payload, occurred_at
    ) values (
      'application_automatically_not_selected', 'participants', 'system',
      locked_gig.id, closed_application_id, 'selection_confirmed',
      'another_applicant_selected', jsonb_build_object('selection_request_id', locked_request.id), accepted_at
    );
  end loop;

  insert into public.marketplace_events (
    event_type, visibility, actor_type, actor_user_id, gig_id, application_id,
    selection_request_id, engagement_id, event_payload, occurred_at
  ) values
  (
    'selection_accepted', 'participants', 'user', p_acting_user_id,
    locked_gig.id, locked_application.id, locked_request.id, new_engagement_id,
    jsonb_build_object(
      'application_version_id', immutable_application_version.id,
      'material_gig_version_id', immutable_gig_version.id
    ), accepted_at
  ),
  (
    'engagement_created', 'participants', 'system', null,
    locked_gig.id, locked_application.id, locked_request.id, new_engagement_id,
    jsonb_build_object('status', 'confirmed'), accepted_at
  );

  return query select
    locked_request.id,
    new_engagement_id,
    locked_gig.id,
    locked_application.id,
    'accepted'::text,
    'confirmed'::text,
    'filled'::text,
    'confirmed'::text;
end;
$$;

revoke all on function public.confirm_selection_request(uuid, uuid) from public;
revoke all on function public.confirm_selection_request(uuid, uuid) from anon;
revoke all on function public.confirm_selection_request(uuid, uuid) from authenticated;
grant execute on function public.confirm_selection_request(uuid, uuid) to service_role;

comment on function public.confirm_selection_request(uuid, uuid) is
'Backend-only atomic acceptance. Lock order: gig, request, selected application, remaining applications by UUID, engagement.';

commit;
