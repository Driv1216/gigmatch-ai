begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
set constraints all deferred;

create temporary table contact_cases(
  name text primary key,
  client_user_id uuid not null,
  freelancer_user_id uuid not null,
  outsider_user_id uuid not null,
  gig_id uuid not null,
  application_id uuid not null,
  engagement_id uuid not null
);

create or replace function pg_temp.gig_snapshot()
returns jsonb language sql as $$
  select jsonb_build_object(
    'version_kind','initial_product_version','terms_contract_version',1,
    'snapshot_schema_version',1,'payment_structure','fixed_price','currency','USD',
    'title','Secure contact build','description','Build a secure contact exchange.',
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

create or replace function pg_temp.application_snapshot()
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
    'scope_notes','Contact exchange test'
  )
$$;

create or replace function pg_temp.seed_contact(p_name text)
returns void language plpgsql set search_path='' as $$
declare
  client_user uuid:=gen_random_uuid();
  freelancer_user uuid:=gen_random_uuid();
  outsider_user uuid:=gen_random_uuid();
  freelancer_profile uuid:=gen_random_uuid();
  gig uuid:=gen_random_uuid();
  gig_version uuid:=gen_random_uuid();
  application uuid:=gen_random_uuid();
  app_version uuid:=gen_random_uuid();
  selection_request uuid:=gen_random_uuid();
  engagement uuid:=gen_random_uuid();
  snap jsonb:=pg_temp.application_snapshot();
  accepted jsonb;
  confirmed timestamptz:=clock_timestamp()-interval '1 hour';
begin
  insert into auth.users(
    instance_id,id,aud,role,email,phone,encrypted_password,
    email_confirmed_at,phone_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values
  ('00000000-0000-0000-0000-000000000000',client_user,
    'authenticated','authenticated',p_name||'-client@example.test',
    '+1555000'||right(replace(client_user::text,'-',''),4),'',now(),now(),
    '{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',freelancer_user,
    'authenticated','authenticated',p_name||'-freelancer@example.test',
    '+1555111'||right(replace(freelancer_user::text,'-',''),4),'',now(),now(),
    '{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',outsider_user,
    'authenticated','authenticated',p_name||'-outsider@example.test',null,
    '',now(),null,'{}','{}',now(),now());
  insert into public.user_profiles(id,email,full_name,role) values
    (client_user,p_name||'-client@example.test',p_name||' Client','client'),
    (freelancer_user,p_name||'-freelancer@example.test',p_name||' Freelancer','freelancer'),
    (outsider_user,p_name||'-outsider@example.test',p_name||' Outsider','freelancer');
  insert into public.client_profiles(user_id,company_name)
    values(client_user,p_name||' Company');
  insert into public.freelancer_profiles(id,user_id,headline)
    values(freelancer_profile,freelancer_user,'API Engineer');
  insert into public.gigs(
    id,client_id,title,description,tech_category,status,
    opportunity_lifecycle,application_intake,operational_state,
    current_gig_version_id,current_material_gig_version_id
  ) values(
    gig,client_user,'Secure contact build','Build secure contact exchange.','backend',
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
    stage_changed_by_actor_type,stage_changed_by_user_id
  ) values(
    application,gig,freelancer_profile,'confirmed',app_version,
    confirmed,confirmed,confirmed,'user',freelancer_user
  );
  insert into public.application_versions(
    id,application_id,gig_id,version_number,gig_version_id,origin,
    snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,
    availability_snapshot,scope_snapshot,scope_notes,created_by_user_id,created_at
  ) values(
    app_version,application,gig,1,gig_version,'initial_submission',1,
    snap->>'cover_note',snap->'proposal',snap->'timeline',snap->'availability',
    snap->'scope',snap->>'scope_notes',freelancer_user,confirmed
  );
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
  accepted:=jsonb_build_object(
    'accepted_terms_contract_version',2,'snapshot_schema_version',2,
    'captured_at',confirmed,'application_version_id',app_version,
    'material_gig_version_id',gig_version,
    'client_payment_terms',pg_temp.gig_snapshot()->'client_payment',
    'freelancer_proposal',snap->'proposal','timeline',snap->'timeline',
    'availability',snap->'availability','scope',snap->'scope',
    'included_work',snap#>'{scope,included_work}',
    'excluded_work',snap#>'{scope,excluded_work}',
    'assumptions',snap#>'{scope,assumptions}',
    'estimate_change_factors',snap#>'{scope,estimate_change_factors}',
    'scope_notes',snap->'scope_notes'
  );
  insert into public.engagements(
    id,gig_id,application_id,selection_request_id,
    client_participant_user_id,freelancer_participant_user_id,status,
    accepted_application_version_id,accepted_gig_version_id,
    accepted_terms_contract_version,accepted_terms_snapshot,
    snapshot_schema_version,confirmed_at
  ) values(
    engagement,gig,application,selection_request,client_user,freelancer_user,
    'confirmed',app_version,gig_version,2,accepted,2,confirmed
  );
  insert into public.marketplace_events(
    event_type,visibility,actor_type,gig_id,application_id,
    selection_request_id,engagement_id,event_payload,occurred_at
  ) values(
    'engagement_created','participants','system',gig,application,
    selection_request,engagement,jsonb_build_object(
      'status','confirmed','snapshot_schema_version',2,'lifecycle_version',1
    ),confirmed
  );
  insert into contact_cases values(
    p_name,client_user,freelancer_user,outsider_user,gig,application,engagement
  );
end;
$$;

select pg_temp.seed_contact('main');
select pg_temp.seed_contact('source');
select pg_temp.seed_contact('blocked');
select pg_temp.seed_contact('cancelled');

create or replace function pg_temp.method_token(
  p_name text,p_actor text,p_method text
) returns text language plpgsql as $$
declare c contact_cases; actor uuid; item jsonb;
begin
  select * into c from contact_cases where name=p_name;
  actor:=case when p_actor='client' then c.client_user_id else c.freelancer_user_id end;
  select value into item from jsonb_array_elements(
    public.contact_exchange_get(c.engagement_id,actor)->'available_methods'
  ) where value->>'method'=p_method;
  return item->>'share_action_token';
end;
$$;

create or replace function pg_temp.share_auth(
  p_name text,p_actor text,p_method text,p_request uuid default gen_random_uuid()
) returns jsonb language plpgsql as $$
declare c contact_cases; actor uuid;
begin
  select * into c from contact_cases where name=p_name;
  actor:=case when p_actor='client' then c.client_user_id else c.freelancer_user_id end;
  return public.contact_share_create(
    c.engagement_id,actor,p_method,
    pg_temp.method_token(p_name,p_actor,p_method),p_request,gen_random_uuid(),
    null,null,null,null,null
  );
end;
$$;

create or replace function pg_temp.share_url(
  p_name text,p_actor text,p_method text,p_request uuid default gen_random_uuid()
) returns jsonb language plpgsql as $$
declare c contact_cases; actor uuid;
begin
  select * into c from contact_cases where name=p_name;
  actor:=case when p_actor='client' then c.client_user_id else c.freelancer_user_id end;
  return public.contact_share_create(
    c.engagement_id,actor,p_method,
    pg_temp.method_token(p_name,p_actor,p_method),p_request,gen_random_uuid(),
    'ciphertext-not-plaintext','nonce-value','contact-key-v1',
    repeat('a',64),'https://meet.example.test/••••'
  );
end;
$$;

create or replace function pg_temp.received_share(
  p_name text,p_actor text,p_method text
) returns jsonb language plpgsql as $$
declare c contact_cases; actor uuid; item jsonb;
begin
  select * into c from contact_cases where name=p_name;
  actor:=case when p_actor='client' then c.client_user_id else c.freelancer_user_id end;
  select value into item from jsonb_array_elements(
    public.contact_exchange_get(c.engagement_id,actor)->'shared_with_you'
  ) where value->>'method'=p_method order by value->>'created_at' desc limit 1;
  return item;
end;
$$;

create or replace function pg_temp.own_share(
  p_name text,p_actor text,p_method text
) returns jsonb language plpgsql as $$
declare c contact_cases; actor uuid; item jsonb;
begin
  select * into c from contact_cases where name=p_name;
  actor:=case when p_actor='client' then c.client_user_id else c.freelancer_user_id end;
  select value into item from jsonb_array_elements(
    public.contact_exchange_get(c.engagement_id,actor)->'shared_by_you'
  ) where value->>'method'=p_method order by value->>'created_at' desc limit 1;
  return item;
end;
$$;

create or replace function pg_temp.reveal(
  p_name text,p_actor text,p_method text,p_request uuid
) returns jsonb language plpgsql as $$
declare c contact_cases; actor uuid; item jsonb; token text;
begin
  select * into c from contact_cases where name=p_name;
  actor:=case when p_actor='client' then c.client_user_id else c.freelancer_user_id end;
  item:=pg_temp.received_share(p_name,p_actor,p_method);
  select value->>'action_token' into token
  from jsonb_array_elements(item->'actions')
  where value->>'action'='reveal';
  return public.contact_share_reveal(
    (item->>'share_id')::uuid,actor,token,p_request,10,10
  );
end;
$$;

select has_table('public','contact_shares','contact share authority exists');
select has_table('private','contact_share_material','sensitive material is private');
select has_table('public','contact_reveals','reveal audit authority exists');
select has_table('public','engagement_contact_blocks','engagement block authority exists');
select has_table('public','engagement_contact_reports','private report authority exists');
select has_table('private','contact_operations','contact idempotency ledger exists');
select ok((select relrowsecurity from pg_class where oid='public.contact_shares'::regclass),
  'contact shares have RLS enabled');
select ok(not has_function_privilege('authenticated',
  'public.contact_share_reveal(uuid,uuid,text,uuid,integer,integer)','EXECUTE'),
  'authenticated browser cannot execute reveal RPC');
select ok(has_function_privilege('service_role',
  'public.contact_share_reveal(uuid,uuid,text,uuid,integer,integer)','EXECUTE'),
  'service role alone receives reveal RPC execution');
select ok(not has_table_privilege('service_role','private.contact_share_material','SELECT'),
  'service role cannot directly select private material');

select throws_ok(
  (select format('select public.contact_exchange_get(%L,%L)',
    engagement_id,outsider_user_id) from contact_cases where name='main'),
  'P0002','M7I_CONTACT_EXCHANGE_NOT_FOUND',
  'cross-user contact exchange is non-enumerating'
);
select is(
  public.contact_exchange_get(engagement_id,client_user_id)->>'engagement_status',
  'confirmed','participant can load contact exchange'
) from contact_cases where name='main';
select is(
  (select value#>>'{ownership_verification}' from contact_cases c,
    jsonb_array_elements(public.contact_exchange_get(
      c.engagement_id,c.client_user_id)->'available_methods')
    where c.name='main' and value->>'method'='verified_email'),
  'verified','confirmed auth email is offered as verified'
);
select is(
  (select value#>>'{whatsapp_availability}' from contact_cases c,
    jsonb_array_elements(public.contact_exchange_get(
      c.engagement_id,c.client_user_id)->'available_methods')
    where c.name='main' and value->>'method'='whatsapp_phone'),
  'self_declared','WhatsApp availability is explicitly self-declared'
);

select lives_ok($$select pg_temp.share_auth('main','client','verified_email')$$,
  'client shares confirmed auth email without browser value');
select lives_ok($$select pg_temp.share_url('main','freelancer','meeting_link')$$,
  'freelancer shares only encrypted meeting-link material');
select throws_ok(
  (select format(
    'select public.contact_share_create(%L,%L,''meeting_link'',%L,gen_random_uuid(),gen_random_uuid(),null,null,null,null,null)',
    engagement_id,client_user_id,pg_temp.method_token('main','client','meeting_link'))
    from contact_cases where name='main'),
  '22023','M7I_ENCRYPTED_MATERIAL_REQUIRED',
  'database rejects unencrypted user-provided URL material'
);
select ok(
  position('main-client@example.test' in
    public.contact_exchange_get(engagement_id,freelancer_user_id)::text)=0,
  'ordinary recipient DTO recursively excludes full verified email'
) from contact_cases where name='main';
select ok(
  position('ciphertext-not-plaintext' in
    public.contact_exchange_get(engagement_id,client_user_id)::text)=0,
  'ordinary DTO recursively excludes ciphertext'
) from contact_cases where name='main';
select ok(
  position('contact-key-v1' in
    public.contact_exchange_get(engagement_id,client_user_id)::text)=0,
  'ordinary DTO recursively excludes encryption key ID'
) from contact_cases where name='main';
select ok(
  not (public.engagement_get(engagement_id,client_user_id)
    ?| array['contact_exchange','contact_shares','contact_values']),
  'engagement detail remains contact-domain free'
) from contact_cases where name='main';
select ok(
  position('contact_' in
    public.engagement_timeline(engagement_id,client_user_id)::text)=0,
  'engagement lifecycle timeline remains contact-domain free'
) from contact_cases where name='main';

create temporary table reveal_retry(
  request_id uuid primary key,share_id uuid not null,reveal_token text not null
);
insert into reveal_retry
select gen_random_uuid(),(item->>'share_id')::uuid,action->>'action_token'
from (select pg_temp.received_share('main','freelancer','verified_email') item) s,
lateral jsonb_array_elements(item->'actions') action
where action->>'action'='reveal';
select is(
  pg_temp.reveal('main','freelancer','verified_email',
    (select request_id from reveal_retry))->>'value',
  'main-client@example.test','authorized reveal returns exact Auth value only here'
);
select is(
  pg_temp.reveal('main','freelancer','verified_email',
    (select request_id from reveal_retry))->>'audit_replay',
  'true','same-key reveal retry reauthorizes and deduplicates audit'
);
select is((select count(*) from public.contact_reveals r join contact_cases c
  on c.engagement_id=r.engagement_id where c.name='main'
  and r.request_id=(select request_id from reveal_retry)),1::bigint,
  'same-key reveal retry creates one audit row');

create or replace function pg_temp.revoke(
  p_name text,p_actor text,p_method text,p_request uuid
) returns jsonb language plpgsql as $$
declare c contact_cases; actor uuid; item jsonb; token text;
begin
  select * into c from contact_cases where name=p_name;
  actor:=case when p_actor='client' then c.client_user_id else c.freelancer_user_id end;
  item:=pg_temp.own_share(p_name,p_actor,p_method);
  select value->>'action_token' into token from jsonb_array_elements(item->'actions')
    where value->>'action'='revoke';
  return public.contact_share_revoke(
    (item->>'share_id')::uuid,actor,token,p_request
  );
end;
$$;
select lives_ok($$select pg_temp.revoke('main','client','verified_email',gen_random_uuid())$$,
  'sharer can revoke verified email');
select throws_ok(
  (select format(
    'select public.contact_share_reveal(%L,%L,%L,%L,10,10)',
    (select share_id from reveal_retry),
    freelancer_user_id,
    (select reveal_token from reveal_retry),
    (select request_id from reveal_retry)
  ) from contact_cases where name='main'),
  'P0001','M7I_CONTACT_SHARE_NOT_ACTIVE',
  'same reveal request ID returns no plaintext after revocation'
);
select is((select consent_status from public.contact_shares
  where id=(pg_temp.own_share('main','client','verified_email')->>'share_id')::uuid),
  'revoked','revocation persists consent projection');
select lives_ok($$select pg_temp.share_auth('main','client','verified_email')$$,
  'resharing creates a fresh share after revocation');
select is((select previous_share_id::text from public.contact_shares
  where id=(pg_temp.own_share('main','client','verified_email')->>'share_id')::uuid),
  (select id::text from public.contact_shares
    where engagement_id=(select engagement_id from contact_cases where name='main')
      and sharer_user_id=(select client_user_id from contact_cases where name='main')
      and method='verified_email' and consent_status='revoked'
    order by created_at desc,id desc limit 1),
  'reshare links immutable prior consent history');

select lives_ok($$select pg_temp.share_auth('source','client','verified_email')$$,
  'source-change case shares verified email');
create temporary table saved_reveal(
  name text primary key,share_id uuid not null,reveal_token text not null
);
insert into saved_reveal
select 'source',(item->>'share_id')::uuid,action->>'action_token'
from (select pg_temp.received_share('source','freelancer','verified_email') item) s,
lateral jsonb_array_elements(item->'actions') action
where action->>'action'='reveal';
update auth.users set email='source-client-new@example.test',updated_at=now()
where id=(select client_user_id from contact_cases where name='source');
select is(
  (select public.contact_share_reveal(
    sr.share_id,c.freelancer_user_id,sr.reveal_token,gen_random_uuid(),10,10
  )->>'denial_code'
  from saved_reveal sr,contact_cases c
  where sr.name='source' and c.name='source'),
  'contact_source_invalidated',
  'Auth-source change denies reveal without plaintext'
);
select is((select source_status from public.contact_shares s join contact_cases c
  on c.engagement_id=s.engagement_id where c.name='source'
  and s.method='verified_email'),'invalidated',
  'Auth-source mismatch persists invalidated projection');
select lives_ok($$select pg_temp.share_auth('source','client','verified_email')$$,
  'fresh explicit share retires the invalidated consent and creates a new row');
select is((select count(*) filter(where consent_status='active')::text||'|'||
  count(*) filter(where consent_status='revoked')::text
  from public.contact_shares s join contact_cases c
    on c.engagement_id=s.engagement_id
  where c.name='source' and s.method='verified_email'),
  '1|1','source reshare preserves exactly one active consent and immutable history');

select lives_ok($$select pg_temp.share_auth('blocked','client','verified_phone')$$,
  'block case client shares phone');
select lives_ok($$select pg_temp.share_auth('blocked','freelancer','whatsapp_phone')$$,
  'block case freelancer separately consents to WhatsApp phone');
create temporary table saved_share_token(
  name text primary key,action_token text not null
);
insert into saved_share_token values(
  'blocked-freelancer-email',
  pg_temp.method_token('blocked','freelancer','verified_email')
);
create or replace function pg_temp.block_case()
returns jsonb language plpgsql as $$
declare c contact_cases; state jsonb;
begin
  select * into c from contact_cases where name='blocked';
  state:=public.contact_exchange_get(c.engagement_id,c.client_user_id);
  return public.engagement_contact_block(
    c.engagement_id,c.client_user_id,state->>'block_action_token',gen_random_uuid()
  );
end;
$$;
select is(pg_temp.block_case()->>'blocked','true',
  'engagement-scoped block becomes authoritative');
select is((select consent_status from public.contact_shares s join contact_cases c
  on c.engagement_id=s.engagement_id where c.name='blocked'
  and s.sharer_user_id=c.client_user_id),'revoked',
  'block revokes only blocker own active shares');
select is((select consent_status from public.contact_shares s join contact_cases c
  on c.engagement_id=s.engagement_id where c.name='blocked'
  and s.sharer_user_id=c.freelancer_user_id),'active',
  'block does not rewrite other participant consent history');
select throws_ok(
  (select format(
    'select public.contact_share_create(%L,%L,''verified_email'',%L,gen_random_uuid(),gen_random_uuid(),null,null,null,null,null)',
    c.engagement_id,c.freelancer_user_id,t.action_token
  ) from contact_cases c,saved_share_token t
    where c.name='blocked' and t.name='blocked-freelancer-email'),
  'P0001','M7I_CONTACT_EXCHANGE_BLOCKED',
  'either-direction block prevents new shares'
);
select lives_ok(
  (select format(
    'select public.engagement_transition(%L,%L,''prepare_kickoff'',%L,gen_random_uuid(),null,null)',
    engagement_id,freelancer_user_id,
    public.engagement_get(engagement_id,freelancer_user_id)->>'action_token')
  from contact_cases where name='blocked'),
  'contact block does not disable required engagement lifecycle action'
);

select lives_ok($$select pg_temp.share_auth('cancelled','client','verified_phone')$$,
  'cancelled case starts with eligible share');
insert into saved_reveal
select 'cancelled',(item->>'share_id')::uuid,action->>'action_token'
from (select pg_temp.received_share('cancelled','freelancer','verified_phone') item) s,
lateral jsonb_array_elements(item->'actions') action
where action->>'action'='reveal';
create or replace function pg_temp.cancel_case()
returns void language plpgsql as $$
declare c contact_cases; detail jsonb;
begin
  select * into c from contact_cases where name='cancelled';
  detail:=public.engagement_get(c.engagement_id,c.client_user_id);
  perform public.engagement_transition(
    c.engagement_id,c.client_user_id,'request_cancellation',
    detail->>'action_token',gen_random_uuid(),'mutual_decision',null
  );
  detail:=public.engagement_get(c.engagement_id,c.freelancer_user_id);
  perform public.engagement_transition(
    c.engagement_id,c.freelancer_user_id,'acknowledge_cancellation',
    detail->>'action_token',gen_random_uuid(),null,null
  );
end;
$$;
select lives_ok($$select pg_temp.cancel_case()$$,'engagement reaches Cancelled');
select throws_ok(
  (select format(
    'select public.contact_share_reveal(%L,%L,%L,gen_random_uuid(),10,10)',
    sr.share_id,c.freelancer_user_id,sr.reveal_token
  ) from saved_reveal sr,contact_cases c
    where sr.name='cancelled' and c.name='cancelled'),
  'P0001','M7I_CONTACT_EXCHANGE_UNAVAILABLE',
  'Cancelled engagement denies reveal'
);
select lives_ok(
  $$select pg_temp.revoke('cancelled','client','verified_phone',gen_random_uuid())$$,
  'revocation remains available after cancellation'
);
select lives_ok(
  (select format(
    'select public.engagement_contact_report(%L,%L,%L,gen_random_uuid(),''request_for_credentials'',null)',
    engagement_id,freelancer_user_id,
    public.contact_exchange_get(engagement_id,freelancer_user_id)
      ->>'report_action_token')
  from contact_cases where name='cancelled'),
  'private reporting remains available after cancellation'
);
select throws_ok(
  (select format(
    'select public.engagement_contact_report(%L,%L,%L,gen_random_uuid(),''other'',null)',
    engagement_id,client_user_id,
    public.contact_exchange_get(engagement_id,client_user_id)
      ->>'report_action_token')
  from contact_cases where name='cancelled'),
  '22023','M7I_INVALID_REPORT_DETAIL','Other report requires bounded detail'
);
select is((select count(*) from public.marketplace_events me
  where me.event_type like '%contact%' or me.event_payload::text like '%contact%'),
  0::bigint,'contact shares, reveals, reports and blocks never enter marketplace events');
select lives_ok(
  $$select pg_temp.revoke('main','freelancer','meeting_link',gen_random_uuid())$$,
  'user-provided URL share can be revoked'
);
select ok((select m.retired_at is not null and m.ciphertext is null and m.nonce is null
  from private.contact_share_material m
  where m.share_id=(
    select s.id from public.contact_shares s join contact_cases c
      on c.engagement_id=s.engagement_id
    where c.name='main' and s.sharer_user_id=c.freelancer_user_id
      and s.method='meeting_link'
  )),'revocation cryptographically retires encrypted URL material');
select ok(not has_table_privilege(
  'authenticated','public.engagement_contact_reports','SELECT'
),'participant cannot directly read private safety reports');
select throws_ok(
  $$delete from public.contact_reveals$$,null,null,
  'reveal audit cannot be physically deleted');
select throws_ok(
  $$update public.contact_shares set consent_status='active',revoked_at=null,
    state_version=state_version+1 where consent_status='revoked'$$,
  'P0001','M7I_REVOKED_SHARE_IMMUTABLE','revoked shares cannot be reactivated');

select * from finish();
rollback;
