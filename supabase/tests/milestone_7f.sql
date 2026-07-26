begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
set constraints all deferred;

create temporary table qa_case (
  client_id uuid,
  other_client_id uuid,
  gig_id uuid,
  gig_version_id uuid,
  application_ids uuid[],
  freelancer_user_ids uuid[],
  application_version_ids uuid[]
);

create or replace function pg_temp.application_snapshot(p_total numeric default 1500)
returns jsonb language sql as $$
  select jsonb_build_object(
    'proposal_contract_version',1,'snapshot_schema_version',1,
    'cover_note','Complete linked proposal update.',
    'proposal',jsonb_build_object(
      'proposal_contract_version',1,'snapshot_schema_version',1,
      'payment_structure','fixed_price','currency','USD',
      'mode','exact_total','exact_total',p_total
    ),
    'timeline',jsonb_build_object('mode','exact','unit','weeks','exact_value',4),
    'availability',jsonb_build_object('available_from','2098-01-01'),
    'scope',jsonb_build_object(
      'included_work',jsonb_build_array('API implementation'),
      'excluded_work',jsonb_build_array('Hosting fees'),
      'assumptions',jsonb_build_array('Access is provided'),
      'estimate_change_factors',jsonb_build_array('Scope changes')
    ),
    'scope_notes','Complete proposal'
  )
$$;

do $$
declare
  client_id uuid:=gen_random_uuid(); other_client_id uuid:=gen_random_uuid();
  gig_id uuid:=gen_random_uuid(); gig_version_id uuid:=gen_random_uuid();
  freelancer_user_id uuid; freelancer_profile_id uuid;
  application_id uuid; application_version_id uuid; ordinal integer;
  application_ids uuid[]:=array[]::uuid[];
  freelancer_user_ids uuid[]:=array[]::uuid[];
  application_version_ids uuid[]:=array[]::uuid[];
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
  ('00000000-0000-0000-0000-000000000000',client_id,'authenticated','authenticated',
    '7f-client@example.test','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',other_client_id,'authenticated','authenticated',
    '7f-other-client@example.test','',now(),'{}','{}',now(),now());
  insert into public.user_profiles(id,email,full_name,role) values
    (client_id,'7f-client@example.test','7F Client','client'),
    (other_client_id,'7f-other-client@example.test','Other Client','client');
  insert into public.client_profiles(user_id,company_name) values
    (client_id,'7F Company'),(other_client_id,'Other Company');
  insert into public.gigs(
    id,client_id,title,description,tech_category,status,
    opportunity_lifecycle,application_intake,operational_state,
    current_gig_version_id,current_material_gig_version_id
  ) values(
    gig_id,client_id,'Structured Q&A gig','Test structured Q&A','Backend','open',
    'active','accepting','active',gig_version_id,gig_version_id
  );
  insert into public.gig_versions(
    id,gig_id,version_number,snapshot_schema_version,terms_snapshot,
    changed_fields,created_by_actor_type,created_by_user_id
  ) values(
    gig_version_id,gig_id,1,1,
    jsonb_build_object(
      'version_kind','initial_product_version','terms_contract_version',1,
      'snapshot_schema_version',1,'payment_structure','fixed_price','currency','USD',
      'title','Structured Q&A gig','description','Test structured Q&A',
      'scope',jsonb_build_object('tech_category','Backend'),
      'client_payment',jsonb_build_object(
        'payment_structure','fixed_price','currency','USD',
        'budget',jsonb_build_object('minimum',1000,'maximum',2000)
      ),
      'required_skills',jsonb_build_array('Python'),
      'preferred_skills',jsonb_build_array('PostgreSQL'),
      'experience_requirement','mid','work_mode','remote',
      'application_deadline','2099-12-31T00:00:00+00:00',
      'deliverables',jsonb_build_array('API')
    ),
    array['initial_publication'],'user',client_id
  );
  for ordinal in 1..5 loop
    freelancer_user_id:=gen_random_uuid();
    freelancer_profile_id:=gen_random_uuid();
    application_id:=gen_random_uuid();
    application_version_id:=gen_random_uuid();
    application_ids:=array_append(application_ids,application_id);
    freelancer_user_ids:=array_append(freelancer_user_ids,freelancer_user_id);
    application_version_ids:=array_append(application_version_ids,application_version_id);
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(
      '00000000-0000-0000-0000-000000000000',freelancer_user_id,
      'authenticated','authenticated','7f-freelancer-'||ordinal||'@example.test','',
      now(),'{}','{}',now(),now()
    );
    insert into public.user_profiles(id,email,full_name,role) values(
      freelancer_user_id,'7f-freelancer-'||ordinal||'@example.test',
      '7F Freelancer '||ordinal,'freelancer'
    );
    insert into public.freelancer_profiles(id,user_id,headline)
      values(freelancer_profile_id,freelancer_user_id,'API Engineer');
    insert into public.applications(
      id,gig_id,freelancer_profile_id,stage,current_version_id,
      submitted_at,last_updated_at,stage_changed_at,
      stage_changed_by_actor_type,stage_changed_by_user_id
    ) values(
      application_id,gig_id,freelancer_profile_id,'under_review',application_version_id,
      now()-interval '1 day',now()-interval '1 day',now()-interval '1 day',
      'user',freelancer_user_id
    );
    insert into public.application_versions(
      id,application_id,gig_id,version_number,gig_version_id,origin,
      snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,
      availability_snapshot,scope_snapshot,scope_notes,created_by_user_id,created_at
    ) values(
      application_version_id,application_id,gig_id,1,gig_version_id,'initial_submission',
      1,'Initial application',
      '{"proposal_contract_version":1,"snapshot_schema_version":1,"payment_structure":"fixed_price","currency":"USD","mode":"exact_total","exact_total":1500}',
      '{"mode":"exact","unit":"weeks","exact_value":4}',
      '{"available_from":"2098-01-01"}',
      '{"included_work":["API implementation"],"excluded_work":["Hosting fees"],"assumptions":["Access is provided"],"estimate_change_factors":["Scope changes"]}',
      'Initial scope',freelancer_user_id,now()-interval '1 day'
    );
  end loop;
  insert into qa_case values(
    client_id,other_client_id,gig_id,gig_version_id,application_ids,
    freelancer_user_ids,application_version_ids
  );
end $$;

select has_table('public','application_qa_threads','Q&A thread table exists');
select has_table('public','application_qa_messages','immutable message table exists');
select has_table('public','application_question_reports','private report table exists');
select has_table('public','application_revision_requests','revision table exists');
select has_table('public','application_qa_operations','operation idempotency table exists');
select col_is_pk('public','application_qa_threads','application_id','one thread row per application');
select ok((select relrowsecurity from pg_class where oid='public.application_qa_threads'::regclass),
  'thread RLS is enabled');
select ok((select relrowsecurity from pg_class where oid='public.application_qa_messages'::regclass),
  'message RLS is enabled');
select ok((select relrowsecurity from pg_class where oid='public.application_question_reports'::regclass),
  'report RLS is enabled');
select ok((select relrowsecurity from pg_class where oid='public.application_revision_requests'::regclass),
  'revision RLS is enabled');
select ok(not has_table_privilege('authenticated','public.application_qa_messages','SELECT'),
  'browser cannot read message rows directly');
select ok(not has_table_privilege('authenticated','public.application_qa_messages','INSERT'),
  'browser cannot insert message rows directly');
select ok(not has_table_privilege('service_role','public.application_qa_messages','INSERT'),
  'service role direct message insert is denied');
select ok(has_function_privilege('service_role',
  'public.qa_stop_pre_advancement(uuid,uuid,uuid)','EXECUTE'),
  'service role can execute Q&A mutation RPC');
select ok(not has_function_privilege('authenticated',
  'public.qa_stop_pre_advancement(uuid,uuid,uuid)','EXECUTE'),
  'authenticated browser cannot execute Q&A mutation RPC');
select is((select proconfig::text from pg_proc where oid=
  'public.revision_submit_update(uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure),
  '{"search_path=\"\""}','revision update RPC has fixed empty search path');
select is((select count(*) from public.application_qa_threads),0::bigint,
  'thread rows are lazy with no backfill');

select lives_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'initial_question','timeline',null,
  'Could you confirm the delivery timeline?',null,null,null,8,10,40)$sql$,
  application_ids[1],client_id,gen_random_uuid()) from qa_case),
  'first initial question succeeds');
select lives_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'initial_question','availability',null,
  'When would you be available to begin?',null,null,null,8,10,40)$sql$,
  application_ids[1],client_id,gen_random_uuid()) from qa_case),
  'second initial question succeeds');
select is((select initial_client_turn_count from public.application_qa_threads
  where application_id=(select application_ids[1] from qa_case)),2::smallint,
  'initial allowance records two permanent turns');
select throws_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'initial_question','budget',null,
  'Could you explain the proposed budget?',null,null,null,8,10,40)$sql$,
  application_ids[1],client_id,gen_random_uuid()) from qa_case),
  'P0001','M7F_INITIAL_QUESTION_LIMIT_REACHED','third initial question is rejected');
select is((select count(*) from public.application_qa_messages
  where application_id=(select application_ids[1] from qa_case)),2::bigint,
  'rejected third question consumes no message sequence');
select is((select next_message_sequence from public.application_qa_threads
  where application_id=(select application_ids[1] from qa_case)),3::bigint,
  'next sequence has no rejected-write gap');

select lives_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'answer',null,null,
  'I can deliver within four weeks.',%L,null,null,8,10,40)$sql$,
  application_ids[1],freelancer_user_ids[1],gen_random_uuid(),
  (select id from public.application_qa_messages
    where application_id=application_ids[1] and sequence_number=1)
  ) from qa_case),'freelancer answers an initial question');
select throws_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'decline',null,null,null,%L,
  'not_comfortable_answering',null,8,10,40)$sql$,
  application_ids[1],freelancer_user_ids[1],gen_random_uuid(),
  (select id from public.application_qa_messages
    where application_id=application_ids[1] and sequence_number=1)
  ) from qa_case),'P0001','M7F_QUESTION_ALREADY_RESOLVED',
  'answer and decline cannot both resolve a question');
select lives_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'decline',null,null,
  'I cannot provide that detail.',%L,'insufficient_context',null,8,10,40)$sql$,
  application_ids[1],freelancer_user_ids[1],gen_random_uuid(),
  (select id from public.application_qa_messages
    where application_id=application_ids[1] and sequence_number=2)
  ) from qa_case),'freelancer can decline the other question');
select throws_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'answer',null,null,
  'The client cannot answer their own question.',%L,null,null,8,10,40)$sql$,
  application_ids[1],client_id,gen_random_uuid(),
  (select id from public.application_qa_messages
    where application_id=application_ids[1] and sequence_number=2)
  ) from qa_case),'22023','M7F_INVALID_MESSAGE_REFERENCE',
  'question sender cannot answer their own question');

select lives_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'initial_question','proposal_scope',null,
  'Could you confirm what the API scope includes?',null,null,null,8,10,40)$sql$,
  application_ids[2],client_id,gen_random_uuid()) from qa_case),
  'initial question exists for correction allowance test');
select lives_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'correction',null,null,
  'Correction: please confirm the API scope only.',%L,null,null,8,10,40)$sql$,
  application_ids[2],client_id,gen_random_uuid(),
  (select id from public.application_qa_messages
    where application_id=application_ids[2] and sequence_number=1)
  ) from qa_case),'client pre-advancement correction succeeds');
select is((select initial_client_turn_count from public.application_qa_threads
  where application_id=(select application_ids[2] from qa_case)),2::smallint,
  'client correction consumes the remaining pre-advancement turn');
select is((select count(*) from public.application_qa_messages
  where application_id=(select application_ids[2] from qa_case)
    and message_kind='correction'),1::bigint,'correction preserves original as a second row');

select throws_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'initial_question','timeline',null,
  'Please email me at buyer@example.com with details.',null,null,null,8,10,40)$sql$,
  application_ids[3],client_id,gen_random_uuid()) from qa_case),
  '22023','M7F_MESSAGE_SAFETY:contact_information_not_allowed','email is blocked');
select throws_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'initial_question','timeline',null,
  'Send the OTP and password for deployment.',null,null,null,8,10,40)$sql$,
  application_ids[3],client_id,gen_random_uuid()) from qa_case),
  '22023','M7F_MESSAGE_SAFETY:credential_request_not_allowed','credential solicitation is blocked');
select is((select count(*) from public.application_qa_messages
  where application_id=(select application_ids[3] from qa_case)),0::bigint,
  'blocked content creates no message');
select is(coalesce((select next_message_sequence from public.application_qa_threads
  where application_id=(select application_ids[3] from qa_case)),1::bigint),1::bigint,
  'blocked content consumes no sequence');
select lives_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'initial_question','technical_assumptions',null,
  'Which API token authentication approach would you implement?',null,null,null,8,10,40)$sql$,
  application_ids[3],client_id,gen_random_uuid()) from qa_case),
  'safe technical token terminology is not falsely blocked');

select lives_ok((select format(
  $sql$select public.qa_stop_pre_advancement(%L,%L,%L)$sql$,
  application_ids[3],freelancer_user_ids[3],gen_random_uuid()) from qa_case),
  'freelancer stops pre-advancement discussion');
select throws_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'initial_question','budget',null,
  'Could you clarify the budget assumptions?',null,null,null,8,10,40)$sql$,
  application_ids[3],client_id,gen_random_uuid()) from qa_case),
  'P0001','M7F_PRE_ADVANCE_DISCUSSION_STOPPED','stop blocks new client question');
select lives_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'answer',null,null,
  'I would use short-lived signed tokens.',%L,null,null,8,10,40)$sql$,
  application_ids[3],freelancer_user_ids[3],gen_random_uuid(),
  (select id from public.application_qa_messages
    where application_id=application_ids[3] and sequence_number=1)
  ) from qa_case),'existing question can still be answered after stop');
select is((select count(*) from public.marketplace_events
  where application_id=(select application_ids[3] from qa_case)
    and event_type='qa_pre_advance_discussion_stopped'),1::bigint,
  'stop appends one workflow event');

select throws_ok((select format(
  $sql$select public.qa_report_message(%L,%L,%L,%L,'spam',null)$sql$,
  application_ids[3],client_id,gen_random_uuid(),
  (select id from public.application_qa_messages
    where application_id=application_ids[3] and sender_user_id=client_id limit 1)
  ) from qa_case),'P0002','M7F_APPLICATION_QA_NOT_FOUND',
  'participant cannot report own message');
select lives_ok((select format(
  $sql$select public.qa_report_message(%L,%L,%L,%L,'spam',null)$sql$,
  application_ids[3],client_id,gen_random_uuid(),
  (select id from public.application_qa_messages
    where application_id=application_ids[3] and sender_user_id=freelancer_user_ids[3] limit 1)
  ) from qa_case),'participant can report incoming message');
select is((select count(*) from public.application_question_reports
  where application_id=(select application_ids[3] from qa_case)),1::bigint,
  'report is stored once in private history');
select is((select stage from public.applications
  where id=(select application_ids[3] from qa_case)),'under_review',
  'report does not alter application stage');

update public.applications set stage='advanced',stage_changed_at=clock_timestamp(),
  stage_changed_by_actor_type='user',
  stage_changed_by_user_id=(select client_id from qa_case)
where id=(select application_ids[3] from qa_case);
select ok((select full_discussion_unlocked_at is not null
  from public.application_qa_threads
  where application_id=(select application_ids[3] from qa_case)),
  'first advancement permanently unlocks full discussion');
select lives_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'question','commercial_assumptions',null,
  'Which commercial assumptions affect the estimate?',null,null,null,8,10,40)$sql$,
  application_ids[3],client_id,gen_random_uuid()) from qa_case),
  'advanced discussion ignores prior pre-advance stop');

select lives_ok((select format(
  $sql$select public.revision_create_request(%L,%L,%L,'clarify_scope',null,%L,%L,3)$sql$,
  application_ids[3],client_id,gen_random_uuid(),
  application_version_ids[3],gig_version_id) from qa_case),
  'client creates exact-version revision request while Advanced');
select is((select status from public.application_revision_requests
  where application_id=(select application_ids[3] from qa_case)),'open',
  'revision request begins open without changing proposal');
select is((select current_version_id from public.applications
  where id=(select application_ids[3] from qa_case)),
  (select application_version_ids[3] from qa_case),
  'old proposal remains current before response');
select throws_ok((select format(
  $sql$select public.revision_create_request(%L,%L,%L,'revise_budget',null,%L,%L,3)$sql$,
  application_ids[3],client_id,gen_random_uuid(),
  application_version_ids[3],gig_version_id) from qa_case),
  'P0001','M7F_REVISION_ALREADY_OPEN','only one revision request may be open');
select lives_ok((select format(
  $sql$select public.revision_decline_request(%L,%L,%L,%L,'request_unclear',null)$sql$,
  application_ids[3],
  (select id from public.application_revision_requests
    where application_id=application_ids[3] and status='open'),
  freelancer_user_ids[3],gen_random_uuid()) from qa_case),
  'freelancer declines revision without creating a version');
select is((select count(*) from public.application_versions
  where application_id=(select application_ids[3] from qa_case)),1::bigint,
  'decline creates no application version');

select lives_ok((select format(
  $sql$select public.revision_create_request(%L,%L,%L,'revise_timeline',null,%L,%L,3)$sql$,
  application_ids[3],client_id,gen_random_uuid(),
  application_version_ids[3],gig_version_id) from qa_case),
  'different structured request can follow a decline');
select lives_ok((select format(
  $sql$select public.revision_submit_update(%L,%L,%L,%L,%L,%L::jsonb)$sql$,
  application_ids[3],
  (select id from public.application_revision_requests
    where application_id=application_ids[3] and status='open'),
  freelancer_user_ids[3],gen_random_uuid(),
  private.application_version_token(application_ids[3],application_version_ids[3]),
  pg_temp.application_snapshot(1650)::text) from qa_case),
  'linked proposal revision creates a validated immutable version');
select is((select status from public.application_revision_requests
  where application_id=(select application_ids[3] from qa_case)
  order by created_at desc limit 1),'fulfilled','linked request becomes fulfilled');
select is((select origin from public.application_versions
  where application_id=(select application_ids[3] from qa_case)
  order by version_number desc limit 1),'proposal_revision_response',
  'linked version uses the honest proposal revision origin');
select is((select version_number from public.application_versions
  where application_id=(select application_ids[3] from qa_case)
  order by version_number desc limit 1),2,'linked response receives next ordinal');
select ok((select rr.response_application_version_id=a.current_version_id
  from public.application_revision_requests rr
  join public.applications a on a.id=rr.application_id
  where rr.application_id=(select application_ids[3] from qa_case)
    and rr.status='fulfilled'),'fulfilled request links exact current response version');
select is((select count(*) from public.marketplace_events
  where application_id=(select application_ids[3] from qa_case)
    and event_type='revision_request_fulfilled'),1::bigint,
  'fulfilment creates one reference-oriented event');
select lives_ok((select format(
  $sql$select public.revision_submit_update(%L,%L,%L,%L,'original-token-no-longer-current',%L::jsonb)$sql$,
  application_ids[3],
  (select id from public.application_revision_requests
    where application_id=application_ids[3] and status='fulfilled'),
  freelancer_user_ids[3],
  (select terminal_request_id from public.application_revision_requests
    where application_id=application_ids[3] and status='fulfilled'),
  pg_temp.application_snapshot(1650)::text) from qa_case),
  'exact linked-update replay succeeds after current pointer moves');
select is((select count(*) from public.application_versions
  where application_id=(select application_ids[3] from qa_case)),2::bigint,
  'linked-update replay creates no duplicate version');

update public.applications set stage='advanced',stage_changed_at=clock_timestamp(),
  stage_changed_by_actor_type='user',
  stage_changed_by_user_id=(select client_id from qa_case)
where id=(select application_ids[4] from qa_case);
select lives_ok((select format(
  $sql$select public.revision_create_request(%L,%L,%L,'update_availability',null,%L,%L,3)$sql$,
  application_ids[4],client_id,gen_random_uuid(),
  application_version_ids[4],gig_version_id) from qa_case),
  'second Advanced application receives revision request');
update public.applications set stage='under_review',stage_changed_at=clock_timestamp(),
  stage_changed_by_actor_type='user',
  stage_changed_by_user_id=(select client_id from qa_case)
where id=(select application_ids[4] from qa_case);
select is((select status from public.application_revision_requests
  where application_id=(select application_ids[4] from qa_case)),
  'closed_by_stage_change','return to review closes open revision request');
select is((select count(*) from public.marketplace_events
  where application_id=(select application_ids[4] from qa_case)
    and event_type='revision_request_closed_by_stage_change'),1::bigint,
  'stage closure is audited once');

create or replace function pg_temp.reject_7f_operation()
returns trigger language plpgsql as $$
begin
  raise exception 'forced operation-ledger failure';
end $$;
create trigger reject_7f_operation
before insert on public.application_qa_operations
for each row execute function pg_temp.reject_7f_operation();
select throws_ok((select format(
  $sql$select public.qa_write_message(%L,%L,%L,'initial_question','timeline',null,
  'This transaction must roll back.',null,null,null,8,10,40)$sql$,
  application_ids[5],client_id,gen_random_uuid()) from qa_case),
  null,null,'final-step failure rolls back the entire question mutation');
drop trigger reject_7f_operation on public.application_qa_operations;
select is((select count(*) from public.application_qa_threads
  where application_id=(select application_ids[5] from qa_case)),0::bigint,
  'rolled-back question leaves no lazy thread');
select is((select count(*) from public.application_qa_messages
  where application_id=(select application_ids[5] from qa_case)),0::bigint,
  'rolled-back question leaves no message');
select is((select count(*) from public.application_qa_operations
  where application_id=(select application_ids[5] from qa_case)),0::bigint,
  'rolled-back question leaves no idempotency row');

update public.applications set stage='advanced',stage_changed_at=clock_timestamp(),
  stage_changed_by_actor_type='user',
  stage_changed_by_user_id=(select client_id from qa_case)
where id=(select application_ids[5] from qa_case);
select lives_ok((select format(
  $sql$select public.revision_create_request(%L,%L,%L,'revise_budget',null,%L,%L,3)$sql$,
  application_ids[5],client_id,gen_random_uuid(),
  application_version_ids[5],gig_version_id) from qa_case),
  'rollback fixture receives a linked revision request');
create or replace function pg_temp.reject_7f_fulfilment_event()
returns trigger language plpgsql as $$
begin
  if new.event_type='revision_request_fulfilled' then
    raise exception 'forced fulfilment-event failure';
  end if;
  return new;
end $$;
create trigger reject_7f_fulfilment_event
before insert on public.marketplace_events
for each row execute function pg_temp.reject_7f_fulfilment_event();
select throws_ok((select format(
  $sql$select public.revision_submit_update(%L,%L,%L,%L,%L,%L::jsonb)$sql$,
  application_ids[5],
  (select id from public.application_revision_requests
    where application_id=application_ids[5] and status='open'),
  freelancer_user_ids[5],gen_random_uuid(),
  private.application_version_token(application_ids[5],application_version_ids[5]),
  pg_temp.application_snapshot(1750)::text) from qa_case),
  null,null,'final event failure rolls back the linked proposal revision');
drop trigger reject_7f_fulfilment_event on public.marketplace_events;
select is((select status from public.application_revision_requests
  where application_id=(select application_ids[5] from qa_case)),'open',
  'rolled-back revision request remains open');
select is((select count(*) from public.application_versions
  where application_id=(select application_ids[5] from qa_case)),1::bigint,
  'rolled-back revision creates no immutable version');
select is((select current_version_id from public.applications
  where id=(select application_ids[5] from qa_case)),
  (select application_version_ids[5] from qa_case),
  'rolled-back revision does not move the current-version pointer');
select is((select count(*) from public.marketplace_events
  where application_id=(select application_ids[5] from qa_case)
    and event_type='revision_request_fulfilled'),0::bigint,
  'rolled-back revision leaves no fulfilment event');

select throws_ok((select format(
  $sql$update public.application_qa_messages set body='rewrite' where application_id=%L$sql$,
  application_ids[1]) from qa_case),null,null,'message rows reject updates');
select throws_ok((select format(
  $sql$delete from public.application_question_reports where application_id=%L$sql$,
  application_ids[3]) from qa_case),null,null,'report rows reject physical deletion');
select throws_ok((select format(
  $sql$delete from public.application_qa_threads where application_id=%L$sql$,
  application_ids[1]) from qa_case),null,null,'thread rows reject physical deletion');

select * from finish();
rollback;
