begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
set constraints all deferred;

create temporary table review_case (
  client_id uuid,
  other_client_id uuid,
  gig_id uuid,
  gig_version_id uuid,
  application_ids uuid[],
  freelancer_user_ids uuid[],
  freelancer_profile_ids uuid[],
  application_version_ids uuid[]
);

do $$
declare
  client_id uuid := gen_random_uuid();
  other_client_id uuid := gen_random_uuid();
  gig_id uuid := gen_random_uuid();
  gig_version_id uuid := gen_random_uuid();
  application_ids uuid[] := array[]::uuid[];
  freelancer_user_ids uuid[] := array[]::uuid[];
  freelancer_profile_ids uuid[] := array[]::uuid[];
  application_version_ids uuid[] := array[]::uuid[];
  freelancer_user_id uuid;
  freelancer_profile_id uuid;
  application_id uuid;
  application_version_id uuid;
  ordinal integer;
begin
  insert into auth.users (
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values
    ('00000000-0000-0000-0000-000000000000',client_id,'authenticated','authenticated',
      'review-client@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000',other_client_id,'authenticated','authenticated',
      'review-other-client@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
  insert into public.user_profiles(id,email,full_name,role) values
    (client_id,'review-client@example.test','Review Client','client'),
    (other_client_id,'review-other-client@example.test','Other Client','client');
  insert into public.client_profiles(user_id,company_name) values
    (client_id,'Review Company'),(other_client_id,'Other Company');

  insert into public.gigs(
    id,client_id,title,description,tech_category,status,
    opportunity_lifecycle,application_intake,operational_state,
    current_gig_version_id,current_material_gig_version_id
  ) values (
    gig_id,client_id,'Review gig','Applicant review test gig','Backend','open',
    'active','accepting','active',gig_version_id,gig_version_id
  );
  insert into public.gig_versions(
    id,gig_id,version_number,snapshot_schema_version,terms_snapshot,
    changed_fields,created_by_actor_type,created_by_user_id
  ) values (
    gig_version_id,gig_id,1,1,
    jsonb_build_object(
      'version_kind','initial_product_version','terms_contract_version',1,
      'snapshot_schema_version',1,'payment_structure','fixed_price','currency','USD',
      'title','Review gig','description','Applicant review test gig',
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

  for ordinal in 1..6 loop
    freelancer_user_id := gen_random_uuid();
    freelancer_profile_id := gen_random_uuid();
    application_id := gen_random_uuid();
    application_version_id := gen_random_uuid();
    freelancer_user_ids := array_append(freelancer_user_ids,freelancer_user_id);
    freelancer_profile_ids := array_append(freelancer_profile_ids,freelancer_profile_id);
    application_ids := array_append(application_ids,application_id);
    application_version_ids := array_append(application_version_ids,application_version_id);

    insert into auth.users (
      instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',freelancer_user_id,
      'authenticated','authenticated','review-freelancer-'||ordinal||'@example.test','',now(),
      '{"provider":"email","providers":["email"]}','{}',now(),now()
    );
    insert into public.user_profiles(id,email,full_name,role) values (
      freelancer_user_id,'review-freelancer-'||ordinal||'@example.test',
      'Review Freelancer '||ordinal,'freelancer'
    );
    insert into public.freelancer_profiles(id,user_id,headline,skills)
    values(freelancer_profile_id,freelancer_user_id,'Backend Engineer',array['Python']);
    insert into public.applications(
      id,gig_id,freelancer_profile_id,stage,current_version_id,
      submitted_at,last_updated_at,stage_changed_at,
      stage_changed_by_actor_type,stage_changed_by_user_id
    ) values (
      application_id,gig_id,freelancer_profile_id,'under_review',application_version_id,
      now()-interval '1 day',now()-interval '1 day',now()-interval '1 day',
      'user',freelancer_user_id
    );
    insert into public.application_versions(
      id,application_id,gig_id,version_number,gig_version_id,origin,
      snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,
      availability_snapshot,scope_snapshot,created_by_user_id,created_at
    ) values (
      application_version_id,application_id,gig_id,1,gig_version_id,'initial_submission',
      1,'Review application',
      '{"proposal_contract_version":1,"snapshot_schema_version":1,"payment_structure":"fixed_price","currency":"USD","mode":"exact_total","exact_total":1500}',
      '{"mode":"exact","unit":"weeks","exact_value":4}',
      '{"available_from":"2099-01-01"}',
      '{"included_work":["API"],"excluded_work":["Hosting"],"assumptions":["Access"],"estimate_change_factors":["Scope"]}',
      freelancer_user_id,now()-interval '1 day'
    );
  end loop;
  insert into review_case values (
    client_id,other_client_id,gig_id,gig_version_id,application_ids,
    freelancer_user_ids,freelancer_profile_ids,application_version_ids
  );
end
$$;

create or replace function pg_temp.shortlist_token(p_application_id uuid)
returns text language sql stable set search_path = ''
as $$
  select private.shortlist_review_action_token(
    a.id,a.stage,coalesce(ars.review_state_version,0),
    g.opportunity_lifecycle,g.application_intake,g.operational_state
  )
  from public.applications a
  join public.gigs g on g.id=a.gig_id
  left join public.application_review_states ars on ars.application_id=a.id
  where a.id=p_application_id
$$;

create or replace function pg_temp.decision_token(p_application_id uuid)
returns text language sql stable set search_path = ''
as $$
  select private.decision_review_action_token(
    a.id,a.stage,a.current_version_id,a.stage_changed_at,g.current_material_gig_version_id,
    (
      select sr.id from public.selection_requests sr
      where sr.application_id=a.id and sr.status='pending' and sr.expires_at>clock_timestamp()
      order by sr.id limit 1
    ),
    g.opportunity_lifecycle,g.application_intake,g.operational_state
  )
  from public.applications a
  join public.gigs g on g.id=a.gig_id
  where a.id=p_application_id
$$;

select has_table('public','application_review_states','private review-state table exists');
select col_is_pk('public','application_review_states','application_id','maximum one review-state row per application');
select ok((select relrowsecurity from pg_class where oid='public.application_review_states'::regclass),
  'review-state RLS is enabled');
select ok(not has_table_privilege('authenticated','public.application_review_states','SELECT'),
  'authenticated browser has no direct review-state read');
select ok(not has_table_privilege('authenticated','public.application_review_states','INSERT'),
  'authenticated browser has no direct review-state insert');
select ok(not has_table_privilege('authenticated','public.application_review_states','UPDATE'),
  'authenticated browser has no direct review-state update');
select ok(not has_table_privilege('authenticated','public.application_review_states','DELETE'),
  'authenticated browser has no direct review-state delete');
select ok(has_function_privilege('service_role','public.review_set_shortlist(uuid,uuid,boolean,text,integer)','EXECUTE'),
  'service role alone can execute shortlist RPC');
select ok(not has_function_privilege('authenticated','public.review_set_shortlist(uuid,uuid,boolean,text,integer)','EXECUTE'),
  'authenticated browser cannot execute shortlist RPC');
select ok(not has_function_privilege('anon','public.review_transition_application(uuid,uuid,text,text,integer,jsonb)','EXECUTE'),
  'anon cannot execute transition RPC');
select is(
  (select proconfig::text from pg_proc where oid='public.review_set_shortlist(uuid,uuid,boolean,text,integer)'::regprocedure),
  '{"search_path=\"\""}','shortlist RPC has a fixed empty search path');
select is((select count(*) from public.application_review_states),0::bigint,
  'review state uses lazy creation with no fabricated backfill');

select lives_ok((
  select format('select public.review_set_shortlist(%L,%L,true,%L,5)',
    application_ids[1],client_id,pg_temp.shortlist_token(application_ids[1])) from review_case
),'shortlist add succeeds');
select ok((select is_shortlisted from public.application_review_states
  where application_id=(select application_ids[1] from review_case)),'shortlist state becomes active');
select is((select review_state_version from public.application_review_states
  where application_id=(select application_ids[1] from review_case)),1::bigint,'first lazy row starts at version one');
select lives_ok((
  select format('select public.review_set_shortlist(%L,%L,true,''stale-retry'',5)',
    application_ids[1],client_id) from review_case
),'same shortlist add naturally replays');
select is((select count(*) from public.marketplace_events where
  application_id=(select application_ids[1] from review_case)
  and event_type='application_shortlisted'),1::bigint,'shortlist add retry creates no duplicate event');
select lives_ok((
  select format('select public.review_set_shortlist(%L,%L,false,%L,5)',
    application_ids[1],client_id,pg_temp.shortlist_token(application_ids[1])) from review_case
),'shortlist remove succeeds');
select lives_ok((
  select format('select public.review_set_shortlist(%L,%L,false,''stale-retry'',5)',
    application_ids[1],client_id) from review_case
),'same shortlist remove naturally replays');
select is((select count(*) from public.marketplace_events where
  application_id=(select application_ids[1] from review_case)
  and event_type='application_unshortlisted'),1::bigint,'shortlist remove retry creates no duplicate event');

select lives_ok((
  select format('select public.review_set_shortlist(%L,%L,true,%L,1)',
    application_ids[1],client_id,pg_temp.shortlist_token(application_ids[1])) from review_case
),'first applicant occupies configured final shortlist slot');
select throws_ok((
  select format('select public.review_set_shortlist(%L,%L,true,%L,1)',
    application_ids[2],client_id,pg_temp.shortlist_token(application_ids[2])) from review_case
),'P0001','M7E_SHORTLIST_CAPACITY_REACHED','configured shortlist capacity is enforced');
select throws_ok((
  select format('select public.review_set_shortlist(%L,%L,true,%L,101)',
    application_ids[2],client_id,pg_temp.shortlist_token(application_ids[2])) from review_case
),'22023','M7E_REVIEW_ACTION_NOT_ALLOWED','unsafe browser-like capacity is rejected');
select throws_ok((
  select format('select public.review_set_shortlist(%L,%L,true,%L,5)',
    application_ids[2],other_client_id,pg_temp.shortlist_token(application_ids[2])) from review_case
),'P0002','M7E_APPLICANT_REVIEW_NOT_FOUND','wrong client receives non-enumerating rejection');

select set_config('app.gig_controlled_write','on',true);
update public.gigs set operational_state='paused'
where id=(select gig_id from review_case);
select lives_ok((
  select format('select public.review_set_shortlist(%L,%L,true,%L,5)',
    application_ids[2],client_id,pg_temp.shortlist_token(application_ids[2])) from review_case
),'paused gig permits private shortlist organization');
select throws_ok((
  select format($sql$select public.review_transition_application(%L,%L,'advance',%L,5,'{}')$sql$,
    application_ids[2],client_id,pg_temp.decision_token(application_ids[2])) from review_case
),'P0001','M7E_REVIEW_ACTION_NOT_ALLOWED','paused gig blocks applicant-visible decisions');
update public.gigs set operational_state='active'
where id=(select gig_id from review_case);

select lives_ok((
  select format($sql$select public.review_transition_application(%L,%L,'advance',%L,1,'{}')$sql$,
    application_ids[1],client_id,pg_temp.decision_token(application_ids[1])) from review_case
),'under-review application advances');
select is((select stage from public.applications where id=(select application_ids[1] from review_case)),
  'advanced','advance projects current stage');
select throws_ok((
  select format($sql$select public.review_transition_application(%L,%L,'advance',%L,1,'{}')$sql$,
    application_ids[2],client_id,pg_temp.decision_token(application_ids[2])) from review_case
),'P0001','M7E_ADVANCEMENT_CAPACITY_REACHED','configured advancement capacity is enforced');
select is((select count(*) from public.marketplace_events where application_id=(select application_ids[1] from review_case)
  and event_type='application_advanced'),1::bigint,'advance appends one participant event');
select lives_ok((
  select format($sql$select public.review_transition_application(%L,%L,'return',%L,5,'{}')$sql$,
    application_ids[1],client_id,pg_temp.decision_token(application_ids[1])) from review_case
),'advanced application returns to review');
select is((select stage from public.applications where id=(select application_ids[1] from review_case)),
  'under_review','return projects under-review stage');

select lives_ok((
  select format($sql$select public.review_transition_application(%L,%L,'not_selected',%L,5,
    '{"primary_reason":"stronger_overall_match","additional_reasons":[],"feedback_points":[],"final_decision_confirmed":false}')$sql$,
    application_ids[1],client_id,pg_temp.decision_token(application_ids[1])) from review_case
),'under-review Not Selected accepts one structured primary reason');
select is((select stage_reason_code from public.applications where id=(select application_ids[1] from review_case)),
  'stronger_overall_match','Not Selected current reason projection is correct');
select is((select is_shortlisted from public.application_review_states
  where application_id=(select application_ids[1] from review_case)),false,'Not Selected clears active shortlist atomically');
select lives_ok((
  select format($sql$select public.review_transition_application(%L,%L,'reopen',%L,5,
    '{"reason":"client_reconsideration"}')$sql$,
    application_ids[1],client_id,pg_temp.decision_token(application_ids[1])) from review_case
),'Not Selected application reopens');
select is((select stage_reason_code from public.applications where id=(select application_ids[1] from review_case)),
  null,'reopen clears current terminal reason projection');
select is((select is_shortlisted from public.application_review_states
  where application_id=(select application_ids[1] from review_case)),false,'reopen does not restore shortlist');
select is((select count(*) from public.marketplace_events where application_id=(select application_ids[1] from review_case)
  and event_type='application_not_selected'),1::bigint,'original Not Selected history is preserved after reopen');

select throws_ok((
  select format($sql$select public.review_transition_application(%L,%L,'not_selected',%L,5,
    '{"primary_reason":"another_applicant_selected","additional_reasons":[],"feedback_points":[]}')$sql$,
    application_ids[1],client_id,pg_temp.decision_token(application_ids[1])) from review_case
),'22023','M7E_INVALID_NOT_SELECTED_DECISION','reserved automatic reason is rejected');
select throws_ok((
  select format($sql$select public.review_transition_application(%L,%L,'not_selected',%L,5,
    '{"primary_reason":"other","additional_reasons":["other"],"feedback_points":[]}')$sql$,
    application_ids[1],client_id,pg_temp.decision_token(application_ids[1])) from review_case
),'22023','M7E_INVALID_NOT_SELECTED_DECISION','duplicate and unexplained reasons are rejected');

select lives_ok((
  select format($sql$select public.review_transition_application(%L,%L,'advance',%L,5,'{}')$sql$,
    application_ids[1],client_id,pg_temp.decision_token(application_ids[1])) from review_case
),'application advances again for advanced decision validation');
select throws_ok((
  select format($sql$select public.review_transition_application(%L,%L,'not_selected',%L,5,
    '{"primary_reason":"stronger_overall_match","additional_reasons":[],"feedback_points":[],"final_decision_confirmed":true}')$sql$,
    application_ids[1],client_id,pg_temp.decision_token(application_ids[1])) from review_case
),'22023','M7E_INVALID_NOT_SELECTED_DECISION','advanced Not Selected requires meaningful feedback');
select throws_ok((
  select format($sql$select public.review_transition_application(%L,%L,'not_selected',%L,5,
    '{"primary_reason":"stronger_overall_match","additional_reasons":[],"feedback_points":["Job-related feedback"],"final_decision_confirmed":false}')$sql$,
    application_ids[1],client_id,pg_temp.decision_token(application_ids[1])) from review_case
),'22023','M7E_INVALID_NOT_SELECTED_DECISION','advanced Not Selected requires final confirmation');
select lives_ok((
  select format($sql$select public.review_transition_application(%L,%L,'not_selected',%L,5,
    '{"primary_reason":"stronger_overall_match","additional_reasons":[],"feedback_points":["Job-related feedback"],"respectful_note":"Thank you","final_decision_confirmed":true}')$sql$,
    application_ids[1],client_id,pg_temp.decision_token(application_ids[1])) from review_case
),'advanced Not Selected accepts structured feedback and final confirmation');

select lives_ok((
  select format('select public.review_set_shortlist(%L,%L,true,%L,5)',
    application_ids[3],client_id,pg_temp.shortlist_token(application_ids[3])) from review_case
),'third application is shortlisted before freelancer withdrawal');
update public.applications
set stage='withdrawn',last_updated_at=clock_timestamp(),stage_changed_at=clock_timestamp(),
  stage_changed_by_actor_type='user',
  stage_changed_by_user_id=(select freelancer_user_ids[3] from review_case),
  stage_reason_origin='freelancer_withdrawal',stage_reason_code='no_longer_available',
  stage_reason_payload='{}'
where id=(select application_ids[3] from review_case);
select is((select is_shortlisted from public.application_review_states
  where application_id=(select application_ids[3] from review_case)),false,
  'freelancer withdrawal clears shortlist through the shared terminal trigger');
select is((select count(*) from public.application_review_states
  where application_id=(select application_ids[4] from review_case)),0::bigint,
  'terminal cleanup has not fabricated a row');
update public.applications
set stage='closed_gig_cancelled',last_updated_at=clock_timestamp(),stage_changed_at=clock_timestamp(),
  stage_changed_by_actor_type='system',stage_changed_by_user_id=null,
  stage_reason_origin='gig_cancelled',stage_reason_code='opportunity_no_longer_required',
  stage_reason_payload='{}'
where id=(select application_ids[4] from review_case);
select is((select count(*) from public.application_review_states
  where application_id=(select application_ids[4] from review_case)),0::bigint,
  'gig-cancellation closure does not create a review-state row');

do $$
declare c review_case; old_token text; new_version uuid:=gen_random_uuid();
begin
  select * into c from review_case;
  old_token:=pg_temp.decision_token(c.application_ids[5]);
  insert into public.application_versions(
    id,application_id,gig_id,version_number,gig_version_id,origin,
    snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,
    availability_snapshot,scope_snapshot,created_by_user_id,created_at
  ) values (
    new_version,c.application_ids[5],c.gig_id,2,c.gig_version_id,'freelancer_edit',
    1,'Edited application',
    '{"proposal_contract_version":1,"snapshot_schema_version":1,"payment_structure":"fixed_price","currency":"USD","mode":"exact_total","exact_total":1600}',
    '{"mode":"exact","unit":"weeks","exact_value":5}','{"available_from":"2099-01-01"}',
    '{"included_work":["API"],"excluded_work":["Hosting"],"assumptions":["Access"],"estimate_change_factors":["Scope"]}',
    c.freelancer_user_ids[5],clock_timestamp()
  );
  update public.applications set current_version_id=new_version,last_updated_at=clock_timestamp()
  where id=c.application_ids[5];
  create temporary table stale_token(value text);
  insert into stale_token values(old_token);
end
$$;
select throws_ok((
  select format($sql$select public.review_transition_application(%L,%L,'advance',%L,5,'{}')$sql$,
    application_ids[5],client_id,(select value from stale_token)) from review_case
),'40001','M7E_STALE_REVIEW_ACTION','application edit invalidates a loaded decision token');

do $$
declare c review_case; request_id uuid:=gen_random_uuid();
begin
  select * into c from review_case;
  update public.applications set stage='advanced',last_updated_at=clock_timestamp(),
    stage_changed_at=clock_timestamp(),stage_changed_by_actor_type='user',
    stage_changed_by_user_id=c.client_id,stage_reason_origin=null,stage_reason_code=null,stage_reason_payload=null
  where id=c.application_ids[2];
  insert into public.selection_requests(
    id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at
  ) values (
    request_id,c.gig_id,c.application_ids[2],c.application_version_ids[2],c.gig_version_id,
    c.client_id,clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 day'
  );
end
$$;
select throws_ok((
  select format($sql$select public.review_transition_application(%L,%L,'return',%L,5,'{}')$sql$,
    application_ids[2],client_id,pg_temp.decision_token(application_ids[2])) from review_case
),'P0001','M7E_PENDING_SELECTION_BLOCKS_REVIEW_ACTION','effective request blocks return to review');
update public.selection_requests
set status='expired',terminal_at=clock_timestamp()
where application_id=(select application_ids[2] from review_case) and status='pending';
select lives_ok((
  select format($sql$select public.review_transition_application(%L,%L,'return',%L,5,'{}')$sql$,
    application_ids[2],client_id,pg_temp.decision_token(application_ids[2])) from review_case
),'expired stored request does not block return');

create or replace function pg_temp.reject_review_event()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.event_type='application_advanced' then raise exception 'forced review event failure'; end if;
  return new;
end
$$;
create trigger reject_review_event before insert on public.marketplace_events
for each row execute function pg_temp.reject_review_event();
select throws_ok((
  select format($sql$select public.review_transition_application(%L,%L,'advance',%L,5,'{}')$sql$,
    application_ids[6],client_id,pg_temp.decision_token(application_ids[6])) from review_case
),null,null,'event failure forces complete review transition rollback');
select is((select stage from public.applications where id=(select application_ids[6] from review_case)),
  'under_review','event failure rolls application stage back');
select is((select count(*) from public.marketplace_events where application_id=(select application_ids[6] from review_case)
  and event_type='application_advanced'),0::bigint,'event failure leaves no partial history');
drop trigger reject_review_event on public.marketplace_events;

select throws_ok((
  select format('delete from public.application_review_states where application_id=%L',application_ids[1])
  from review_case
),null,null,'review-state rows cannot be physically deleted');
select throws_ok((
  select format('update public.application_review_states set gig_id=gen_random_uuid(),review_state_version=review_state_version+1 where application_id=%L',application_ids[1])
  from review_case
),null,null,'review-state identity is immutable');

select set_config('request.jwt.claim.sub',(select freelancer_user_ids[1]::text from review_case),true);
set local role authenticated;
select throws_ok('select * from public.application_review_states',null,null,
  'freelancer cannot directly read private shortlist state');
select is((select count(*) from public.marketplace_events where event_type='application_shortlisted'),
  0::bigint,'freelancer cannot read client-private shortlist events');
reset role;

select * from finish();
rollback;
