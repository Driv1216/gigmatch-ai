begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
set constraints all deferred;

create temporary table engagement_cases(
  name text primary key,
  client_user_id uuid not null,
  freelancer_user_id uuid not null,
  other_freelancer_user_id uuid not null,
  gig_id uuid not null,
  gig_version_id uuid not null,
  application_id uuid not null,
  other_application_id uuid not null,
  engagement_id uuid not null
);

create or replace function pg_temp.gig_snapshot()
returns jsonb language sql as $$
  select jsonb_build_object(
    'version_kind','initial_product_version','terms_contract_version',1,
    'snapshot_schema_version',1,'payment_structure','fixed_price','currency','USD',
    'title','Engagement workspace build','description','Build a verified API.',
    'scope',jsonb_build_object('tech_category','backend'),
    'client_payment',jsonb_build_object(
      'payment_structure','fixed_price','currency','USD',
      'budget',jsonb_build_object('minimum',1000,'maximum',2000),
      'flexibility','slightly_flexible'
    ),
    'required_skills',jsonb_build_array('FastAPI'),
    'preferred_skills',jsonb_build_array('PostgreSQL'),
    'experience_requirement','mid','difficulty_level','intermediate',
    'work_mode','remote','location_requirements',null,'weekly_commitment',null,
    'expected_duration',null,'application_deadline','2099-12-01T12:00:00+00:00',
    'project_deadline','2100-01-01T12:00:00+00:00',
    'deliverables',jsonb_build_array('API'),'assumptions',jsonb_build_array()
  )
$$;

create or replace function pg_temp.application_snapshot(p_note text default 'Accepted scope note')
returns jsonb language sql as $$
  select jsonb_build_object(
    'proposal_contract_version',1,'snapshot_schema_version',1,
    'cover_note','I can deliver these exact terms.',
    'proposal',jsonb_build_object(
      'proposal_contract_version',1,'snapshot_schema_version',1,
      'payment_structure','fixed_price','currency','USD','mode','exact_total',
      'exact_total',1500
    ),
    'timeline',jsonb_build_object('mode','exact','unit','weeks','exact_value',4),
    'availability',jsonb_build_object('available_from','2098-01-01'),
    'scope',jsonb_build_object(
      'included_work',jsonb_build_array('API implementation'),
      'excluded_work',jsonb_build_array('Hosting fees'),
      'assumptions',jsonb_build_array('Access is provided'),
      'estimate_change_factors',jsonb_build_array('Scope changes')
    ),
    'scope_notes',p_note
  )
$$;

create or replace function pg_temp.seed_engagement(
  p_name text,p_snapshot_version integer default 2
) returns void language plpgsql set search_path='' as $$
declare
  client_user uuid:=gen_random_uuid();
  freelancer_user uuid:=gen_random_uuid();
  other_user uuid:=gen_random_uuid();
  freelancer_profile uuid:=gen_random_uuid();
  other_profile uuid:=gen_random_uuid();
  gig uuid:=gen_random_uuid();
  gig_version uuid:=gen_random_uuid();
  application uuid:=gen_random_uuid();
  other_application uuid:=gen_random_uuid();
  app_version uuid:=gen_random_uuid();
  other_version uuid:=gen_random_uuid();
  selection_request uuid:=gen_random_uuid();
  engagement uuid:=gen_random_uuid();
  snap jsonb;
  accepted jsonb;
  confirmed timestamptz:=clock_timestamp()-interval '1 hour';
begin
  insert into auth.users(
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values
  ('00000000-0000-0000-0000-000000000000',client_user,'authenticated','authenticated',
    p_name||'-client@example.test','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',freelancer_user,'authenticated','authenticated',
    p_name||'-freelancer@example.test','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',other_user,'authenticated','authenticated',
    p_name||'-other@example.test','',now(),'{}','{}',now(),now());
  insert into public.user_profiles(id,email,full_name,role) values
    (client_user,p_name||'-client@example.test',p_name||' Client','client'),
    (freelancer_user,p_name||'-freelancer@example.test',p_name||' Freelancer','freelancer'),
    (other_user,p_name||'-other@example.test',p_name||' Other','freelancer');
  insert into public.client_profiles(user_id,company_name) values(client_user,p_name||' Company');
  insert into public.freelancer_profiles(id,user_id,headline) values
    (freelancer_profile,freelancer_user,'API Engineer'),
    (other_profile,other_user,'Backend Engineer');
  insert into public.gigs(
    id,client_id,title,description,tech_category,status,
    opportunity_lifecycle,application_intake,operational_state,
    current_gig_version_id,current_material_gig_version_id
  ) values(
    gig,client_user,'Engagement workspace build','Build a verified API.','backend',
    'open','active','accepting','active',gig_version,gig_version
  );
  insert into public.gig_versions(
    id,gig_id,version_number,snapshot_schema_version,terms_snapshot,
    changed_fields,created_by_actor_type,created_by_user_id
  ) values(
    gig_version,gig,1,1,pg_temp.gig_snapshot(),
    array['initial_publication'],'user',client_user
  );
  insert into public.applications(
    id,gig_id,freelancer_profile_id,stage,current_version_id,
    submitted_at,last_updated_at,stage_changed_at,
    stage_changed_by_actor_type,stage_changed_by_user_id,
    stage_reason_origin,stage_reason_code,stage_reason_payload
  ) values
  (application,gig,freelancer_profile,'confirmed',app_version,
    confirmed,confirmed,confirmed,'user',freelancer_user,null,null,null),
  (other_application,gig,other_profile,'not_selected',other_version,
    confirmed,confirmed,confirmed,'system',null,'selection_confirmed',
    'another_applicant_selected',jsonb_build_object('selection_request_id',selection_request));
  snap:=pg_temp.application_snapshot();
  insert into public.application_versions(
    id,application_id,gig_id,version_number,gig_version_id,origin,
    snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,
    availability_snapshot,scope_snapshot,scope_notes,created_by_user_id,created_at
  ) values
  (app_version,application,gig,1,gig_version,'initial_submission',1,
    snap->>'cover_note',snap->'proposal',snap->'timeline',snap->'availability',
    snap->'scope',snap->>'scope_notes',freelancer_user,confirmed),
  (other_version,other_application,gig,1,gig_version,'initial_submission',1,
    snap->>'cover_note',snap->'proposal',snap->'timeline',snap->'availability',
    snap->'scope','Previous candidate note',other_user,confirmed);
  insert into public.selection_requests(
    id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at,status,terminal_at,response_by_user_id
  ) values(
    selection_request,gig,application,app_version,gig_version,client_user,
    confirmed-interval '1 hour',confirmed+interval '1 day','accepted',confirmed,
    freelancer_user
  );
  update public.gigs set opportunity_lifecycle='filled',
    application_intake='closed',operational_state='active' where id=gig;
  accepted:=jsonb_strip_nulls(jsonb_build_object(
    'accepted_terms_contract_version',p_snapshot_version,
    'snapshot_schema_version',p_snapshot_version,'captured_at',confirmed,
    'application_version_id',app_version,'material_gig_version_id',gig_version,
    'client_payment_terms',pg_temp.gig_snapshot()->'client_payment',
    'freelancer_proposal',snap->'proposal','timeline',snap->'timeline',
    'availability',snap->'availability','scope',snap->'scope',
    'included_work',snap#>'{scope,included_work}',
    'excluded_work',snap#>'{scope,excluded_work}',
    'assumptions',snap#>'{scope,assumptions}',
    'estimate_change_factors',snap#>'{scope,estimate_change_factors}',
    'scope_notes',case when p_snapshot_version=2 then snap->'scope_notes' end
  ));
  insert into public.engagements(
    id,gig_id,application_id,selection_request_id,
    client_participant_user_id,freelancer_participant_user_id,status,
    accepted_application_version_id,accepted_gig_version_id,
    accepted_terms_contract_version,accepted_terms_snapshot,
    snapshot_schema_version,confirmed_at
  ) values(
    engagement,gig,application,selection_request,client_user,freelancer_user,
    'confirmed',app_version,gig_version,p_snapshot_version,accepted,
    p_snapshot_version,confirmed
  );
  insert into public.marketplace_events(
    event_type,visibility,actor_type,gig_id,application_id,
    selection_request_id,engagement_id,event_payload,occurred_at
  ) values(
    'engagement_created','participants','system',gig,application,
    selection_request,engagement,jsonb_build_object(
      'status','confirmed','snapshot_schema_version',p_snapshot_version,
      'lifecycle_version',1),confirmed
  );
  insert into engagement_cases values(
    p_name,client_user,freelancer_user,other_user,gig,gig_version,
    application,other_application,engagement
  );
end;
$$;

select pg_temp.seed_engagement('v1',1);
select pg_temp.seed_engagement('lifecycle',2);
select pg_temp.seed_engagement('completion',2);
select pg_temp.seed_engagement('recovery',2);

select ok(
  not (public.engagement_get(engagement_id,client_user_id) ? 'accepted_terms_snapshot'),
  'engagement detail never exposes the raw accepted snapshot'
) from engagement_cases where name='v1';
select is(
  public.engagement_get(engagement_id,client_user_id)#>>'{accepted_terms,accepted_terms_contract_version}',
  '1','version 1 accepted snapshots normalize safely'
) from engagement_cases where name='v1';
select ok(
  not (public.engagement_get(engagement_id,client_user_id)->'accepted_terms' ? 'scope_notes'),
  'version 1 safely omits absent scope notes'
) from engagement_cases where name='v1';
select is(
  public.engagement_get(engagement_id,freelancer_user_id)#>>'{accepted_terms,scope_notes}',
  'Accepted scope note','version 2 exposes normalized scope notes'
) from engagement_cases where name='lifecycle';
select throws_ok(
  (select format('select public.engagement_get(%L,gen_random_uuid())',engagement_id)
    from engagement_cases where name='lifecycle'),
  'P0002','M7H_ENGAGEMENT_NOT_FOUND','cross-user engagement access is non-enumerating'
);
select is(
  jsonb_array_length(public.engagement_timeline(engagement_id,client_user_id)->'items'),
  1,'timeline starts with the explicit engagement event'
) from engagement_cases where name='lifecycle';

create or replace function pg_temp.idempotent_kickoff(p_conflict boolean default false)
returns jsonb language plpgsql as $$
declare c engagement_cases; token text; fixed_request uuid:='11111111-1111-4111-8111-111111111111';
begin
  select * into c from engagement_cases where name='v1';
  token:=public.engagement_get(c.engagement_id,c.client_user_id)->>'action_token';
  return public.engagement_transition(
    c.engagement_id,c.client_user_id,
    case when p_conflict then 'start_work' else 'prepare_kickoff' end,
    token,fixed_request,null,null
  );
end;
$$;
select is(pg_temp.idempotent_kickoff()->>'status','kickoff_pending',
  'first lifecycle operation commits');
select is(pg_temp.idempotent_kickoff()->>'idempotent_replay','true',
  'exact lifecycle replay returns authoritative result');
select throws_ok($$select pg_temp.idempotent_kickoff(true)$$,
  'P0001','M7H_IDEMPOTENCY_CONFLICT',
  'request id reuse with different canonical operation conflicts');
select is((select count(*) from public.marketplace_events where engagement_id=(
  select engagement_id from engagement_cases where name='v1')
  and event_type='engagement_kickoff_prepared'),1::bigint,
  'idempotent replay creates one lifecycle event');

create or replace function pg_temp.transition(
  p_name text,p_actor text,p_action text,p_request uuid default gen_random_uuid(),
  p_reason text default null,p_explanation text default null
) returns jsonb language plpgsql as $$
declare c engagement_cases; actor uuid; detail jsonb;
begin
  select * into c from engagement_cases where name=p_name;
  actor:=case p_actor when 'client' then c.client_user_id else c.freelancer_user_id end;
  detail:=public.engagement_get(c.engagement_id,actor);
  return public.engagement_transition(
    c.engagement_id,actor,p_action,detail->>'action_token',p_request,p_reason,p_explanation
  );
end;
$$;

select is(pg_temp.transition('lifecycle','client','prepare_kickoff')->>'status',
  'kickoff_pending','either participant can prepare kickoff');
select is(pg_temp.transition('lifecycle','freelancer','start_work')->>'status',
  'in_progress','either participant can start work');
select is(pg_temp.transition('lifecycle','client','request_completion')->>'status',
  'completion_pending','in-progress engagement can request completion');
select throws_ok(
  $$select pg_temp.transition('lifecycle','client','confirm_completion')$$,
  'P0001','M7H_SELF_RESOLUTION_NOT_ALLOWED','requester cannot confirm own completion'
);
select is(pg_temp.transition('lifecycle','freelancer','reject_completion')->>'status',
  'in_progress','other participant can reject completion back to in progress');
select is(pg_temp.transition(
  'lifecycle','client','request_cancellation',gen_random_uuid(),'mutual_decision','Agreed.'
)->>'status','cancellation_pending','active engagement can request cancellation');
select throws_ok(
  $$select pg_temp.transition('lifecycle','freelancer','withdraw_cancellation')$$,
  'P0001','M7H_INVALID_ENGAGEMENT_TRANSITION',
  'only cancellation requester can withdraw'
);
select is(pg_temp.transition('lifecycle','client','withdraw_cancellation')->>'status',
  'in_progress','withdrawal restores the exact prior active state');

select lives_ok($$select pg_temp.transition('completion','client','start_work')$$,'completion case starts');
select lives_ok($$select pg_temp.transition('completion','freelancer','request_completion')$$,'freelancer requests completion');
select is(pg_temp.transition('completion','client','confirm_completion')->>'status',
  'completed','other participant confirms completion');
select throws_ok(
  $$select pg_temp.transition('completion','client','request_cancellation')$$,
  'P0001','M7H_INVALID_ENGAGEMENT_TRANSITION','completed is terminal'
);

create or replace function pg_temp.cancel_recovery()
returns void language plpgsql as $$
begin
  perform pg_temp.transition('recovery','client','request_cancellation',
    gen_random_uuid(),'business_needs_changed','Project stopped.');
  perform pg_temp.transition('recovery','freelancer','acknowledge_cancellation');
end;
$$;
select lives_ok($$select pg_temp.cancel_recovery()$$,'other participant acknowledges cancellation');
select is((select status from public.engagements where id=(
  select engagement_id from engagement_cases where name='recovery')),'cancelled',
  'acknowledgement makes engagement Cancelled');

create or replace function pg_temp.reopen_recovery(p_request uuid)
returns jsonb language plpgsql as $$
declare c engagement_cases; detail jsonb;
begin
  select * into c from engagement_cases where name='recovery';
  detail:=public.engagement_get(c.engagement_id,c.client_user_id);
  return public.engagement_reopen_gig(
    c.engagement_id,c.client_user_id,detail->>'reopening_token',p_request
  );
end;
$$;
select is(pg_temp.reopen_recovery(gen_random_uuid())->>'gig_status',
  'closed_to_new_applications','cancelled engagement reopens gig with intake closed');
select is((select opportunity_lifecycle||'/'||application_intake||'/'||operational_state
  from public.gigs where id=(select gig_id from engagement_cases where name='recovery')),
  'active/closed/active','reopening preserves the required orthogonal gig state');
select is((select stage from public.applications where id=(
  select application_id from engagement_cases where name='recovery')),
  'confirmed','failed winner remains historically Confirmed');
select throws_ok($$select pg_temp.reopen_recovery(gen_random_uuid())$$,
  'P0001','M7H_GIG_REOPEN_NOT_ALLOWED','one-time reopening rejects a later attempt');

select ok(
  (public.reconsideration_get_context(other_application_id,client_user_id)->>'eligible')::boolean,
  'eligible previous Not Selected applicant can be invited'
) from engagement_cases where name='recovery';
select ok(
  (public.reconsideration_get_context(application_id,client_user_id)->'blockers')
    ? 'failed_engagement_winner_ineligible',
  'failed engagement winner is ineligible for same-gig reconsideration'
) from engagement_cases where name='recovery';

create or replace function pg_temp.invite_recovery(p_request uuid)
returns jsonb language plpgsql as $$
declare c engagement_cases; context jsonb;
begin
  select * into c from engagement_cases where name='recovery';
  context:=public.reconsideration_get_context(c.other_application_id,c.client_user_id);
  return public.reconsideration_create_invitation(
    c.other_application_id,c.client_user_id,context->>'action_token',p_request,
    'failed_engagement_reopened',null
  );
end;
$$;
select is(pg_temp.invite_recovery(gen_random_uuid())->>'status','pending',
  'client creates one pending reconsideration invitation');
select throws_ok($$select pg_temp.invite_recovery(gen_random_uuid())$$,
  'P0001','M7H_RECONSIDERATION_NOT_ALLOWED','duplicate pending invitation is rejected');

create or replace function pg_temp.reaffirm_recovery(p_request uuid)
returns jsonb language plpgsql as $$
declare c engagement_cases; context jsonb; invitation jsonb;
begin
  select * into c from engagement_cases where name='recovery';
  context:=public.reconsideration_get_context(c.other_application_id,c.other_freelancer_user_id);
  invitation:=public.reconsideration_get_invitation(
    (context->>'pending_invitation_id')::uuid,c.other_freelancer_user_id
  );
  return public.reconsideration_respond_invitation(
    (invitation->>'invitation_id')::uuid,c.other_freelancer_user_id,'reaffirm',
    invitation->>'action_token',p_request,null
  );
end;
$$;
select is(pg_temp.reaffirm_recovery(gen_random_uuid())->>'status','accepted',
  'freelancer reaffirms through a fresh immutable proposal version');
select is((select stage from public.applications where id=(
  select other_application_id from engagement_cases where name='recovery')),
  'under_review','accepted invitation returns original history to Under Review');
select is((select origin from public.application_versions where id=(
  select current_version_id from public.applications where id=(
    select other_application_id from engagement_cases where name='recovery'))),
  'reconsideration','reaffirmation uses the reconsideration version origin');
select is((select count(*) from public.application_versions where application_id=(
  select other_application_id from engagement_cases where name='recovery')),
  2::bigint,'reconsideration preserves prior proposal history');
select is((select count(*) from public.engagement_reopenings where engagement_id=(
  select engagement_id from engagement_cases where name='recovery')),
  1::bigint,'reopening record is singular');
select is((select count(*) from public.marketplace_events where gig_id=(
  select gig_id from engagement_cases where name='recovery')
  and event_type='reconsideration_invitation_accepted'),
  1::bigint,'accepted invitation event is singular');

select throws_ok(
  (select format('delete from public.engagements where id=%L',engagement_id)
    from engagement_cases where name='v1'),
  null,null,'engagement physical deletion remains blocked'
);
select throws_ok(
  (select format('update public.engagements set lifecycle_version=lifecycle_version+2 where id=%L',
    engagement_id) from engagement_cases where name='v1'),
  'P0001','M7H_INVALID_LIFECYCLE_VERSION','lifecycle version cannot skip'
);

select * from finish();
rollback;
