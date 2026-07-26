#!/usr/bin/env python3
"""Verify Milestone 7D lock ordering with independent PostgreSQL sessions."""

from __future__ import annotations

import json
import subprocess
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


CONTAINER = "supabase_db_gigmatch-ai"


def run_psql(sql: str, *, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["docker", "exec", CONTAINER, "psql", "-X", "-U", "postgres", "-d", "postgres",
         "-v", "ON_ERROR_STOP=1", "-Atc", sql],
        check=False, capture_output=True, text=True,
    )
    if check and result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def uid(value: uuid.UUID) -> str:
    return f"'{value}'::uuid"


def app_snapshot(total: int = 1500) -> dict[str, object]:
    return {
        "proposal_contract_version": 1,
        "snapshot_schema_version": 1,
        "cover_note": "Concurrency-safe application.",
        "proposal": {
            "proposal_contract_version": 1,
            "snapshot_schema_version": 1,
            "payment_structure": "fixed_price",
            "currency": "USD",
            "mode": "exact_total",
            "exact_total": total,
        },
        "timeline": {"mode": "exact", "unit": "weeks", "exact_value": 4},
        "availability": {"available_from": "2098-01-01"},
        "scope": {
            "included_work": ["API"],
            "excluded_work": ["Hosting"],
            "assumptions": ["Access"],
            "estimate_change_factors": ["Scope"],
        },
    }


def gig_snapshot(deadline: datetime, maximum: int = 2000) -> dict[str, object]:
    return {
        "version_kind": "initial_product_version",
        "terms_contract_version": 1,
        "snapshot_schema_version": 1,
        "payment_structure": "fixed_price",
        "currency": "USD",
        "title": "Concurrency gig",
        "description": "Verify independent database sessions.",
        "scope": {"tech_category": "backend"},
        "client_payment": {
            "payment_structure": "fixed_price",
            "currency": "USD",
            "budget": {"minimum": 1000, "maximum": maximum},
            "flexibility": "slightly_flexible",
        },
        "required_skills": ["FastAPI"],
        "preferred_skills": ["PostgreSQL"],
        "experience_requirement": "mid",
        "difficulty_level": "intermediate",
        "work_mode": "remote",
        "location_requirements": None,
        "weekly_commitment": None,
        "expected_duration": None,
        "application_deadline": deadline.isoformat(),
        "project_deadline": "2100-01-01T12:00:00+00:00",
        "deliverables": ["API"],
        "assumptions": [],
    }


@dataclass
class Case:
    client: uuid.UUID
    gig: uuid.UUID
    version: uuid.UUID
    freelancers: list[tuple[uuid.UUID, uuid.UUID]]


def seed_case(*, freelancer_count: int = 1, deadline: datetime | None = None) -> Case:
    client, gig, version = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    freelancers = [(uuid.uuid4(), uuid.uuid4()) for _ in range(freelancer_count)]
    deadline = deadline or datetime(2099, 12, 1, 12, tzinfo=timezone.utc)
    auth_rows = [
        f"('00000000-0000-0000-0000-000000000000',{uid(client)},'authenticated','authenticated',"
        f"{literal(str(client) + '@example.test')},'',now(),'{{}}','{{}}',now(),now())"
    ]
    profile_rows = [f"({uid(client)},{literal(str(client) + '@example.test')},'client')"]
    freelancer_profile_rows: list[str] = []
    for user, profile in freelancers:
        auth_rows.append(
            f"('00000000-0000-0000-0000-000000000000',{uid(user)},'authenticated','authenticated',"
            f"{literal(str(user) + '@example.test')},'',now(),'{{}}','{{}}',now(),now())"
        )
        profile_rows.append(f"({uid(user)},{literal(str(user) + '@example.test')},'freelancer')")
        freelancer_profile_rows.append(f"({uid(profile)},{uid(user)},'Concurrency freelancer')")
    snapshot = literal(json.dumps(gig_snapshot(deadline)))
    run_psql(f"""
      begin; set constraints all deferred;
      insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
        raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values {','.join(auth_rows)};
      insert into public.user_profiles(id,email,role) values {','.join(profile_rows)};
      insert into public.client_profiles(user_id,company_name) values({uid(client)},'Concurrency company');
      insert into public.freelancer_profiles(id,user_id,headline) values {','.join(freelancer_profile_rows)};
      insert into public.gigs(id,client_id,title,description,tech_category,status,opportunity_lifecycle,
        application_intake,operational_state,current_gig_version_id,current_material_gig_version_id)
      values({uid(gig)},{uid(client)},'Concurrency gig','Verify sessions','backend','open','active',
        'accepting','active',{uid(version)},{uid(version)});
      insert into public.gig_versions(id,gig_id,version_number,snapshot_schema_version,terms_snapshot,
        changed_fields,created_by_actor_type,created_by_user_id)
      values({uid(version)},{uid(gig)},1,1,{snapshot}::jsonb,array['initial'],'user',{uid(client)});
      commit;
    """)
    return Case(client, gig, version, freelancers)


def term_token(case: Case) -> str:
    return run_psql(
        f"select private.application_terms_token({uid(case.gig)},{uid(case.version)});"
    ).stdout.strip()


def submit_sql(case: Case, index: int, request_id: uuid.UUID, total: int = 1500) -> str:
    user = case.freelancers[index][0]
    snapshot = literal(json.dumps(app_snapshot(total)))
    return (
        f"select public.submit_application({uid(case.gig)},{uid(user)},{uid(request_id)},"
        f"{literal(term_token(case))},{snapshot}::jsonb);"
    )


def application_id(case: Case, index: int = 0) -> uuid.UUID:
    profile = case.freelancers[index][1]
    return uuid.UUID(run_psql(
        f"select id from public.applications where gig_id={uid(case.gig)} and freelancer_profile_id={uid(profile)};"
    ).stdout.strip())


def app_token(application: uuid.UUID) -> str:
    return run_psql(
        f"select private.application_version_token(id,current_version_id) from public.applications where id={uid(application)};"
    ).stdout.strip()


def create_request(case: Case, application: uuid.UUID) -> uuid.UUID:
    request = uuid.uuid4()
    run_psql(f"""
      insert into public.selection_requests(id,gig_id,application_id,application_version_id,gig_version_id,
        created_by_user_id,created_at,expires_at)
      select {uid(request)},a.gig_id,a.id,a.current_version_id,av.gig_version_id,{uid(case.client)},
        clock_timestamp(),clock_timestamp()+interval '1 day'
      from public.applications a join public.application_versions av on av.id=a.current_version_id
      where a.id={uid(application)};
    """)
    return request


def race(sql_a: str, sql_b: str) -> list[subprocess.CompletedProcess[str]]:
    barrier = threading.Barrier(3)
    results: list[subprocess.CompletedProcess[str]] = []
    mutex = threading.Lock()

    def attempt(sql: str) -> None:
        barrier.wait()
        result = run_psql(sql, check=False)
        with mutex:
            results.append(result)

    threads = [threading.Thread(target=attempt, args=(sql,)) for sql in (sql_a, sql_b)]
    for thread in threads:
        thread.start()
    barrier.wait()
    for thread in threads:
        thread.join()
    return results


def ordered_race(sql_a: str, sql_b: str) -> list[subprocess.CompletedProcess[str]]:
    results: list[subprocess.CompletedProcess[str]] = []
    thread = threading.Thread(target=lambda: results.append(run_psql(sql_a, check=False)))
    thread.start()
    time.sleep(0.2)
    results.append(run_psql(sql_b, check=False))
    thread.join()
    return results


def assert_counts(sql: str, expected: str, label: str) -> None:
    actual = run_psql(sql).stdout.strip()
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected}, got {actual}")
    print(f"PASS {label}")


def assert_one_success(results: list[subprocess.CompletedProcess[str]], marker: str, label: str) -> None:
    successes = sum(result.returncode == 0 for result in results)
    failures = [result for result in results if result.returncode != 0]
    if successes != 1 or len(failures) != 1 or marker not in (failures[0].stderr + failures[0].stdout):
        raise AssertionError(f"{label}: unexpected race results")
    print(f"PASS {label}")


def material_edit_sql(case: Case, maximum: int, *, delay: float = 0) -> str:
    candidate = literal(json.dumps(gig_snapshot(datetime(2099, 12, 1, 12, tzinfo=timezone.utc), maximum)))
    delay_sql = f"select pg_sleep({delay});" if delay else ""
    return f"""
      begin; select 1 from public.gigs where id={uid(case.gig)} for update; {delay_sql}
      with p as (select public.preview_gig_edit({uid(case.gig)},{uid(case.client)},{uid(case.version)},{candidate}::jsonb) preview)
      select public.manage_gig_edit({uid(case.gig)},{uid(case.client)},{uid(case.version)},{candidate}::jsonb,true,
        (select preview->>'preview_fingerprint' from p)); commit;
    """


def main() -> int:
    same = seed_case()
    request = uuid.uuid4()
    results = race(submit_sql(same, 0, request), submit_sql(same, 0, request))
    if any(result.returncode != 0 for result in results):
        raise AssertionError("same-key submissions must both return successfully")
    assert_counts(
        f"select count(*), (select count(*) from public.application_versions av join public.applications a on a.id=av.application_id where a.gig_id={uid(same.gig)}), (select count(*) from public.marketplace_events where gig_id={uid(same.gig)} and event_type='application_submitted') from public.applications where gig_id={uid(same.gig)};",
        "1|1|1", "same freelancer double-submit creates one aggregate/version/event",
    )

    different = seed_case(freelancer_count=2)
    results = race(submit_sql(different, 0, uuid.uuid4()), submit_sql(different, 1, uuid.uuid4()))
    if any(result.returncode != 0 for result in results):
        raise AssertionError("different freelancers must both be able to submit")
    assert_counts(f"select count(*) from public.applications where gig_id={uid(different.gig)};", "2",
                  "two different freelancers both submit")

    deadline_case = seed_case(deadline=datetime.now(timezone.utc) + timedelta(seconds=1.2))
    blocker = f"begin; select 1 from public.gigs where id={uid(deadline_case.gig)} for update; select pg_sleep(2); commit;"
    thread = threading.Thread(target=lambda: run_psql(blocker))
    thread.start(); time.sleep(0.2)
    deadline_result = run_psql(submit_sql(deadline_case, 0, uuid.uuid4()), check=False)
    thread.join()
    if deadline_result.returncode == 0 or "M7D_APPLICATION_DEADLINE_PASSED" not in deadline_result.stderr:
        raise AssertionError("submission waiting past deadline was not rejected")
    assert_counts(f"select count(*) from public.applications where gig_id={uid(deadline_case.gig)};", "0",
                  "submission waits past deadline with no partial rows")

    material_submit = seed_case()
    old_submit = submit_sql(material_submit, 0, uuid.uuid4())
    results = ordered_race(material_edit_sql(material_submit, 2500, delay=0.7), old_submit)
    assert_one_success(results, "M7D_STALE_GIG_TERMS", "submission versus material edit has one valid winner")

    paused = seed_case()
    pause_sql = f"begin; select 1 from public.gigs where id={uid(paused.gig)} for update; select pg_sleep(0.7); select public.manage_gig_lifecycle({uid(paused.gig)},{uid(paused.client)},'pause','business_delay','{{}}'); commit;"
    results = ordered_race(pause_sql, submit_sql(paused, 0, uuid.uuid4()))
    assert_one_success(results, "M7D_GIG_NOT_APPLICATION_READY", "submission versus pause has one valid winner")

    closed = seed_case()
    close_sql = f"begin; select 1 from public.gigs where id={uid(closed.gig)} for update; select pg_sleep(0.7); select public.manage_gig_lifecycle({uid(closed.gig)},{uid(closed.client)},'close_intake','moving_to_applicant_review','{{}}'); commit;"
    results = ordered_race(close_sql, submit_sql(closed, 0, uuid.uuid4()))
    assert_one_success(results, "M7D_GIG_NOT_APPLICATION_READY", "submission versus intake close has one valid winner")

    cancelled = seed_case()
    cancel_sql = f"begin; select 1 from public.gigs where id={uid(cancelled.gig)} for update; select pg_sleep(0.7); select public.manage_gig_lifecycle({uid(cancelled.gig)},{uid(cancelled.client)},'cancel','opportunity_no_longer_required','{{\"applicant_facing_explanation\":\"Cancelled\",\"closes_active_records_confirmed\":true}}'); commit;"
    results = ordered_race(cancel_sql, submit_sql(cancelled, 0, uuid.uuid4()))
    assert_one_success(results, "M7D_GIG_NOT_APPLICATION_READY", "submission versus cancellation has one valid winner")

    filled = seed_case(freelancer_count=2); run_psql(submit_sql(filled, 0, uuid.uuid4())); selected = application_id(filled)
    run_psql(f"update public.applications set stage='advanced',last_updated_at=clock_timestamp(),stage_changed_at=clock_timestamp(),stage_changed_by_actor_type='user',stage_changed_by_user_id={uid(filled.client)} where id={uid(selected)};")
    request = create_request(filled, selected)
    fill_sql = f"begin; select 1 from public.gigs where id={uid(filled.gig)} for update; select pg_sleep(0.7); select * from public.confirm_selection_request({uid(request)},{uid(filled.freelancers[0][0])}); commit;"
    results = ordered_race(fill_sql, submit_sql(filled, 1, uuid.uuid4()))
    assert_one_success(results, "M7D_GIG_NOT_APPLICATION_READY", "submission versus fill has one valid winner")

    edits = seed_case(); run_psql(submit_sql(edits, 0, uuid.uuid4())); app = application_id(edits)
    token = app_token(app); snapshot_a = literal(json.dumps(app_snapshot(1600))); snapshot_b = literal(json.dumps(app_snapshot(1700)))
    results = race(
        f"select public.create_application_version({uid(app)},{uid(edits.freelancers[0][0])},{literal(token)},{snapshot_a}::jsonb);",
        f"select public.create_application_version({uid(app)},{uid(edits.freelancers[0][0])},{literal(token)},{snapshot_b}::jsonb);",
    )
    assert_one_success(results, "M7D_STALE_APPLICATION_VERSION", "edit versus edit commits one next version")
    assert_counts(f"select count(*),max(version_number) from public.application_versions where application_id={uid(app)};",
                  "2|2", "edit race preserves sequential ordinals")

    own_request = seed_case(); run_psql(submit_sql(own_request, 0, uuid.uuid4())); app = application_id(own_request)
    request = create_request(own_request, app)
    run_psql(f"select public.create_application_version({uid(app)},{uid(own_request.freelancers[0][0])},{literal(app_token(app))},{literal(json.dumps(app_snapshot(1600)))}::jsonb);")
    assert_counts(f"select status,(select count(*) from public.application_versions where application_id={uid(app)}) from public.selection_requests where id={uid(request)};",
                  "invalidated|2", "edit with own request invalidates request and commits one version")

    other_request = seed_case(freelancer_count=2)
    run_psql(submit_sql(other_request, 0, uuid.uuid4())); run_psql(submit_sql(other_request, 1, uuid.uuid4()))
    app = application_id(other_request, 0); request = create_request(other_request, application_id(other_request, 1))
    run_psql(f"select public.create_application_version({uid(app)},{uid(other_request.freelancers[0][0])},{literal(app_token(app))},{literal(json.dumps(app_snapshot(1600)))}::jsonb);")
    assert_counts(f"select status,(select count(*) from public.application_versions where application_id={uid(app)}) from public.selection_requests where id={uid(request)};",
                  "pending|2", "edit with another applicant request remains non-blocking")

    edit_material = seed_case(); run_psql(submit_sql(edit_material, 0, uuid.uuid4())); app = application_id(edit_material)
    edit_sql = f"select public.create_application_version({uid(app)},{uid(edit_material.freelancers[0][0])},{literal(app_token(app))},{literal(json.dumps(app_snapshot(1650)))}::jsonb);"
    results = ordered_race(material_edit_sql(edit_material, 2500, delay=0.7), edit_sql)
    assert_one_success(results, "M7D_RESPONSE_TO_UPDATED_GIG_REQUIRED", "edit versus material edit preserves reviewed terms")

    changed_response = seed_case(); run_psql(submit_sql(changed_response, 0, uuid.uuid4())); app = application_id(changed_response)
    run_psql(material_edit_sql(changed_response, 2500))
    changed_response.version = uuid.UUID(run_psql(f"select current_material_gig_version_id from public.gigs where id={uid(changed_response.gig)};").stdout.strip())
    response_sql = f"select public.respond_to_application_gig_change({uid(app)},{uid(changed_response.freelancers[0][0])},'reaffirm',{literal(app_token(app))},{literal(term_token(changed_response))},null);"
    results = ordered_race(material_edit_sql(changed_response, 3000, delay=0.7), response_sql)
    assert_one_success(results, "M7D_GIG_TERMS_CHANGED_AGAIN", "changed-gig response versus second material edit has one reviewed winner")

    withdraw_edit = seed_case(); run_psql(submit_sql(withdraw_edit, 0, uuid.uuid4())); app = application_id(withdraw_edit); token = app_token(app)
    withdraw_sql = f"begin; select 1 from public.gigs where id={uid(withdraw_edit.gig)} for update; select pg_sleep(0.7); select public.withdraw_application({uid(app)},{uid(withdraw_edit.freelancers[0][0])},{literal(token)},'no_longer_available',null); commit;"
    edit_sql = f"select public.create_application_version({uid(app)},{uid(withdraw_edit.freelancers[0][0])},{literal(token)},{literal(json.dumps(app_snapshot(1800)))}::jsonb);"
    results = ordered_race(withdraw_sql, edit_sql)
    assert_one_success(results, "M7D_APPLICATION_EDIT_NOT_ALLOWED", "withdraw versus edit has one terminal winner")

    withdraw_cancel = seed_case(); run_psql(submit_sql(withdraw_cancel, 0, uuid.uuid4())); app = application_id(withdraw_cancel); token = app_token(app)
    cancel_sql = f"begin; select 1 from public.gigs where id={uid(withdraw_cancel.gig)} for update; select pg_sleep(0.7); select public.manage_gig_lifecycle({uid(withdraw_cancel.gig)},{uid(withdraw_cancel.client)},'cancel','opportunity_no_longer_required','{{\"applicant_facing_explanation\":\"Cancelled\",\"closes_active_records_confirmed\":true}}'); commit;"
    withdrawal = f"select public.withdraw_application({uid(app)},{uid(withdraw_cancel.freelancers[0][0])},{literal(token)},'no_longer_available',null);"
    results = ordered_race(cancel_sql, withdrawal)
    assert_one_success(results, "M7D_APPLICATION_WITHDRAWAL_NOT_ALLOWED", "withdraw versus cancellation has a valid terminal outcome")

    reapply = seed_case(); run_psql(submit_sql(reapply, 0, uuid.uuid4())); app = application_id(reapply)
    run_psql(f"select public.withdraw_application({uid(app)},{uid(reapply.freelancers[0][0])},{literal(app_token(app))},'no_longer_available',null);")
    run_psql(material_edit_sql(reapply, 2500))
    reapply.version = uuid.UUID(run_psql(f"select current_material_gig_version_id from public.gigs where id={uid(reapply.gig)};").stdout.strip())
    token = app_token(app); terms = term_token(reapply); snapshot = literal(json.dumps(app_snapshot(1900)))
    call = f"select public.reapply_application_after_gig_change({uid(app)},{uid(reapply.freelancers[0][0])},{literal(token)},{literal(terms)},{snapshot}::jsonb);"
    results = race(call, call)
    assert_one_success(results, "M7D_STALE_APPLICATION_VERSION", "reapply versus reapply creates one reactivation")
    assert_counts(f"select count(*) filter(where origin='gig_change_reapplication'),max(version_number) from public.application_versions where application_id={uid(app)};",
                  "1|2", "reapplication race preserves one history and one new version")

    print("Milestone 7D separate-session concurrency verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
