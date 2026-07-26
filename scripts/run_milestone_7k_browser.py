#!/usr/bin/env python3
"""Run the Milestone 7K browser gate against an isolated local stack.

This runner intentionally keeps credentials, encryption keys, browser state,
and service logs in memory or in a private temporary directory. It refuses to
reset or seed until every effective service URL has passed the local-only
guard.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
import secrets
import signal
import socket
import subprocess
import sys
import tempfile
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from uuid import uuid4


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
SUPABASE_API = "http://127.0.0.1:54321"
BACKEND_ORIGIN = "http://127.0.0.1:8000"
FRONTEND_ORIGIN = "http://127.0.0.1:5173"
EXPECTED_PROJECT_ID = "gigmatch-ai"

IDENTITIES = {
    "client_a": ("clientA@test.com", "Milestone 7K Client A", "client"),
    "client_b": ("clientB@test.com", "Milestone 7K Client B", "client"),
    "freelancer_a": (
        "freelancerAA@test.com",
        "Milestone 7K Freelancer A",
        "freelancer",
    ),
    "freelancer_b": (
        "freelancerB@test.com",
        "Milestone 7K Freelancer B",
        "freelancer",
    ),
}


class GateFailure(RuntimeError):
    pass


def run(
    command: list[str],
    *,
    cwd: Path = ROOT,
    input_text: str | None = None,
    capture: bool = True,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        input=input_text,
        text=True,
        check=True,
        capture_output=capture,
    )


def local_url(value: str, port: int, name: str) -> None:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "postgresql"}:
        raise GateFailure(f"{name} must use a local HTTP or PostgreSQL URL")
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise GateFailure(f"{name} is not loopback")
    if parsed.port != port:
        raise GateFailure(f"{name} has unexpected port")
    if ".supabase.co" in value.lower():
        raise GateFailure(f"{name} points to hosted Supabase")


def load_local_status() -> dict[str, str]:
    config = (ROOT / "supabase" / "config.toml").read_text(encoding="utf-8")
    if f'project_id = "{EXPECTED_PROJECT_ID}"' not in config:
        raise GateFailure("unexpected Supabase project_id")
    result = run(["supabase", "status", "--output", "json"])
    status: dict[str, str] = json.loads(result.stdout)
    required = {
        "API_URL",
        "REST_URL",
        "DB_URL",
        "PUBLISHABLE_KEY",
        "SECRET_KEY",
        "SERVICE_ROLE_KEY",
    }
    if not required.issubset(status) or not all(status[key] for key in required):
        raise GateFailure("local Supabase status is incomplete")
    local_url(status["API_URL"], 54321, "Supabase API")
    local_url(status["REST_URL"], 54321, "Supabase REST")
    local_url(status["DB_URL"], 54322, "Supabase database")
    if status["API_URL"].rstrip("/") != SUPABASE_API:
        raise GateFailure("Supabase API does not match the fixed test origin")
    return status


def assert_ignored(path: Path) -> None:
    relative = path.relative_to(ROOT)
    result = subprocess.run(
        ["git", "check-ignore", "--quiet", str(relative)],
        cwd=ROOT,
        check=False,
    )
    if result.returncode != 0:
        raise GateFailure(f"refusing to write non-ignored environment file: {relative}")


def write_private(path: Path, text: str) -> None:
    assert_ignored(path)
    path.write_text(text, encoding="utf-8")
    path.chmod(0o600)


def configure_local_stack(status: dict[str, str]) -> set[str]:
    encryption_key = base64.b64encode(secrets.token_bytes(32)).decode("ascii")
    fingerprint_key = base64.b64encode(secrets.token_bytes(32)).decode("ascii")
    key_id = "milestone-7k-local"
    backend_values = {
        "APP_ENV": "test",
        "FRONTEND_ORIGIN": FRONTEND_ORIGIN,
        "SUPABASE_URL": status["API_URL"],
        "SUPABASE_PUBLISHABLE_KEY": status["PUBLISHABLE_KEY"],
        "SUPABASE_SECRET_KEY": status["SECRET_KEY"],
        "EMBEDDING_MODEL_NAME": "",
        "CONTACT_ACTIVE_ENCRYPTION_KEY_ID": key_id,
        "CONTACT_ENCRYPTION_KEYS_JSON": json.dumps({key_id: encryption_key}),
        "CONTACT_FINGERPRINT_KEY_BASE64": fingerprint_key,
    }
    frontend_values = {
        "VITE_SUPABASE_URL": status["API_URL"],
        "VITE_SUPABASE_PUBLISHABLE_KEY": status["PUBLISHABLE_KEY"],
        "VITE_API_BASE_URL": BACKEND_ORIGIN,
    }
    write_private(
        BACKEND / ".env",
        "".join(f"{key}={value}\n" for key, value in backend_values.items()),
    )
    write_private(
        FRONTEND / ".env",
        "".join(f"{key}={value}\n" for key, value in frontend_values.items()),
    )
    # Validate the effective values after writing and before any destructive setup.
    if backend_values["SUPABASE_URL"] != frontend_values["VITE_SUPABASE_URL"]:
        raise GateFailure("frontend and backend Supabase URLs differ")
    local_url(backend_values["SUPABASE_URL"], 54321, "backend Supabase URL")
    local_url(frontend_values["VITE_SUPABASE_URL"], 54321, "frontend Supabase URL")
    local_url(frontend_values["VITE_API_BASE_URL"], 8000, "frontend API URL")
    local_url(backend_values["FRONTEND_ORIGIN"], 5173, "backend CORS origin")
    return {
        status["PUBLISHABLE_KEY"],
        status["SECRET_KEY"],
        status["SERVICE_ROLE_KEY"],
        encryption_key,
        fingerprint_key,
    }


def http_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    body: dict[str, Any] | None = None,
) -> Any:
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    try:
        with urlopen(request, timeout=10) as response:
            payload = response.read()
    except (HTTPError, URLError) as exc:
        raise GateFailure(f"local HTTP setup request failed ({method} {urlparse(url).path})") from exc
    return json.loads(payload) if payload else None


def provision_fixtures(status: dict[str, str]) -> tuple[dict[str, Any], set[str]]:
    admin_headers = {
        "apikey": status["SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {status['SERVICE_ROLE_KEY']}",
    }
    actors: dict[str, Any] = {}
    sensitive: set[str] = set()
    listed = http_json(
        "GET",
        f"{SUPABASE_API}/auth/v1/admin/users?page=1&per_page=1000",
        headers=admin_headers,
    )
    existing_by_email = {
        str(user.get("email", "")).lower(): user
        for user in listed.get("users", [])
        if isinstance(user, dict)
    }
    for key, (email, full_name, role) in IDENTITIES.items():
        password = secrets.token_urlsafe(24)
        sensitive.add(password)
        existing = existing_by_email.get(email.lower())
        if existing:
            created = http_json(
                "PUT",
                f"{SUPABASE_API}/auth/v1/admin/users/{existing['id']}",
                headers=admin_headers,
                body={
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"fixture": "milestone_7k"},
                },
            )
        else:
            created = http_json(
                "POST",
                f"{SUPABASE_API}/auth/v1/admin/users",
                headers=admin_headers,
                body={
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"fixture": "milestone_7k"},
                },
            )
        actors[key] = {
            "id": created["id"],
            "email": email,
            "password": password,
            "full_name": full_name,
            "role": role,
        }

    values = []
    for actor in actors.values():
        values.append(
            "('%s','%s','%s','%s')"
            % (
                actor["id"],
                actor["email"].replace("'", "''"),
                actor["full_name"].replace("'", "''"),
                actor["role"],
            )
        )
    client_values = []
    freelancer_values = []
    for key, actor in actors.items():
        if actor["role"] == "client":
            suffix = "A" if key.endswith("_a") else "B"
            client_values.append(
                "('%s','Milestone 7K Company %s','%s','software','small',"
                "array['web applications'],'Local E2E fixture')"
                % (actor["id"], suffix, actor["full_name"].replace("'", "''"))
            )
        else:
            is_a = key.endswith("_a")
            skills = (
                "array['React','TypeScript','FastAPI','PostgreSQL']"
                if is_a
                else "array['React','TypeScript']"
            )
            resume_skills = (
                "array['React','TypeScript','FastAPI','PostgreSQL']"
                if is_a
                else "array['React','TypeScript']"
            )
            freelancer_values.append(
                """
                with created_profile as (
                  insert into public.freelancer_profiles(
                    user_id,headline,bio,location,experience_level,primary_role,
                    tech_categories,skills,tools,availability,preferred_gig_type
                  ) values (
                    '%s','Milestone 7K Full-Stack Engineer',
                    'Deterministic local E2E profile.','Remote','advanced',
                    'Full-stack engineer',array['frontend','backend'],%s,
                    array['Git'],'available','any'
                  )
                  on conflict(user_id) do update set
                    headline=excluded.headline,
                    bio=excluded.bio,
                    location=excluded.location,
                    experience_level=excluded.experience_level,
                    primary_role=excluded.primary_role,
                    tech_categories=excluded.tech_categories,
                    skills=excluded.skills,
                    tools=excluded.tools,
                    availability=excluded.availability,
                    preferred_gig_type=excluded.preferred_gig_type
                  returning user_id
                )
                insert into public.resume_parses(
                  user_id,source_kind,parser_version,status,parsed_json,skills,
                  categories,matched_terms,unmatched_keywords,confidence
                ) select user_id,'manual','deterministic_v1','reviewed',
                  jsonb_build_object('fixture','milestone_7k'),%s,
                  array['frontend','backend'],%s,array[]::text[],'deterministic'
                from created_profile
                on conflict(user_id) do update set
                  source_kind=excluded.source_kind,
                  parser_version=excluded.parser_version,
                  status=excluded.status,
                  parsed_json=excluded.parsed_json,
                  skills=excluded.skills,
                  categories=excluded.categories,
                  matched_terms=excluded.matched_terms,
                  unmatched_keywords=excluded.unmatched_keywords,
                  confidence=excluded.confidence;
                """
                % (actor["id"], skills, resume_skills, resume_skills)
            )
    fixture_sql = f"""
    begin;
    insert into public.user_profiles(id,email,full_name,role)
      values {",".join(values)}
      on conflict(id) do update set
        email=excluded.email,full_name=excluded.full_name,role=excluded.role;
    insert into public.client_profiles(
      user_id,company_name,contact_name,industry,company_size,hiring_focus,bio
    ) values {",".join(client_values)}
      on conflict(user_id) do update set
        company_name=excluded.company_name,
        contact_name=excluded.contact_name,
        industry=excluded.industry,
        company_size=excluded.company_size,
        hiring_focus=excluded.hiring_focus,
        bio=excluded.bio;
    {"".join(freelancer_values)}
    commit;
    """
    run(
        ["docker", "exec", "-i", "supabase_db_gigmatch-ai", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"],
        input_text=fixture_sql,
    )
    return actors, sensitive


def port_is_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex(("127.0.0.1", port)) != 0


def wait_http(url: str, deadline_seconds: int = 45) -> None:
    deadline = time.monotonic() + deadline_seconds
    while time.monotonic() < deadline:
        try:
            with urlopen(url, timeout=2) as response:
                if response.status < 500:
                    return
        except (HTTPError, URLError):
            pass
        time.sleep(0.25)
    raise GateFailure(f"local service did not become ready: {url}")


def start_services(
    temp: Path,
    processes: list[subprocess.Popen[bytes]],
    logs: list[Path],
) -> None:
    for port in (8000, 5173):
        if not port_is_free(port):
            raise GateFailure(f"port {port} is already occupied")
    backend_log = temp / "backend.log"
    frontend_log = temp / "frontend.log"
    logs.extend([backend_log, frontend_log])
    backend_handle = backend_log.open("wb")
    frontend_handle = frontend_log.open("wb")
    processes.extend([
        subprocess.Popen(
            [
                str(BACKEND / ".venv" / "bin" / "uvicorn"),
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ],
            cwd=BACKEND,
            stdout=backend_handle,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        ),
        subprocess.Popen(
            ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
            cwd=FRONTEND,
            stdout=frontend_handle,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        ),
    ])
    backend_handle.close()
    frontend_handle.close()
    wait_http(f"{BACKEND_ORIGIN}/health")
    wait_http(FRONTEND_ORIGIN)


def stop_services(processes: list[subprocess.Popen[bytes]]) -> None:
    for process in processes:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
    deadline = time.monotonic() + 8
    for process in processes:
        remaining = max(0.1, deadline - time.monotonic())
        try:
            process.wait(timeout=remaining)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=3)


def scrubbed_tail(path: Path, sensitive: set[str]) -> str:
    text = path.read_text(encoding="utf-8", errors="replace")[-12000:]
    for value in sensitive:
        if value:
            text = text.replace(value, "[REDACTED]")
    return text


def assert_logs_clean(logs: list[Path], sentinel: str, sensitive: set[str]) -> None:
    forbidden = sensitive | {sentinel}
    for path in logs:
        contents = path.read_text(encoding="utf-8", errors="replace")
        if any(value and value in contents for value in forbidden):
            raise GateFailure(f"sensitive value appeared in retained {path.name}")


def post_database_evidence(run_id: str, sentinel: str) -> None:
    # The query emits only booleans/counts and raises on any failed invariant.
    sql = r"""
    create temporary table proof_config as
    select
      :'sentinel'::text as sentinel,
      :'main_title'::text as main_title,
      :'second_title'::text as second_title;
    do $proof$
    declare
      main_gig uuid;
      second_gig uuid;
      main_application uuid;
      second_application uuid;
      main_engagement uuid;
      meeting_share uuid;
      sentinel text;
      main_title text;
      second_title text;
    begin
      select c.sentinel,c.main_title,c.second_title
        into strict sentinel,main_title,second_title
      from proof_config c;
      select id into strict main_gig from public.gigs
        where title = main_title;
      select id into strict second_gig from public.gigs
        where title = second_title;
      if (select array_agg(version_number order by version_number)
          from public.gig_versions where gig_id=main_gig) <> array[1,2] then
        raise exception 'main gig version sequence invalid';
      end if;
      select a.id into strict main_application
      from public.applications a
      join public.freelancer_profiles fp on fp.id=a.freelancer_profile_id
      join public.user_profiles up on up.id=fp.user_id
      where a.gig_id=main_gig and up.email='freelancerAA@test.com';
      if (select array_agg(version_number order by version_number)
          from public.application_versions
          where application_id=main_application) <> array[1,2] then
        raise exception 'main application version sequence invalid';
      end if;
      select a.id into strict second_application
      from public.applications a
      join public.freelancer_profiles fp on fp.id=a.freelancer_profile_id
      join public.user_profiles up on up.id=fp.user_id
      where a.gig_id=second_gig and up.email='freelancerAA@test.com';
      if (select array_agg(version_number order by version_number)
          from public.application_versions
          where application_id=second_application) <> array[1,2] then
        raise exception 'invalidation application version sequence invalid';
      end if;
      if not exists (
        select 1 from public.selection_requests sr
        join public.application_versions av on av.id=sr.application_version_id
        join public.engagements e on e.selection_request_id=sr.id
        where sr.application_id=main_application
          and sr.status='accepted'
          and av.version_number=2
          and e.accepted_application_version_id=sr.application_version_id
          and e.accepted_gig_version_id=sr.gig_version_id
      ) then raise exception 'accepted exact-version binding missing'; end if;
      if not exists (
        select 1 from public.selection_requests sr
        where sr.application_id=second_application and sr.status='invalidated'
      ) then raise exception 'stale request was not invalidated'; end if;
      if not exists (
        select 1 from public.applications a
        join public.freelancer_profiles fp on fp.id=a.freelancer_profile_id
        join public.user_profiles up on up.id=fp.user_id
        where a.gig_id=main_gig and up.email='freelancerB@test.com'
          and a.stage='not_selected'
          and a.stage_reason_code='another_applicant_selected'
      ) then raise exception 'automatic competing-applicant closure missing'; end if;
      select id into strict main_engagement from public.engagements
        where gig_id=main_gig and status <> 'cancelled';
      if (select count(*) from public.engagements
          where gig_id=main_gig and status <> 'cancelled') <> 1 then
        raise exception 'main engagement count invalid';
      end if;
      select cs.id into strict meeting_share from public.contact_shares cs
        where cs.engagement_id=main_engagement
          and cs.method='meeting_link'
          and cs.consent_status='revoked';
      if not exists (
        select 1 from private.contact_share_material m
        where m.share_id=meeting_share
          and m.retired_at is not null
          and m.ciphertext is null
          and m.nonce is null
          and m.key_id is not null
          and m.source_digest ~ '^[0-9a-f]{64}$'
          and m.canonical_value_fingerprint ~ '^[0-9a-f]{64}$'
      ) then raise exception 'retired encrypted contact evidence invalid'; end if;
      if exists (
        select 1
        from (
          select row_to_json(x)::text body from public.contact_shares x
          union all select row_to_json(x)::text from public.marketplace_events x
          union all select row_to_json(x)::text from private.contact_operations x
        ) persisted
        where persisted.body like '%' || sentinel || '%'
      ) then raise exception 'contact plaintext persisted in authority/event data'; end if;
      declare
        persisted_column record;
        plaintext_found boolean;
      begin
        for persisted_column in
          select n.nspname as schema_name,c.relname as table_name,a.attname as column_name
          from pg_catalog.pg_attribute a
          join pg_catalog.pg_class c on c.oid=a.attrelid
          join pg_catalog.pg_namespace n on n.oid=c.relnamespace
          join pg_catalog.pg_type t on t.oid=a.atttypid
          where n.nspname in ('public','private')
            and c.relkind in ('r','p')
            and a.attnum > 0
            and not a.attisdropped
            and t.typname in ('text','varchar','bpchar','json','jsonb')
        loop
          execute format(
            'select exists(select 1 from %I.%I where position($1 in %I::text) > 0)',
            persisted_column.schema_name,
            persisted_column.table_name,
            persisted_column.column_name
          ) into plaintext_found using sentinel;
          if plaintext_found then
            raise exception 'contact plaintext persisted in %.%.%',
              persisted_column.schema_name,
              persisted_column.table_name,
              persisted_column.column_name;
          end if;
        end loop;
      end;
    end
    $proof$;
    select json_build_object(
      'status','pass',
      'main_gig_versions',(
        select count(*) from public.gig_versions gv join public.gigs g on g.id=gv.gig_id
        where g.title=(select main_title from proof_config)
      ),
      'main_application_versions',(
        select count(*) from public.application_versions av
        join public.applications a on a.id=av.application_id
        join public.gigs g on g.id=a.gig_id
        join public.freelancer_profiles fp on fp.id=a.freelancer_profile_id
        join public.user_profiles up on up.id=fp.user_id
        where g.title=(select main_title from proof_config)
          and up.email='freelancerAA@test.com'
      ),
      'non_cancelled_engagements',(
        select count(*) from public.engagements e join public.gigs g on g.id=e.gig_id
        where g.title=(select main_title from proof_config)
          and e.status <> 'cancelled'
      ),
      'retired_meeting_material',(
        select count(*) from private.contact_share_material m
        join public.contact_shares cs on cs.id=m.share_id
        join public.engagements e on e.id=cs.engagement_id
        join public.gigs g on g.id=e.gig_id
        where g.title=(select main_title from proof_config)
          and cs.method='meeting_link'
          and m.retired_at is not null and m.ciphertext is null and m.nonce is null
      )
    );
    """
    escaped_sentinel = sentinel.replace("'", "''")
    variables = (
        f"\\set sentinel '{escaped_sentinel}'\n"
        f"\\set main_title 'Milestone 7K Main {run_id}'\n"
        f"\\set second_title 'Milestone 7K Invalidation {run_id}'\n"
    )
    result = run(
        [
            "docker",
            "exec",
            "-i",
            "supabase_db_gigmatch-ai",
            "psql",
            "-v",
            "ON_ERROR_STOP=1",
            "-U",
            "postgres",
            "-d",
            "postgres",
            "-At",
        ],
        input_text=variables + sql,
    )
    print(f"Post-browser database evidence: {result.stdout.strip()}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--skip-reset",
        action="store_true",
        help="developer-only rerun against already prepared local fixtures",
    )
    args = parser.parse_args()
    processes: list[subprocess.Popen[bytes]] = []
    sensitive: set[str] = set()
    with tempfile.TemporaryDirectory(prefix="gigmatch-7k-") as temp_name:
        temp = Path(temp_name)
        logs: list[Path] = []
        try:
            status = load_local_status()
            sensitive |= configure_local_stack(status)
            if not args.skip_reset:
                print("Local-only guard passed; resetting local Supabase.")
                run(["supabase", "db", "reset", "--local"], capture=False)
            # Re-read keys because reset can rotate local credentials in newer CLIs.
            status = load_local_status()
            sensitive |= configure_local_stack(status)
            actors, actor_secrets = provision_fixtures(status)
            sensitive |= actor_secrets
            run_id = f"{int(time.time())}-{secrets.token_hex(3)}"
            sentinel = f"m7k-contact-{secrets.token_hex(12)}"
            sensitive.add(sentinel)
            start_services(temp, processes, logs)
            browser_config = {
                "frontend_origin": FRONTEND_ORIGIN,
                "backend_origin": BACKEND_ORIGIN,
                "supabase_origin": SUPABASE_API,
                "run_id": run_id,
                "contact_sentinel": sentinel,
                "actors": actors,
            }
            browser = subprocess.run(
                ["node", "e2e/milestone-7k.mjs"],
                cwd=FRONTEND,
                input=json.dumps(browser_config),
                text=True,
                capture_output=True,
                check=False,
            )
            if browser.returncode != 0:
                detail = browser.stderr[-6000:] or browser.stdout[-6000:]
                for value in sensitive:
                    detail = detail.replace(value, "[REDACTED]")
                raise GateFailure(f"browser scenario failed:\n{detail}")
            print(browser.stdout.strip())
            assert_logs_clean(logs, sentinel, sensitive)
            post_database_evidence(run_id, sentinel)
            print("Milestone 7K browser gate: PASS")
            return 0
        except (GateFailure, subprocess.CalledProcessError) as exc:
            print(f"Milestone 7K browser gate: FAIL: {exc}", file=sys.stderr)
            for path in logs:
                if path.exists():
                    print(f"--- sanitized {path.name} tail ---", file=sys.stderr)
                    print(scrubbed_tail(path, sensitive), file=sys.stderr)
            return 1
        finally:
            stop_services(processes)


if __name__ == "__main__":
    raise SystemExit(main())
