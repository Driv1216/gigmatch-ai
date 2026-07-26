#!/usr/bin/env python3
"""Verify Milestone 7E review races in independent PostgreSQL sessions."""

from __future__ import annotations

import json
import uuid

from verify_milestone_7d_concurrency import (
    Case,
    app_snapshot,
    app_token,
    application_id,
    assert_counts,
    literal,
    race,
    run_psql,
    seed_case,
    submit_sql,
    uid,
)


def prepare(count: int = 1) -> tuple[Case, list[uuid.UUID]]:
    case = seed_case(freelancer_count=count)
    for index in range(count):
        run_psql(submit_sql(case, index, uuid.uuid4()))
    return case, [application_id(case, index) for index in range(count)]


def shortlist_token(application: uuid.UUID) -> str:
    return run_psql(f"""
      select private.shortlist_review_action_token(
        a.id,a.stage,coalesce(ars.review_state_version,0),
        g.opportunity_lifecycle,g.application_intake,g.operational_state)
      from public.applications a
      join public.gigs g on g.id=a.gig_id
      left join public.application_review_states ars on ars.application_id=a.id
      where a.id={uid(application)};
    """).stdout.strip()


def decision_token(application: uuid.UUID) -> str:
    return run_psql(f"""
      select private.decision_review_action_token(
        a.id,a.stage,a.current_version_id,a.stage_changed_at,g.current_material_gig_version_id,
        (select sr.id from public.selection_requests sr
         where sr.application_id=a.id and sr.status='pending' and sr.expires_at>clock_timestamp()
         order by sr.id limit 1),
        g.opportunity_lifecycle,g.application_intake,g.operational_state)
      from public.applications a join public.gigs g on g.id=a.gig_id
      where a.id={uid(application)};
    """).stdout.strip()


def shortlist_sql(case: Case, application: uuid.UUID, capacity: int = 5) -> str:
    return (
        "select public.review_set_shortlist("
        f"{uid(application)},{uid(case.client)},true,{literal(shortlist_token(application))},{capacity});"
    )


def transition_sql(
    case: Case,
    application: uuid.UUID,
    action: str,
    *,
    token: str | None = None,
    capacity: int = 5,
    decision: dict[str, object] | None = None,
) -> str:
    return (
        "select public.review_transition_application("
        f"{uid(application)},{uid(case.client)},{literal(action)},"
        f"{literal(token or decision_token(application))},{capacity},"
        f"{literal(json.dumps(decision or {}))}::jsonb);"
    )


def withdraw_sql(case: Case, application: uuid.UUID, token: str | None = None) -> str:
    return (
        "select public.withdraw_application("
        f"{uid(application)},{uid(case.freelancers[0][0])},"
        f"{literal(token or app_token(application))},'no_longer_available',null);"
    )


def edit_sql(case: Case, application: uuid.UUID, token: str | None = None) -> str:
    return (
        "select public.create_application_version("
        f"{uid(application)},{uid(case.freelancers[0][0])},"
        f"{literal(token or app_token(application))},"
        f"{literal(json.dumps(app_snapshot(1750)))}::jsonb);"
    )


def cancellation_sql(case: Case) -> str:
    detail = literal(json.dumps({
        "applicant_facing_explanation": "Opportunity cancelled.",
        "closes_active_records_confirmed": True,
    }))
    return (
        "select public.manage_gig_lifecycle("
        f"{uid(case.gig)},{uid(case.client)},'cancel','opportunity_no_longer_required',"
        f"{detail}::jsonb);"
    )


def assert_one_marker(
    results: list,
    marker: str,
    label: str,
    *,
    successes: int = 1,
) -> None:
    actual_successes = sum(result.returncode == 0 for result in results)
    failures = [result.stderr + result.stdout for result in results if result.returncode != 0]
    if actual_successes != successes or (marker and not any(marker in value for value in failures)):
        raise AssertionError(
            f"{label}: expected {successes} success(es) and marker {marker}; "
            f"got {[result.returncode for result in results]} / {failures}"
        )
    print(f"PASS {label}")


def projection(case: Case, application: uuid.UUID) -> list[str]:
    result = run_psql(f"""
      select concat_ws('|',
        a.stage,
        coalesce(ars.is_shortlisted,false),
        (select count(*) from public.application_review_states x
         join public.applications xa on xa.id=x.application_id
         where x.gig_id=a.gig_id and x.is_shortlisted
           and xa.stage in ('under_review','advanced')),
        (select count(*) from public.applications x
         where x.gig_id=a.gig_id and x.stage='advanced'),
        a.current_version_id,
        (select count(*) from public.marketplace_events e where e.application_id=a.id),
        (select count(distinct e.id) from public.marketplace_events e where e.application_id=a.id))
      from public.applications a
      left join public.application_review_states ars on ars.application_id=a.id
      where a.id={uid(application)};
    """).stdout.strip().split("|")
    if len(result) != 7 or result[5] != result[6]:
        raise AssertionError(f"invalid or duplicate event projection: {result}")
    return result


def assert_terminal_not_shortlisted(case: Case, application: uuid.UUID, label: str) -> None:
    state = projection(case, application)
    if state[0] not in ("not_selected", "withdrawn", "closed_gig_cancelled", "confirmed"):
        raise AssertionError(f"{label}: expected terminal stage, got {state}")
    if state[1] not in ("f", "false"):
        raise AssertionError(f"{label}: terminal application remained shortlisted: {state}")
    print(f"PASS {label}")


def create_selection_request_sql(case: Case, application: uuid.UUID) -> str:
    request = uuid.uuid4()
    return f"""
      begin;
      select 1 from public.gigs where id={uid(case.gig)} for update;
      do $block$
      begin
        if not exists (
          select 1 from public.applications
          where id={uid(application)} and gig_id={uid(case.gig)} and stage='advanced'
        ) then
          raise exception 'M7E_SELECTION_REQUIRES_ADVANCED';
        end if;
      end
      $block$;
      insert into public.selection_requests(
        id,gig_id,application_id,application_version_id,gig_version_id,
        created_by_user_id,created_at,expires_at)
      select {uid(request)},a.gig_id,a.id,a.current_version_id,av.gig_version_id,
        {uid(case.client)},clock_timestamp(),clock_timestamp()+interval '1 day'
      from public.applications a
      join public.application_versions av on av.id=a.current_version_id
      where a.id={uid(application)};
      commit;
    """


def main() -> int:
    # 1. Two applicants compete for one private shortlist slot.
    case, applications = prepare(2)
    results = race(
        shortlist_sql(case, applications[0], 1),
        shortlist_sql(case, applications[1], 1),
    )
    assert_one_marker(results, "M7E_SHORTLIST_CAPACITY_REACHED", "final shortlist slot is serialized")
    assert_counts(
        f"select count(*) from public.application_review_states where gig_id={uid(case.gig)} and is_shortlisted;",
        "1",
        "final active shortlist count equals configured limit",
    )
    projection(case, applications[0]); projection(case, applications[1])

    # 2. Two applicants compete for one advancement slot.
    case, applications = prepare(2)
    results = race(
        transition_sql(case, applications[0], "advance", capacity=1),
        transition_sql(case, applications[1], "advance", capacity=1),
    )
    assert_one_marker(results, "M7E_ADVANCEMENT_CAPACITY_REACHED", "final advancement slot is serialized")
    assert_counts(
        f"select count(*) from public.applications where gig_id={uid(case.gig)} and stage='advanced';",
        "1",
        "final advanced count equals configured limit",
    )
    projection(case, applications[0]); projection(case, applications[1])

    # 3. Same-state shortlist retries are naturally idempotent.
    case, applications = prepare()
    application = applications[0]
    call = shortlist_sql(case, application)
    results = race(call, call)
    if any(result.returncode != 0 for result in results):
        raise AssertionError("concurrent same-app shortlist requests must both resolve")
    assert_counts(
        f"""select count(*),count(*) filter(where is_shortlisted),
          (select count(*) from public.marketplace_events where application_id={uid(application)}
             and event_type='application_shortlisted')
          from public.application_review_states where application_id={uid(application)};""",
        "1|1|1",
        "same applicant shortlist race creates one row and one event",
    )
    projection(case, application)

    # 4. Shortlist racing Not Selected always finishes terminal and clear.
    case, applications = prepare()
    application = applications[0]
    results = race(
        shortlist_sql(case, application),
        transition_sql(
            case,
            application,
            "not_selected",
            decision={"primary_reason": "stronger_overall_match", "feedback_points": []},
        ),
    )
    if not any(result.returncode == 0 for result in results):
        raise AssertionError("shortlist/terminal race produced no committed transition")
    assert_terminal_not_shortlisted(case, application, "shortlist versus terminal transition")

    # 5. Advance and freelancer withdrawal follow one serial order.
    case, applications = prepare()
    application = applications[0]
    results = race(
        transition_sql(case, application, "advance"),
        withdraw_sql(case, application),
    )
    if not any(result.returncode == 0 for result in results):
        raise AssertionError("advance/withdraw race produced no winner")
    assert_terminal_not_shortlisted(case, application, "advance versus freelancer withdrawal")

    # 6. Advance and edit either invalidate the old decision or both serialize safely.
    case, applications = prepare()
    application = applications[0]
    old_decision, old_version = decision_token(application), app_token(application)
    results = race(
        transition_sql(case, application, "advance", token=old_decision),
        edit_sql(case, application, old_version),
    )
    state = projection(case, application)
    if not any(result.returncode == 0 for result in results):
        raise AssertionError("advance/edit race produced no winner")
    if all(result.returncode == 0 for result in results) and state[0] != "advanced":
        raise AssertionError(f"successful advance/edit race lost advanced stage: {state}")
    print("PASS advance versus freelancer edit")

    # 7. Return cannot coexist with an effective request that requires Advanced.
    case, applications = prepare()
    application = applications[0]
    run_psql(transition_sql(case, application, "advance"))
    results = race(
        transition_sql(case, application, "return"),
        create_selection_request_sql(case, application),
    )
    assert_one_marker(results, "", "return versus selection-request creation", successes=1)
    state = projection(case, application)
    effective = run_psql(
        f"select count(*) from public.selection_requests where application_id={uid(application)} "
        "and status='pending' and expires_at>clock_timestamp();"
    ).stdout.strip()
    if effective == "1" and state[0] != "advanced":
        raise AssertionError(f"effective request coexists with non-advanced stage: {state}")

    # 8. Not Selected versus withdrawal has one authoritative terminal projection.
    case, applications = prepare()
    application = applications[0]
    results = race(
        transition_sql(
            case,
            application,
            "not_selected",
            decision={"primary_reason": "stronger_overall_match", "feedback_points": []},
        ),
        withdraw_sql(case, application),
    )
    assert_one_marker(results, "", "Not Selected versus withdrawal", successes=1)
    assert_terminal_not_shortlisted(case, application, "Not Selected/withdrawal terminal projection")

    # 9. Not Selected versus edit admits only one stale-state winner.
    case, applications = prepare()
    application = applications[0]
    results = race(
        transition_sql(
            case,
            application,
            "not_selected",
            token=decision_token(application),
            decision={"primary_reason": "stronger_overall_match", "feedback_points": []},
        ),
        edit_sql(case, application, app_token(application)),
    )
    assert_one_marker(results, "", "Not Selected versus freelancer edit", successes=1)
    projection(case, application)

    # 10. Two reopen transitions from one token cannot both append history.
    case, applications = prepare()
    application = applications[0]
    run_psql(transition_sql(
        case,
        application,
        "not_selected",
        decision={"primary_reason": "stronger_overall_match", "feedback_points": []},
    ))
    token = decision_token(application)
    reopen = transition_sql(
        case,
        application,
        "reopen",
        token=token,
        decision={"reason": "client_reconsideration"},
    )
    results = race(reopen, reopen)
    assert_one_marker(results, "", "concurrent reopen decisions", successes=1)
    assert_counts(
        f"select count(*) from public.marketplace_events where application_id={uid(application)} "
        "and event_type='application_reopened';",
        "1",
        "concurrent reopen appends one event",
    )
    projection(case, application)

    # 11. Cancellation remains authoritative against review work.
    case, applications = prepare()
    application = applications[0]
    results = race(
        transition_sql(case, application, "advance"),
        cancellation_sql(case),
    )
    if not any(result.returncode == 0 for result in results):
        raise AssertionError("review/cancellation race produced no winner")
    assert_counts(
        f"select opportunity_lifecycle from public.gigs where id={uid(case.gig)};",
        "cancelled",
        "gig cancellation remains authoritative",
    )
    assert_terminal_not_shortlisted(case, application, "review transition versus gig cancellation")

    # 12. Terminal cleanup is atomic even under a concurrent shortlist write.
    case, applications = prepare()
    application = applications[0]
    run_psql(shortlist_sql(case, application))
    results = race(
        transition_sql(
            case,
            application,
            "not_selected",
            decision={"primary_reason": "stronger_overall_match", "feedback_points": []},
        ),
        withdraw_sql(case, application),
    )
    if not any(result.returncode == 0 for result in results):
        raise AssertionError("terminal cleanup race produced no winner")
    assert_terminal_not_shortlisted(case, application, "terminal transition clears shortlist atomically")
    assert_counts(
        """select count(*) from public.applications a
           join public.application_review_states ars on ars.application_id=a.id
           where a.stage in ('confirmed','not_selected','withdrawn','closed_gig_cancelled')
             and ars.is_shortlisted;""",
        "0",
        "no committed terminal application remains shortlisted",
    )

    print("Milestone 7E separate-session concurrency verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
