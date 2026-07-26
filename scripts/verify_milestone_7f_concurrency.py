#!/usr/bin/env python3
"""Verify Milestone 7F races in independent PostgreSQL sessions."""

from __future__ import annotations

import json
import uuid

from verify_milestone_7d_concurrency import (
    app_snapshot,
    app_token,
    application_id,
    assert_counts,
    literal,
    material_edit_sql,
    race,
    run_psql,
    seed_case,
    submit_sql,
    uid,
)
from verify_milestone_7e_concurrency import decision_token, transition_sql, withdraw_sql


def prepare(*, advanced: bool = False):
    case = seed_case()
    run_psql(submit_sql(case, 0, uuid.uuid4()))
    application = application_id(case)
    if advanced:
        run_psql(transition_sql(case, application, "advance"))
    return case, application


def send_sql(
    case,
    application: uuid.UUID,
    operation: str,
    body: str,
    *,
    request_id: uuid.UUID | None = None,
    target: uuid.UUID | None = None,
    actor: uuid.UUID | None = None,
    burst: int = 8,
) -> str:
    actor = actor or case.client
    topic = "'timeline'" if operation in ("initial_question", "question", "clarification") else "null"
    decline = "'insufficient_context'" if operation == "decline" else "null"
    return (
        "select public.qa_write_message("
        f"{uid(application)},{uid(actor)},{uid(request_id or uuid.uuid4())},"
        f"{literal(operation)},{topic},null,{literal(body) if body else 'null'},"
        f"{uid(target) if target else 'null'},{decline},null,{burst},10,40);"
    )


def message_id(application: uuid.UUID, sequence: int) -> uuid.UUID:
    value = run_psql(
        "select id from public.application_qa_messages "
        f"where application_id={uid(application)} and sequence_number={sequence};"
    ).stdout.strip()
    return uuid.UUID(value)


def create_revision_sql(case, application: uuid.UUID, *, request_id: uuid.UUID | None = None) -> str:
    current, material = run_psql(
        "select a.current_version_id||'|'||g.current_material_gig_version_id "
        "from public.applications a join public.gigs g on g.id=a.gig_id "
        f"where a.id={uid(application)};"
    ).stdout.strip().split("|")
    return (
        "select public.revision_create_request("
        f"{uid(application)},{uid(case.client)},{uid(request_id or uuid.uuid4())},"
        f"'revise_timeline',null,{uid(uuid.UUID(current))},{uid(uuid.UUID(material))},3);"
    )


def open_revision(application: uuid.UUID) -> uuid.UUID:
    value = run_psql(
        "select id from public.application_revision_requests "
        f"where application_id={uid(application)} and status='open';"
    ).stdout.strip()
    return uuid.UUID(value)


def fulfil_sql(case, application: uuid.UUID, revision: uuid.UUID) -> str:
    return (
        "select public.revision_submit_update("
        f"{uid(application)},{uid(revision)},{uid(case.freelancers[0][0])},{uid(uuid.uuid4())},"
        f"{literal(app_token(application))},{literal(json.dumps(app_snapshot(1650)))}::jsonb);"
    )


def successes(results) -> int:
    return sum(result.returncode == 0 for result in results)


def require_marker(results, marker: str, label: str, *, expected_successes: int) -> None:
    errors = [result.stderr + result.stdout for result in results if result.returncode != 0]
    if successes(results) != expected_successes or (marker and not any(marker in value for value in errors)):
        raise AssertionError(
            f"{label}: results={[result.returncode for result in results]} errors={errors}"
        )
    print(f"PASS {label}")


def main() -> int:
    one_slot, app = prepare()
    run_psql(send_sql(one_slot, app, "initial_question", "Please confirm the first timeline."))
    results = race(
        send_sql(one_slot, app, "initial_question", "Please confirm the second timeline."),
        send_sql(one_slot, app, "initial_question", "Please confirm the alternate timeline."),
    )
    require_marker(results, "M7F_INITIAL_QUESTION_LIMIT_REACHED",
                   "1. final initial-question slot", expected_successes=1)
    assert_counts(
        f"select count(*),max(sequence_number) from public.application_qa_messages where application_id={uid(app)};",
        "2|2", "1. final initial slot has two unique committed messages",
    )

    zero, app = prepare()
    results = race(
        send_sql(zero, app, "initial_question", "Please confirm the first timeline."),
        send_sql(zero, app, "initial_question", "Please confirm the second timeline."),
    )
    if successes(results) != 2:
        raise AssertionError("2. both initial slots should serialize successfully")
    assert_counts(
        f"select count(*),count(distinct sequence_number) from public.application_qa_messages where application_id={uid(app)};",
        "2|2", "2. zero-used race fills both unique slots",
    )

    duplicate, app = prepare()
    request = uuid.uuid4()
    sql = send_sql(duplicate, app, "initial_question", "Please confirm the timeline.",
                   request_id=request)
    results = race(sql, sql)
    if successes(results) != 2:
        raise AssertionError("3. exact replay should return successfully in both sessions")
    assert_counts(
        f"select count(*),(select initial_client_turn_count from public.application_qa_threads where application_id={uid(app)}) from public.application_qa_messages where application_id={uid(app)};",
        "1|1", "3. exact duplicate stores one message and allowance use",
    )

    conflict, app = prepare()
    request = uuid.uuid4()
    results = race(
        send_sql(conflict, app, "initial_question", "Please confirm the timeline.",
                 request_id=request),
        send_sql(conflict, app, "initial_question", "Please confirm availability.",
                 request_id=request),
    )
    require_marker(results, "M7F_IDEMPOTENCY_CONFLICT",
                   "4. same key different content conflicts", expected_successes=1)

    stopped, app = prepare()
    run_psql(send_sql(stopped, app, "initial_question", "Please confirm the first timeline."))
    results = race(
        send_sql(stopped, app, "initial_question", "Please confirm the second timeline."),
        f"select public.qa_stop_pre_advancement({uid(app)},{uid(stopped.freelancers[0][0])},{uid(uuid.uuid4())});",
    )
    if successes(results) not in (1, 2):
        raise AssertionError("5. stop/question race had no valid serial outcome")
    assert_counts(
        "select (pre_advance_stopped_at is not null)||'|'||"
        "(initial_client_turn_count between 1 and 2) from public.application_qa_threads "
        f"where application_id={uid(app)};",
        "true|true", "5. stop/question final projection is valid",
    )

    advancing, app = prepare()
    question = send_sql(advancing, app, "initial_question", "Please confirm the timeline.")
    advance = transition_sql(advancing, app, "advance", token=decision_token(app))
    results = race(question, advance)
    if successes(results) not in (1, 2):
        raise AssertionError("6. question/advance race had no valid serial outcome")
    assert_counts(
        "select stage||'|'||(select full_discussion_unlocked_at is not null "
        f"from public.application_qa_threads where application_id={uid(app)}) "
        f"from public.applications where id={uid(app)};",
        "advanced|true", "6. advancement permanently unlocks discussion",
    )

    returning, app = prepare(advanced=True)
    results = race(
        send_sql(returning, app, "question", "Please confirm the advanced timeline."),
        transition_sql(returning, app, "return", token=decision_token(app)),
    )
    if successes(results) not in (1, 2):
        raise AssertionError("7. message/return race had no valid serial outcome")
    assert_counts(
        f"select stage from public.applications where id={uid(app)};",
        "under_review", "7. returned application is read-only final state",
    )

    withdrawing, app = prepare(advanced=True)
    results = race(
        send_sql(withdrawing, app, "question", "Please confirm the advanced timeline."),
        withdraw_sql(withdrawing, app),
    )
    if successes(results) not in (1, 2):
        raise AssertionError("8. message/withdrawal race had no valid serial outcome")
    assert_counts(
        f"select stage from public.applications where id={uid(app)};",
        "withdrawn", "8. terminal withdrawal remains authoritative",
    )

    response, app = prepare()
    run_psql(send_sql(response, app, "initial_question", "Please confirm the timeline."))
    target = message_id(app, 1)
    results = race(
        send_sql(response, app, "answer", "The timeline is four weeks.",
                 target=target, actor=response.freelancers[0][0]),
        send_sql(response, app, "decline", "", target=target,
                 actor=response.freelancers[0][0]),
    )
    require_marker(results, "M7F_QUESTION_ALREADY_RESOLVED",
                   "9. answer versus decline has one resolution", expected_successes=1)

    double_answer, app = prepare()
    run_psql(send_sql(double_answer, app, "initial_question", "Please confirm the timeline."))
    target = message_id(app, 1)
    results = race(
        send_sql(double_answer, app, "answer", "The timeline is four weeks.",
                 target=target, actor=double_answer.freelancers[0][0]),
        send_sql(double_answer, app, "answer", "The timeline is five weeks.",
                 target=target, actor=double_answer.freelancers[0][0]),
    )
    require_marker(results, "M7F_QUESTION_ALREADY_RESOLVED",
                   "10. double answer has one primary response", expected_successes=1)

    limited, app = prepare(advanced=True)
    for index in range(7):
        run_psql(send_sql(limited, app, "clarification",
                          f"Structured clarification number {index + 1}."))
    results = race(
        send_sql(limited, app, "clarification", "Final permitted clarification A."),
        send_sql(limited, app, "clarification", "Final permitted clarification B."),
    )
    require_marker(results, "M7F_QA_RATE_LIMITED",
                   "11. final rate slot is multi-session safe", expected_successes=1)

    revision, app = prepare(advanced=True)
    results = race(create_revision_sql(revision, app), create_revision_sql(revision, app))
    require_marker(results, "M7F_REVISION_ALREADY_OPEN",
                   "12. concurrent revision creation leaves one open", expected_successes=1)
    assert_counts(
        f"select count(*) from public.application_revision_requests where application_id={uid(app)} and status='open';",
        "1", "12. exactly one revision remains open",
    )

    edit_race, app = prepare(advanced=True)
    create = create_revision_sql(edit_race, app)
    edit = (
        "select public.create_application_version("
        f"{uid(app)},{uid(edit_race.freelancers[0][0])},{literal(app_token(app))},"
        f"{literal(json.dumps(app_snapshot(1600)))}::jsonb);"
    )
    results = race(create, edit)
    if successes(results) not in (1, 2):
        raise AssertionError("13. revision/edit race had no serial outcome")
    assert_counts(
        "select count(*) from public.application_revision_requests rr "
        "join public.applications a on a.id=rr.application_id "
        f"where rr.application_id={uid(app)} and rr.status='open' "
        "and rr.requested_application_version_id<>a.current_version_id;",
        "0", "13. no stale open revision survives ordinary edit",
    )

    fulfil_race, app = prepare(advanced=True)
    run_psql(create_revision_sql(fulfil_race, app))
    revision_id = open_revision(app)
    token = app_token(app)
    results = race(
        fulfil_sql(fulfil_race, app, revision_id),
        "select public.create_application_version("
        f"{uid(app)},{uid(fulfil_race.freelancers[0][0])},{literal(token)},"
        f"{literal(json.dumps(app_snapshot(1700)))}::jsonb);",
    )
    require_marker(results, "M7", "14. fulfilment versus edit creates one next version",
                   expected_successes=1)
    assert_counts(
        f"select count(*),max(version_number) from public.application_versions where application_id={uid(app)};",
        "2|2", "14. version chronology remains singular",
    )

    material_race, app = prepare(advanced=True)
    run_psql(create_revision_sql(material_race, app))
    revision_id = open_revision(app)
    results = race(
        fulfil_sql(material_race, app, revision_id),
        material_edit_sql(material_race, 2500),
    )
    if successes(results) not in (1, 2):
        raise AssertionError("15. fulfilment/material edit race had no serial outcome")
    assert_counts(
        "select count(*) from public.application_revision_requests rr "
        "join public.applications a on a.id=rr.application_id "
        "join public.application_versions av on av.id=rr.response_application_version_id "
        f"where rr.application_id={uid(app)} and rr.status='fulfilled' "
        "and av.id<>a.current_version_id;",
        "0", "15. fulfilled request never links a non-current response",
    )

    stage_race, app = prepare(advanced=True)
    run_psql(create_revision_sql(stage_race, app))
    revision_id = open_revision(app)
    results = race(
        fulfil_sql(stage_race, app, revision_id),
        transition_sql(stage_race, app, "return", token=decision_token(app)),
    )
    if successes(results) not in (1, 2):
        raise AssertionError("16. revision response/stage race had no serial outcome")
    assert_counts(
        "select count(*) from public.application_revision_requests rr "
        "join public.applications a on a.id=rr.application_id "
        f"where rr.application_id={uid(app)} and rr.status='open' and a.stage<>'advanced';",
        "0", "16. incompatible final stage has no actionable revision",
    )

    print("Milestone 7F separate-session concurrency verification complete (16 race families).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
