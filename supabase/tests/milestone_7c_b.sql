begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
set constraints all deferred;

create temporary table gig_management_case (
  client_id uuid not null,
  gig_id uuid not null,
  initial_version_id uuid not null,
  published_version_id uuid,
  minor_version_id uuid,
  material_version_id uuid,
  application_id uuid,
  application_version_id uuid,
  selection_request_id uuid
);
grant select on gig_management_case to authenticated;

do $$
declare
  client uuid:=gen_random_uuid();
  gig uuid:=gen_random_uuid();
  initial_version uuid;
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000',client,'authenticated','authenticated','7cb-client@example.test','',now(),'{}','{}',now(),now());
  insert into public.user_profiles(id,email,full_name,role) values(client,'7cb-client@example.test','7CB Client','client');
  insert into public.client_profiles(user_id,company_name) values(client,'7CB Company');
  insert into public.gigs(id,client_id,title,description,tech_category,status,required_skills,preferred_skills,deliverables,seniority_needed,work_mode,deadline)
  values(gig,client,'Draft API','Build an API','backend','draft',array['FastAPI'],array['PostgreSQL'],array['API'],'mid','remote',now()+interval '7 days');
  select current_gig_version_id into initial_version from public.gigs where id=gig;
  insert into gig_management_case values(client,gig,initial_version,null,null,null);
end $$;

select is((select opportunity_lifecycle from public.gigs where id=(select gig_id from gig_management_case)),'draft','seed is a genuine draft');
select is((select terms_contract_version from public.gig_versions where id=(select initial_version_id from gig_management_case)),0,'draft compatibility snapshot remains contract zero');

select lives_ok(format($sql$
  select public.manage_gig_publish(%L,%L,%L,%L::jsonb)
$sql$,
  (select gig_id from gig_management_case),(select client_id from gig_management_case),(select initial_version_id from gig_management_case),
  jsonb_build_object(
    'version_kind','initial_product_version','terms_contract_version',1,'snapshot_schema_version',1,
    'payment_structure','fixed_price','currency','USD','title','Draft API','description','Build an API',
    'scope',jsonb_build_object('tech_category','backend'),
    'client_payment',jsonb_build_object('payment_structure','fixed_price','currency','USD','budget',jsonb_build_object('minimum',1000,'maximum',2000),'flexibility','negotiable'),
    'required_skills',jsonb_build_array('FastAPI'),'preferred_skills',jsonb_build_array('PostgreSQL'),
    'experience_requirement','mid','difficulty_level','intermediate','work_mode','remote','location_requirements',null,
    'weekly_commitment',null,'expected_duration',null,'application_deadline','2099-12-01T12:00:00+00:00',
    'project_deadline','2100-01-01T12:00:00+00:00','deliverables',jsonb_build_array('API'),'assumptions',jsonb_build_array()
  )::text), 'valid draft publishes atomically');

update gig_management_case set published_version_id=(select current_gig_version_id from public.gigs where id=gig_id);
select is((select status from public.gigs where id=(select gig_id from gig_management_case)),'open','publication projects open state');
select is((select version_number from public.gig_versions where id=(select published_version_id from gig_management_case)),2,'publication allocates next per-gig snapshot number');
select is((select terms_contract_version from public.gig_versions where id=(select published_version_id from gig_management_case)),1,'publication creates supported contract one');
select is((select current_gig_version_id from public.gigs where id=(select gig_id from gig_management_case)),(select current_material_gig_version_id from public.gigs where id=(select gig_id from gig_management_case)),'publication moves both pointers together');
select is((select count(*) from public.marketplace_events where gig_id=(select gig_id from gig_management_case) and event_type='gig_published'),1::bigint,'publication records one event');

select ok(not has_function_privilege('authenticated','public.manage_gig_publish(uuid,uuid,uuid,jsonb)','EXECUTE'),'authenticated cannot execute publish RPC');
select ok(has_function_privilege('service_role','public.manage_gig_publish(uuid,uuid,uuid,jsonb)','EXECUTE'),'service role can execute publish RPC');
select ok(not has_function_privilege('authenticated','public.manage_gig_edit(uuid,uuid,uuid,jsonb,boolean,text)','EXECUTE'),'authenticated cannot execute edit RPC');
select ok(not has_table_privilege('authenticated','public.gig_versions','INSERT'),'browser cannot insert gig versions');
select ok(not has_table_privilege('authenticated','public.gig_versions','UPDATE'),'browser cannot update gig versions');
select ok(not has_table_privilege('authenticated','public.gigs','DELETE'),'browser cannot physically delete gigs');

select is(
  (select (public.preview_gig_edit(gig_id,client_id,published_version_id,
    jsonb_set((select terms_snapshot from public.gig_versions where id=published_version_id),'{title}','"DRAFT API"')))->>'is_material'
   from gig_management_case), 'false', 'case-only title correction is canonically minor');

select lives_ok((select format($sql$select public.manage_gig_edit(%L,%L,%L,jsonb_set((select terms_snapshot from public.gig_versions where id=%L),'{title}','"DRAFT API"'),false,null)$sql$,gig_id,client_id,published_version_id,published_version_id) from gig_management_case),'minor edit succeeds without consequence confirmation');
update gig_management_case set minor_version_id=(select current_gig_version_id from public.gigs where id=gig_id);
select isnt((select minor_version_id from gig_management_case),(select published_version_id from gig_management_case),'minor edit moves display pointer');
select is((select current_material_gig_version_id from public.gigs where id=(select gig_id from gig_management_case)),(select published_version_id from gig_management_case),'minor edit preserves material pointer');

select is(
  (select (public.preview_gig_edit(gig_id,client_id,minor_version_id,
    jsonb_set((select terms_snapshot from public.gig_versions where id=minor_version_id),'{client_payment,budget,maximum}','2500')))->>'is_material' from gig_management_case),
  'true','budget change is material at trusted database boundary');

select lives_ok((select format($sql$select public.manage_gig_edit(%L,%L,%L,jsonb_set((select terms_snapshot from public.gig_versions where id=%L),'{client_payment,budget,maximum}','2500'),false,null)$sql$,gig_id,client_id,minor_version_id,minor_version_id) from gig_management_case),'material edit without dependents commits');
update gig_management_case set material_version_id=(select current_gig_version_id from public.gigs where id=gig_id);
select is((select current_material_gig_version_id from public.gigs where id=(select gig_id from gig_management_case)),(select material_version_id from gig_management_case),'material edit moves both pointers');
select throws_ok((select format('select public.manage_gig_edit(%L,%L,%L,(select terms_snapshot from public.gig_versions where id=%L),false,null)',gig_id,client_id,minor_version_id,minor_version_id) from gig_management_case),'40001','M7CB_STALE_GIG_VERSION','stale expected version is rejected');

do $$
declare
  freelancer_user uuid:=gen_random_uuid(); freelancer_profile uuid:=gen_random_uuid(); app uuid:=gen_random_uuid(); app_version uuid:=gen_random_uuid(); request uuid:=gen_random_uuid(); c gig_management_case;
begin
  select * into c from gig_management_case;
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000',freelancer_user,'authenticated','authenticated','7cb-freelancer@example.test','',now(),'{}','{}',now(),now());
  insert into public.user_profiles(id,email,full_name,role) values(freelancer_user,'7cb-freelancer@example.test','7CB Freelancer','freelancer');
  insert into public.freelancer_profiles(id,user_id,headline) values(freelancer_profile,freelancer_user,'Backend Engineer');
  insert into public.applications(id,gig_id,freelancer_profile_id,stage,current_version_id,stage_changed_by_actor_type,stage_changed_by_user_id)
  values(app,c.gig_id,freelancer_profile,'advanced',app_version,'user',c.client_id);
  insert into public.application_versions(id,application_id,gig_id,version_number,gig_version_id,origin,snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,availability_snapshot,scope_snapshot,created_by_user_id)
  values(app_version,app,c.gig_id,1,c.material_version_id,'initial_submission',1,'Ready to build.',
    jsonb_build_object('proposal_contract_version',1,'snapshot_schema_version',1,'payment_structure','fixed_price','currency','USD'),
    '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,freelancer_user);
  insert into public.selection_requests(id,gig_id,application_id,application_version_id,gig_version_id,created_by_user_id,created_at,expires_at)
  values(request,c.gig_id,app,app_version,c.material_version_id,c.client_id,now()-interval '1 minute',now()+interval '1 day');
  update gig_management_case set application_id=app,application_version_id=app_version,selection_request_id=request;
end $$;

select throws_ok((select format('select public.manage_gig_lifecycle(%L,%L,''pause'',''business_delay'',''{}'')',gig_id,client_id) from gig_management_case),'P0001','M7CB_PENDING_SELECTION_BLOCKS_PAUSE','effective pending request blocks pause');
select is(
  (select (public.preview_gig_edit(gig_id,client_id,material_version_id,
    jsonb_set((select terms_snapshot from public.gig_versions where id=material_version_id),'{client_payment,budget,maximum}','3000')))->>'code' from gig_management_case),
  'material_change_confirmation_required','material edit with dependents requires preview confirmation');
select throws_ok((select format($sql$select public.manage_gig_edit(%L,%L,%L,jsonb_set((select terms_snapshot from public.gig_versions where id=%L),'{client_payment,budget,maximum}','3000'),false,null)$sql$,gig_id,client_id,material_version_id,material_version_id) from gig_management_case),'P0001','M7CB_MATERIAL_CHANGE_CONFIRMATION_REQUIRED','unconfirmed consequences cannot commit');
select throws_ok((select format($sql$select public.manage_gig_edit(%L,%L,%L,jsonb_set((select terms_snapshot from public.gig_versions where id=%L),'{client_payment,budget,maximum}','3000'),true,'stale-fingerprint')$sql$,gig_id,client_id,material_version_id,material_version_id) from gig_management_case),'P0001','M7CB_MATERIAL_CHANGE_CONSEQUENCES_CHANGED','stale preview fingerprint cannot commit');
select lives_ok((select format($sql$select public.manage_gig_edit(%L,%L,%L,jsonb_set((select terms_snapshot from public.gig_versions where id=%L),'{client_payment,budget,maximum}','3000'),true,%L)$sql$,
  gig_id,client_id,material_version_id,material_version_id,
  (public.preview_gig_edit(gig_id,client_id,material_version_id,jsonb_set((select terms_snapshot from public.gig_versions where id=material_version_id),'{client_payment,budget,maximum}','3000')))->>'preview_fingerprint') from gig_management_case),'confirmed material edit commits');
update gig_management_case set material_version_id=(select current_material_gig_version_id from public.gigs where id=gig_id);
select is((select status from public.selection_requests where id=(select selection_request_id from gig_management_case)),'invalidated','material edit invalidates the effective request');
select is((select current_version_id from public.applications where id=(select application_id from gig_management_case)),(select application_version_id from gig_management_case),'material edit never rewrites application versions');
select isnt((select gig_version_id from public.application_versions where id=(select application_version_id from gig_management_case)),(select material_version_id from gig_management_case),'application staleness remains derived from version linkage');

set local role authenticated;
select set_config('request.jwt.claim.sub',(select client_id::text from gig_management_case),true);
select lives_ok((select format('update public.gigs set title=''bypass'' where id=%L',gig_id) from gig_management_case),'published bypass is filtered by RLS');
select isnt((select title from public.gigs where id=(select gig_id from gig_management_case)),'bypass','authenticated owner cannot directly edit published terms');
select lives_ok((select format($sql$insert into public.gigs(client_id,title,description,tech_category,required_skills,preferred_skills,budget_min,budget_max,difficulty_level,seniority_needed,deliverables,work_mode,deadline,status)
  values(%L,'Second genuine draft','Draft content','backend',array['FastAPI'],array['PostgreSQL'],1000,2000,'intermediate','mid',array['API'],'remote',now()+interval '7 days','draft')$sql$,client_id) from gig_management_case),'authenticated owner can still create a genuine draft');
reset role;

select throws_ok((select format('update public.gig_versions set changed_fields=array[''forged''] where id=%L',material_version_id) from gig_management_case),null,null,'old versions remain immutable');
select lives_ok((select format('select public.manage_gig_lifecycle(%L,%L,''close_intake'',''moving_to_applicant_review'',''{}'')',gig_id,client_id) from gig_management_case),'close intake succeeds');
select is((select status from public.gigs where id=(select gig_id from gig_management_case)),'closed_to_new_applications','close intake is not cancellation');
select lives_ok((select format('select public.manage_gig_lifecycle(%L,%L,''reopen_intake'',null,''{}'')',gig_id,client_id) from gig_management_case),'future-deadline intake reopens');
select lives_ok((select format('select public.manage_gig_lifecycle(%L,%L,''pause'',''business_delay'',''{}'')',gig_id,client_id) from gig_management_case),'pause succeeds without an effective request');
select is((select application_intake from public.gigs where id=(select gig_id from gig_management_case)),'accepting','pause preserves intake');
select lives_ok((select format('select public.manage_gig_lifecycle(%L,%L,''resume'',null,''{}'')',gig_id,client_id) from gig_management_case),'resume succeeds');
do $$
declare c gig_management_case; request uuid:=gen_random_uuid(); begin
  select * into c from gig_management_case;
  insert into public.selection_requests(id,gig_id,application_id,application_version_id,gig_version_id,created_by_user_id,created_at,expires_at,previous_selection_request_id)
  values(request,c.gig_id,c.application_id,c.application_version_id,(select gig_version_id from public.application_versions where id=c.application_version_id),c.client_id,now()-interval '1 minute',now()+interval '1 day',c.selection_request_id);
  update gig_management_case set selection_request_id=request;
end $$;
select lives_ok((select format('select public.manage_gig_lifecycle(%L,%L,''cancel'',''opportunity_no_longer_required'',''{"applicant_facing_explanation":"Cancelled","closes_active_records_confirmed":true}'')',gig_id,client_id) from gig_management_case),'active published gig cancels');
select is((select status from public.gigs where id=(select gig_id from gig_management_case)),'cancelled','cancellation is terminal');
select is((select stage from public.applications where id=(select application_id from gig_management_case)),'closed_gig_cancelled','cancellation closes active applications without Not Selected');
select is((select status from public.selection_requests where id=(select selection_request_id from gig_management_case)),'cancelled','cancellation cancels only the effectively active request');
select throws_ok((select format('select public.manage_gig_lifecycle(%L,%L,''resume'',null,''{}'')',gig_id,client_id) from gig_management_case),'P0001','M7CB_INVALID_GIG_TRANSITION','terminal gig cannot resume');

select * from finish();
rollback;
