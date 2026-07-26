#!/usr/bin/env python3
"""Verify 7H engagement/recovery races with independent PostgreSQL sessions."""

from __future__ import annotations

import uuid

from verify_milestone_7d_concurrency import assert_counts, material_edit_sql, race, run_psql, uid
from verify_milestone_7g_concurrency import (
    errors,
    prepare,
    request_id,
    response_sql,
    send_sql,
    successes,
)


def prepare_engagement(*, applicants: int = 1):
    case, applications = prepare(freelancer_count=applicants)
    run_psql(send_sql(case, applications[0], uuid.uuid4()))
    request = request_id(applications[0])
    run_psql(response_sql(case, request, "accept", uuid.uuid4()))
    engagement = uuid.UUID(run_psql(
        "select id from public.engagements "
        f"where gig_id={uid(case.gig)} and status<>'cancelled';"
    ).stdout.strip())
    return case, applications, engagement


def transition_sql(
    engagement: uuid.UUID,
    actor: uuid.UUID,
    action: str,
    operation: uuid.UUID,
    reason: str | None = None,
) -> str:
    return (
        "select public.engagement_transition("
        f"{uid(engagement)},{uid(actor)},'{action}',"
        f"public.engagement_get({uid(engagement)},{uid(actor)})->>'action_token',"
        f"{uid(operation)},{repr(reason) if reason else 'null'},null);"
    )


def require_one(results, markers: tuple[str, ...], label: str) -> None:
    if successes(results) != 1 or not any(marker in errors(results) for marker in markers):
        raise AssertionError(f"{label}: {[result.returncode for result in results]}; {errors(results)}")
    print(f"PASS {label}")


def main() -> int:
    start_case, _, start_engagement = prepare_engagement()
    results = race(
        transition_sql(start_engagement, start_case.client, "start_work", uuid.uuid4()),
        transition_sql(
            start_engagement, start_case.freelancers[0][0], "start_work", uuid.uuid4()
        ),
    )
    require_one(results, ("M7H_STALE_ENGAGEMENT_ACTION",), "1. competing work-start transitions")
    assert_counts(
        f"select lifecycle_version||'|'||(select count(*) from public.marketplace_events "
        f"where engagement_id={uid(start_engagement)} and event_type='engagement_work_started') "
        f"from public.engagements where id={uid(start_engagement)};",
        "2|1",
        "1. one work-start projection and event survive",
    )

    completion_case, _, completion_engagement = prepare_engagement()
    run_psql(transition_sql(
        completion_engagement, completion_case.client, "start_work", uuid.uuid4()
    ))
    run_psql(transition_sql(
        completion_engagement, completion_case.client, "request_completion", uuid.uuid4()
    ))
    results = race(
        transition_sql(
            completion_engagement, completion_case.freelancers[0][0],
            "confirm_completion", uuid.uuid4(),
        ),
        transition_sql(
            completion_engagement, completion_case.freelancers[0][0],
            "reject_completion", uuid.uuid4(),
        ),
    )
    require_one(results, ("M7H_STALE_ENGAGEMENT_ACTION",), "2. completion confirm versus reject")
    assert_counts(
        f"select count(*) from public.marketplace_events where engagement_id={uid(completion_engagement)} "
        "and event_type in('engagement_completion_confirmed','engagement_completion_rejected');",
        "1",
        "2. completion resolution event is singular",
    )

    cancel_case, _, cancel_engagement = prepare_engagement()
    run_psql(transition_sql(
        cancel_engagement, cancel_case.client, "request_cancellation",
        uuid.uuid4(), "mutual_decision",
    ))
    results = race(
        transition_sql(
            cancel_engagement, cancel_case.client, "withdraw_cancellation", uuid.uuid4()
        ),
        transition_sql(
            cancel_engagement, cancel_case.freelancers[0][0],
            "acknowledge_cancellation", uuid.uuid4(),
        ),
    )
    require_one(results, ("M7H_STALE_ENGAGEMENT_ACTION",), "3. cancellation withdraw versus acknowledge")
    assert_counts(
        f"select count(*) from public.marketplace_events where engagement_id={uid(cancel_engagement)} "
        "and event_type in('engagement_cancellation_withdrawn','engagement_cancellation_acknowledged');",
        "1",
        "3. cancellation resolution event is singular",
    )

    recovery_case, applications, recovery_engagement = prepare_engagement(applicants=2)
    run_psql(transition_sql(
        recovery_engagement, recovery_case.client, "request_cancellation",
        uuid.uuid4(), "business_needs_changed",
    ))
    run_psql(transition_sql(
        recovery_engagement, recovery_case.freelancers[0][0],
        "acknowledge_cancellation", uuid.uuid4(),
    ))
    reopen = (
        "select public.engagement_reopen_gig("
        f"{uid(recovery_engagement)},{uid(recovery_case.client)},"
        f"public.engagement_get({uid(recovery_engagement)},{uid(recovery_case.client)})->>'reopening_token',"
    )
    results = race(
        reopen + f"{uid(uuid.uuid4())});",
        reopen + f"{uid(uuid.uuid4())});",
    )
    require_one(
        results,
        ("M7H_STALE_REOPENING_ACTION", "M7H_GIG_REOPEN_NOT_ALLOWED"),
        "4. duplicate failed-engagement reopening",
    )
    assert_counts(
        f"select count(*) from public.engagement_reopenings where engagement_id={uid(recovery_engagement)};",
        "1",
        "4. one reopening authority survives",
    )

    other_application = applications[1]
    invite = (
        "select public.reconsideration_create_invitation("
        f"{uid(other_application)},{uid(recovery_case.client)},"
        f"public.reconsideration_get_context({uid(other_application)},{uid(recovery_case.client)})->>'action_token',"
    )
    results = race(
        invite + f"{uid(uuid.uuid4())},'failed_engagement_reopened',null);",
        invite + f"{uid(uuid.uuid4())},'failed_engagement_reopened',null);",
    )
    require_one(
        results,
        ("M7H_STALE_RECONSIDERATION_ACTION", "M7H_RECONSIDERATION_NOT_ALLOWED"),
        "5. competing reconsideration invitations",
    )
    assert_counts(
        f"select count(*) from public.application_reconsideration_invitations "
        f"where application_id={uid(other_application)} and status='pending';",
        "1",
        "5. one pending invitation survives",
    )
    invitation_id = uuid.UUID(run_psql(
        "select id from public.application_reconsideration_invitations "
        f"where application_id={uid(other_application)} and status='pending';"
    ).stdout.strip())
    response = (
        "select public.reconsideration_respond_invitation("
        f"{uid(invitation_id)},{uid(recovery_case.freelancers[1][0])},'reaffirm',"
        f"public.reconsideration_get_invitation({uid(invitation_id)},"
        f"{uid(recovery_case.freelancers[1][0])})->>'action_token',"
        f"{uid(uuid.uuid4())},null);"
    )
    results = race(response, material_edit_sql(recovery_case, 2600))
    if successes(results) not in {1, 2}:
        raise AssertionError(
            f"6. invitation response versus material edit: "
            f"{[result.returncode for result in results]}; {errors(results)}"
        )
    print("PASS 6. invitation response versus material gig edit serializes")
    assert_counts(
        f"select count(*) from public.application_reconsideration_invitations "
        f"where id={uid(invitation_id)} and status='pending';",
        "0",
        "6. material edit/response leaves no stale pending invitation",
    )
    print("Milestone 7H independent-session concurrency verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
