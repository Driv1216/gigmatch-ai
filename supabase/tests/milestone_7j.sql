begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
set constraints all deferred;

create temporary table dashboard_case (
  client_user_id uuid,
  other_client_user_id uuid,
  freelancer_user_id uuid,
  other_freelancer_user_id uuid,
  freelancer_profile_id uuid,
  other_freelancer_profile_id uuid,
  gig_ids uuid[],
  application_ids uuid[],
  application_version_ids uuid[],
  effective_selection_id uuid,
  expired_selection_id uuid,
  active_engagement_ids uuid[],
  cancelled_engagement_id uuid,
  event_count bigint
);

create or replace function pg_temp.dashboard_gig_snapshot(p_title text)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'version_kind','initial_product_version',
    'terms_contract_version',1,
    'snapshot_schema_version',1,
    'payment_structure','fixed_price',
    'currency','USD',
    'title',p_title,
    'description','Dashboard projection fixture.',
    'scope',jsonb_build_object('tech_category','backend'),
    'client_payment',jsonb_build_object(
      'payment_structure','fixed_price',
      'currency','USD',
      'budget',jsonb_build_object('minimum',1000,'maximum',2000),
      'flexibility','slightly_flexible'
    ),
    'required_skills',jsonb_build_array('PostgreSQL'),
    'preferred_skills',jsonb_build_array('FastAPI'),
    'experience_requirement','mid',
    'difficulty_level','intermediate',
    'work_mode','remote',
    'location_requirements',null,
    'weekly_commitment',null,
    'expected_duration',null,
    'application_deadline','2099-12-01T12:00:00+00:00',
    'project_deadline','2100-01-01T12:00:00+00:00',
    'deliverables',jsonb_build_array('Dashboard'),
    'assumptions',jsonb_build_array()
  )
$$;

create or replace function pg_temp.dashboard_application_snapshot()
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'proposal_contract_version',1,
    'snapshot_schema_version',1,
    'cover_note','Complete dashboard fixture proposal.',
    'proposal',jsonb_build_object(
      'proposal_contract_version',1,
      'snapshot_schema_version',1,
      'payment_structure','fixed_price',
      'currency','USD',
      'mode','exact_total',
      'exact_total',1500
    ),
    'timeline',jsonb_build_object(
      'mode','exact','unit','weeks','exact_value',4
    ),
    'availability',jsonb_build_object('available_from','2098-01-01'),
    'scope',jsonb_build_object(
      'included_work',jsonb_build_array('Dashboard implementation'),
      'excluded_work',jsonb_build_array('Hosting'),
      'assumptions',jsonb_build_array('Access is provided'),
      'estimate_change_factors',jsonb_build_array('Scope changes')
    ),
    'scope_notes','Dashboard fixture'
  )
$$;

do $$
declare
  client_user uuid := gen_random_uuid();
  other_client uuid := gen_random_uuid();
  freelancer_user uuid := gen_random_uuid();
  other_freelancer uuid := gen_random_uuid();
  freelancer_profile uuid := gen_random_uuid();
  other_profile uuid := gen_random_uuid();
  gigs uuid[] := array[]::uuid[];
  applications uuid[] := array[]::uuid[];
  versions uuid[] := array[]::uuid[];
  gig uuid;
  gig_version uuid;
  second_gig_version uuid;
  application uuid;
  app_version uuid;
  ordinal integer;
  stage_value text;
  effective_selection uuid := gen_random_uuid();
  expired_selection uuid := gen_random_uuid();
  accepted_selection_one uuid := gen_random_uuid();
  accepted_selection_two uuid := gen_random_uuid();
  accepted_selection_cancelled uuid := gen_random_uuid();
  active_engagement_one uuid := gen_random_uuid();
  active_engagement_two uuid := gen_random_uuid();
  cancelled_engagement uuid := gen_random_uuid();
  failed_application uuid := gen_random_uuid();
  failed_version uuid := gen_random_uuid();
  reopening uuid := gen_random_uuid();
  snap jsonb := pg_temp.dashboard_application_snapshot();
  accepted jsonb;
  base_time timestamptz := clock_timestamp() - interval '2 days';
begin
  insert into auth.users(
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values
  ('00000000-0000-0000-0000-000000000000',client_user,
    'authenticated','authenticated','7j-client@example.test','',now(),
    '{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',other_client,
    'authenticated','authenticated','7j-other-client@example.test','',now(),
    '{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',freelancer_user,
    'authenticated','authenticated','7j-freelancer@example.test','',now(),
    '{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',other_freelancer,
    'authenticated','authenticated','7j-other-freelancer@example.test','',now(),
    '{}','{}',now(),now());

  insert into public.user_profiles(id,email,full_name,role) values
    (client_user,'7j-client@example.test','7J Client','client'),
    (other_client,'7j-other-client@example.test','Other Client','client'),
    (freelancer_user,'7j-freelancer@example.test','7J Freelancer','freelancer'),
    (other_freelancer,'7j-other-freelancer@example.test',
      'Other Freelancer','freelancer');
  insert into public.client_profiles(user_id,company_name) values
    (client_user,'7J Company'),
    (other_client,'Other Company');
  insert into public.freelancer_profiles(id,user_id,headline) values
    (freelancer_profile,freelancer_user,'Dashboard Engineer'),
    (other_profile,other_freelancer,'Other Engineer');

  for ordinal in 1..8 loop
    gig := gen_random_uuid();
    gig_version := gen_random_uuid();
    if ordinal = 3 then
      second_gig_version := gen_random_uuid();
    end if;
    application := gen_random_uuid();
    app_version := gen_random_uuid();
    gigs := array_append(gigs,gig);
    applications := array_append(applications,application);
    versions := array_append(versions,app_version);
    stage_value := case
      when ordinal in (1,2,4) then 'advanced'
      when ordinal in (3,5) then 'under_review'
      when ordinal in (6,8) then 'confirmed'
      else 'withdrawn'
    end;

    insert into public.gigs(
      id,client_id,title,description,tech_category,status,
      opportunity_lifecycle,application_intake,operational_state,
      current_gig_version_id,current_material_gig_version_id,
      created_at,updated_at
    ) values(
      gig,client_user,'Dashboard gig '||ordinal,'Dashboard fixture','backend',
      case
        when ordinal = 4 then 'paused'
        when ordinal in (6,8) then 'closed_to_new_applications'
        else 'open'
      end,
      'active',
      case when ordinal in (6,8) then 'closed' else 'accepting' end,
      case when ordinal = 4 then 'paused' else 'active' end,
      case when ordinal=3 then second_gig_version else gig_version end,
      case when ordinal=3 then second_gig_version else gig_version end,
      base_time + ordinal * interval '1 hour',
      base_time + ordinal * interval '1 hour'
    );
    insert into public.gig_versions(
      id,gig_id,version_number,snapshot_schema_version,terms_snapshot,
      changed_fields,created_by_actor_type,created_by_user_id,created_at
    ) values(
      gig_version,gig,1,1,
      pg_temp.dashboard_gig_snapshot('Dashboard gig '||ordinal),
      array['initial_publication'],'user',client_user,
      base_time + ordinal * interval '1 hour'
    );
    if ordinal = 3 then
      insert into public.gig_versions(
        id,gig_id,version_number,snapshot_schema_version,terms_snapshot,
        changed_fields,created_by_actor_type,created_by_user_id,created_at
      ) values(
        second_gig_version,gig,2,1,
        pg_temp.dashboard_gig_snapshot('Dashboard gig 3 updated'),
        array['description'],'user',client_user,
        clock_timestamp()-interval '10 minutes'
      );
    end if;
    insert into public.applications(
      id,gig_id,freelancer_profile_id,stage,current_version_id,
      submitted_at,last_updated_at,stage_changed_at,
      stage_changed_by_actor_type,stage_changed_by_user_id,
      stage_reason_origin,stage_reason_code,stage_reason_payload
    ) values(
      application,gig,freelancer_profile,stage_value,app_version,
      base_time + ordinal * interval '1 hour',
      base_time + ordinal * interval '2 hours',
      base_time + ordinal * interval '2 hours',
      'user',freelancer_user,
      case when stage_value='withdrawn' then 'freelancer_withdrawal' end,
      case when stage_value='withdrawn' then 'personal_circumstances' end,
      case when stage_value='withdrawn'
        then jsonb_build_object('explanation','Fixture withdrawal') end
    );
    insert into public.application_versions(
      id,application_id,gig_id,version_number,gig_version_id,origin,
      snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,
      availability_snapshot,scope_snapshot,scope_notes,
      created_by_user_id,created_at
    ) values(
      app_version,application,gig,1,gig_version,'initial_submission',1,
      snap->>'cover_note',snap->'proposal',snap->'timeline',
      snap->'availability',snap->'scope',snap->>'scope_notes',
      freelancer_user,base_time + ordinal * interval '1 hour'
    );
  end loop;

  -- App 1 has two different response actions on one resource.
  insert into public.selection_requests(
    id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at,status
  )
  select effective_selection,gigs[1],applications[1],versions[1],
    av.gig_version_id,client_user,clock_timestamp()-interval '1 hour',
    clock_timestamp()+interval '24 hours','pending'
  from public.application_versions av where av.id=versions[1];

  insert into public.application_qa_threads(
    application_id,gig_id,next_message_sequence,initial_client_turn_count,
    full_discussion_unlocked_at,created_at,updated_at
  ) values(
    applications[1],gigs[1],3,0,clock_timestamp()-interval '2 hours',
    clock_timestamp()-interval '2 hours',clock_timestamp()-interval '30 minutes'
  );
  insert into public.application_qa_messages(
    id,application_id,gig_id,sequence_number,sender_user_id,sender_role,
    message_kind,topic,body,request_id,request_fingerprint,created_at
  ) values
  (gen_random_uuid(),applications[1],gigs[1],1,client_user,'client',
    'question','proposal_scope','Clarify delivery responsibility.',
    gen_random_uuid(),repeat('a',64),clock_timestamp()-interval '40 minutes'),
  (gen_random_uuid(),applications[1],gigs[1],2,freelancer_user,'freelancer',
    'question','technical_assumptions','Confirm the test environment.',
    gen_random_uuid(),repeat('b',64),clock_timestamp()-interval '30 minutes');

  -- App 2 has an actionable exact-version revision.
  insert into public.application_revision_requests(
    id,application_id,gig_id,requested_application_version_id,
    requested_material_gig_version_id,created_by_user_id,reason_code,status,
    created_at,request_id,request_fingerprint
  )
  select gen_random_uuid(),applications[2],gigs[2],versions[2],
    av.gig_version_id,client_user,'clarify_scope','open',
    clock_timestamp()-interval '20 minutes',gen_random_uuid(),repeat('c',64)
  from public.application_versions av where av.id=versions[2];

  -- App 4 has an unresolved question but its gig is paused.
  insert into public.application_qa_threads(
    application_id,gig_id,next_message_sequence,initial_client_turn_count,
    full_discussion_unlocked_at,created_at,updated_at
  ) values(
    applications[4],gigs[4],2,0,clock_timestamp()-interval '2 hours',
    clock_timestamp()-interval '2 hours',clock_timestamp()-interval '5 minutes'
  );
  insert into public.application_qa_messages(
    id,application_id,gig_id,sequence_number,sender_user_id,sender_role,
    message_kind,topic,body,request_id,request_fingerprint,created_at
  ) values(
    gen_random_uuid(),applications[4],gigs[4],1,client_user,'client',
    'question','timeline','Confirm the paused timeline.',
    gen_random_uuid(),repeat('d',64),clock_timestamp()-interval '5 minutes'
  );
  insert into public.selection_requests(
    id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at,status
  )
  select gen_random_uuid(),gigs[4],applications[4],versions[4],
    av.gig_version_id,client_user,clock_timestamp()-interval '1 hour',
    clock_timestamp()+interval '12 hours','pending'
  from public.application_versions av where av.id=versions[4];

  insert into public.application_review_states(
    application_id,gig_id,is_shortlisted,shortlisted_at,
    shortlisted_by_user_id,review_state_version,updated_at,updated_by_user_id
  ) values(
    applications[5],gigs[5],true,clock_timestamp()-interval '1 hour',
    client_user,1,clock_timestamp()-interval '1 hour',client_user
  );

  -- A stored expired pending row stays stored but is never effective.
  insert into public.selection_requests(
    id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at,status
  )
  select expired_selection,gigs[3],applications[3],versions[3],
    av.gig_version_id,client_user,clock_timestamp()-interval '2 days',
    clock_timestamp()-interval '1 day','pending'
  from public.application_versions av where av.id=versions[3];

  accepted := jsonb_build_object(
    'accepted_terms_contract_version',2,
    'snapshot_schema_version',2,
    'captured_at',clock_timestamp()-interval '1 day',
    'application_version_id',versions[6],
    'material_gig_version_id',
      (select gig_version_id from public.application_versions where id=versions[6]),
    'client_payment_terms',
      pg_temp.dashboard_gig_snapshot('Dashboard gig 6')->'client_payment',
    'freelancer_proposal',snap->'proposal',
    'timeline',snap->'timeline',
    'availability',snap->'availability',
    'scope',snap->'scope',
    'included_work',snap#>'{scope,included_work}',
    'excluded_work',snap#>'{scope,excluded_work}',
    'assumptions',snap#>'{scope,assumptions}',
    'estimate_change_factors',snap#>'{scope,estimate_change_factors}',
    'scope_notes',snap->'scope_notes'
  );
  insert into public.selection_requests(
    id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at,status,terminal_at,response_by_user_id
  )
  select accepted_selection_one,gigs[6],applications[6],versions[6],
    av.gig_version_id,client_user,clock_timestamp()-interval '2 days',
    clock_timestamp()-interval '1 day','accepted',
    clock_timestamp()-interval '1 day',freelancer_user
  from public.application_versions av where av.id=versions[6];
  insert into public.engagements(
    id,gig_id,application_id,selection_request_id,
    client_participant_user_id,freelancer_participant_user_id,status,
    accepted_application_version_id,accepted_gig_version_id,
    accepted_terms_contract_version,accepted_terms_snapshot,
    snapshot_schema_version,confirmed_at,work_started_by_user_id,
    work_started_at,completion_requested_by_user_id,completion_requested_at
  )
  select active_engagement_one,gigs[6],applications[6],accepted_selection_one,
    client_user,freelancer_user,'completion_pending',versions[6],
    av.gig_version_id,2,accepted,2,
    clock_timestamp()-interval '1 day',client_user,
    clock_timestamp()-interval '20 hours',freelancer_user,
    clock_timestamp()-interval '1 hour'
  from public.application_versions av where av.id=versions[6];

  -- App 8 has an active cancellation response assigned to the freelancer.
  accepted := accepted
    || jsonb_build_object(
      'application_version_id',versions[8],
      'material_gig_version_id',
        (select gig_version_id from public.application_versions where id=versions[8])
    );
  insert into public.selection_requests(
    id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at,status,terminal_at,response_by_user_id
  )
  select accepted_selection_two,gigs[8],applications[8],versions[8],
    av.gig_version_id,client_user,clock_timestamp()-interval '2 days',
    clock_timestamp()-interval '1 day','accepted',
    clock_timestamp()-interval '1 day',freelancer_user
  from public.application_versions av where av.id=versions[8];
  insert into public.engagements(
    id,gig_id,application_id,selection_request_id,
    client_participant_user_id,freelancer_participant_user_id,status,
    accepted_application_version_id,accepted_gig_version_id,
    accepted_terms_contract_version,accepted_terms_snapshot,
    snapshot_schema_version,confirmed_at,
    cancellation_requested_by_user_id,cancellation_requested_at,
    cancellation_reason_code,cancellation_detail,previous_active_status
  )
  select active_engagement_two,gigs[8],applications[8],accepted_selection_two,
    client_user,freelancer_user,'cancellation_pending',versions[8],
    av.gig_version_id,2,accepted,2,
    clock_timestamp()-interval '1 day',
    client_user,clock_timestamp()-interval '30 minutes',
    'other',jsonb_build_object('explanation','Fixture cancellation'),
    'confirmed'
  from public.application_versions av where av.id=versions[8];

  -- Gig 7 contains a historical Confirmed winner and cancelled engagement,
  -- while the primary freelancer has the pending reconsideration invitation.
  failed_version := gen_random_uuid();
  insert into public.applications(
    id,gig_id,freelancer_profile_id,stage,current_version_id,
    submitted_at,last_updated_at,stage_changed_at,
    stage_changed_by_actor_type,stage_changed_by_user_id
  ) values(
    failed_application,gigs[7],other_profile,'confirmed',failed_version,
    base_time,base_time,base_time,'user',other_freelancer
  );
  insert into public.application_versions(
    id,application_id,gig_id,version_number,gig_version_id,origin,
    snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,
    availability_snapshot,scope_snapshot,scope_notes,
    created_by_user_id,created_at
  )
  select failed_version,failed_application,gigs[7],1,av.gig_version_id,
    'initial_submission',1,snap->>'cover_note',snap->'proposal',
    snap->'timeline',snap->'availability',snap->'scope',snap->>'scope_notes',
    other_freelancer,base_time
  from public.application_versions av where av.id=versions[7];
  insert into public.selection_requests(
    id,gig_id,application_id,application_version_id,gig_version_id,
    created_by_user_id,created_at,expires_at,status,terminal_at,response_by_user_id
  )
  select accepted_selection_cancelled,gigs[7],failed_application,failed_version,
    av.gig_version_id,client_user,base_time,base_time+interval '1 day',
    'accepted',base_time+interval '1 hour',other_freelancer
  from public.application_versions av where av.id=versions[7];
  accepted := accepted
    || jsonb_build_object(
      'application_version_id',failed_version,
      'material_gig_version_id',
        (select gig_version_id from public.application_versions where id=failed_version)
    );
  insert into public.engagements(
    id,gig_id,application_id,selection_request_id,
    client_participant_user_id,freelancer_participant_user_id,status,
    accepted_application_version_id,accepted_gig_version_id,
    accepted_terms_contract_version,accepted_terms_snapshot,
    snapshot_schema_version,confirmed_at,
    cancellation_requested_by_user_id,cancellation_requested_at,
    cancellation_reason_code,cancellation_detail,previous_active_status
  )
  select cancelled_engagement,gigs[7],failed_application,
    accepted_selection_cancelled,client_user,other_freelancer,'cancelled',
    failed_version,av.gig_version_id,2,accepted,2,
    base_time,client_user,base_time+interval '2 hours',
    'other',jsonb_build_object('explanation','Failed engagement fixture'),
    'confirmed'
  from public.application_versions av where av.id=failed_version;
  insert into public.engagement_reopenings(
    id,engagement_id,gig_id,application_id,client_actor_user_id,
    operation_request_id,reopened_at
  ) values(
    reopening,cancelled_engagement,gigs[7],failed_application,
    client_user,gen_random_uuid(),clock_timestamp()-interval '2 hours'
  );
  insert into public.application_reconsideration_invitations(
    id,reopening_id,source_engagement_id,gig_id,application_id,
    invited_application_version_id,invited_material_gig_version_id,
    client_actor_user_id,reason_code,status,created_at
  )
  select gen_random_uuid(),reopening,cancelled_engagement,gigs[7],
    applications[7],versions[7],av.gig_version_id,client_user,
    'client_reconsideration','pending',clock_timestamp()-interval '1 hour'
  from public.application_versions av where av.id=versions[7];

  insert into dashboard_case values(
    client_user,other_client,freelancer_user,other_freelancer,
    freelancer_profile,other_profile,gigs,applications,versions,
    effective_selection,expired_selection,
    array[active_engagement_one,active_engagement_two],
    cancelled_engagement,
    (select count(*) from public.marketplace_events)
  );
end
$$;

select has_function(
  'public','dashboard_freelancer_get',array['uuid'],
  'freelancer dashboard read function exists'
);
select has_function(
  'public','dashboard_client_get',array['uuid'],
  'client dashboard read function exists'
);
select function_lang_is(
  'public','dashboard_freelancer_get',array['uuid'],'sql',
  'freelancer dashboard is one SQL read projection'
);
select function_lang_is(
  'public','dashboard_client_get',array['uuid'],'sql',
  'client dashboard is one SQL read projection'
);
select is(
  (select prosecdef from pg_proc
    where oid='public.dashboard_freelancer_get(uuid)'::regprocedure),
  true,
  'freelancer dashboard is security definer'
);
select is(
  (select prosecdef from pg_proc
    where oid='public.dashboard_client_get(uuid)'::regprocedure),
  true,
  'client dashboard is security definer'
);
select is(
  (select proconfig from pg_proc
    where oid='public.dashboard_freelancer_get(uuid)'::regprocedure),
  array['search_path=""'],
  'freelancer dashboard has an empty search path'
);
select ok(
  has_function_privilege(
    'service_role','public.dashboard_freelancer_get(uuid)','EXECUTE'
  ),
  'service role can execute freelancer dashboard'
);
select ok(
  not has_function_privilege(
    'authenticated','public.dashboard_freelancer_get(uuid)','EXECUTE'
  ),
  'browser cannot execute freelancer dashboard directly'
);
select ok(
  not has_function_privilege(
    'anon','public.dashboard_client_get(uuid)','EXECUTE'
  ),
  'anonymous role cannot execute client dashboard'
);

select throws_ok(
  (select format(
    'select public.dashboard_freelancer_get(%L)',
    client_user_id
  ) from dashboard_case),
  '42501',
  'M7J_FREELANCER_DASHBOARD_NOT_ALLOWED',
  'wrong role cannot read freelancer dashboard'
);
select throws_ok(
  (select format(
    'select public.dashboard_client_get(%L)',
    freelancer_user_id
  ) from dashboard_case),
  '42501',
  'M7J_CLIENT_DASHBOARD_NOT_ALLOWED',
  'wrong role cannot read client dashboard'
);
select throws_ok(
  $$select public.dashboard_client_get(gen_random_uuid())$$,
  '42501',
  'M7J_CLIENT_DASHBOARD_NOT_ALLOWED',
  'unknown users cannot enumerate dashboards'
);

select is(
  (public.dashboard_freelancer_get(freelancer_user_id)
    #>>'{summary,total_applications}')::integer,
  8,
  'freelancer total counts all owned application histories'
) from dashboard_case;
select is(
  (public.dashboard_freelancer_get(freelancer_user_id)
    #>>'{summary,effective_selection_requests}')::integer,
  2,
  'effective total includes unexpired pending requests even when not actionable'
) from dashboard_case;
select is(
  (public.dashboard_freelancer_get(freelancer_user_id)
    #>>'{summary,active_engagements}')::integer,
  2,
  'terminal engagements are excluded from freelancer active total'
) from dashboard_case;
select is(
  jsonb_array_length(
    public.dashboard_freelancer_get(freelancer_user_id)
      #>'{recent_applications,items}'
  ),
  6,
  'recent application preview is bounded independently from total'
) from dashboard_case;
select is(
  public.dashboard_freelancer_get(freelancer_user_id)
    #>>'{recent_applications,has_more}',
  'true',
  'application has_more matches total and limit'
) from dashboard_case;
select ok(
  (public.dashboard_freelancer_get(freelancer_user_id)
    #>>'{attention,attention_action_count}')::integer
  >
  (public.dashboard_freelancer_get(freelancer_user_id)
    #>>'{attention,attention_resource_count}')::integer,
  'duplicate actions are distinct from resource count'
) from dashboard_case;
select ok(
  (public.dashboard_freelancer_get(freelancer_user_id)
    #>>'{summary,response_required_applications}')::integer
  <
  (public.dashboard_freelancer_get(freelancer_user_id)
    #>>'{attention,attention_action_count}')::integer,
  'freelancer response summary counts distinct applications'
) from dashboard_case;
select is(
  (
    select count(*)
    from jsonb_array_elements(
      public.dashboard_freelancer_get(freelancer_user_id)
        #>'{attention,items}'
    ) item
    where item->>'gig_id'=gig_ids[4]::text
  ),
  0::bigint,
  'paused gig Q&A is excluded from attention'
) from dashboard_case;
select is(
  (
    select (item->>'action_kind')
    from jsonb_array_elements(
      public.dashboard_freelancer_get(freelancer_user_id)
        #>'{attention,items}'
    ) item
    where item->>'resource_id'=effective_selection_id::text
  ),
  'selection_response_required',
  'effective selection response appears with its resource ID'
) from dashboard_case;
select is(
  (
    select count(*)
    from jsonb_array_elements(
      public.dashboard_freelancer_get(freelancer_user_id)
        #>'{attention,items}'
    ) item
    where item->>'resource_id'=expired_selection_id::text
  ),
  0::bigint,
  'expired stored selection is excluded from attention'
) from dashboard_case;

select is(
  (public.dashboard_client_get(client_user_id)
    #>>'{summary,shortlisted_applications}')::integer,
  1,
  'client receives its private active shortlist count'
) from dashboard_case;
select is(
  (public.dashboard_client_get(client_user_id)
    #>>'{summary,active_engagements}')::integer,
  2,
  'historical Confirmed application and cancelled engagement do not inflate active total'
) from dashboard_case;
select is(
  jsonb_array_length(
    public.dashboard_client_get(client_user_id)
      #>'{gig_review_overview,items}'
  ),
  6,
  'client gig-review preview is bounded'
) from dashboard_case;
select is(
  public.dashboard_client_get(client_user_id)
    #>>'{gig_review_overview,has_more}',
  'true',
  'gig-review has_more matches total and limit'
) from dashboard_case;
select is(
  (
    select item->>'action_kind'
    from jsonb_array_elements(
      public.dashboard_client_get(client_user_id)#>'{attention,items}'
    ) item
    order by item->>'latest_activity_at'
    limit 1
  ),
  'engagement_response_required',
  'engagement resolution has priority over later action categories'
) from dashboard_case;
select ok(
  not (
    public.dashboard_freelancer_get(freelancer_user_id)::text
    ~* '(shortlist|contact_|contact value|accepted_terms|proposal_snapshot|action_token)'
  ),
  'freelancer response excludes shortlist, contact, snapshots, and tokens'
) from dashboard_case;
select ok(
  not (
    public.dashboard_client_get(client_user_id)::text
    ~* '(contact_|contact value|accepted_terms|proposal_snapshot|action_token|cover_note)'
  ),
  'client response excludes contact, snapshots, tokens, and proposal bodies'
) from dashboard_case;
select is(
  (select count(*) from public.marketplace_events),
  event_count,
  'dashboard reads create no marketplace events'
) from dashboard_case;
select is(
  (select status from public.selection_requests where id=expired_selection_id),
  'pending',
  'dashboard read does not project stored selection expiry'
) from dashboard_case;
select is(
  public.dashboard_freelancer_get(freelancer_user_id)
    #>>'{recent_applications,total}',
  public.dashboard_freelancer_get(freelancer_user_id)
    #>>'{summary,total_applications}',
  'preview population total is coherent with summary'
) from dashboard_case;
select ok(
  (
    select bool_and(
      exists(
        select 1
        from public.applications application
        where application.id=(item->>'application_id')::uuid
      )
    )
    from jsonb_array_elements(
      public.dashboard_freelancer_get(freelancer_user_id)
        #>'{recent_applications,items}'
    ) item
  ),
  'every application preview belongs to the authoritative population'
) from dashboard_case;

select * from finish();
rollback;
