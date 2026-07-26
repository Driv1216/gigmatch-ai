begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
set constraints all deferred;

create temporary table selection_cases(
  name text primary key,
  client_user_id uuid not null,
  freelancer_user_id uuid not null,
  freelancer_profile_id uuid not null,
  gig_id uuid not null,
  gig_version_id uuid not null,
  application_id uuid not null,
  application_version_id uuid not null
);

create or replace function pg_temp.gig_snapshot(
  p_deadline timestamptz default '2099-12-01T12:00:00+00:00',
  p_maximum numeric default 2000
) returns jsonb language sql as $$
  select jsonb_build_object(
    'version_kind','initial_product_version','terms_contract_version',1,
    'snapshot_schema_version',1,'payment_structure','fixed_price','currency','USD',
    'title','Selection-ready API build','description','Build a verified API.',
    'scope',jsonb_build_object('tech_category','backend'),
    'client_payment',jsonb_build_object(
      'payment_structure','fixed_price','currency','USD',
      'budget',jsonb_build_object('minimum',1000,'maximum',p_maximum),
      'flexibility','slightly_flexible'
    ),
    'required_skills',jsonb_build_array('FastAPI'),
    'preferred_skills',jsonb_build_array('PostgreSQL'),
    'experience_requirement','mid','difficulty_level','intermediate',
    'work_mode','remote','location_requirements',null,'weekly_commitment',null,
    'expected_duration',null,'application_deadline',p_deadline,
    'project_deadline','2100-01-01T12:00:00+00:00',
    'deliverables',jsonb_build_array('API'),'assumptions',jsonb_build_array()
  )
$$;

create or replace function pg_temp.application_snapshot(
  p_total numeric default 1500,
  p_mode text default 'exact_total'
) returns jsonb language sql as $$
  select jsonb_build_object(
    'proposal_contract_version',1,'snapshot_schema_version',1,
    'cover_note','I can deliver these exact terms.',
    'proposal',jsonb_strip_nulls(jsonb_build_object(
      'proposal_contract_version',1,'snapshot_schema_version',1,
      'payment_structure','fixed_price','currency','USD','mode',p_mode,
      'exact_total',case when p_mode='exact_total' then p_total else null end,
      'above_budget_explanation',case when p_total>2000 then 'Specialist delivery.' else null end
    )),
    'timeline',jsonb_build_object('mode','exact','unit','weeks','exact_value',4),
    'availability',jsonb_build_object('available_from','2098-01-01'),
    'scope',jsonb_build_object(
      'included_work',jsonb_build_array('API implementation'),
      'excluded_work',jsonb_build_array('Hosting fees'),
      'assumptions',jsonb_build_array('Access is provided'),
      'estimate_change_factors',jsonb_build_array('Scope changes')
    ),
    'scope_notes','Acceptance includes the documented API boundary.'
  )
$$;

create or replace function pg_temp.seed_case(
  p_name text,
  p_stage text default 'advanced',
  p_intake text default 'accepting',
  p_operations text default 'active',
  p_deadline timestamptz default '2099-12-01T12:00:00+00:00',
  p_total numeric default 1500,
  p_mode text default 'exact_total'
) returns void language plpgsql set search_path='' as $$
declare
  client_user uuid:=gen_random_uuid();
  freelancer_user uuid:=gen_random_uuid();
  freelancer_profile uuid:=gen_random_uuid();
  gig uuid:=gen_random_uuid();
  gig_version uuid:=gen_random_uuid();
  application uuid:=gen_random_uuid();
  app_version uuid:=gen_random_uuid();
begin
  insert into auth.users(
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values
  ('00000000-0000-0000-0000-000000000000',client_user,'authenticated','authenticated',
    p_name||'-client@example.test','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',freelancer_user,'authenticated','authenticated',
    p_name||'-freelancer@example.test','',now(),'{}','{}',now(),now());
  insert into public.user_profiles(id,email,full_name,role) values
    (client_user,p_name||'-client@example.test',p_name||' Client','client'),
    (freelancer_user,p_name||'-freelancer@example.test',p_name||' Freelancer','freelancer');
  insert into public.client_profiles(user_id,company_name) values(client_user,p_name||' Company');
  insert into public.freelancer_profiles(id,user_id,headline)
    values(freelancer_profile,freelancer_user,'API Engineer');
  insert into public.gigs(
    id,client_id,title,description,tech_category,status,
    opportunity_lifecycle,application_intake,operational_state,
    current_gig_version_id,current_material_gig_version_id
  ) values (
    gig,client_user,'Selection-ready API build','Build a verified API.','backend',
    case when p_operations='paused' then 'paused'
      when p_intake='closed' then 'closed_to_new_applications' else 'open' end,
    'active',p_intake,p_operations,gig_version,gig_version
  );
  insert into public.gig_versions(
    id,gig_id,version_number,snapshot_schema_version,terms_snapshot,
    changed_fields,created_by_actor_type,created_by_user_id
  ) values (
    gig_version,gig,1,1,pg_temp.gig_snapshot(p_deadline),
    array['initial_publication'],'user',client_user
  );
  insert into public.applications(
    id,gig_id,freelancer_profile_id,stage,current_version_id,
    submitted_at,last_updated_at,stage_changed_at,
    stage_changed_by_actor_type,stage_changed_by_user_id
  ) values (
    application,gig,freelancer_profile,p_stage,app_version,
    now()-interval '2 hours',now()-interval '1 hour',now()-interval '1 hour',
    'user',client_user
  );
  insert into public.application_versions(
    id,application_id,gig_id,version_number,gig_version_id,origin,
    snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,
    availability_snapshot,scope_snapshot,scope_notes,created_by_user_id
  )
  select app_version,application,gig,1,gig_version,'initial_submission',1,
    snapshot->>'cover_note',snapshot->'proposal',snapshot->'timeline',
    snapshot->'availability',snapshot->'scope',snapshot->>'scope_notes',freelancer_user
  from (select pg_temp.application_snapshot(p_total,p_mode) snapshot) source;
  insert into selection_cases values(
    p_name,client_user,freelancer_user,freelancer_profile,
    gig,gig_version,application,app_version
  );
end $$;

create or replace function pg_temp.send_case(
  p_name text,
  p_duration integer default 48,
  p_operation_id uuid default gen_random_uuid(),
  p_ack boolean default false
) returns jsonb language plpgsql as $$
declare c selection_cases; context jsonb;
begin
  select * into c from selection_cases where name=p_name;
  context:=public.selection_get_context(c.application_id,c.client_user_id);
  return public.selection_send_request(
    c.application_id,c.client_user_id,p_duration,context->>'send_token',
    p_operation_id,p_ack
  );
end $$;

select pg_temp.seed_case('ready');
select is((public.selection_get_context(application_id,client_user_id))->>'can_send','true',
  'advanced exact-current application is selection ready') from selection_cases where name='ready';
select is((public.selection_get_context(application_id,freelancer_user_id))->>'viewer_role','freelancer',
  'freelancer can read own exact selection context') from selection_cases where name='ready';
select throws_ok((select format('select public.selection_get_context(%L,gen_random_uuid())',application_id)
  from selection_cases where name='ready'),'P0002','M7G_SELECTION_REQUEST_NOT_FOUND',
  'selection context is non-enumerating');

select pg_temp.seed_case('intake_closed','advanced','closed','active','2025-01-01');
select is((public.selection_get_context(application_id,client_user_id))->>'can_send','true',
  'closed intake and passed application deadline do not block selection')
from selection_cases where name='intake_closed';
select lives_ok($$select pg_temp.send_case('intake_closed')$$,
  'selection sends after intake closure and deadline');

select pg_temp.seed_case('under_review','under_review');
select ok((public.selection_get_context(application_id,client_user_id)->'blockers')
  ? 'application_not_advanced','non-advanced application is blocked')
from selection_cases where name='under_review';
select pg_temp.seed_case('paused','advanced','accepting','paused');
select ok((public.selection_get_context(application_id,client_user_id)->'blockers')
  ? 'selection_action_not_allowed','paused gig is blocked')
from selection_cases where name='paused';
select pg_temp.seed_case('not_concrete','advanced','accepting','active','2099-12-01',1500,
  'requires_scope_clarification');
select ok((public.selection_get_context(application_id,client_user_id)->'blockers')
  ? 'proposal_not_selection_ready','non-concrete proposal is blocked')
from selection_cases where name='not_concrete';

select pg_temp.seed_case('revision_block');
insert into public.application_revision_requests(
  application_id,gig_id,requested_application_version_id,requested_material_gig_version_id,
  created_by_user_id,reason_code,status,created_at,request_id,request_fingerprint
)
select application_id,gig_id,application_version_id,gig_version_id,client_user_id,
  'clarify_scope','open',now(),gen_random_uuid(),repeat('a',64)
from selection_cases where name='revision_block';
select ok((public.selection_get_context(application_id,client_user_id)->'blockers')
  ? 'revision_request_blocks_selection','open 7F revision blocks selection')
from selection_cases where name='revision_block';

select pg_temp.seed_case('warning','advanced','accepting','active','2099-12-01',2500);
select is((public.selection_get_context(application_id,client_user_id))
  ->>'commercial_acknowledgement_required','true','out-of-range terms require acknowledgement')
from selection_cases where name='warning';
select throws_ok((select format(
  'select public.selection_send_request(%L,%L,48,%L,gen_random_uuid(),false)',
  application_id,client_user_id,
  public.selection_get_context(application_id,client_user_id)->>'send_token'
) from selection_cases where name='warning'),'P0001','M7G_COMMERCIAL_ACKNOWLEDGEMENT_REQUIRED',
  'missing commercial acknowledgement is rejected');
select lives_ok($$select pg_temp.send_case('warning',48,gen_random_uuid(),true)$$,
  'explicit warning acknowledgement is stored by the database');

select pg_temp.seed_case('duration24');
select pg_temp.seed_case('duration48');
select pg_temp.seed_case('duration72');
select lives_ok($$select pg_temp.send_case('duration24',24)$$,'24-hour deadline is allowed');
select lives_ok($$select pg_temp.send_case('duration48',48)$$,'48-hour deadline is allowed');
select lives_ok($$select pg_temp.send_case('duration72',72)$$,'72-hour deadline is allowed');
select ok((select expires_at-created_at between interval '23 hours 59 minutes' and interval '24 hours 1 minute'
  from public.selection_requests where application_id=(select application_id from selection_cases where name='duration24')),
  'database calculates the 24-hour expiry');
select ok((select expires_at-created_at between interval '47 hours 59 minutes' and interval '48 hours 1 minute'
  from public.selection_requests where application_id=(select application_id from selection_cases where name='duration48')),
  'database calculates the 48-hour expiry');
select ok((select expires_at-created_at between interval '71 hours 59 minutes' and interval '72 hours 1 minute'
  from public.selection_requests where application_id=(select application_id from selection_cases where name='duration72')),
  'database calculates the 72-hour expiry');

select pg_temp.seed_case('send_replay');
create temporary table replay_key(value uuid);
insert into replay_key values(gen_random_uuid());
select is((pg_temp.send_case('send_replay',48,(select value from replay_key)))->>'idempotent_replay',
  'false','first send is not a replay');
select is((public.selection_send_request(
  c.application_id,c.client_user_id,48,
  public.selection_get_context(c.application_id,c.client_user_id)->>'send_token',
  k.value,false))->>'idempotent_replay','true','exact send retry returns the same request')
from selection_cases c cross join replay_key k where c.name='send_replay';
select is((select count(*) from public.selection_requests
  where application_id=(select application_id from selection_cases where name='send_replay')),
  1::bigint,'send replay creates no duplicate request');
select throws_ok((select format(
  'select public.selection_send_request(%L,%L,72,%L,%L,false)',
  c.application_id,c.client_user_id,
  public.selection_get_context(c.application_id,c.client_user_id)->>'send_token',k.value
) from selection_cases c cross join replay_key k where c.name='send_replay'),
  '23505','M7G_IDEMPOTENCY_CONFLICT','same key with different canonical send conflicts');

select pg_temp.seed_case('expiry');
insert into public.selection_requests(
  gig_id,application_id,application_version_id,gig_version_id,created_by_user_id,
  created_at,expires_at
) select gig_id,application_id,application_version_id,gig_version_id,client_user_id,
  now()-interval '2 days',now()-interval '1 day' from selection_cases where name='expiry';
select lives_ok($$select pg_temp.send_case('expiry')$$,
  'send projects a due stored-pending request and creates a new one');
select is((select count(*) from public.selection_requests where application_id=
  (select application_id from selection_cases where name='expiry') and status='expired'),
  1::bigint,'due stored request becomes expired');
select is((select count(*) from public.marketplace_events where application_id=
  (select application_id from selection_cases where name='expiry')
  and event_type='selection_request_expired'),1::bigint,'expiry event is singular');

select pg_temp.seed_case('cancel');
select pg_temp.send_case('cancel');
create temporary table cancel_data as
select c.*,sr.id request_id,gen_random_uuid() operation_id,
  public.selection_get_request(sr.id,c.client_user_id)->>'management_token' management_token
from selection_cases c join public.selection_requests sr on sr.application_id=c.application_id
where c.name='cancel';
select is((public.selection_cancel_request(request_id,client_user_id,management_token,
  operation_id,'client_withdrew_request',null))->>'status','cancelled',
  'client cancellation terminates only the request') from cancel_data;
select is((select stage from public.applications where id=(select application_id from cancel_data)),
  'advanced','cancellation preserves Advanced');
select is((public.selection_cancel_request(request_id,client_user_id,
  public.selection_get_request(request_id,client_user_id)->>'management_token',
  operation_id,'client_withdrew_request',null))->>'idempotent_replay','true',
  'cancellation exact retry replays') from cancel_data;

select pg_temp.seed_case('decline_remain');
select pg_temp.send_case('decline_remain');
create temporary table response_data as
select c.*,sr.id request_id,gen_random_uuid() operation_id,
  public.selection_get_request(sr.id,c.freelancer_user_id)->>'response_token' response_token
from selection_cases c join public.selection_requests sr on sr.application_id=c.application_id
where c.name='decline_remain';
select is((public.selection_respond_request(
  request_id,freelancer_user_id,'decline_remain_interested',response_token,
  operation_id,false,null,null,null))->>'status','declined',
  'decline and remain interested terminates request') from response_data;
select is((select stage from public.applications where id=(select application_id from response_data)),
  'advanced','decline remain preserves Advanced');
select ok((public.selection_get_context(application_id,client_user_id)->'blockers')
  ? 'unchanged_selection_resend_blocked','unchanged resend after interested decline is blocked')
from response_data;
select is((public.selection_respond_request(
  request_id,freelancer_user_id,'decline_remain_interested',
  public.selection_get_request(request_id,freelancer_user_id)->>'response_token',
  operation_id,false,null,null,null))->>'idempotent_replay','true',
  'decline exact retry replays terminal state') from response_data;

select pg_temp.seed_case('revision_response');
select pg_temp.send_case('revision_response');
create temporary table revision_response_data as
select c.*,sr.id request_id,gen_random_uuid() operation_id,
  public.selection_get_request(sr.id,c.freelancer_user_id)->>'response_token' response_token
from selection_cases c join public.selection_requests sr on sr.application_id=c.application_id
where c.name='revision_response';
select is((public.selection_respond_request(
  request_id,freelancer_user_id,'request_revised_terms',response_token,
  operation_id,false,null,'Adjust delivery scope',array['scope','timeline']))->>'status',
  'revision_requested','structured revised-terms response is stored') from revision_response_data;
select ok((public.selection_get_context(application_id,client_user_id)->'blockers')
  ? 'unchanged_selection_resend_blocked','revision response requires a committed new version')
from revision_response_data;

select pg_temp.seed_case('withdraw_response');
select pg_temp.send_case('withdraw_response');
insert into public.application_review_states(
  application_id,gig_id,is_shortlisted,shortlisted_at,shortlisted_by_user_id,
  review_state_version,updated_at,updated_by_user_id
) select application_id,gig_id,true,now(),client_user_id,1,now(),client_user_id
from selection_cases where name='withdraw_response';
insert into public.application_qa_threads(
  application_id,gig_id,next_message_sequence,full_discussion_unlocked_at,created_at,updated_at
) select application_id,gig_id,1,now(),now(),now()
from selection_cases where name='withdraw_response' on conflict do nothing;
create temporary table withdraw_response_data as
select c.*,sr.id request_id,
  public.selection_get_request(sr.id,c.freelancer_user_id)->>'response_token' response_token
from selection_cases c join public.selection_requests sr on sr.application_id=c.application_id
where c.name='withdraw_response';
select is((public.selection_respond_request(
  request_id,freelancer_user_id,'decline_withdraw',response_token,gen_random_uuid(),
  false,'no_longer_available',null,null))->>'status','declined',
  'decline and withdraw terminates request') from withdraw_response_data;
select is((select stage from public.applications where id=
  (select application_id from withdraw_response_data)),'withdrawn',
  'decline withdraw atomically withdraws application');
select is((select is_shortlisted from public.application_review_states where application_id=
  (select application_id from withdraw_response_data)),false,
  'existing 7E terminal cleanup clears shortlist');

select pg_temp.seed_case('accept');
do $$
declare c selection_cases; other_user uuid:=gen_random_uuid(); other_profile uuid:=gen_random_uuid();
  other_app uuid:=gen_random_uuid(); other_version uuid:=gen_random_uuid();
  terminal_user uuid:=gen_random_uuid(); terminal_profile uuid:=gen_random_uuid();
  terminal_app uuid:=gen_random_uuid(); terminal_version uuid:=gen_random_uuid();
  snapshot jsonb:=pg_temp.application_snapshot(1400);
begin
  select * into c from selection_cases where name='accept';
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
  ('00000000-0000-0000-0000-000000000000',other_user,'authenticated','authenticated',
    'accept-other@example.test','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',terminal_user,'authenticated','authenticated',
    'accept-terminal@example.test','',now(),'{}','{}',now(),now());
  insert into public.user_profiles(id,email,role) values
    (other_user,'accept-other@example.test','freelancer'),
    (terminal_user,'accept-terminal@example.test','freelancer');
  insert into public.freelancer_profiles(id,user_id) values
    (other_profile,other_user),(terminal_profile,terminal_user);
  insert into public.applications(
    id,gig_id,freelancer_profile_id,stage,current_version_id,submitted_at,last_updated_at,
    stage_changed_at,stage_changed_by_actor_type,stage_changed_by_user_id,
    stage_reason_origin,stage_reason_code,stage_reason_payload
  ) values
  (other_app,c.gig_id,other_profile,'under_review',other_version,now()-interval '2 hours',
    now()-interval '1 hour',now()-interval '1 hour','user',c.client_user_id,null,null,null),
  (terminal_app,c.gig_id,terminal_profile,'withdrawn',terminal_version,now()-interval '2 hours',
    now()-interval '1 hour',now()-interval '1 hour','user',terminal_user,
    'freelancer_withdrawal','no_longer_available','{}');
  insert into public.application_versions(
    id,application_id,gig_id,version_number,gig_version_id,origin,
    snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,
    availability_snapshot,scope_snapshot,scope_notes,created_by_user_id
  ) values
  (other_version,other_app,c.gig_id,1,c.gig_version_id,'initial_submission',1,
    snapshot->>'cover_note',snapshot->'proposal',snapshot->'timeline',
    snapshot->'availability',snapshot->'scope',snapshot->>'scope_notes',other_user),
  (terminal_version,terminal_app,c.gig_id,1,c.gig_version_id,'initial_submission',1,
    snapshot->>'cover_note',snapshot->'proposal',snapshot->'timeline',
    snapshot->'availability',snapshot->'scope',snapshot->>'scope_notes',terminal_user);
end $$;
select pg_temp.send_case('accept');
create temporary table accept_data as
select c.*,sr.id request_id,gen_random_uuid() operation_id,
  public.selection_get_request(sr.id,c.freelancer_user_id)->>'response_token' response_token
from selection_cases c join public.selection_requests sr on sr.application_id=c.application_id
where c.name='accept';
select is((public.selection_respond_request(
  request_id,freelancer_user_id,'accept',response_token,operation_id,true,null,null,null))
  ->>'status','accepted','exact acceptance succeeds') from accept_data;
select is((select opportunity_lifecycle from public.gigs where id=(select gig_id from accept_data)),
  'filled','acceptance fills the gig');
select is((select stage from public.applications where id=(select application_id from accept_data)),
  'confirmed','acceptance confirms selected application');
select is((select count(*) from public.engagements where gig_id=(select gig_id from accept_data)),
  1::bigint,'acceptance creates exactly one engagement');
select is((select snapshot_schema_version from public.engagements
  where gig_id=(select gig_id from accept_data)),2,'7G engagement uses snapshot schema version 2');
select is((select accepted_terms_snapshot->>'scope_notes' from public.engagements
  where gig_id=(select gig_id from accept_data)),
  'Acceptance includes the documented API boundary.','version 2 snapshot includes scope notes');
select is((select count(*) from public.applications where gig_id=(select gig_id from accept_data)
  and stage='not_selected'),1::bigint,'only other active application closes automatically');
select is((select count(*) from public.applications where gig_id=(select gig_id from accept_data)
  and stage='withdrawn'),1::bigint,'already-terminal application history is preserved');
select is((public.selection_respond_request(
  request_id,freelancer_user_id,'accept',
  public.selection_get_request(request_id,freelancer_user_id)->>'response_token',
  operation_id,true,null,null,null))->>'idempotent_replay','true',
  'same-key acceptance replay returns existing engagement') from accept_data;
select throws_ok((select format(
  'select public.selection_respond_request(%L,%L,''accept'',%L,gen_random_uuid(),true,null,null,null)',
  request_id,freelancer_user_id,
  public.selection_get_request(request_id,freelancer_user_id)->>'response_token'
) from accept_data),'P0001',null,'different-key second acceptance is resolved conflict');
select is((select count(*) from public.engagements where gig_id=(select gig_id from accept_data)),
  1::bigint,'resolved conflict creates no second engagement');

select ok(has_function_privilege('service_role',
  'public.selection_send_request(uuid,uuid,integer,text,uuid,boolean)','EXECUTE'),
  'service role can execute send RPC');
select ok(not has_function_privilege('authenticated',
  'public.selection_send_request(uuid,uuid,integer,text,uuid,boolean)','EXECUTE'),
  'browser cannot execute send RPC');
select ok(not has_function_privilege('authenticated',
  'public.selection_respond_request(uuid,uuid,text,text,uuid,boolean,text,text,text[])','EXECUTE'),
  'browser cannot execute response RPC');
select ok(not has_table_privilege('service_role','private.selection_operations','INSERT'),
  'service role cannot directly mutate idempotency ledger');
select throws_ok((select format('update public.selection_requests set expires_at=now()+interval ''9 days'' where id=%L',
  request_id) from accept_data),null,null,'request expiry binding remains immutable');

select * from finish();
rollback;
