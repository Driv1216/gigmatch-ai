#!/usr/bin/env python3
"""Verify Milestone 7G serial outcomes with independent PostgreSQL sessions."""

from __future__ import annotations

import json
import threading
import time
import uuid

from verify_milestone_7d_concurrency import (
    app_snapshot,
    app_token,
    application_id,
    assert_counts,
    gig_snapshot,
    literal,
    material_edit_sql,
    race,
    run_psql,
    seed_case,
    submit_sql,
    uid,
)
from verify_milestone_7e_concurrency import transition_sql
from verify_milestone_7f_concurrency import create_revision_sql


def prepare(*, freelancer_count: int = 1, send: bool = False):
    case = seed_case(freelancer_count=freelancer_count)
    applications: list[uuid.UUID] = []
    for index in range(freelancer_count):
        run_psql(submit_sql(case, index, uuid.uuid4(), 1400 + index * 100))
        application = application_id(case, index)
        applications.append(application)
        if index == 0:
            run_psql(transition_sql(case, application, "advance"))
    if send:
        run_psql(send_sql(case, applications[0], uuid.uuid4()))
    return case, applications


def send_sql(case, application: uuid.UUID, operation_id: uuid.UUID) -> str:
    return (
        "select public.selection_send_request("
        f"{uid(application)},{uid(case.client)},48,"
        f"public.selection_get_context({uid(application)},{uid(case.client)})->>'send_token',"
        f"{uid(operation_id)},false);"
    )


def request_id(application: uuid.UUID) -> uuid.UUID:
    value = run_psql(
        "select id from public.selection_requests "
        f"where application_id={uid(application)} order by created_at desc,id desc limit 1;"
    ).stdout.strip()
    return uuid.UUID(value)


def response_sql(
    case,
    request: uuid.UUID,
    action: str,
    operation_id: uuid.UUID,
) -> str:
    user = case.freelancers[0][0]
    exact = "true" if action == "accept" else "false"
    reason = "'no_longer_available'" if action == "decline_withdraw" else "null"
    categories = "array['scope','timeline']::text[]" if action == "request_revised_terms" else "null"
    return (
        "select public.selection_respond_request("
        f"{uid(request)},{uid(user)},{literal(action)},"
        f"public.selection_get_request({uid(request)},{uid(user)})->>'response_token',"
        f"{uid(operation_id)},{exact},{reason},null,{categories});"
    )


def cancel_request_sql(case, request: uuid.UUID, operation_id: uuid.UUID) -> str:
    return (
        "select public.selection_cancel_request("
        f"{uid(request)},{uid(case.client)},"
        f"public.selection_get_request({uid(request)},{uid(case.client)})->>'management_token',"
        f"{uid(operation_id)},'client_withdrew_request',null);"
    )


def edit_sql(case, application: uuid.UUID, total: int = 1700) -> str:
    return (
        "select public.create_application_version("
        f"{uid(application)},{uid(case.freelancers[0][0])},{literal(app_token(application))},"
        f"{literal(json.dumps(app_snapshot(total)))}::jsonb);"
    )


def minor_edit_sql(case) -> str:
    return f"""
      with candidate as (
        select jsonb_set(terms_snapshot,'{{title}}','"  concurrency   GIG  "')
        from public.gig_versions where id={uid(case.version)}
      ), preview as (
        select public.preview_gig_edit(
          {uid(case.gig)},{uid(case.client)},{uid(case.version)},
          (select * from candidate)
        ) value
      )
      select public.manage_gig_edit(
        {uid(case.gig)},{uid(case.client)},{uid(case.version)},
        (select * from candidate),false,(select value->>'preview_fingerprint' from preview)
      );
    """


def pause_sql(case) -> str:
    return (
        "select public.manage_gig_lifecycle("
        f"{uid(case.gig)},{uid(case.client)},'pause','business_delay','{{}}'::jsonb);"
    )


def intake_close_sql(case) -> str:
    return (
        "select public.manage_gig_lifecycle("
        f"{uid(case.gig)},{uid(case.client)},'close_intake',"
        "'moving_to_applicant_review','{}'::jsonb);"
    )


def gig_cancel_sql(case) -> str:
    detail = literal(json.dumps({
        "applicant_facing_explanation": "The opportunity was cancelled.",
        "closes_active_records_confirmed": True,
    }))
    return (
        "select public.manage_gig_lifecycle("
        f"{uid(case.gig)},{uid(case.client)},'cancel','opportunity_no_longer_required',"
        f"{detail}::jsonb);"
    )


def successes(results) -> int:
    return sum(result.returncode == 0 for result in results)


def errors(results) -> str:
    return " | ".join(
        result.stderr + result.stdout for result in results if result.returncode != 0
    )


def require_success_range(results, allowed: set[int], label: str) -> None:
    count = successes(results)
    if count not in allowed:
        raise AssertionError(f"{label}: successes={count}; errors={errors(results)}")
    print(f"PASS {label}")


def require_one(results, markers: tuple[str, ...], label: str) -> None:
    if successes(results) != 1 or not any(marker in errors(results) for marker in markers):
        raise AssertionError(f"{label}: results={[r.returncode for r in results]}; {errors(results)}")
    print(f"PASS {label}")


def assert_no_stale_pending(case, label: str) -> None:
    assert_counts(
        "select count(*) from public.selection_requests sr "
        "join public.applications a on a.id=sr.application_id "
        "join public.gigs g on g.id=sr.gig_id "
        f"where sr.gig_id={uid(case.gig)} and sr.status='pending' "
        "and (sr.application_version_id<>a.current_version_id "
        "or sr.gig_version_id<>g.current_material_gig_version_id);",
        "0",
        label,
    )


def expiry_boundary(action: str, ordinal: int) -> None:
    case, applications = prepare()
    application = applications[0]
    request = uuid.uuid4()
    run_psql(
        "insert into public.selection_requests("
        "id,gig_id,application_id,application_version_id,gig_version_id,"
        "created_by_user_id,created_at,expires_at) "
        f"select {uid(request)},a.gig_id,a.id,a.current_version_id,av.gig_version_id,"
        f"{uid(case.client)},clock_timestamp(),clock_timestamp()+interval '0.8 seconds' "
        "from public.applications a join public.application_versions av "
        f"on av.id=a.current_version_id where a.id={uid(application)};"
    )
    blocker = (
        f"begin; select 1 from public.gigs where id={uid(case.gig)} for update;"
        "select pg_sleep(1.1); commit;"
    )
    thread = threading.Thread(target=lambda: run_psql(blocker))
    thread.start()
    time.sleep(0.15)
    result = run_psql(response_sql(case, request, action, uuid.uuid4()), check=False)
    thread.join()
    if result.returncode != 0 or '"status": "expired"' not in result.stdout:
        raise AssertionError(
            f"{ordinal}. {action} expiry boundary did not project authoritative expiry: "
            f"{result.stderr}{result.stdout}"
        )
    assert_counts(
        "select status||'|'||(select count(*) from public.marketplace_events "
        f"where selection_request_id={uid(request)} and event_type='selection_request_expired') "
        f"from public.selection_requests where id={uid(request)};",
        "expired|1",
        f"{ordinal}. {action} versus expiry has one expiry projection/event",
    )


def main() -> int:
    competing, applications = prepare(freelancer_count=2)
    run_psql(transition_sql(competing, applications[1], "advance"))
    results = race(
        send_sql(competing, applications[0], uuid.uuid4()),
        send_sql(competing, applications[1], uuid.uuid4()),
    )
    require_one(
        results,
        ("M7G_STALE_SELECTION_ACTION", "M7G_SELECTION_REQUEST_ALREADY_ACTIVE"),
        "1. two applicants compete for one active request",
    )
    assert_counts(
        f"select count(*) from public.selection_requests where gig_id={uid(competing.gig)} and status='pending';",
        "1",
        "1. exactly one pending request survives",
    )

    edit_case, apps = prepare()
    results = race(send_sql(edit_case, apps[0], uuid.uuid4()), edit_sql(edit_case, apps[0]))
    require_success_range(results, {1, 2}, "2. send versus application edit serializes")
    assert_no_stale_pending(edit_case, "2. no stale effective request survives application edit")

    material_case, apps = prepare()
    results = race(
        send_sql(material_case, apps[0], uuid.uuid4()),
        material_edit_sql(material_case, 2500),
    )
    require_success_range(results, {1, 2}, "3. send versus material edit serializes")
    assert_no_stale_pending(material_case, "3. material edit leaves no stale pending request")

    minor_case, apps = prepare()
    results = race(send_sql(minor_case, apps[0], uuid.uuid4()), minor_edit_sql(minor_case))
    require_success_range(results, {2}, "4. send and minor correction both succeed")
    assert_counts(
        "select count(*) from public.selection_requests sr join public.gigs g on g.id=sr.gig_id "
        f"where sr.gig_id={uid(minor_case.gig)} and sr.status='pending' "
        "and sr.gig_version_id=g.current_material_gig_version_id;",
        "1",
        "4. minor correction preserves exact material binding",
    )

    revision_case, apps = prepare()
    results = race(
        send_sql(revision_case, apps[0], uuid.uuid4()),
        create_revision_sql(revision_case, apps[0]),
    )
    require_one(
        results,
        ("M7G_REVISION_REQUEST_BLOCKS_SELECTION", "M7F_PENDING_SELECTION_BLOCKS_REVISION",
         "M7G_STALE_SELECTION_ACTION"),
        "5. send versus revision creation has one winner",
    )

    pause_case, apps = prepare()
    results = race(send_sql(pause_case, apps[0], uuid.uuid4()), pause_sql(pause_case))
    require_one(
        results,
        ("M7G_SELECTION_ACTION_NOT_ALLOWED", "M7CB_PENDING_SELECTION_BLOCKS_PAUSE",
         "M7G_STALE_SELECTION_ACTION"),
        "6. send versus pause has one valid winner",
    )

    cancel_gig_case, apps = prepare()
    results = race(
        send_sql(cancel_gig_case, apps[0], uuid.uuid4()),
        gig_cancel_sql(cancel_gig_case),
    )
    require_success_range(results, {1, 2}, "7. send versus gig cancellation serializes")
    assert_counts(
        "select opportunity_lifecycle||'|'||(select count(*) from public.selection_requests "
        f"where gig_id={uid(cancel_gig_case.gig)} and status='pending') "
        f"from public.gigs where id={uid(cancel_gig_case.gig)};",
        "cancelled|0",
        "7. cancellation leaves no effective request",
    )

    intake_case, apps = prepare()
    results = race(
        send_sql(intake_case, apps[0], uuid.uuid4()),
        intake_close_sql(intake_case),
    )
    require_success_range(results, {2}, "8. send and intake close both succeed")
    assert_counts(
        "select application_intake||'|'||(select count(*) from public.selection_requests "
        f"where gig_id={uid(intake_case.gig)} and status='pending') "
        f"from public.gigs where id={uid(intake_case.gig)};",
        "closed|1",
        "8. closed intake retains the formal request",
    )

    for index, action in enumerate(
        ("accept", "decline_remain_interested", "decline_withdraw", "request_revised_terms"),
        start=9,
    ):
        expiry_boundary(action, index)

    accept_edit, apps = prepare(send=True)
    request = request_id(apps[0])
    results = race(
        response_sql(accept_edit, request, "accept", uuid.uuid4()),
        edit_sql(accept_edit, apps[0]),
    )
    require_success_range(results, {1}, "13. accept versus application edit has one winner")
    assert_no_stale_pending(accept_edit, "13. accept/edit leaves no impossible pending state")

    accept_material, apps = prepare(send=True)
    request = request_id(apps[0])
    results = race(
        response_sql(accept_material, request, "accept", uuid.uuid4()),
        material_edit_sql(accept_material, 2600),
    )
    require_success_range(results, {1}, "14. accept versus material edit has one winner")
    assert_no_stale_pending(accept_material, "14. accept/material leaves no stale request")

    accept_minor, apps = prepare(send=True)
    request = request_id(apps[0])
    results = race(
        response_sql(accept_minor, request, "accept", uuid.uuid4()),
        minor_edit_sql(accept_minor),
    )
    require_success_range(
        results, {1, 2},
        "15. accept/minor correction preserves the valid ordering around fill",
    )
    assert_counts(
        f"select count(*) from public.engagements where gig_id={uid(accept_minor.gig)};",
        "1",
        "15. minor correction race still creates one engagement",
    )

    accept_cancel, apps = prepare(send=True)
    request = request_id(apps[0])
    results = race(
        response_sql(accept_cancel, request, "accept", uuid.uuid4()),
        cancel_request_sql(accept_cancel, request, uuid.uuid4()),
    )
    require_one(
        results,
        ("M7G_SELECTION_RESPONSE_ALREADY_RESOLVED", "M7G_SELECTION_REQUEST_NOT_PENDING",
         "M7G_STALE_SELECTION_MANAGEMENT"),
        "16. accept versus request cancellation has one terminal winner",
    )

    accept_pause, apps = prepare(send=True)
    request = request_id(apps[0])
    results = race(
        response_sql(accept_pause, request, "accept", uuid.uuid4()),
        pause_sql(accept_pause),
    )
    require_one(
        results,
        ("M7CB_PENDING_SELECTION_BLOCKS_PAUSE", "M7CB_INVALID_GIG_TRANSITION"),
        "17. accept versus pause preserves one valid serial outcome",
    )

    for ordinal, action in enumerate(
        ("decline_remain_interested", "decline_withdraw", "request_revised_terms"),
        start=18,
    ):
        case, apps = prepare(send=True)
        request = request_id(apps[0])
        results = race(
            response_sql(case, request, "accept", uuid.uuid4()),
            response_sql(case, request, action, uuid.uuid4()),
        )
        require_one(
            results,
            ("M7G_SELECTION_RESPONSE_ALREADY_RESOLVED",),
            f"{ordinal}. accept versus {action} has one terminal response",
        )
        assert_counts(
            f"select count(*) from public.engagements where gig_id={uid(case.gig)};",
            "1" if run_psql(
                f"select status from public.selection_requests where id={uid(request)};"
            ).stdout.strip() == "accepted" else "0",
            f"{ordinal}. engagement existence matches terminal request",
        )

    replay_case, apps = prepare(send=True)
    request = request_id(apps[0])
    key = uuid.uuid4()
    sql = response_sql(replay_case, request, "accept", key)
    results = race(sql, sql)
    require_success_range(results, {2}, "21. same-key concurrent acceptance replays")
    assert_counts(
        f"select count(*) from public.engagements where gig_id={uid(replay_case.gig)};",
        "1",
        "21. same-key retry creates one engagement",
    )

    second_case, apps = prepare(send=True)
    request = request_id(apps[0])
    results = race(
        response_sql(second_case, request, "accept", uuid.uuid4()),
        response_sql(second_case, request, "accept", uuid.uuid4()),
    )
    require_one(
        results,
        ("M7G_SELECTION_RESPONSE_ALREADY_RESOLVED",),
        "22. different-key double acceptance resolves once",
    )
    assert_counts(
        f"select count(*) from public.engagements where gig_id={uid(second_case.gig)};",
        "1",
        "22. different-key race creates one engagement",
    )

    cancel_edit, apps = prepare(send=True)
    request = request_id(apps[0])
    results = race(
        cancel_request_sql(cancel_edit, request, uuid.uuid4()),
        edit_sql(cancel_edit, apps[0]),
    )
    require_success_range(results, {1, 2}, "23. cancellation versus application invalidation serializes")
    assert_no_stale_pending(cancel_edit, "23. cancellation/edit leaves no stale pending request")

    cancel_material, apps = prepare(send=True)
    request = request_id(apps[0])
    results = race(
        cancel_request_sql(cancel_material, request, uuid.uuid4()),
        material_edit_sql(cancel_material, 2700),
    )
    require_success_range(results, {1, 2}, "24. cancellation versus material invalidation serializes")
    assert_no_stale_pending(cancel_material, "24. cancellation/material leaves no stale request")

    revise_edit, apps = prepare(send=True)
    request = request_id(apps[0])
    results = race(
        response_sql(revise_edit, request, "request_revised_terms", uuid.uuid4()),
        edit_sql(revise_edit, apps[0]),
    )
    require_success_range(results, {1}, "25. revised terms versus application edit has one winner")
    assert_no_stale_pending(revise_edit, "25. revision/edit leaves no stale request")

    fanout, apps = prepare(freelancer_count=4, send=True)
    request = request_id(apps[0])
    results = race(
        response_sql(fanout, request, "accept", uuid.uuid4()),
        response_sql(fanout, request, "accept", uuid.uuid4()),
    )
    require_one(
        results,
        ("M7G_SELECTION_RESPONSE_ALREADY_RESOLVED",),
        "26. fan-out acceptance uses deterministic locks",
    )
    assert_counts(
        "select count(*)||'|'||"
        "(select count(*) from public.applications where "
        f"gig_id={uid(fanout.gig)} and stage='not_selected')||'|'||"
        "(select count(*) from public.applications where "
        f"gig_id={uid(fanout.gig)} and stage='confirmed') "
        f"from public.engagements where gig_id={uid(fanout.gig)};",
        "1|3|1",
        "26. fan-out commits one engagement, one winner, and exact automatic closure",
    )

    print("Milestone 7G separate-session concurrency verification complete (26 race families).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
