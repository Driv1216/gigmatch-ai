#!/usr/bin/env python3
"""Run two independent PostgreSQL sessions against one selection request."""

from __future__ import annotations

import subprocess
import threading
import uuid


CONTAINER = "supabase_db_gigmatch-ai"


def run_psql(sql: str, *, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        [
            "docker",
            "exec",
            CONTAINER,
            "psql",
            "-X",
            "-U",
            "postgres",
            "-d",
            "postgres",
            "-v",
            "ON_ERROR_STOP=1",
            "-Atc",
            sql,
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if check and result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result


def q(value: uuid.UUID) -> str:
    return f"'{value}'::uuid"


def main() -> int:
    client_user = uuid.uuid4()
    freelancer_user = uuid.uuid4()
    freelancer_profile = uuid.uuid4()
    gig = uuid.uuid4()
    gig_version = uuid.uuid4()
    application = uuid.uuid4()
    application_version = uuid.uuid4()
    request = uuid.uuid4()

    seed_sql = f"""
    begin;
    set constraints all deferred;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values
    ('00000000-0000-0000-0000-000000000000', {q(client_user)}, 'authenticated', 'authenticated',
      '{client_user}@example.test', '', now(), '{{"provider":"email","providers":["email"]}}', '{{}}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', {q(freelancer_user)}, 'authenticated', 'authenticated',
      '{freelancer_user}@example.test', '', now(), '{{"provider":"email","providers":["email"]}}', '{{}}', now(), now());
    insert into public.user_profiles (id, email, role) values
      ({q(client_user)}, '{client_user}@example.test', 'client'),
      ({q(freelancer_user)}, '{freelancer_user}@example.test', 'freelancer');
    insert into public.client_profiles (user_id, company_name)
      values ({q(client_user)}, 'Concurrency client');
    insert into public.freelancer_profiles (id, user_id, headline)
      values ({q(freelancer_profile)}, {q(freelancer_user)}, 'Concurrency freelancer');
    insert into public.gigs (
      id, client_id, title, description, tech_category, status,
      opportunity_lifecycle, application_intake, operational_state,
      current_gig_version_id, current_material_gig_version_id
    ) values (
      {q(gig)}, {q(client_user)}, 'Concurrency gig', 'Stored terms', 'backend', 'open',
      'active', 'accepting', 'active', {q(gig_version)}, {q(gig_version)}
    );
    insert into public.gig_versions (
      id, gig_id, version_number, snapshot_schema_version, terms_snapshot,
      changed_fields, created_by_actor_type, created_by_user_id
    ) values (
      {q(gig_version)}, {q(gig)}, 1, 1,
      '{{"version_kind":"initial_product_version","terms_contract_version":1,"snapshot_schema_version":1,"payment_structure":"fixed_price","currency":"USD","client_payment":{{"payment_structure":"fixed_price","currency":"USD","budget_min":1000,"budget_max":2000}}}}',
      array['initial'], 'user', {q(client_user)}
    );
    insert into public.applications (
      id, gig_id, freelancer_profile_id, stage, current_version_id,
      submitted_at, last_updated_at, stage_changed_at,
      stage_changed_by_actor_type, stage_changed_by_user_id
    ) values (
      {q(application)}, {q(gig)}, {q(freelancer_profile)}, 'advanced', {q(application_version)},
      now() - interval '10 minutes', now() - interval '5 minutes', now() - interval '5 minutes',
      'user', {q(client_user)}
    );
    insert into public.application_versions (
      id, application_id, gig_id, version_number, gig_version_id, origin,
      snapshot_schema_version, cover_note, proposal_snapshot, timeline_snapshot,
      availability_snapshot, scope_snapshot, created_by_user_id
    ) values (
      {q(application_version)}, {q(application)}, {q(gig)}, 1, {q(gig_version)}, 'initial_submission',
      1, 'Concurrency proposal',
      '{{"proposal_contract_version":1,"snapshot_schema_version":1,"payment_structure":"fixed_price","currency":"USD","mode":"exact_total","exact_total":1500}}',
      '{{"kind":"exact","weeks":4}}', '{{"available_from":"tomorrow"}}',
      '{{"included_work":["API"],"excluded_work":["Hosting"],"assumptions":["Access"],"estimate_change_factors":["Scope"]}}',
      {q(freelancer_user)}
    );
    insert into public.selection_requests (
      id, gig_id, application_id, application_version_id, gig_version_id,
      created_by_user_id, created_at, expires_at
    ) values (
      {q(request)}, {q(gig)}, {q(application)}, {q(application_version)}, {q(gig_version)},
      {q(client_user)}, now() - interval '1 minute', now() + interval '1 day'
    );
    commit;
    """
    run_psql(seed_sql)

    barrier = threading.Barrier(3)
    results: list[subprocess.CompletedProcess[str]] = []
    results_lock = threading.Lock()

    def attempt() -> None:
        barrier.wait()
        result = run_psql(
            f"set role service_role; select * from public.confirm_selection_request({q(request)}, {q(freelancer_user)});",
            check=False,
        )
        with results_lock:
            results.append(result)

    threads = [threading.Thread(target=attempt), threading.Thread(target=attempt)]
    for thread in threads:
        thread.start()
    barrier.wait()
    for thread in threads:
        thread.join()

    successes = [result for result in results if result.returncode == 0]
    failures = [result for result in results if result.returncode != 0]
    if len(successes) != 1 or len(failures) != 1:
        print(f"FAIL attempts: successes={len(successes)} failures={len(failures)}")
        return 1
    failure_text = failures[0].stderr + failures[0].stdout
    if "not pending" not in failure_text:
        print("FAIL losing attempt did not return the controlled non-pending failure")
        return 1

    final_counts = run_psql(
        f"""
        select
          (select count(*) from public.selection_requests where id = {q(request)} and status = 'accepted'),
          (select count(*) from public.applications where id = {q(application)} and stage = 'confirmed'),
          (select count(*) from public.gigs where id = {q(gig)} and status = 'filled'),
          (select count(*) from public.engagements where gig_id = {q(gig)} and status <> 'cancelled'),
          (select count(*) from public.engagements where gig_id = {q(gig)} and accepted_terms_snapshot is not null);
        """
    ).stdout.strip()
    if final_counts != "1|1|1|1|1":
        print(f"FAIL final counts: {final_counts}")
        return 1

    print("PASS independent sessions: one success, one controlled failure")
    print("PASS final state: accepted=1 confirmed=1 filled=1 active_engagement=1 snapshot=1")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
