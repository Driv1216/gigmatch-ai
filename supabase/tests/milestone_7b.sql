begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
set constraints all deferred;

create temporary table confirmation_cases (
  name text primary key,
  client_user_id uuid not null,
  freelancer_user_id uuid not null,
  freelancer_profile_id uuid not null,
  gig_id uuid not null,
  gig_version_id uuid not null,
  display_gig_version_id uuid not null,
  application_id uuid not null,
  application_version_id uuid not null,
  selection_request_id uuid not null,
  other_active_application_id uuid,
  withdrawn_application_id uuid
);
grant select on confirmation_cases to authenticated;

create or replace function pg_temp.seed_confirmation_case(
  p_name text,
  p_request_status text default 'pending',
  p_expired boolean default false,
  p_application_stage text default 'advanced',
  p_gig_lifecycle text default 'active',
  p_gig_operations text default 'active',
  p_terms_contract_version integer default 1,
  p_proposal_contract_version integer default 1,
  p_stale_application_version boolean default false,
  p_stale_material_version boolean default false,
  p_minor_display_correction boolean default false,
  p_with_other_applications boolean default false
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  client_user uuid := gen_random_uuid();
  freelancer_user uuid := gen_random_uuid();
  freelancer_profile uuid := gen_random_uuid();
  gig uuid := gen_random_uuid();
  gig_v1 uuid := gen_random_uuid();
  gig_v2 uuid := gen_random_uuid();
  display_version uuid := gig_v1;
  material_version uuid := gig_v1;
  application uuid := gen_random_uuid();
  app_v1 uuid := gen_random_uuid();
  app_v2 uuid := gen_random_uuid();
  current_app_version uuid := app_v1;
  request uuid := gen_random_uuid();
  created_time timestamptz := case when p_expired then now() - interval '2 days' else now() - interval '1 minute' end;
  expiry_time timestamptz := case when p_expired then now() - interval '1 day' else now() + interval '1 day' end;
  terminal_time timestamptz := now();
  public_status text;
  intake text := case when p_gig_lifecycle = 'active' then 'accepting' else 'closed' end;
  gig_kind text := case when p_terms_contract_version = 0 then 'legacy_import' else 'initial_product_version' end;
  payment_kind text := case when p_terms_contract_version = 0 then 'legacy_unspecified' else 'fixed_price' end;
  gig_currency text := case when p_terms_contract_version = 0 then null else 'USD' end;
  other_user uuid;
  other_profile uuid;
  other_app uuid;
  other_version uuid;
  withdrawn_user uuid;
  withdrawn_profile uuid;
  withdrawn_app uuid;
  withdrawn_version uuid;
begin
  if p_gig_lifecycle in ('filled', 'cancelled') then
    intake := 'closed';
  end if;
  public_status := case
    when p_gig_lifecycle = 'draft' then 'draft'
    when p_gig_lifecycle = 'filled' then 'filled'
    when p_gig_lifecycle = 'cancelled' then 'cancelled'
    when p_gig_operations = 'paused' then 'paused'
    when intake = 'closed' then 'closed_to_new_applications'
    else 'open'
  end;
  if p_stale_material_version or p_minor_display_correction then
    display_version := gig_v2;
  end if;
  if p_stale_material_version then
    material_version := gig_v2;
  end if;
  if p_stale_application_version then
    current_app_version := app_v2;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
  ('00000000-0000-0000-0000-000000000000', client_user, 'authenticated', 'authenticated',
    p_name || '-client@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', freelancer_user, 'authenticated', 'authenticated',
    p_name || '-freelancer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

  insert into public.user_profiles (id, email, full_name, role) values
    (client_user, p_name || '-client@example.test', p_name || ' client', 'client'),
    (freelancer_user, p_name || '-freelancer@example.test', p_name || ' freelancer', 'freelancer');
  insert into public.client_profiles (user_id, company_name) values (client_user, p_name || ' company');
  insert into public.freelancer_profiles (id, user_id, headline)
    values (freelancer_profile, freelancer_user, p_name || ' freelancer');

  insert into public.gigs (
    id, client_id, title, description, tech_category, status,
    opportunity_lifecycle, application_intake, operational_state,
    current_gig_version_id, current_material_gig_version_id
  ) values (
    gig, client_user, p_name || ' gig', 'Versioned terms', 'backend', public_status,
    p_gig_lifecycle, intake, p_gig_operations, display_version, material_version
  );

  insert into public.gig_versions (
    id, gig_id, version_number, snapshot_schema_version, terms_snapshot,
    changed_fields, created_by_actor_type, created_by_user_id, created_at
  ) values (
    gig_v1, gig, 1, 1,
    jsonb_build_object(
      'version_kind', gig_kind,
      'terms_contract_version', p_terms_contract_version,
      'snapshot_schema_version', 1,
      'payment_structure', payment_kind,
      'currency', gig_currency,
      'title', p_name || ' gig',
      'description', 'Versioned terms',
      'client_payment', jsonb_build_object(
        'payment_structure', payment_kind, 'currency', gig_currency,
        'budget_min', 1000, 'budget_max', 2000
      ),
      'scope', jsonb_build_object('deliverables', jsonb_build_array('API')),
      'required_skills', jsonb_build_array('PostgreSQL'),
      'preferred_skills', jsonb_build_array('FastAPI'),
      'deliverables', jsonb_build_array('API'),
      'assumptions', jsonb_build_array('Stored test terms')
    ),
    array['initial'], case when p_terms_contract_version = 0 then 'system' else 'user' end,
    case when p_terms_contract_version = 0 then null else client_user end, now() - interval '1 hour'
  );

  if p_stale_material_version or p_minor_display_correction then
    insert into public.gig_versions (
      id, gig_id, version_number, snapshot_schema_version, terms_snapshot,
      changed_fields, created_by_actor_type, created_by_user_id, created_at
    ) values (
      gig_v2, gig, 2, 1,
      jsonb_build_object(
        'version_kind', case when p_minor_display_correction then 'minor_correction' else 'material_change' end,
        'terms_contract_version', 1,
        'snapshot_schema_version', 1,
        'payment_structure', 'fixed_price',
        'currency', 'USD',
        'title', p_name || ' gig corrected',
        'description', 'Versioned terms',
        'client_payment', jsonb_build_object(
          'payment_structure', 'fixed_price', 'currency', 'USD',
          'budget_min', 1000, 'budget_max', 2000
        ),
        'scope', jsonb_build_object('deliverables', jsonb_build_array('API')),
        'required_skills', jsonb_build_array('PostgreSQL'),
        'preferred_skills', jsonb_build_array('FastAPI'),
        'deliverables', jsonb_build_array('API'),
        'assumptions', jsonb_build_array('Stored test terms')
      ),
      array[case when p_minor_display_correction then 'title' else 'client_payment' end],
      'user', client_user, now() - interval '30 minutes'
    );
  end if;

  insert into public.applications (
    id, gig_id, freelancer_profile_id, stage, current_version_id,
    submitted_at, last_updated_at, stage_changed_at,
    stage_changed_by_actor_type, stage_changed_by_user_id
  ) values (
    application, gig, freelancer_profile, p_application_stage, current_app_version,
    now() - interval '20 minutes', now() - interval '10 minutes', now() - interval '10 minutes',
    'user', client_user
  );

  insert into public.application_versions (
    id, application_id, gig_id, version_number, gig_version_id, origin,
    snapshot_schema_version, cover_note, proposal_snapshot, timeline_snapshot,
    availability_snapshot, scope_snapshot, created_by_user_id, created_at
  ) values (
    app_v1, application, gig, 1, gig_v1, 'initial_submission', 1, 'Stored proposal',
    jsonb_build_object(
      'proposal_contract_version', p_proposal_contract_version,
      'snapshot_schema_version', 1,
      'payment_structure', 'fixed_price', 'currency', 'USD',
      'mode', 'exact_total', 'exact_total', 1500
    ),
    jsonb_build_object('kind', 'exact', 'weeks', 4),
    jsonb_build_object('available_from', current_date + 1),
    jsonb_build_object(
      'included_work', jsonb_build_array('API'),
      'excluded_work', jsonb_build_array('Hosting'),
      'assumptions', jsonb_build_array('Client provides access'),
      'estimate_change_factors', jsonb_build_array('Scope changes')
    ),
    freelancer_user, now() - interval '15 minutes'
  );

  if p_stale_application_version then
    insert into public.application_versions (
      id, application_id, gig_id, version_number, gig_version_id, origin,
      snapshot_schema_version, cover_note, proposal_snapshot, timeline_snapshot,
      availability_snapshot, scope_snapshot, created_by_user_id, created_at
    ) values (
      app_v2, application, gig, 2, material_version, 'freelancer_edit', 1, 'Newer stored proposal',
      jsonb_build_object(
        'proposal_contract_version', 1, 'snapshot_schema_version', 1,
        'payment_structure', 'fixed_price', 'currency', 'USD',
        'mode', 'exact_total', 'exact_total', 1600
      ),
      jsonb_build_object('kind', 'exact', 'weeks', 5),
      jsonb_build_object('available_from', current_date + 1),
      jsonb_build_object(
        'included_work', jsonb_build_array('API'), 'excluded_work', jsonb_build_array('Hosting'),
        'assumptions', jsonb_build_array('Client provides access'),
        'estimate_change_factors', jsonb_build_array('Scope changes')
      ),
      freelancer_user, now() - interval '5 minutes'
    );
  end if;

  insert into public.selection_requests (
    id, gig_id, application_id, application_version_id, gig_version_id,
    created_by_user_id, created_at, expires_at, status, terminal_at,
    decline_disposition, cancellation_reason_code, cancellation_detail, invalidation_reason
  ) values (
    request, gig, application, app_v1, gig_v1, client_user, created_time, expiry_time,
    p_request_status,
    case when p_request_status = 'pending' then null else terminal_time end,
    case when p_request_status = 'declined' then 'remain_interested' else null end,
    case when p_request_status = 'cancelled' then 'client_withdrew_request' else null end,
    case when p_request_status = 'cancelled' then '{"explanation":"test"}'::jsonb else null end,
    case when p_request_status = 'invalidated' then 'application_version_changed' else null end
  );

  if p_with_other_applications then
    other_user := gen_random_uuid(); other_profile := gen_random_uuid();
    other_app := gen_random_uuid(); other_version := gen_random_uuid();
    withdrawn_user := gen_random_uuid(); withdrawn_profile := gen_random_uuid();
    withdrawn_app := gen_random_uuid(); withdrawn_version := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values
    ('00000000-0000-0000-0000-000000000000', other_user, 'authenticated', 'authenticated',
      p_name || '-other@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', withdrawn_user, 'authenticated', 'authenticated',
      p_name || '-withdrawn@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
    insert into public.user_profiles (id, email, role) values
      (other_user, p_name || '-other@example.test', 'freelancer'),
      (withdrawn_user, p_name || '-withdrawn@example.test', 'freelancer');
    insert into public.freelancer_profiles (id, user_id) values
      (other_profile, other_user), (withdrawn_profile, withdrawn_user);
    insert into public.applications (
      id, gig_id, freelancer_profile_id, stage, current_version_id,
      submitted_at, last_updated_at, stage_changed_at,
      stage_changed_by_actor_type, stage_changed_by_user_id,
      stage_reason_origin, stage_reason_code, stage_reason_payload
    ) values
      (other_app, gig, other_profile, 'under_review', other_version,
        now() - interval '20 minutes', now() - interval '10 minutes', now() - interval '10 minutes',
        'user', client_user, null, null, null),
      (withdrawn_app, gig, withdrawn_profile, 'withdrawn', withdrawn_version,
        now() - interval '20 minutes', now() - interval '10 minutes', now() - interval '10 minutes',
        'user', withdrawn_user, 'freelancer_withdrawal', 'no_longer_available', '{}'::jsonb);
    insert into public.application_versions (
      id, application_id, gig_id, version_number, gig_version_id, origin,
      snapshot_schema_version, cover_note, proposal_snapshot, timeline_snapshot,
      availability_snapshot, scope_snapshot, created_by_user_id, created_at
    ) values
      (other_version, other_app, gig, 1, gig_v1, 'initial_submission', 1, 'Other proposal',
        '{"proposal_contract_version":1,"snapshot_schema_version":1,"payment_structure":"fixed_price","currency":"USD"}',
        '{}', '{}', '{}', other_user, now() - interval '15 minutes'),
      (withdrawn_version, withdrawn_app, gig, 1, gig_v1, 'initial_submission', 1, 'Withdrawn proposal',
        '{"proposal_contract_version":1,"snapshot_schema_version":1,"payment_structure":"fixed_price","currency":"USD"}',
        '{}', '{}', '{}', withdrawn_user, now() - interval '15 minutes');
  end if;

  insert into pg_temp.confirmation_cases values (
    p_name, client_user, freelancer_user, freelancer_profile, gig, gig_v1,
    display_version, application, app_v1, request, other_app, withdrawn_app
  );
end;
$$;

select pg_temp.seed_confirmation_case('structural');

select is(
  (select opportunity_lifecycle || '/' || application_intake || '/' || operational_state
   from public.gigs where id = (select gig_id from confirmation_cases where name = 'structural')),
  'active/accepting/active',
  'orthogonal gig state is persisted'
);
select is(
  (select current_gig_version_id <> current_material_gig_version_id
   from public.gigs where id = (select gig_id from confirmation_cases where name = 'structural')),
  false,
  'initial display and material version pointers match'
);

select throws_ok(
  (select format('insert into public.applications (gig_id, freelancer_profile_id, stage, current_version_id, stage_changed_by_actor_type, stage_changed_by_user_id) values (%L, %L, ''advanced'', gen_random_uuid(), ''user'', %L)', gig_id, freelancer_profile_id, client_user_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'duplicate freelancer/gig application is rejected'
);
select throws_ok(
  (select format('update public.applications set id = gen_random_uuid() where id = %L', application_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'application identity fields are immutable'
);
select throws_ok(
  (select format('delete from public.applications where id = %L', application_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'applications cannot be physically deleted'
);
select throws_ok(
  (select format('update public.gig_versions set changed_fields = array[''x''] where id = %L', gig_version_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'gig versions reject updates'
);
select throws_ok(
  (select format('delete from public.gig_versions where id = %L', gig_version_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'gig versions reject deletes'
);
select throws_ok(
  (select format('update public.application_versions set cover_note = ''changed'' where id = %L', application_version_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'application versions reject updates'
);
select throws_ok(
  (select format('delete from public.application_versions where id = %L', application_version_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'application versions reject deletes'
);
select throws_ok(
  (select format('insert into public.gig_versions (gig_id, version_number, snapshot_schema_version, terms_snapshot, created_by_actor_type, created_by_user_id) values (%L, 1, 1, ''{"version_kind":"minor_correction","terms_contract_version":1,"snapshot_schema_version":1,"payment_structure":"fixed_price","currency":"USD"}'', ''user'', %L)', gig_id, client_user_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'duplicate gig version number is rejected'
);
select throws_ok(
  (select format('insert into public.gig_versions (gig_id, version_number, snapshot_schema_version, terms_snapshot, created_by_actor_type, created_by_user_id) values (%L, 2, 1, ''{"version_kind":"minor_correction","snapshot_schema_version":1,"payment_structure":"fixed_price","currency":"USD"}'', ''user'', %L)', gig_id, client_user_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'gig version canonical JSON cannot omit its generated contract version'
);
select throws_ok(
  (select format('insert into public.application_versions (application_id, gig_id, version_number, gig_version_id, origin, snapshot_schema_version, cover_note, proposal_snapshot, timeline_snapshot, availability_snapshot, scope_snapshot, created_by_user_id) values (%L, %L, 3, %L, ''freelancer_edit'', 1, ''Skipped version'', ''{"proposal_contract_version":1,"snapshot_schema_version":1,"payment_structure":"fixed_price","currency":"USD"}'', ''{}'', ''{}'', ''{}'', %L)', application_id, gig_id, gig_version_id, freelancer_user_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'application version chronology rejects a skipped version number'
);
select throws_ok(
  (select format('insert into public.application_versions (application_id, gig_id, version_number, gig_version_id, origin, snapshot_schema_version, cover_note, proposal_snapshot, timeline_snapshot, availability_snapshot, scope_snapshot, created_by_user_id) values (%L, %L, 2, %L, ''freelancer_edit'', 1, ''Missing contract'', ''{"snapshot_schema_version":1,"payment_structure":"fixed_price","currency":"USD"}'', ''{}'', ''{}'', ''{}'', %L)', application_id, gig_id, gig_version_id, freelancer_user_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'application proposal JSON cannot omit its generated contract version'
);
select throws_ok(
  (select format('insert into public.selection_requests (gig_id, application_id, application_version_id, gig_version_id, created_by_user_id, expires_at) values (%L, %L, %L, %L, %L, now() + interval ''1 day'')', gig_id, application_id, application_version_id, gig_version_id, client_user_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'a second pending selection request for a gig is rejected'
);
select throws_ok(
  (select format('update public.selection_requests set application_version_id = gen_random_uuid() where id = %L', selection_request_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'selection request frozen bindings cannot change'
);
select throws_ok(
  (select format('delete from public.selection_requests where id = %L', selection_request_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'selection requests cannot be physically deleted'
);
select throws_ok(
  (select format('insert into public.selection_requests (gig_id, application_id, application_version_id, gig_version_id, created_by_user_id, created_at, expires_at, commercial_warning_code) values (%L, %L, %L, %L, %L, now(), now() + interval ''1 day'', ''out_of_range'')', gig_id, application_id, application_version_id, gig_version_id, client_user_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'commercial warning cannot omit acknowledgement metadata'
);

select ok(not has_table_privilege('authenticated', 'public.applications', 'INSERT'), 'authenticated cannot directly insert applications');
select ok(not has_table_privilege('authenticated', 'public.applications', 'UPDATE'), 'authenticated cannot directly update application stage');
select ok(not has_table_privilege('authenticated', 'public.selection_requests', 'UPDATE'), 'authenticated cannot directly update requests');
select ok(not has_table_privilege('authenticated', 'public.engagements', 'INSERT'), 'authenticated cannot directly insert engagements');
select ok(not has_table_privilege('authenticated', 'public.marketplace_events', 'INSERT'), 'authenticated cannot insert arbitrary events');
select ok(not has_table_privilege('service_role', 'public.engagements', 'INSERT'), 'service role direct engagement writes are locked down');
select ok(not has_table_privilege('anon', 'public.applications', 'SELECT'), 'unauthenticated role has no private marketplace read grant');
select ok(has_function_privilege('service_role', 'public.confirm_selection_request(uuid,uuid)', 'EXECUTE'), 'service role can execute confirmation');
select ok(not has_function_privilege('authenticated', 'public.confirm_selection_request(uuid,uuid)', 'EXECUTE'), 'authenticated cannot execute confirmation');
select ok(not has_function_privilege('anon', 'public.confirm_selection_request(uuid,uuid)', 'EXECUTE'), 'anon cannot execute confirmation');
select ok(not has_function_privilege('public', 'public.confirm_selection_request(uuid,uuid)', 'EXECUTE'), 'PUBLIC cannot execute confirmation');
select is(
  (select prosecdef from pg_proc where oid = 'public.confirm_selection_request(uuid,uuid)'::regprocedure),
  true,
  'confirmation is SECURITY DEFINER'
);
select is(
  (select proconfig[1] from pg_proc where oid = 'public.confirm_selection_request(uuid,uuid)'::regprocedure),
  'search_path=""',
  'confirmation has an empty fixed search_path'
);

select pg_temp.seed_confirmation_case('other_tenant');
set constraints public.gigs_id_current_display_version_fk immediate;
select throws_ok(
  (select format('update public.gigs set current_gig_version_id = %L where id = %L',
    (select gig_version_id from confirmation_cases where name = 'other_tenant'), gig_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'gig display pointer cannot reference another gig version'
);
set constraints public.gigs_id_current_display_version_fk deferred;
set constraints public.applications_current_version_fk immediate;
select throws_ok(
  (select format('update public.applications set current_version_id = %L where id = %L',
    (select application_version_id from confirmation_cases where name = 'other_tenant'), application_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'application current pointer cannot reference another application version'
);
set constraints public.applications_current_version_fk deferred;
select throws_ok(
  (select format('insert into public.selection_requests (gig_id, application_id, application_version_id, gig_version_id, created_by_user_id, expires_at) values (%L, %L, %L, %L, %L, now() + interval ''1 day'')',
    gig_id, application_id, application_version_id,
    (select gig_version_id from confirmation_cases where name = 'other_tenant'), client_user_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'selection request cannot mismatch application and gig version bindings'
);
select throws_ok(
  (select format('update public.selection_requests set status = ''cancelled'', terminal_at = now() where id = %L', selection_request_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'selection terminal metadata constraints reject incomplete cancellation'
);
select throws_ok(
  $$insert into public.marketplace_events (event_type, visibility, actor_type, event_payload)
    values ('meaningless', 'participants', 'system', '{}')$$,
  null, null, 'marketplace event requires an aggregate anchor'
);
select throws_ok(
  (select format('insert into public.marketplace_events (event_type, visibility, actor_type, actor_user_id, gig_id, event_payload) values (''bad_actor'', ''participants'', ''system'', %L, %L, ''{}'')', client_user_id, gig_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'marketplace event actor metadata is consistent'
);
select throws_ok(
  (select format('insert into public.marketplace_events (event_type, visibility, actor_type, gig_id, application_id, event_payload) values (''selection_accepted'', ''participants'', ''system'', %L, %L, ''{}'')', gig_id, application_id)
   from confirmation_cases where name = 'structural'),
  null, null, 'selection accepted event requires request and engagement references'
);
insert into public.marketplace_events (
  event_type, visibility, actor_type, actor_user_id, gig_id, application_id, event_payload
)
select 'client_note', 'client_private', 'user', client_user_id, gig_id, application_id, '{}'
from confirmation_cases where name = 'structural';
insert into public.marketplace_events (
  event_type, visibility, actor_type, gig_id, event_payload
)
select 'admin_audit', 'admin_internal', 'system', gig_id, '{}'
from confirmation_cases where name = 'structural';

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'authenticated', 'authenticated', 'admin@example.test', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);
insert into public.user_profiles (id, email, role)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'admin@example.test', 'admin');
insert into public.marketplace_events (
  event_type, visibility, actor_type, actor_user_id, gig_id, application_id, event_payload
)
select 'freelancer_note', 'freelancer_private', 'user', freelancer_user_id, gig_id, application_id, '{}'
from confirmation_cases where name = 'structural';

set local role authenticated;
select set_config('request.jwt.claim.sub', (select freelancer_user_id::text from confirmation_cases where name = 'structural'), true);
select is((select count(*) from public.applications where id = (select application_id from confirmation_cases where name = 'structural')), 1::bigint, 'freelancer reads own application');
select is((select count(*) from public.applications where id = (select application_id from confirmation_cases where name = 'other_tenant')), 0::bigint, 'freelancer cannot read another application');
select is((select count(*) from public.application_versions where application_id = (select application_id from confirmation_cases where name = 'other_tenant')), 0::bigint, 'freelancer cannot read another application version');
select is((select count(*) from public.marketplace_events where visibility = 'client_private'), 0::bigint, 'client-private events do not leak to freelancers');
select is((select count(*) from public.marketplace_events where visibility = 'freelancer_private'), 1::bigint, 'freelancer sees own freelancer-private event');
select is((select count(*) from public.gig_versions where id = (select gig_version_id from confirmation_cases where name = 'other_tenant')), 0::bigint, 'freelancer cannot read unrelated gig history');
select is(
  private.owns_application(
    (select freelancer_user_id from confirmation_cases where name = 'other_tenant'),
    (select application_id from confirmation_cases where name = 'other_tenant')
  ),
  false,
  'RLS helper rejects a caller-supplied identity different from auth.uid()'
);

select set_config('request.jwt.claim.sub', (select client_user_id::text from confirmation_cases where name = 'structural'), true);
select is((select count(*) from public.applications where id = (select application_id from confirmation_cases where name = 'structural')), 1::bigint, 'client reads applicants for owned gig');
select is((select count(*) from public.applications where id = (select application_id from confirmation_cases where name = 'other_tenant')), 0::bigint, 'client cannot read another client applicant');
select is((select count(*) from public.marketplace_events where visibility = 'freelancer_private'), 0::bigint, 'freelancer-private events do not leak to clients');
select is((select count(*) from public.marketplace_events where visibility = 'client_private'), 1::bigint, 'client sees own client-private event');
select is((select count(*) from public.marketplace_events where visibility = 'admin_internal'), 0::bigint, 'admin-internal events do not leak to clients');

select set_config('request.jwt.claim.sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff', true);
select is((select count(*) from public.applications where id in (select application_id from confirmation_cases)), 2::bigint, 'admin reads marketplace rows through trusted user_profiles role');
select is((select count(*) from public.marketplace_events where visibility = 'admin_internal'), 1::bigint, 'admin reads admin-internal events');
reset role;

select pg_temp.seed_confirmation_case('wrong_actor');
select throws_ok(
  (select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, client_user_id)
   from confirmation_cases where name = 'wrong_actor'),
  '42501', null, 'client or wrong freelancer cannot accept for the applicant'
);
select pg_temp.seed_confirmation_case('expired', p_expired => true);
select throws_ok((select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id) from confirmation_cases where name = 'expired'), null, null, 'expired request is rejected');
select pg_temp.seed_confirmation_case('cancelled', p_request_status => 'cancelled');
select throws_ok((select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id) from confirmation_cases where name = 'cancelled'), null, null, 'cancelled request is rejected');
select pg_temp.seed_confirmation_case('invalidated', p_request_status => 'invalidated');
select throws_ok((select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id) from confirmation_cases where name = 'invalidated'), null, null, 'invalidated request is rejected');
select pg_temp.seed_confirmation_case('revision', p_request_status => 'revision_requested');
select throws_ok((select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id) from confirmation_cases where name = 'revision'), null, null, 'revision-requested request is rejected');
select pg_temp.seed_confirmation_case('stale_app', p_stale_application_version => true);
select throws_ok((select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id) from confirmation_cases where name = 'stale_app'), null, null, 'stale application version is rejected');
select pg_temp.seed_confirmation_case('stale_material', p_stale_material_version => true);
select throws_ok((select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id) from confirmation_cases where name = 'stale_material'), null, null, 'stale material gig version is rejected');
select pg_temp.seed_confirmation_case('legacy', p_terms_contract_version => 0);
select throws_ok((select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id) from confirmation_cases where name = 'legacy'), null, null, 'legacy contract-version-zero gig is rejected');
select pg_temp.seed_confirmation_case('proposal2', p_proposal_contract_version => 2);
select throws_ok((select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id) from confirmation_cases where name = 'proposal2'), null, null, 'unsupported proposal contract version is rejected');
select pg_temp.seed_confirmation_case('under_review', p_application_stage => 'under_review');
select throws_ok((select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id) from confirmation_cases where name = 'under_review'), null, null, 'application not Advanced is rejected');
select pg_temp.seed_confirmation_case('paused', p_gig_operations => 'paused');
select throws_ok((select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id) from confirmation_cases where name = 'paused'), null, null, 'paused gig is rejected');
select pg_temp.seed_confirmation_case('filled', p_gig_lifecycle => 'filled');
select throws_ok((select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id) from confirmation_cases where name = 'filled'), null, null, 'filled gig is rejected');

select pg_temp.seed_confirmation_case('minor_display', p_minor_display_correction => true);
create temporary table gigs (id uuid);
select lives_ok(
  (select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id)
   from confirmation_cases where name = 'minor_display'),
  'minor display correction does not invalidate a material-version-bound request'
);

create or replace function pg_temp.fail_marketplace_event_insert()
returns trigger language plpgsql as $$ begin raise exception 'intentional rollback test'; end $$;
select pg_temp.seed_confirmation_case('rollback');
create trigger fail_marketplace_event_insert
before insert on public.marketplace_events
for each row execute function pg_temp.fail_marketplace_event_insert();
select throws_ok(
  (select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id)
   from confirmation_cases where name = 'rollback'),
  null, null, 'failure after attempted mutations rolls back the entire confirmation'
);
drop trigger fail_marketplace_event_insert on public.marketplace_events;
select is((select status from public.selection_requests where id = (select selection_request_id from confirmation_cases where name = 'rollback')), 'pending', 'rollback preserves pending request');
select is((select stage from public.applications where id = (select application_id from confirmation_cases where name = 'rollback')), 'advanced', 'rollback preserves selected application stage');
select is((select opportunity_lifecycle from public.gigs where id = (select gig_id from confirmation_cases where name = 'rollback')), 'active', 'rollback preserves active gig');
select is((select count(*) from public.engagements where gig_id = (select gig_id from confirmation_cases where name = 'rollback')), 0::bigint, 'rollback creates no engagement');

select pg_temp.seed_confirmation_case('valid', p_with_other_applications => true);
select lives_ok(
  (select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id)
   from confirmation_cases where name = 'valid'),
  'correct freelancer accepts a valid request'
);
select is((select status from public.selection_requests where id = (select selection_request_id from confirmation_cases where name = 'valid')), 'accepted', 'valid request becomes accepted');
select is((select stage from public.applications where id = (select application_id from confirmation_cases where name = 'valid')), 'confirmed', 'selected application becomes confirmed');
select is((select status from public.gigs where id = (select gig_id from confirmation_cases where name = 'valid')), 'filled', 'gig projection becomes filled');
select is((select count(*) from public.engagements where gig_id = (select gig_id from confirmation_cases where name = 'valid') and status <> 'cancelled'), 1::bigint, 'exactly one active engagement is created');
select is((select stage from public.applications where id = (select other_active_application_id from confirmation_cases where name = 'valid')), 'not_selected', 'other active application is automatically closed');
select is((select stage_reason_origin || '/' || stage_reason_code from public.applications where id = (select other_active_application_id from confirmation_cases where name = 'valid')), 'selection_confirmed/another_applicant_selected', 'automatic closure stores exact origin and reason');
select is((select stage from public.applications where id = (select withdrawn_application_id from confirmation_cases where name = 'valid')), 'withdrawn', 'withdrawn application is preserved');
select ok((select accepted_terms_snapshot -> 'freelancer_proposal' = av.proposal_snapshot from public.engagements e join public.application_versions av on av.id = e.accepted_application_version_id where e.gig_id = (select gig_id from confirmation_cases where name = 'valid')), 'accepted proposal snapshot is constructed from immutable stored proposal');
select ok((select accepted_terms_snapshot -> 'client_payment_terms' = gv.terms_snapshot -> 'client_payment' from public.engagements e join public.gig_versions gv on gv.id = e.accepted_gig_version_id where e.gig_id = (select gig_id from confirmation_cases where name = 'valid')), 'accepted client terms are constructed from immutable stored gig version');
select throws_ok(
  (select format('select * from public.confirm_selection_request(%L, %L)', selection_request_id, freelancer_user_id)
   from confirmation_cases where name = 'valid'),
  null, null, 'repeated accepted request fails without creating another engagement'
);
select is((select count(*) from public.engagements where gig_id = (select gig_id from confirmation_cases where name = 'valid')), 1::bigint, 'repeated invocation creates nothing new');
select is((select count(*) from public.marketplace_events where gig_id = (select gig_id from confirmation_cases where name = 'valid') and event_type = 'selection_accepted'), 1::bigint, 'selection accepted event is append-only and singular');
select throws_ok(
  (select format('update public.applications set stage = ''confirmed'', stage_reason_origin = null, stage_reason_code = null, stage_reason_payload = null where id = %L', other_active_application_id)
   from confirmation_cases where name = 'valid'),
  null, null, 'a second confirmed application for the gig is rejected'
);
select throws_ok(
  (select format('insert into public.engagements select gen_random_uuid(), gig_id, application_id, selection_request_id, client_participant_user_id, freelancer_participant_user_id, status, accepted_application_version_id, accepted_gig_version_id, accepted_terms_contract_version, accepted_terms_snapshot, snapshot_schema_version, confirmed_at, work_started_by_user_id, work_started_at, completion_requested_by_user_id, completion_requested_at, cancellation_requested_by_user_id, cancellation_requested_at, cancellation_reason_code, cancellation_detail, previous_active_status from public.engagements where gig_id = %L', gig_id)
   from confirmation_cases where name = 'valid'),
  null, null, 'one accepted request cannot create two engagements'
);
select throws_ok((select format('update public.engagements set accepted_terms_snapshot = ''{}'' where gig_id = %L', gig_id) from confirmation_cases where name = 'valid'), null, null, 'accepted engagement snapshot cannot be mutated');
select throws_ok((select format('update public.engagements set selection_request_id = gen_random_uuid() where gig_id = %L', gig_id) from confirmation_cases where name = 'valid'), null, null, 'engagement identity references cannot change');
select throws_ok((select format('delete from public.engagements where gig_id = %L', gig_id) from confirmation_cases where name = 'valid'), null, null, 'engagement cannot be physically deleted');
select throws_ok((select format('update public.marketplace_events set event_type = ''changed'' where gig_id = %L', gig_id) from confirmation_cases where name = 'valid'), null, null, 'marketplace events reject updates');
select throws_ok((select format('delete from public.marketplace_events where gig_id = %L', gig_id) from confirmation_cases where name = 'valid'), null, null, 'marketplace events reject deletes');

set local role authenticated;
select set_config('request.jwt.claim.sub', (select client_user_id::text from confirmation_cases where name = 'other_tenant'), true);
select is((select count(*) from public.engagements where gig_id = (select gig_id from confirmation_cases where name = 'valid')), 0::bigint, 'Client B cannot read Client A engagement');
reset role;

select * from finish();
rollback;
