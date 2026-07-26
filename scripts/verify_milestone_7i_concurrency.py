#!/usr/bin/env python3
"""Verify Milestone 7I races with independent PostgreSQL sessions."""

from __future__ import annotations

import uuid

from verify_milestone_7d_concurrency import assert_counts, race, run_psql, uid
from verify_milestone_7g_concurrency import errors, successes
from verify_milestone_7h_concurrency import prepare_engagement, transition_sql


def prepare_contact():
    case, applications, engagement = prepare_engagement()
    for user in (case.client, case.freelancers[0][0]):
        phone = f"+1{user.int % 10_000_000_000:010d}"
        run_psql(
            "update auth.users set "
            f"phone='{phone}',phone_confirmed_at=clock_timestamp() "
            f"where id={uid(user)};"
        )
    return case, applications, engagement


def method_token(engagement: uuid.UUID, actor: uuid.UUID, method: str) -> str:
    return run_psql(
        "select value->>'share_action_token' "
        f"from jsonb_array_elements(public.contact_exchange_get({uid(engagement)},"
        f"{uid(actor)})->'available_methods') value "
        f"where value->>'method'='{method}';"
    ).stdout.strip()


def share_sql(
    engagement: uuid.UUID,
    actor: uuid.UUID,
    method: str,
    operation: uuid.UUID,
    *,
    token: str | None = None,
) -> str:
    action_token = token or method_token(engagement, actor, method)
    share_id = uuid.uuid4()
    if method in {"meeting_link", "professional_profile"}:
        material = (
            "'ciphertext-value','nonce-value','contact-key-v1',"
            f"'{('a' if method == 'meeting_link' else 'b') * 64}',"
            f"'https://contact.example/••••'"
        )
    else:
        material = "null,null,null,null,null"
    return (
        "select public.contact_share_create("
        f"{uid(engagement)},{uid(actor)},'{method}','{action_token}',"
        f"{uid(operation)},{uid(share_id)},{material});"
    )


def share_id(
    engagement: uuid.UUID, sharer: uuid.UUID, method: str
) -> uuid.UUID:
    value = run_psql(
        "select id from public.contact_shares "
        f"where engagement_id={uid(engagement)} and sharer_user_id={uid(sharer)} "
        f"and method='{method}' order by created_at desc,id desc limit 1;"
    ).stdout.strip()
    return uuid.UUID(value)


def share_action(
    engagement: uuid.UUID, actor: uuid.UUID, share: uuid.UUID, action: str
) -> str:
    direction = "shared_by_you" if action == "revoke" else "shared_with_you"
    return run_psql(
        "select action_item->>'action_token' "
        f"from jsonb_array_elements(public.contact_exchange_get({uid(engagement)},"
        f"{uid(actor)})->'{direction}') share_item,"
        "lateral jsonb_array_elements(share_item->'actions') action_item "
        f"where share_item->>'share_id'='{share}' "
        f"and action_item->>'action'='{action}';"
    ).stdout.strip()


def revoke_sql(
    engagement: uuid.UUID,
    actor: uuid.UUID,
    share: uuid.UUID,
    operation: uuid.UUID,
    *,
    token: str | None = None,
) -> str:
    action_token = token or share_action(engagement, actor, share, "revoke")
    return (
        "select public.contact_share_revoke("
        f"{uid(share)},{uid(actor)},'{action_token}',{uid(operation)});"
    )


def reveal_sql(
    engagement: uuid.UUID,
    actor: uuid.UUID,
    share: uuid.UUID,
    operation: uuid.UUID,
    *,
    token: str | None = None,
    limit: int = 10,
) -> str:
    action_token = token or share_action(engagement, actor, share, "reveal")
    return (
        "select public.contact_share_reveal("
        f"{uid(share)},{uid(actor)},'{action_token}',{uid(operation)},"
        f"{limit},10);"
    )


def block_sql(
    engagement: uuid.UUID,
    actor: uuid.UUID,
    operation: uuid.UUID,
    *,
    token: str | None = None,
) -> str:
    action_token = token or run_psql(
        "select public.contact_exchange_get("
        f"{uid(engagement)},{uid(actor)})->>'block_action_token';"
    ).stdout.strip()
    return (
        "select public.engagement_contact_block("
        f"{uid(engagement)},{uid(actor)},'{action_token}',{uid(operation)});"
    )


def require_serial(results, label: str) -> None:
    if successes(results) not in {1, 2}:
        raise AssertionError(
            f"{label}: {[item.returncode for item in results]}; {errors(results)}"
        )
    print(f"PASS {label}")


def main() -> int:
    case, _, engagement = prepare_contact()
    token = method_token(engagement, case.client, "verified_email")
    results = race(
        share_sql(engagement, case.client, "verified_email", uuid.uuid4(), token=token),
        share_sql(engagement, case.client, "verified_email", uuid.uuid4(), token=token),
    )
    if successes(results) != 1:
        raise AssertionError(f"1. same-method shares: {errors(results)}")
    assert_counts(
        "select count(*) from public.contact_shares "
        f"where engagement_id={uid(engagement)} and sharer_user_id={uid(case.client)} "
        "and method='verified_email' and consent_status='active' and source_status='current';",
        "1",
        "1. two same-method shares leave one active authority",
    )

    case, _, engagement = prepare_contact()
    share_token = method_token(engagement, case.client, "verified_email")
    block_token = run_psql(
        f"select public.contact_exchange_get({uid(engagement)},"
        f"{uid(case.client)})->>'block_action_token';"
    ).stdout.strip()
    results = race(
        share_sql(
            engagement, case.client, "verified_email", uuid.uuid4(), token=share_token
        ),
        block_sql(engagement, case.client, uuid.uuid4(), token=block_token),
    )
    require_serial(results, "2. share versus block serializes")
    assert_counts(
        "select (select count(*) from public.engagement_contact_blocks "
        f"where engagement_id={uid(engagement)})||'|'||"
        "(select count(*) from public.contact_shares "
        f"where engagement_id={uid(engagement)} and sharer_user_id={uid(case.client)} "
        "and consent_status='active');",
        "1|0",
        "2. block wins final authority and revokes blocker shares",
    )

    case, _, engagement = prepare_contact()
    run_psql(
        transition_sql(
            engagement,
            case.client,
            "request_cancellation",
            uuid.uuid4(),
            "mutual_decision",
        )
    )
    token = method_token(engagement, case.client, "verified_email")
    results = race(
        share_sql(engagement, case.client, "verified_email", uuid.uuid4(), token=token),
        transition_sql(
            engagement,
            case.freelancers[0][0],
            "acknowledge_cancellation",
            uuid.uuid4(),
        ),
    )
    require_serial(results, "3. share versus engagement cancellation serializes")
    assert_counts(
        f"select status from public.engagements where id={uid(engagement)};",
        "cancelled",
        "3. cancellation remains authoritative",
    )

    case, _, engagement = prepare_contact()
    run_psql(share_sql(engagement, case.client, "verified_email", uuid.uuid4()))
    shared = share_id(engagement, case.client, "verified_email")
    reveal_token = share_action(
        engagement, case.freelancers[0][0], shared, "reveal"
    )
    revoke_token = share_action(engagement, case.client, shared, "revoke")
    results = race(
        reveal_sql(
            engagement,
            case.freelancers[0][0],
            shared,
            uuid.uuid4(),
            token=reveal_token,
        ),
        revoke_sql(
            engagement, case.client, shared, uuid.uuid4(), token=revoke_token
        ),
    )
    require_serial(results, "4. reveal versus revoke serializes")
    assert_counts(
        f"select consent_status from public.contact_shares where id={uid(shared)};",
        "revoked",
        "4. revoke is final even if a prior reveal was authorised",
    )

    case, _, engagement = prepare_contact()
    run_psql(share_sql(engagement, case.client, "verified_email", uuid.uuid4()))
    shared = share_id(engagement, case.client, "verified_email")
    reveal_token = share_action(
        engagement, case.freelancers[0][0], shared, "reveal"
    )
    block_token = run_psql(
        f"select public.contact_exchange_get({uid(engagement)},"
        f"{uid(case.freelancers[0][0])})->>'block_action_token';"
    ).stdout.strip()
    results = race(
        reveal_sql(
            engagement,
            case.freelancers[0][0],
            shared,
            uuid.uuid4(),
            token=reveal_token,
        ),
        block_sql(
            engagement,
            case.freelancers[0][0],
            uuid.uuid4(),
            token=block_token,
        ),
    )
    require_serial(results, "5. reveal versus block serializes")
    assert_counts(
        f"select count(*) from public.engagement_contact_blocks where engagement_id={uid(engagement)};",
        "1",
        "5. block authority survives",
    )

    case, _, engagement = prepare_contact()
    run_psql(share_sql(engagement, case.client, "verified_email", uuid.uuid4()))
    shared = share_id(engagement, case.client, "verified_email")
    reveal_token = share_action(
        engagement, case.freelancers[0][0], shared, "reveal"
    )
    run_psql(
        transition_sql(
            engagement,
            case.client,
            "request_cancellation",
            uuid.uuid4(),
            "mutual_decision",
        )
    )
    results = race(
        reveal_sql(
            engagement,
            case.freelancers[0][0],
            shared,
            uuid.uuid4(),
            token=reveal_token,
        ),
        transition_sql(
            engagement,
            case.freelancers[0][0],
            "acknowledge_cancellation",
            uuid.uuid4(),
        ),
    )
    require_serial(results, "6. reveal versus cancellation serializes")
    assert_counts(
        f"select status from public.engagements where id={uid(engagement)};",
        "cancelled",
        "6. cancelled engagement is final reveal authority",
    )

    case, _, engagement = prepare_contact()
    run_psql(share_sql(engagement, case.client, "verified_email", uuid.uuid4()))
    shared = share_id(engagement, case.client, "verified_email")
    reveal_token = share_action(
        engagement, case.freelancers[0][0], shared, "reveal"
    )
    retry_id = uuid.uuid4()
    results = race(
        reveal_sql(
            engagement,
            case.freelancers[0][0],
            shared,
            retry_id,
            token=reveal_token,
        ),
        reveal_sql(
            engagement,
            case.freelancers[0][0],
            shared,
            retry_id,
            token=reveal_token,
        ),
    )
    if successes(results) != 2:
        raise AssertionError(f"7. same-key reveals: {errors(results)}")
    assert_counts(
        f"select count(*) from public.contact_reveals where request_id={uid(retry_id)};",
        "1",
        "7. same-key reveal retries create one audit",
    )

    revoke_token = share_action(engagement, case.client, shared, "revoke")
    run_psql(
        revoke_sql(
            engagement, case.client, shared, uuid.uuid4(), token=revoke_token
        )
    )
    denied = run_psql(
        reveal_sql(
            engagement,
            case.freelancers[0][0],
            shared,
            retry_id,
            token=reveal_token,
        ),
        check=False,
    )
    if denied.returncode == 0 or "M7I_CONTACT_SHARE_NOT_ACTIVE" not in denied.stderr:
        raise AssertionError("8. reveal retry after revocation returned or did not deny")
    print("PASS 8. reveal retry after revocation returns no plaintext")

    case, _, engagement = prepare_contact()
    run_psql(share_sql(engagement, case.client, "verified_email", uuid.uuid4()))
    shared = share_id(engagement, case.client, "verified_email")
    reveal_token = share_action(
        engagement, case.freelancers[0][0], shared, "reveal"
    )
    results = race(
        reveal_sql(
            engagement,
            case.freelancers[0][0],
            shared,
            uuid.uuid4(),
            token=reveal_token,
        ),
        f"update auth.users set email='changed-{case.client.hex}@example.test',"
        f"updated_at=clock_timestamp() where id={uid(case.client)};",
    )
    if successes(results) != 2:
        raise AssertionError(f"9. auth source change versus reveal: {errors(results)}")
    assert_counts(
        "select private.contact_effective_source_status(s) "
        f"from public.contact_shares s where s.id={uid(shared)};",
        "invalidated",
        "9. auth-source change invalidates later reveal authority",
    )

    case, _, engagement = prepare_contact()
    run_psql(share_sql(engagement, case.client, "verified_email", uuid.uuid4()))
    shared = share_id(engagement, case.client, "verified_email")
    revoke_token = share_action(engagement, case.client, shared, "revoke")
    premature_reshare_token = run_psql(
        "select private.contact_share_action_token(e,"
        f"{uid(case.client)},'verified_email') from public.engagements e "
        f"where e.id={uid(engagement)};"
    ).stdout.strip()
    results = race(
        revoke_sql(
            engagement, case.client, shared, uuid.uuid4(), token=revoke_token
        ),
        share_sql(
            engagement,
            case.client,
            "verified_email",
            uuid.uuid4(),
            token=premature_reshare_token,
        ),
    )
    if successes(results) != 1:
        raise AssertionError(f"10. revoke versus reshare: {errors(results)}")
    assert_counts(
        "select count(*) from public.contact_shares "
        f"where engagement_id={uid(engagement)} and sharer_user_id={uid(case.client)} "
        "and method='verified_email' and consent_status='active';",
        "0",
        "10. revoke versus stale reshare requires authority refresh",
    )

    case, _, engagement = prepare_contact()
    results = race(
        block_sql(engagement, case.client, uuid.uuid4()),
        transition_sql(
            engagement,
            case.freelancers[0][0],
            "prepare_kickoff",
            uuid.uuid4(),
        ),
    )
    if successes(results) != 2:
        raise AssertionError(f"11. block versus lifecycle: {errors(results)}")
    assert_counts(
        "select (select count(*) from public.engagement_contact_blocks "
        f"where engagement_id={uid(engagement)})||'|'||"
        f"(select status from public.engagements where id={uid(engagement)});",
        "1|kickoff_pending",
        "11. block preserves required engagement lifecycle actions",
    )

    case, _, engagement = prepare_contact()
    run_psql(share_sql(engagement, case.client, "verified_email", uuid.uuid4()))
    shared = share_id(engagement, case.client, "verified_email")
    reveal_token = share_action(
        engagement, case.freelancers[0][0], shared, "reveal"
    )
    results = race(
        reveal_sql(
            engagement,
            case.freelancers[0][0],
            shared,
            uuid.uuid4(),
            token=reveal_token,
            limit=1,
        ),
        reveal_sql(
            engagement,
            case.freelancers[0][0],
            shared,
            uuid.uuid4(),
            token=reveal_token,
            limit=1,
        ),
    )
    if successes(results) != 2:
        raise AssertionError(f"12. final reveal rate slot: {errors(results)}")
    outputs = "|".join(item.stdout for item in results)
    if outputs.count('"authorised": true') != 1 or outputs.count(
        '"contact_reveal_rate_limited"'
    ) != 1:
        raise AssertionError(f"12. unexpected final-slot results: {outputs}")
    assert_counts(
        "select count(*) from public.contact_reveals "
        f"where engagement_id={uid(engagement)} and recipient_user_id="
        f"{uid(case.freelancers[0][0])};",
        "1",
        "12. final rate-limit slot authorises one audit",
    )

    print("Milestone 7I independent-session concurrency verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
