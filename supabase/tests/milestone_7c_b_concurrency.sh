#!/usr/bin/env bash
set -euo pipefail

db_container="${SUPABASE_DB_CONTAINER:-supabase_db_gigmatch-ai}"
psql_cmd=(docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres)
scratch_dir="$(mktemp -d)"

cleanup() {
  "${psql_cmd[@]}" -q -c 'drop table if exists public.m7cb_concurrency_cases; drop function if exists public.m7cb_race_snapshot(text,integer);' >/dev/null 2>&1 || true
  rm -f "$scratch_dir"/*
  rmdir "$scratch_dir"
}
trap cleanup EXIT

"${psql_cmd[@]}" -q <<'SQL'
drop table if exists public.m7cb_concurrency_cases;
create table public.m7cb_concurrency_cases (
  name text primary key, client_id uuid not null, freelancer_id uuid,
  gig_id uuid not null, version_id uuid not null, application_id uuid,
  application_version_id uuid, request_id uuid
);

create or replace function public.m7cb_race_snapshot(title text, budget integer)
returns jsonb language sql stable set search_path = '' as $$
select jsonb_build_object(
  'version_kind','initial_product_version','terms_contract_version',1,'snapshot_schema_version',1,
  'payment_structure','fixed_price','currency','USD','title',title,'description','Concurrency verified API',
  'scope',jsonb_build_object('tech_category','backend'),
  'client_payment',jsonb_build_object('payment_structure','fixed_price','currency','USD','budget',jsonb_build_object('minimum',1000,'maximum',budget),'flexibility','negotiable'),
  'required_skills',jsonb_build_array('FastAPI'),'preferred_skills',jsonb_build_array('PostgreSQL'),
  'experience_requirement','mid','difficulty_level','intermediate','work_mode','remote','location_requirements',null,
  'weekly_commitment',null,'expected_duration',null,'application_deadline','2099-12-01T12:00:00+00:00',
  'project_deadline','2100-01-01T12:00:00+00:00','deliverables',jsonb_build_array('API'),'assumptions',jsonb_build_array()
) $$;

do $$
declare
  case_name text; client uuid; freelancer uuid; freelancer_profile uuid; gig uuid; version uuid; app uuid; app_version uuid; request uuid;
begin
  foreach case_name in array array['same_base','cancel_edit','pause_edit','draft_publish','cancel_accept','edit_accept'] loop
    client:=gen_random_uuid(); gig:=gen_random_uuid(); version:=gen_random_uuid();
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values('00000000-0000-0000-0000-000000000000',client,'authenticated','authenticated',case_name||'-client@example.test','',now(),'{}','{}',now(),now());
    insert into public.user_profiles(id,email,full_name,role) values(client,case_name||'-client@example.test',case_name||' client','client');
    insert into public.client_profiles(user_id,company_name) values(client,case_name||' company');
    if case_name='draft_publish' then
      insert into public.gigs(id,client_id,title,description,tech_category,status,required_skills,preferred_skills,deliverables,seniority_needed,work_mode,deadline)
      values(gig,client,'Draft Race','Draft terms','backend','draft',array['FastAPI'],array['PostgreSQL'],array['API'],'mid','remote',now()+interval '7 days');
      select current_gig_version_id into version from public.gigs where id=gig;
    else
      insert into public.gigs(id,client_id,title,description,tech_category,status,opportunity_lifecycle,application_intake,operational_state,current_gig_version_id,current_material_gig_version_id)
      values(gig,client,case_name,'Concurrency verified API','backend','open','active','accepting','active',version,version);
      insert into public.gig_versions(id,gig_id,version_number,snapshot_schema_version,terms_snapshot,changed_fields,created_by_actor_type,created_by_user_id)
      values(version,gig,1,1,public.m7cb_race_snapshot(case_name,2000),array['initial'],'user',client);
    end if;
    if case_name in ('cancel_accept','edit_accept') then
      freelancer:=gen_random_uuid(); freelancer_profile:=gen_random_uuid(); app:=gen_random_uuid(); app_version:=gen_random_uuid(); request:=gen_random_uuid();
      insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
      values('00000000-0000-0000-0000-000000000000',freelancer,'authenticated','authenticated',case_name||'-freelancer@example.test','',now(),'{}','{}',now(),now());
      insert into public.user_profiles(id,email,full_name,role) values(freelancer,case_name||'-freelancer@example.test',case_name||' freelancer','freelancer');
      insert into public.freelancer_profiles(id,user_id,headline) values(freelancer_profile,freelancer,'Backend Engineer');
      insert into public.applications(id,gig_id,freelancer_profile_id,stage,current_version_id,stage_changed_by_actor_type,stage_changed_by_user_id)
      values(app,gig,freelancer_profile,'advanced',app_version,'user',client);
      insert into public.application_versions(id,application_id,gig_id,version_number,gig_version_id,origin,snapshot_schema_version,cover_note,proposal_snapshot,timeline_snapshot,availability_snapshot,scope_snapshot,created_by_user_id)
      values(app_version,app,gig,1,version,'initial_submission',1,'Ready to build.',jsonb_build_object('proposal_contract_version',1,'snapshot_schema_version',1,'payment_structure','fixed_price','currency','USD'),'{}','{}','{}',freelancer);
      insert into public.selection_requests(id,gig_id,application_id,application_version_id,gig_version_id,created_by_user_id,created_at,expires_at)
      values(request,gig,app,app_version,version,client,now()-interval '1 minute',now()+interval '1 day');
    end if;
    insert into public.m7cb_concurrency_cases values(case_name,client,freelancer,gig,version,app,app_version,request);
  end loop;
end $$;
SQL

run_async() {
  local output_file="$1"
  shift
  "${psql_cmd[@]}" "$@" >"$output_file" 2>&1 &
  LAST_PID=$!
}

# Same expected display version: exactly one edit commits and the waiter sees stale.
run_async "$scratch_dir/same_a" -c "begin; select 1 from public.gigs where id=(select gig_id from public.m7cb_concurrency_cases where name='same_base') for update; select pg_sleep(1); select public.manage_gig_edit(c.gig_id,c.client_id,c.version_id,jsonb_set(v.terms_snapshot,'{title}','\"SAME BASE A\"'),false,null) from public.m7cb_concurrency_cases c join public.gig_versions v on v.id=c.version_id where c.name='same_base'; commit;"
pid_a=$LAST_PID
sleep 0.2
set +e
"${psql_cmd[@]}" -c "select public.manage_gig_edit(c.gig_id,c.client_id,c.version_id,jsonb_set(v.terms_snapshot,'{title}','\"SAME BASE B\"'),false,null) from public.m7cb_concurrency_cases c join public.gig_versions v on v.id=c.version_id where c.name='same_base';" >"$scratch_dir/same_b" 2>&1
status_b=$?
wait "$pid_a"; status_a=$?
set -e
test "$status_a" -eq 0
test "$status_b" -ne 0
grep -q 'M7CB_STALE_GIG_VERSION' "$scratch_dir/same_b"
test "$("${psql_cmd[@]}" -Atq -c "select count(*) from public.gig_versions v join public.m7cb_concurrency_cases c on c.gig_id=v.gig_id where c.name='same_base'")" = "2"

# Cancellation wins against a waiting edit; no post-cancellation version appears.
run_async "$scratch_dir/cancel" -c "begin; select 1 from public.gigs where id=(select gig_id from public.m7cb_concurrency_cases where name='cancel_edit') for update; select pg_sleep(1); select public.manage_gig_lifecycle(gig_id,client_id,'cancel','opportunity_no_longer_required','{\"applicant_facing_explanation\":\"Cancelled\",\"closes_active_records_confirmed\":true}') from public.m7cb_concurrency_cases where name='cancel_edit'; commit;"
pid_a=$LAST_PID
sleep 0.2
set +e
"${psql_cmd[@]}" -c "select public.manage_gig_edit(c.gig_id,c.client_id,c.version_id,jsonb_set(v.terms_snapshot,'{title}','\"LATE EDIT\"'),false,null) from public.m7cb_concurrency_cases c join public.gig_versions v on v.id=c.version_id where c.name='cancel_edit';" >"$scratch_dir/cancel_waiter" 2>&1
status_b=$?
wait "$pid_a"; status_a=$?
set -e
test "$status_a" -eq 0
test "$status_b" -ne 0
grep -q 'M7CB_INVALID_GIG_TRANSITION' "$scratch_dir/cancel_waiter"
test "$("${psql_cmd[@]}" -Atq -c "select count(*) from public.gig_versions v join public.m7cb_concurrency_cases c on c.gig_id=v.gig_id where c.name='cancel_edit'")" = "1"

# Pause commits first; the waiting edit observes and preserves paused operations.
run_async "$scratch_dir/pause" -c "begin; select 1 from public.gigs where id=(select gig_id from public.m7cb_concurrency_cases where name='pause_edit') for update; select pg_sleep(1); select public.manage_gig_lifecycle(gig_id,client_id,'pause','business_delay','{}') from public.m7cb_concurrency_cases where name='pause_edit'; commit;"
pid_a=$LAST_PID
sleep 0.2
"${psql_cmd[@]}" -q -c "select public.manage_gig_edit(c.gig_id,c.client_id,c.version_id,jsonb_set(v.terms_snapshot,'{title}','\"PAUSED EDIT\"'),false,null) from public.m7cb_concurrency_cases c join public.gig_versions v on v.id=c.version_id where c.name='pause_edit';" >"$scratch_dir/pause_waiter" 2>&1
wait "$pid_a"
test "$("${psql_cmd[@]}" -Atq -c "select operational_state from public.gigs g join public.m7cb_concurrency_cases c on c.gig_id=g.id where c.name='pause_edit'")" = "paused"

# Publication uses the locked draft; a browser-role edit cannot mutate it afterward.
run_async "$scratch_dir/publish" -c "begin; select 1 from public.gigs where id=(select gig_id from public.m7cb_concurrency_cases where name='draft_publish') for update; select pg_sleep(1); select public.manage_gig_publish(gig_id,client_id,version_id,public.m7cb_race_snapshot('Published Race',2000)) from public.m7cb_concurrency_cases where name='draft_publish'; commit;"
pid_a=$LAST_PID
sleep 0.2
"${psql_cmd[@]}" -q -c "begin; set local role authenticated; select set_config('request.jwt.claim.sub',(select client_id::text from public.m7cb_concurrency_cases where name='draft_publish'),true); update public.gigs set title='DIRECT DRAFT RACE' where id=(select gig_id from public.m7cb_concurrency_cases where name='draft_publish'); commit;" >"$scratch_dir/direct_draft" 2>&1
wait "$pid_a"
test "$("${psql_cmd[@]}" -Atq -c "select title from public.gigs g join public.m7cb_concurrency_cases c on c.gig_id=g.id where c.name='draft_publish'")" = "Published Race"

# Cancellation wins against selection acceptance: never cancelled + engagement.
run_async "$scratch_dir/cancel_accept" -c "begin; select 1 from public.gigs where id=(select gig_id from public.m7cb_concurrency_cases where name='cancel_accept') for update; select pg_sleep(1); select public.manage_gig_lifecycle(gig_id,client_id,'cancel','opportunity_no_longer_required','{\"applicant_facing_explanation\":\"Cancelled\",\"closes_active_records_confirmed\":true}') from public.m7cb_concurrency_cases where name='cancel_accept'; commit;"
pid_a=$LAST_PID
sleep 0.2
set +e
"${psql_cmd[@]}" -q -c "select public.confirm_selection_request(request_id,freelancer_id) from public.m7cb_concurrency_cases where name='cancel_accept';" >"$scratch_dir/accept_waiter" 2>&1
status_b=$?
wait "$pid_a"; status_a=$?
set -e
test "$status_a" -eq 0
test "$status_b" -ne 0
test "$("${psql_cmd[@]}" -Atq -c "select count(*) from public.engagements e join public.m7cb_concurrency_cases c on c.gig_id=e.gig_id where c.name='cancel_accept'")" = "0"

# Material edit wins against acceptance: request invalidates, no engagement forms.
run_async "$scratch_dir/edit_accept" -c "begin; select 1 from public.gigs where id=(select gig_id from public.m7cb_concurrency_cases where name='edit_accept') for update; select pg_sleep(1); with p as (select c.*,public.preview_gig_edit(c.gig_id,c.client_id,c.version_id,public.m7cb_race_snapshot('edit_accept',2500)) preview from public.m7cb_concurrency_cases c where name='edit_accept') select public.manage_gig_edit(gig_id,client_id,version_id,public.m7cb_race_snapshot('edit_accept',2500),true,preview->>'preview_fingerprint') from p; commit;"
pid_a=$LAST_PID
sleep 0.2
set +e
"${psql_cmd[@]}" -q -c "select public.confirm_selection_request(request_id,freelancer_id) from public.m7cb_concurrency_cases where name='edit_accept';" >"$scratch_dir/edit_accept_waiter" 2>&1
status_b=$?
wait "$pid_a"; status_a=$?
set -e
test "$status_a" -eq 0
test "$status_b" -ne 0
test "$("${psql_cmd[@]}" -Atq -c "select count(*) from public.engagements e join public.m7cb_concurrency_cases c on c.gig_id=e.gig_id where c.name='edit_accept'")" = "0"
test "$("${psql_cmd[@]}" -Atq -c "select status from public.selection_requests r join public.m7cb_concurrency_cases c on c.request_id=r.id where c.name='edit_accept'")" = "invalidated"

echo "7C-B concurrency races passed: same-base, cancel/edit, pause/edit, publish/direct-edit, cancel/accept, material-edit/accept."
