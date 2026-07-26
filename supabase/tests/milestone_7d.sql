begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
set constraints all deferred;

create temporary table application_case (
  client_user_id uuid not null,
  freelancer_user_id uuid not null,
  freelancer_profile_id uuid not null,
  other_user_id uuid not null,
  other_profile_id uuid not null,
  gig_id uuid not null,
  material_version_id uuid not null,
  application_id uuid,
  request_id uuid not null
);
grant select on application_case to authenticated;

create or replace function pg_temp.gig_snapshot(
  p_structure text default 'fixed_price',
  p_currency text default 'USD',
  p_maximum numeric default 2000,
  p_deadline timestamptz default '2099-12-01T12:00:00+00:00'
)
returns jsonb language plpgsql as $$
declare payment jsonb;
begin
  payment := case p_structure
    when 'fixed_price' then jsonb_build_object('payment_structure',p_structure,'currency',p_currency,
      'budget',jsonb_build_object('minimum',1000,'maximum',p_maximum),'flexibility','slightly_flexible')
    when 'hourly' then jsonb_build_object('payment_structure',p_structure,'currency',p_currency,
      'hourly_rate',jsonb_build_object('minimum',20,'maximum',p_maximum),
      'weekly_commitment_hours',jsonb_build_object('minimum',20,'maximum',30),
      'engagement_duration',jsonb_build_object('mode','exact','unit','months','exact_value',3))
    else jsonb_build_object('payment_structure',p_structure,'currency',p_currency,
      'guidance',jsonb_build_object('guidance_type','maximum_budget_ceiling','currency',p_currency,'maximum',p_maximum),
      'preferred_proposal_form','freelancer_recommendation')
  end;
  return jsonb_build_object(
    'version_kind','initial_product_version','terms_contract_version',1,'snapshot_schema_version',1,
    'payment_structure',p_structure,'currency',p_currency,'title','Verified API build',
    'description','Build and verify a product-grade API.','scope',jsonb_build_object('tech_category','backend'),
    'client_payment',payment,'required_skills',jsonb_build_array('FastAPI'),
    'preferred_skills',jsonb_build_array('PostgreSQL'),'experience_requirement','mid',
    'difficulty_level','intermediate','work_mode','remote','location_requirements',null,
    'weekly_commitment',null,'expected_duration',null,'application_deadline',p_deadline,
    'project_deadline','2100-01-01T12:00:00+00:00','deliverables',jsonb_build_array('API'),
    'assumptions',jsonb_build_array()
  );
end $$;

create or replace function pg_temp.application_snapshot(
  p_total numeric default 1500,
  p_above_explanation text default null,
  p_cover_note text default 'I can deliver this API safely.'
)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'proposal_contract_version',1,'snapshot_schema_version',1,'cover_note',p_cover_note,
    'proposal',jsonb_build_object(
      'proposal_contract_version',1,'snapshot_schema_version',1,'payment_structure','fixed_price',
      'currency','USD','mode','exact_total','exact_total',p_total,
      'above_budget_explanation',p_above_explanation
    ),
    'timeline',jsonb_build_object('mode','exact','unit','weeks','exact_value',4),
    'availability',jsonb_build_object('available_from','2098-01-01'),
    'scope',jsonb_build_object('included_work',jsonb_build_array('API implementation'),
      'excluded_work',jsonb_build_array('Hosting fees'),'assumptions',jsonb_build_array('Access is provided'),
      'estimate_change_factors',jsonb_build_array('Scope changes')),
    'scope_notes','Complete delivery proposal'
  ))
$$;

do $$
declare
  client_user uuid:=gen_random_uuid(); freelancer_user uuid:=gen_random_uuid();
  freelancer_profile uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid();
  other_profile uuid:=gen_random_uuid(); gig uuid:=gen_random_uuid(); version_id uuid:=gen_random_uuid();
  request_id uuid:=gen_random_uuid();
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
  ('00000000-0000-0000-0000-000000000000',client_user,'authenticated','authenticated','7d-client@example.test','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',freelancer_user,'authenticated','authenticated','7d-freelancer@example.test','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',other_user,'authenticated','authenticated','7d-other@example.test','',now(),'{}','{}',now(),now());
  insert into public.user_profiles(id,email,full_name,role) values
    (client_user,'7d-client@example.test','7D Client','client'),
    (freelancer_user,'7d-freelancer@example.test','7D Freelancer','freelancer'),
    (other_user,'7d-other@example.test','Other Freelancer','freelancer');
  insert into public.client_profiles(user_id,company_name) values(client_user,'7D Company');
  insert into public.freelancer_profiles(id,user_id,headline) values
    (freelancer_profile,freelancer_user,'API Engineer'),(other_profile,other_user,'Other Engineer');
  insert into public.gigs(id,client_id,title,description,tech_category,required_skills,preferred_skills,
    budget_min,budget_max,difficulty_level,seniority_needed,deliverables,work_mode,deadline,status,
    opportunity_lifecycle,application_intake,operational_state,current_gig_version_id,current_material_gig_version_id)
  values(gig,client_user,'Verified API build','Build and verify a product-grade API.','backend',array['FastAPI'],
    array['PostgreSQL'],1000,2000,'intermediate','mid',array['API'],'remote','2099-12-01','open',
    'active','accepting','active',version_id,version_id);
  insert into public.gig_versions(id,gig_id,version_number,snapshot_schema_version,terms_snapshot,
    changed_fields,created_by_actor_type,created_by_user_id)
  values(version_id,gig,1,1,pg_temp.gig_snapshot(),array['initial_publication'],'user',client_user);
  insert into application_case values(client_user,freelancer_user,freelancer_profile,other_user,
    other_profile,gig,version_id,null,request_id);
end $$;

select ok((select is_nullable = 'YES' from information_schema.columns
  where table_schema='public' and table_name='applications' and column_name='submission_request_id'),
  'existing rows remain migration-compatible with nullable idempotency fields');
select ok(not has_function_privilege('authenticated','public.submit_application(uuid,uuid,uuid,text,jsonb)','EXECUTE'),
  'browser cannot execute submission RPC');
select ok(has_function_privilege('service_role','public.submit_application(uuid,uuid,uuid,text,jsonb)','EXECUTE'),
  'service role can execute submission RPC');
select ok(not has_table_privilege('service_role','public.applications','INSERT'),
  'service role direct application insert remains denied');
select ok(not has_table_privilege('authenticated','public.application_versions','INSERT'),
  'authenticated direct version insert remains denied');
select ok(not private.validate_application_snapshot(pg_temp.application_snapshot(),
  jsonb_set(pg_temp.gig_snapshot(),'{terms_contract_version}','0')),
  'contract-zero gig terms reject application snapshots');
select ok(not private.validate_application_snapshot(pg_temp.application_snapshot(),
  pg_temp.gig_snapshot()-'deliverables'),'incomplete material terms reject application snapshots');
select ok(not private.validate_application_snapshot(jsonb_set(pg_temp.application_snapshot(),
  '{proposal,payment_structure}','"hourly"'),pg_temp.gig_snapshot()),
  'payment-structure-incompatible application snapshot is rejected');

select lives_ok((select format($sql$select public.submit_application(%L,%L,%L,%L,%L::jsonb)$sql$,
  gig_id,freelancer_user_id,request_id,private.application_terms_token(gig_id,material_version_id),
  pg_temp.application_snapshot()::text) from application_case),'eligible fixed-price submission succeeds');
update application_case set application_id=(select id from public.applications
  where gig_id=application_case.gig_id and freelancer_profile_id=application_case.freelancer_profile_id);
select is((select stage from public.applications where id=(select application_id from application_case)),
  'under_review','submission creates the active aggregate');
select is((select count(*) from public.application_versions where application_id=(select application_id from application_case)),
  1::bigint,'submission creates exactly one complete version');
select is((select version_number from public.application_versions where application_id=(select application_id from application_case)),
  1,'initial version has ordinal one');
select is((select scope_notes from public.application_versions where application_id=(select application_id from application_case)),
  'Complete delivery proposal','complete historical snapshot preserves scope notes');
select is((select count(*) from public.marketplace_events where application_id=(select application_id from application_case)
  and event_type='application_submitted'),1::bigint,'submission creates one reference-oriented event');
select ok((select current_version_id in (select id from public.application_versions where application_id=applications.id)
  from public.applications where id=(select application_id from application_case)),'current pointer is atomic and exact');

select is((select (public.submit_application(gig_id,freelancer_user_id,request_id,
  private.application_terms_token(gig_id,material_version_id),jsonb_set(pg_temp.application_snapshot(),
    '{proposal,exact_total}','"1500.00"'::jsonb)))->>'idempotent_replay'
  from application_case),'true','same canonical request replays idempotently');
select is((select count(*) from public.application_versions where application_id=(select application_id from application_case)),
  1::bigint,'equal replay creates no duplicate version');
select throws_ok((select format($sql$select public.submit_application(%L,%L,%L,%L,%L::jsonb)$sql$,
  gig_id,freelancer_user_id,request_id,private.application_terms_token(gig_id,material_version_id),
  pg_temp.application_snapshot(1600)::text) from application_case),'23505','M7D_IDEMPOTENCY_KEY_REUSED',
  'same key with a different canonical operation conflicts');
select throws_ok((select format($sql$select public.submit_application(%L,%L,%L,%L,%L::jsonb)$sql$,
  gig_id,freelancer_user_id,gen_random_uuid(),private.application_terms_token(gig_id,material_version_id),
  pg_temp.application_snapshot()::text) from application_case),'23505','M7D_APPLICATION_ALREADY_EXISTS',
  'different request key cannot create a second history');
select throws_ok((select format($sql$select public.submit_application(%L,%L,%L,'stale',%L::jsonb)$sql$,
  gig_id,other_user_id,gen_random_uuid(),pg_temp.application_snapshot()::text) from application_case),
  '40001','M7D_STALE_GIG_TERMS','stale material terms token fails closed');
select throws_ok((select format($sql$select public.submit_application(%L,%L,%L,%L,%L::jsonb)$sql$,
  gig_id,other_user_id,gen_random_uuid(),private.application_terms_token(gig_id,material_version_id),
  pg_temp.application_snapshot(2500)::text) from application_case),'22023','M7D_INVALID_FINANCIAL_PROPOSAL',
  'above-budget fixed proposal requires explanation');

select throws_ok((select format('update public.application_versions set cover_note=''rewrite'' where application_id=%L',application_id)
  from application_case),null,null,'immutable application versions reject updates');
select throws_ok((select format('delete from public.applications where id=%L',application_id) from application_case),
  null,null,'physical application deletion is rejected');

create or replace function pg_temp.reject_7d_event() returns trigger language plpgsql as $$
begin
  if new.event_type='application_version_created' then raise exception 'forced event failure'; end if;
  return new;
end $$;
create trigger reject_7d_event before insert on public.marketplace_events
for each row execute function pg_temp.reject_7d_event();
select throws_ok((select format($sql$select public.create_application_version(%L,%L,%L,%L::jsonb)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  pg_temp.application_snapshot(1600)::text) from application_case),null,null,
  'event failure rolls back the complete application edit');
select is((select count(*) from public.application_versions where application_id=(select application_id from application_case)),
  1::bigint,'event rollback leaves immutable history unchanged');
drop trigger reject_7d_event on public.marketplace_events;

select lives_ok((select format($sql$select public.create_application_version(%L,%L,%L,%L::jsonb)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  pg_temp.application_snapshot(1700)::text) from application_case),'ordinary complete edit creates a version');
select is((select max(version_number) from public.application_versions where application_id=(select application_id from application_case)),
  2,'ordinary edit increments exactly once');
select throws_ok((select format($sql$select public.create_application_version(%L,%L,'stale',%L::jsonb)$sql$,
  application_id,freelancer_user_id,pg_temp.application_snapshot()::text) from application_case),
  '40001','M7D_STALE_APPLICATION_VERSION','stale application token conflicts');

do $$
declare c application_case; request uuid:=gen_random_uuid(); app_version uuid;
begin
  select * into c from application_case;
  select current_version_id into app_version from public.applications where id=c.application_id;
  insert into public.selection_requests(id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at)
  values(request,c.gig_id,c.application_id,app_version,c.material_version_id,c.client_user_id,
    clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 day');
end $$;
select lives_ok((select format($sql$select public.create_application_version(%L,%L,%L,%L::jsonb)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  pg_temp.application_snapshot(1750)::text) from application_case),'edit proceeds while own request is effective');
select is((select status from public.selection_requests where gig_id=(select gig_id from application_case)
  order by created_at desc limit 1),'invalidated','own effective request is atomically invalidated by edit');
select is((select invalidation_reason from public.selection_requests where gig_id=(select gig_id from application_case)
  order by created_at desc limit 1),'application_version_changed','edit uses the existing invalidation reason');

select lives_ok((select format('select public.manage_gig_lifecycle(%L,%L,''close_intake'',''moving_to_applicant_review'',''{}'')',
  gig_id,client_user_id) from application_case),'intake can close with application preserved');
select lives_ok((select format($sql$select public.create_application_version(%L,%L,%L,%L::jsonb)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  pg_temp.application_snapshot(1800)::text) from application_case),'ordinary maintenance remains allowed after intake closes');
select lives_ok((select format('select public.manage_gig_lifecycle(%L,%L,''reopen_intake'',null,''{}'')',
  gig_id,client_user_id) from application_case),'future-deadline intake reopens before later reapplication');

do $$
declare c application_case; current_display uuid; preview jsonb; candidate jsonb;
begin
  select * into c from application_case;
  select current_gig_version_id into current_display from public.gigs where id=c.gig_id;
  candidate:=jsonb_set((select terms_snapshot from public.gig_versions where id=current_display),
    '{client_payment,budget,maximum}','2500');
  preview:=public.preview_gig_edit(c.gig_id,c.client_user_id,current_display,candidate);
  perform public.manage_gig_edit(c.gig_id,c.client_user_id,current_display,candidate,true,preview->>'preview_fingerprint');
  update application_case set material_version_id=(select current_material_gig_version_id from public.gigs where id=c.gig_id);
end $$;
select throws_ok((select format($sql$select public.create_application_version(%L,%L,%L,%L::jsonb)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  pg_temp.application_snapshot()::text) from application_case),'P0001','M7D_RESPONSE_TO_UPDATED_GIG_REQUIRED',
  'material gig change blocks ordinary editing');
do $$
declare c application_case; request uuid:=gen_random_uuid(); app_version public.application_versions;
begin
  select * into c from application_case;
  select av.* into app_version from public.applications a join public.application_versions av
    on av.id=a.current_version_id where a.id=c.application_id;
  insert into public.selection_requests(id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at)
  values(request,c.gig_id,c.application_id,app_version.id,app_version.gig_version_id,c.client_user_id,
    clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 day');
end $$;
select lives_ok((select format($sql$select public.respond_to_application_gig_change(%L,%L,'reaffirm',%L,%L,null)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  private.application_terms_token(gig_id,material_version_id)) from application_case),
  'compatible reaffirmation copies the immutable applicant snapshot');
select is((select status from public.selection_requests where gig_id=(select gig_id from application_case)
  order by created_at desc limit 1),'invalidated','changed-gig response invalidates an effective own request');
select is((select origin from public.application_versions where application_id=(select application_id from application_case)
  order by version_number desc limit 1),'gig_change_terms_reaffirmed','reaffirmation has the exact origin');
select is((select scope_notes from public.application_versions where application_id=(select application_id from application_case)
  order by version_number desc limit 1),'Complete delivery proposal','reaffirmation copies historical scope notes');
select is((select gig_version_id from public.application_versions where application_id=(select application_id from application_case)
  order by version_number desc limit 1),(select material_version_id from application_case),
  'reaffirmation binds the reviewed current material version');

do $$
declare c application_case; request uuid:=gen_random_uuid(); app_version uuid;
begin
  select * into c from application_case;
  select current_version_id into app_version from public.applications where id=c.application_id;
  insert into public.selection_requests(id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at)
  values(request,c.gig_id,c.application_id,app_version,c.material_version_id,c.client_user_id,
    clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 day');
end $$;
select throws_ok((select format($sql$select public.withdraw_application(%L,%L,%L,'no_longer_available',null)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id))) from application_case),
  'P0001','M7D_PENDING_SELECTION_BLOCKS_APPLICATION_WITHDRAWAL','own active request blocks ordinary withdrawal');
update public.selection_requests set status='invalidated',terminal_at=clock_timestamp(),
  invalidation_reason='application_version_changed' where gig_id=(select gig_id from application_case) and status='pending';
select lives_ok((select format($sql$select public.withdraw_application(%L,%L,%L,'no_longer_available',null)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id))) from application_case),
  'structured withdrawal succeeds without deleting versions');
select is((select stage from public.applications where id=(select application_id from application_case)),
  'withdrawn','withdrawal updates current aggregate stage');
select ok((select count(*)>1 from public.application_versions where application_id=(select application_id from application_case)),
  'withdrawal preserves every immutable version');

do $$
declare c application_case; current_display uuid; preview jsonb; candidate jsonb;
begin
  select * into c from application_case;
  select current_gig_version_id into current_display from public.gigs where id=c.gig_id;
  candidate:=jsonb_set((select terms_snapshot from public.gig_versions where id=current_display),
    '{client_payment,budget,maximum}','3000');
  preview:=public.preview_gig_edit(c.gig_id,c.client_user_id,current_display,candidate);
  perform public.manage_gig_edit(c.gig_id,c.client_user_id,current_display,candidate,true,preview->>'preview_fingerprint');
  update application_case set material_version_id=(select current_material_gig_version_id from public.gigs where id=c.gig_id);
end $$;
select lives_ok((select format($sql$select public.reapply_application_after_gig_change(%L,%L,%L,%L,%L::jsonb)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  private.application_terms_token(gig_id,material_version_id),pg_temp.application_snapshot(1900)::text)
  from application_case),'withdrawn freelancer reapplies after a newer material version');
select is((select stage from public.applications where id=(select application_id from application_case)),
  'under_review','reapplication reactivates the same history');
select is((select origin from public.application_versions where application_id=(select application_id from application_case)
  order by version_number desc limit 1),'gig_change_reapplication','reapplication uses its distinct origin');
select is((select count(*) from public.applications where id=(select application_id from application_case)),
  1::bigint,'reapplication never creates a second aggregate');

do $$
declare c application_case; current_display uuid; preview jsonb; candidate jsonb;
begin
  select * into c from application_case;
  select current_gig_version_id into current_display from public.gigs where id=c.gig_id;
  candidate:=jsonb_set((select terms_snapshot from public.gig_versions where id=current_display),
    '{title}',to_jsonb(upper((select terms_snapshot->>'title' from public.gig_versions where id=current_display))));
  preview:=public.preview_gig_edit(c.gig_id,c.client_user_id,current_display,candidate);
  if (preview->>'is_material')::boolean then raise exception 'expected minor edit'; end if;
  perform public.manage_gig_edit(c.gig_id,c.client_user_id,current_display,candidate,false,preview->>'preview_fingerprint');
end $$;
select ok((select av.gig_version_id=g.current_material_gig_version_id from public.applications a
  join public.application_versions av on av.id=a.current_version_id join public.gigs g on g.id=a.gig_id
  where a.id=(select application_id from application_case)),
  'minor gig change does not require an application response');

do $$
declare c application_case; current_display uuid; preview jsonb; candidate jsonb;
begin
  select * into c from application_case;
  select current_gig_version_id into current_display from public.gigs where id=c.gig_id;
  candidate:=jsonb_set((select terms_snapshot from public.gig_versions where id=current_display),
    '{client_payment,budget,maximum}','1800');
  preview:=public.preview_gig_edit(c.gig_id,c.client_user_id,current_display,candidate);
  perform public.manage_gig_edit(c.gig_id,c.client_user_id,current_display,candidate,true,preview->>'preview_fingerprint');
  update application_case set material_version_id=(select current_material_gig_version_id from public.gigs where id=c.gig_id);
end $$;
select throws_ok((select format($sql$select public.respond_to_application_gig_change(%L,%L,'reaffirm',%L,%L,null)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  private.application_terms_token(gig_id,material_version_id)) from application_case),
  'P0001','M7D_EXISTING_PROPOSAL_INCOMPATIBLE_WITH_UPDATED_TERMS',
  'newly above-range proposal cannot be reaffirmed without its required explanation');
select lives_ok((select format($sql$select public.respond_to_application_gig_change(%L,%L,'update',%L,%L,%L::jsonb)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  private.application_terms_token(gig_id,material_version_id),pg_temp.application_snapshot(1700)::text)
  from application_case),'updated proposal binds the reviewed lower-budget material version');

do $$
declare c application_case; current_display uuid; preview jsonb; candidate jsonb;
begin
  select * into c from application_case;
  select current_gig_version_id into current_display from public.gigs where id=c.gig_id;
  candidate:=jsonb_set(jsonb_set((select terms_snapshot from public.gig_versions where id=current_display),
    '{currency}','"EUR"'),'{client_payment,currency}','"EUR"');
  preview:=public.preview_gig_edit(c.gig_id,c.client_user_id,current_display,candidate);
  perform public.manage_gig_edit(c.gig_id,c.client_user_id,current_display,candidate,true,preview->>'preview_fingerprint');
  update application_case set material_version_id=(select current_material_gig_version_id from public.gigs where id=c.gig_id);
end $$;
select throws_ok((select format($sql$select public.respond_to_application_gig_change(%L,%L,'reaffirm',%L,%L,null)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  private.application_terms_token(gig_id,material_version_id)) from application_case),
  'P0001','M7D_EXISTING_PROPOSAL_INCOMPATIBLE_WITH_UPDATED_TERMS',
  'currency-incompatible proposal cannot be reaffirmed');
select lives_ok((select format($sql$select public.respond_to_application_gig_change(%L,%L,'update',%L,%L,%L::jsonb)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  private.application_terms_token(gig_id,material_version_id),
  jsonb_set(pg_temp.application_snapshot(1700),'{proposal,currency}','"EUR"')::text)
  from application_case),'proposal can be updated to the reviewed currency');

do $$
declare c application_case; current_display uuid; preview jsonb; candidate jsonb;
begin
  select * into c from application_case;
  select current_gig_version_id into current_display from public.gigs where id=c.gig_id;
  candidate:=pg_temp.gig_snapshot('hourly','EUR',100);
  preview:=public.preview_gig_edit(c.gig_id,c.client_user_id,current_display,candidate);
  perform public.manage_gig_edit(c.gig_id,c.client_user_id,current_display,candidate,true,preview->>'preview_fingerprint');
  update application_case set material_version_id=(select current_material_gig_version_id from public.gigs where id=c.gig_id);
end $$;
select throws_ok((select format($sql$select public.respond_to_application_gig_change(%L,%L,'reaffirm',%L,%L,null)$sql$,
  application_id,freelancer_user_id,private.application_version_token(application_id,
    (select current_version_id from public.applications where id=application_id)),
  private.application_terms_token(gig_id,material_version_id)) from application_case),
  'P0001','M7D_EXISTING_PROPOSAL_INCOMPATIBLE_WITH_UPDATED_TERMS',
  'payment-structure-incompatible proposal cannot be reaffirmed');

set local role authenticated;
select set_config('request.jwt.claim.sub',(select other_user_id::text from application_case),true);
select is((select count(*) from public.applications where id=(select application_id from application_case)),
  0::bigint,'cross-freelancer application read is hidden by RLS');
reset role;

select * from finish();
rollback;
