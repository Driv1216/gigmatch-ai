-- GigMatch AI Milestone 7F: application-specific structured Q&A and proposal revision.
-- Global lock order: gig -> effective selection request -> application -> Q&A thread
-- -> target message -> revision request -> application version -> events.

begin;

alter table public.application_versions
  drop constraint application_versions_origin_check,
  add constraint application_versions_origin_check check (origin in (
    'initial_submission', 'freelancer_edit', 'gig_change_terms_reaffirmed',
    'gig_change_proposal_updated', 'gig_change_reapplication', 'reconsideration',
    'proposal_revision_response'
  ));

create table public.application_qa_threads (
  application_id uuid primary key,
  gig_id uuid not null,
  next_message_sequence bigint not null default 1 check (next_message_sequence > 0),
  initial_client_turn_count smallint not null default 0
    check (initial_client_turn_count between 0 and 2),
  pre_advance_stopped_at timestamptz,
  pre_advance_stopped_by_user_id uuid references public.user_profiles(id) on delete restrict,
  full_discussion_unlocked_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint application_qa_threads_application_gig_fk
    foreign key (application_id, gig_id)
    references public.applications(id, gig_id) on delete restrict,
  constraint application_qa_threads_stop_pair_check check (
    (pre_advance_stopped_at is null and pre_advance_stopped_by_user_id is null)
    or (pre_advance_stopped_at is not null and pre_advance_stopped_by_user_id is not null)
  )
);

create index application_qa_threads_gig_id_idx
on public.application_qa_threads (gig_id);

create index application_qa_threads_attention_idx
on public.application_qa_threads (updated_at desc, application_id);

create table public.application_qa_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  gig_id uuid not null,
  sequence_number bigint not null check (sequence_number > 0),
  sender_user_id uuid not null references public.user_profiles(id) on delete restrict,
  sender_role text not null check (sender_role in ('client', 'freelancer')),
  message_kind text not null check (message_kind in (
    'initial_question', 'question', 'answer', 'clarification', 'decline', 'correction'
  )),
  topic text check (topic in (
    'proposal_scope', 'budget', 'timeline', 'availability', 'relevant_experience',
    'included_work', 'excluded_work', 'technical_assumptions',
    'commercial_assumptions', 'other_job_related'
  )),
  other_topic_detail text,
  body text,
  in_reply_to_message_id uuid,
  corrects_message_id uuid,
  decline_reason_code text check (
    decline_reason_code is null or decline_reason_code in (
      'outside_proposal_scope', 'requires_unpaid_work', 'sensitive_information',
      'not_comfortable_answering', 'insufficient_context', 'other'
    )
  ),
  decline_reason_detail text,
  request_id uuid not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null,
  constraint application_qa_messages_application_gig_fk
    foreign key (application_id, gig_id)
    references public.applications(id, gig_id) on delete restrict,
  constraint application_qa_messages_application_id_id_key
    unique (application_id, id),
  constraint application_qa_messages_sequence_key
    unique (application_id, sequence_number),
  constraint application_qa_messages_sender_request_key
    unique (sender_user_id, request_id),
  constraint application_qa_messages_reply_fk
    foreign key (application_id, in_reply_to_message_id)
    references public.application_qa_messages(application_id, id) on delete restrict,
  constraint application_qa_messages_correction_fk
    foreign key (application_id, corrects_message_id)
    references public.application_qa_messages(application_id, id) on delete restrict,
  constraint application_qa_messages_shape_check check (
    (
      message_kind in ('initial_question', 'question')
      and topic is not null and body is not null
      and in_reply_to_message_id is null and corrects_message_id is null
      and decline_reason_code is null and decline_reason_detail is null
    )
    or (
      message_kind = 'answer'
      and topic is null and body is not null
      and in_reply_to_message_id is not null and corrects_message_id is null
      and decline_reason_code is null and decline_reason_detail is null
    )
    or (
      message_kind = 'clarification'
      and topic is not null and body is not null
      and in_reply_to_message_id is null and corrects_message_id is null
      and decline_reason_code is null and decline_reason_detail is null
    )
    or (
      message_kind = 'decline'
      and topic is null and in_reply_to_message_id is not null
      and corrects_message_id is null and decline_reason_code is not null
    )
    or (
      message_kind = 'correction'
      and topic is null and body is not null
      and in_reply_to_message_id is null and corrects_message_id is not null
      and decline_reason_code is null and decline_reason_detail is null
    )
  ),
  constraint application_qa_messages_other_topic_check check (
    (topic = 'other_job_related' and other_topic_detail is not null)
    or (topic is distinct from 'other_job_related' and other_topic_detail is null)
  ),
  constraint application_qa_messages_body_check check (
    body is null or (
      body = btrim(body) and body <> '' and char_length(body) <= 1200
      and body !~ '[[:cntrl:]]'
    )
  ),
  constraint application_qa_messages_details_check check (
    (other_topic_detail is null or (
      other_topic_detail = btrim(other_topic_detail)
      and other_topic_detail <> '' and char_length(other_topic_detail) <= 120
      and other_topic_detail !~ '[[:cntrl:]]'
    ))
    and (decline_reason_detail is null or (
      decline_reason_detail = btrim(decline_reason_detail)
      and decline_reason_detail <> '' and char_length(decline_reason_detail) <= 400
      and decline_reason_detail !~ '[[:cntrl:]]'
    ))
    and (decline_reason_code <> 'other' or decline_reason_detail is not null)
  )
);

create unique index application_qa_messages_primary_resolution_idx
on public.application_qa_messages (application_id, in_reply_to_message_id)
where message_kind in ('answer', 'decline');

create index application_qa_messages_cursor_idx
on public.application_qa_messages (application_id, sequence_number desc);

create index application_qa_messages_rate_idx
on public.application_qa_messages (application_id, sender_user_id, created_at desc);

create table public.application_question_reports (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  gig_id uuid not null,
  message_id uuid not null,
  reporter_user_id uuid not null references public.user_profiles(id) on delete restrict,
  category text not null check (category in (
    'free_work_request', 'complete_solution_request', 'unpaid_design_request',
    'contact_information_request', 'banking_information_request',
    'credential_or_secret_request', 'harassment', 'spam',
    'suspicious_payment_request', 'other'
  )),
  detail text,
  request_id uuid not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null,
  constraint application_question_reports_application_gig_fk
    foreign key (application_id, gig_id)
    references public.applications(id, gig_id) on delete restrict,
  constraint application_question_reports_message_fk
    foreign key (application_id, message_id)
    references public.application_qa_messages(application_id, id) on delete restrict,
  constraint application_question_reports_reporter_message_key
    unique (reporter_user_id, message_id),
  constraint application_question_reports_reporter_request_key
    unique (reporter_user_id, request_id),
  constraint application_question_reports_detail_check check (
    (category <> 'other' and detail is null)
    or (
      detail = btrim(detail) and detail <> ''
      and char_length(detail) <= 600 and detail !~ '[[:cntrl:]]'
    )
  )
);

create index application_question_reports_application_idx
on public.application_question_reports (application_id, created_at desc);

create index application_question_reports_message_idx
on public.application_question_reports (message_id);

create table public.application_revision_requests (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  gig_id uuid not null,
  requested_application_version_id uuid not null,
  requested_material_gig_version_id uuid not null,
  created_by_user_id uuid not null references public.user_profiles(id) on delete restrict,
  reason_code text not null check (reason_code in (
    'clarify_scope', 'revise_budget', 'revise_timeline', 'explain_exclusions',
    'update_availability', 'correct_assumptions', 'other'
  )),
  reason_detail text,
  status text not null check (status in (
    'open', 'fulfilled', 'declined', 'superseded',
    'closed_by_stage_change', 'closed_by_gig_state'
  )),
  created_at timestamptz not null,
  terminal_at timestamptz,
  response_application_version_id uuid,
  response_by_user_id uuid references public.user_profiles(id) on delete restrict,
  response_reason_code text,
  response_reason_detail text,
  request_id uuid not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  terminal_request_id uuid,
  terminal_request_fingerprint text,
  constraint application_revision_requests_application_gig_fk
    foreign key (application_id, gig_id)
    references public.applications(id, gig_id) on delete restrict,
  constraint application_revision_requests_requested_version_fk
    foreign key (application_id, requested_application_version_id)
    references public.application_versions(application_id, id) on delete restrict,
  constraint application_revision_requests_material_version_fk
    foreign key (gig_id, requested_material_gig_version_id)
    references public.gig_versions(gig_id, id) on delete restrict,
  constraint application_revision_requests_response_version_fk
    foreign key (application_id, response_application_version_id)
    references public.application_versions(application_id, id) on delete restrict,
  constraint application_revision_requests_creator_request_key
    unique (created_by_user_id, request_id),
  constraint application_revision_requests_terminal_request_pair_check check (
    (terminal_request_id is null and terminal_request_fingerprint is null)
    or (
      terminal_request_id is not null
      and terminal_request_fingerprint ~ '^[0-9a-f]{64}$'
      and response_by_user_id is not null
    )
  ),
  constraint application_revision_requests_reason_check check (
    (reason_code <> 'other' and reason_detail is null)
    or (
      reason_detail = btrim(reason_detail) and reason_detail <> ''
      and char_length(reason_detail) <= 800 and reason_detail !~ '[[:cntrl:]]'
    )
  ),
  constraint application_revision_requests_lifecycle_check check (
    (status = 'open' and terminal_at is null
      and response_application_version_id is null and response_by_user_id is null
      and response_reason_code is null and response_reason_detail is null
      and terminal_request_id is null and terminal_request_fingerprint is null)
    or
    (status = 'fulfilled' and terminal_at is not null
      and response_application_version_id is not null and response_by_user_id is not null
      and response_reason_code is null and response_reason_detail is null
      and terminal_request_id is not null and terminal_request_fingerprint is not null)
    or
    (status = 'declined' and terminal_at is not null
      and response_application_version_id is null and response_by_user_id is not null
      and response_reason_code is not null
      and terminal_request_id is not null and terminal_request_fingerprint is not null)
    or
    (status in ('superseded', 'closed_by_stage_change', 'closed_by_gig_state')
      and terminal_at is not null and response_application_version_id is null
      and response_by_user_id is null and response_reason_code is null
      and response_reason_detail is null
      and terminal_request_id is null and terminal_request_fingerprint is null)
  ),
  constraint application_revision_requests_response_reason_check check (
    response_reason_code is null or response_reason_code in (
      'scope_stands', 'budget_stands', 'timeline_stands', 'availability_unchanged',
      'request_unclear', 'unable_to_revise', 'other'
    )
  ),
  constraint application_revision_requests_response_detail_check check (
    response_reason_detail is null or (
      response_reason_detail = btrim(response_reason_detail)
      and response_reason_detail <> '' and char_length(response_reason_detail) <= 600
      and response_reason_detail !~ '[[:cntrl:]]'
    )
  )
);

create unique index application_revision_requests_one_open_idx
on public.application_revision_requests (application_id)
where status = 'open';

create index application_revision_requests_gig_idx
on public.application_revision_requests (gig_id, created_at desc);

create index application_revision_requests_application_history_idx
on public.application_revision_requests (application_id, created_at desc, id);

create index application_revision_requests_rate_idx
on public.application_revision_requests (application_id, created_by_user_id, created_at desc);

create table public.application_qa_operations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  gig_id uuid not null,
  actor_user_id uuid not null references public.user_profiles(id) on delete restrict,
  operation_kind text not null check (operation_kind in (
    'initial_question', 'question', 'clarification', 'answer', 'decline',
    'correction', 'stop_pre_advancement', 'report',
    'revision_create', 'revision_decline', 'revision_submit_update'
  )),
  request_id uuid not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null,
  constraint application_qa_operations_application_gig_fk
    foreign key (application_id, gig_id)
    references public.applications(id, gig_id) on delete restrict,
  constraint application_qa_operations_actor_request_key unique (actor_user_id, request_id)
);

create index application_qa_operations_application_idx
on public.application_qa_operations (application_id, created_at desc);

alter table public.application_qa_threads enable row level security;
alter table public.application_qa_messages enable row level security;
alter table public.application_question_reports enable row level security;
alter table public.application_revision_requests enable row level security;
alter table public.application_qa_operations enable row level security;

revoke all on public.application_qa_threads, public.application_qa_messages,
  public.application_question_reports, public.application_revision_requests,
  public.application_qa_operations
from public, anon, authenticated, service_role;

grant select on public.application_qa_threads, public.application_qa_messages,
  public.application_question_reports, public.application_revision_requests,
  public.application_qa_operations
to service_role;

create or replace function private.protect_qa_immutable_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Milestone 7F immutable history cannot be updated or deleted';
end;
$$;

create trigger protect_application_qa_message
before update or delete on public.application_qa_messages
for each row execute function private.protect_qa_immutable_row();

create trigger protect_application_question_report
before update or delete on public.application_question_reports
for each row execute function private.protect_qa_immutable_row();

create trigger protect_application_qa_operation
before update or delete on public.application_qa_operations
for each row execute function private.protect_qa_immutable_row();

create or replace function private.protect_application_qa_thread()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Application Q&A threads cannot be physically deleted';
  end if;
  if (new.application_id, new.gig_id, new.created_at)
      is distinct from (old.application_id, old.gig_id, old.created_at) then
    raise exception 'Application Q&A thread identity is immutable';
  end if;
  if new.next_message_sequence < old.next_message_sequence
     or new.initial_client_turn_count < old.initial_client_turn_count
     or (old.pre_advance_stopped_at is not null and new.pre_advance_stopped_at is null)
     or (old.full_discussion_unlocked_at is not null and new.full_discussion_unlocked_at is null) then
    raise exception 'Application Q&A control projections cannot move backwards';
  end if;
  return new;
end;
$$;

create trigger protect_application_qa_thread
before update or delete on public.application_qa_threads
for each row execute function private.protect_application_qa_thread();

create or replace function private.protect_application_revision_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Application revision requests cannot be physically deleted';
  end if;
  if (new.id, new.application_id, new.gig_id, new.requested_application_version_id,
      new.requested_material_gig_version_id, new.created_by_user_id, new.reason_code,
      new.reason_detail, new.created_at, new.request_id, new.request_fingerprint)
      is distinct from
     (old.id, old.application_id, old.gig_id, old.requested_application_version_id,
      old.requested_material_gig_version_id, old.created_by_user_id, old.reason_code,
      old.reason_detail, old.created_at, old.request_id, old.request_fingerprint) then
    raise exception 'Application revision-request identity is immutable';
  end if;
  if old.status <> 'open' then
    raise exception 'Terminal application revision requests are immutable';
  end if;
  return new;
end;
$$;

create trigger protect_application_revision_request
before update or delete on public.application_revision_requests
for each row execute function private.protect_application_revision_request();

create or replace function private.qa_valid_text(
  p_value text,
  p_minimum integer,
  p_maximum integer,
  p_required boolean default true
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value is null then not p_required
    else p_value = btrim(p_value)
      and char_length(p_value) between p_minimum and p_maximum
      and p_value !~ '[[:cntrl:]]'
      and p_value !~ '<[^>]+>'
  end
$$;

create or replace function private.qa_fingerprint(p_payload jsonb)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select encode(extensions.digest(p_payload::text, 'sha256'), 'hex')
$$;

create or replace function private.qa_safety_code(p_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_value ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+[.][[:alpha:]]{2,}'
     or p_value ~* '(^|[^[:digit:]])[+]?[[:digit:]][[:digit:] ()-]{8,}[[:digit:]]([^[:digit:]]|$)' then
    return 'contact_information_not_allowed';
  end if;
  if p_value ~* '(https?://|www[.])'
     or p_value ~* '(whatsapp|telegram|discord|signal)[[:space:]]*(me|at|:|@)'
     or p_value ~* '(move|continue|contact|message|reach)[[:space:][:punct:]]+(me[[:space:]]+)?(off[- ]platform|outside[[:space:]]+gigmatch)' then
    return 'external_communication_request_not_allowed';
  end if;
  if p_value ~* '(send|share|provide|tell|give|enter)[^.!?]{0,40}(password|passcode|otp|one[- ]time password|api key|access token|secret key|private key)'
     or p_value ~* '(^|[^[:alnum:]])sk-[[:alnum:]_-]{16,}' then
    return 'credential_request_not_allowed';
  end if;
  if p_value ~* '(send|share|provide|enter)[^.!?]{0,40}(bank account|account number|routing number|ifsc|upi id|payment identifier)'
     or p_value ~* '[[:alnum:]._-]+@[[:alpha:]]{2,15}[[:space:]]*(upi|pay)' then
    return 'financial_identifier_not_allowed';
  end if;
  return null;
end;
$$;

create or replace function private.qa_participant_role(
  p_application_id uuid,
  p_gig_id uuid,
  p_acting_user_id uuid
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when g.client_id = p_acting_user_id
      and up.role = 'client' then 'client'
    when fp.user_id = p_acting_user_id
      and up.role = 'freelancer' then 'freelancer'
    else null
  end
  from public.applications a
  join public.gigs g on g.id = a.gig_id
  join public.freelancer_profiles fp on fp.id = a.freelancer_profile_id
  join public.user_profiles up on up.id = p_acting_user_id
  where a.id = p_application_id and a.gig_id = p_gig_id
$$;

create or replace function private.qa_replay(
  p_application_id uuid,
  p_actor_user_id uuid,
  p_request_id uuid,
  p_fingerprint text
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare existing public.application_qa_operations%rowtype;
begin
  select op.* into existing
  from public.application_qa_operations op
  where op.actor_user_id = p_actor_user_id and op.request_id = p_request_id;
  if existing.id is null then
    return null;
  end if;
  if existing.application_id <> p_application_id
     or existing.request_fingerprint <> p_fingerprint then
    raise exception using errcode='23505', message='M7F_IDEMPOTENCY_CONFLICT';
  end if;
  return existing.result || jsonb_build_object('idempotent_replay', true);
end;
$$;

create or replace function private.qa_record_operation(
  p_application_id uuid,
  p_gig_id uuid,
  p_actor_user_id uuid,
  p_operation_kind text,
  p_request_id uuid,
  p_fingerprint text,
  p_result jsonb,
  p_created_at timestamptz
)
returns void
language sql
set search_path = ''
as $$
  insert into public.application_qa_operations(
    application_id, gig_id, actor_user_id, operation_kind, request_id,
    request_fingerprint, result, created_at
  ) values (
    p_application_id, p_gig_id, p_actor_user_id, p_operation_kind, p_request_id,
    p_fingerprint, p_result, p_created_at
  )
$$;

create or replace function private.qa_retry_after(
  p_application_id uuid,
  p_actor_user_id uuid,
  p_now timestamptz,
  p_burst_limit integer,
  p_burst_minutes integer,
  p_daily_limit integer
)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare burst_count integer; daily_count integer; oldest timestamptz;
begin
  select count(*), min(created_at) into burst_count, oldest
  from public.application_qa_messages
  where application_id = p_application_id and sender_user_id = p_actor_user_id
    and created_at > p_now - make_interval(mins => p_burst_minutes);
  if burst_count >= p_burst_limit then
    return greatest(1, ceil(extract(epoch from
      (oldest + make_interval(mins => p_burst_minutes) - p_now)))::integer);
  end if;
  select count(*), min(created_at) into daily_count, oldest
  from public.application_qa_messages
  where application_id = p_application_id and sender_user_id = p_actor_user_id
    and created_at > p_now - interval '24 hours';
  if daily_count >= p_daily_limit then
    return greatest(1, ceil(extract(epoch from
      (oldest + interval '24 hours' - p_now)))::integer);
  end if;
  return 0;
end;
$$;

create or replace function public.qa_write_message(
  p_application_id uuid,
  p_acting_user_id uuid,
  p_request_id uuid,
  p_operation text,
  p_topic text default null,
  p_other_topic_detail text default null,
  p_body text default null,
  p_target_message_id uuid default null,
  p_decline_reason_code text default null,
  p_decline_reason_detail text default null,
  p_burst_limit integer default 8,
  p_burst_minutes integer default 10,
  p_daily_limit integer default 40
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_gig_id uuid;
  locked_gig public.gigs%rowtype;
  locked_application public.applications%rowtype;
  locked_thread public.application_qa_threads%rowtype;
  target public.application_qa_messages%rowtype;
  actor_role text;
  message_kind text;
  effective_now timestamptz;
  fingerprint text;
  replay jsonb;
  safety_code text;
  retry_after integer;
  allocated_sequence bigint;
  message_id uuid := gen_random_uuid();
  result jsonb;
  is_never_advanced boolean;
begin
  if p_application_id is null or p_acting_user_id is null or p_request_id is null
     or p_operation not in ('initial_question', 'question', 'clarification',
       'answer', 'decline', 'correction')
     or p_burst_limit not between 1 and 100
     or p_burst_minutes not between 1 and 1440
     or p_daily_limit not between p_burst_limit and 500 then
    raise exception using errcode='22023', message='M7F_QA_ACTION_NOT_ALLOWED';
  end if;

  select a.gig_id into resolved_gig_id
  from public.applications a where a.id = p_application_id;
  if resolved_gig_id is null then
    raise exception using errcode='P0002', message='M7F_APPLICATION_QA_NOT_FOUND';
  end if;
  select g.* into locked_gig from public.gigs g
  where g.id = resolved_gig_id for update;
  select a.* into locked_application from public.applications a
  where a.id = p_application_id for update;
  actor_role := private.qa_participant_role(
    locked_application.id, locked_application.gig_id, p_acting_user_id
  );
  if actor_role is null then
    raise exception using errcode='P0002', message='M7F_APPLICATION_QA_NOT_FOUND';
  end if;

  effective_now := clock_timestamp();
  insert into public.application_qa_threads(
    application_id, gig_id, full_discussion_unlocked_at, created_at, updated_at
  ) values (
    locked_application.id, locked_application.gig_id,
    case when locked_application.stage = 'advanced' then effective_now else null end,
    effective_now, effective_now
  ) on conflict (application_id) do nothing;
  select q.* into locked_thread from public.application_qa_threads q
  where q.application_id = locked_application.id for update;

  fingerprint := private.qa_fingerprint(jsonb_strip_nulls(jsonb_build_object(
    'actor_user_id', p_acting_user_id, 'application_id', p_application_id,
    'operation', p_operation, 'topic', nullif(btrim(coalesce(p_topic, '')), ''),
    'other_topic_detail', nullif(btrim(coalesce(p_other_topic_detail, '')), ''),
    'body', nullif(btrim(coalesce(p_body, '')), ''),
    'target_message_id', p_target_message_id,
    'decline_reason_code', p_decline_reason_code,
    'decline_reason_detail', nullif(btrim(coalesce(p_decline_reason_detail, '')), '')
  )));
  replay := private.qa_replay(p_application_id, p_acting_user_id, p_request_id, fingerprint);
  if replay is not null then return replay; end if;

  if locked_gig.opportunity_lifecycle <> 'active'
     or locked_gig.operational_state <> 'active'
     or locked_application.stage not in ('under_review', 'advanced') then
    raise exception using errcode='P0001', message='M7F_QA_THREAD_READ_ONLY';
  end if;
  is_never_advanced := locked_thread.full_discussion_unlocked_at is null;

  if p_operation in ('initial_question', 'question', 'clarification') then
    if p_topic not in (
      'proposal_scope', 'budget', 'timeline', 'availability', 'relevant_experience',
      'included_work', 'excluded_work', 'technical_assumptions',
      'commercial_assumptions', 'other_job_related'
    ) or (p_topic = 'other_job_related'
      and not private.qa_valid_text(btrim(p_other_topic_detail), 3, 120, true))
      or (p_topic <> 'other_job_related' and p_other_topic_detail is not null) then
      raise exception using errcode='22023', message='M7F_QA_ACTION_NOT_ALLOWED';
    end if;
  elsif p_topic is not null or p_other_topic_detail is not null then
    raise exception using errcode='22023', message='M7F_QA_ACTION_NOT_ALLOWED';
  end if;

  if p_operation = 'decline' then
    if p_decline_reason_code not in (
      'outside_proposal_scope', 'requires_unpaid_work', 'sensitive_information',
      'not_comfortable_answering', 'insufficient_context', 'other'
    ) or (p_decline_reason_code = 'other'
      and not private.qa_valid_text(btrim(p_decline_reason_detail), 3, 400, true))
      or (p_decline_reason_code <> 'other'
        and p_decline_reason_detail is not null
        and not private.qa_valid_text(btrim(p_decline_reason_detail), 3, 400, true)) then
      raise exception using errcode='22023', message='M7F_INVALID_QUESTION_RESPONSE';
    end if;
  elsif p_decline_reason_code is not null or p_decline_reason_detail is not null then
    raise exception using errcode='22023', message='M7F_QA_ACTION_NOT_ALLOWED';
  end if;

  if p_operation <> 'decline'
     and not private.qa_valid_text(
       btrim(p_body), case when p_operation in ('initial_question', 'question') then 8 else 2 end,
       case when p_operation = 'initial_question' then 600 else 1200 end, true
     ) then
    raise exception using errcode='22023', message='M7F_QA_ACTION_NOT_ALLOWED';
  end if;
  if p_operation = 'decline' and p_body is not null
     and not private.qa_valid_text(btrim(p_body), 2, 400, true) then
    raise exception using errcode='22023', message='M7F_INVALID_QUESTION_RESPONSE';
  end if;

  safety_code := private.qa_safety_code(concat_ws(' ', p_body, p_other_topic_detail, p_decline_reason_detail));
  if safety_code is not null then
    raise exception using errcode='22023', message='M7F_MESSAGE_SAFETY:' || safety_code;
  end if;

  if p_operation = 'initial_question' then
    if actor_role <> 'client' or locked_application.stage <> 'under_review'
       or not is_never_advanced then
      raise exception using errcode='P0001', message='M7F_QA_ACTION_NOT_ALLOWED';
    end if;
    if locked_thread.pre_advance_stopped_at is not null then
      raise exception using errcode='P0001', message='M7F_PRE_ADVANCE_DISCUSSION_STOPPED';
    end if;
    if locked_thread.initial_client_turn_count >= 2 then
      raise exception using errcode='P0001', message='M7F_INITIAL_QUESTION_LIMIT_REACHED';
    end if;
    message_kind := 'initial_question';
  elsif p_operation in ('question', 'clarification') then
    if locked_application.stage <> 'advanced' then
      raise exception using errcode='P0001', message='M7F_QA_THREAD_READ_ONLY';
    end if;
    message_kind := p_operation;
  elsif p_operation in ('answer', 'decline') then
    select m.* into target from public.application_qa_messages m
    where m.application_id = locked_application.id and m.id = p_target_message_id
    for update;
    if target.id is null or target.message_kind not in ('initial_question', 'question')
       or target.sender_user_id = p_acting_user_id then
      raise exception using errcode='22023', message='M7F_INVALID_MESSAGE_REFERENCE';
    end if;
    if exists (
      select 1 from public.application_qa_messages r
      where r.application_id = locked_application.id
        and r.in_reply_to_message_id = target.id
        and r.message_kind in ('answer', 'decline')
    ) then
      raise exception using errcode='P0001', message='M7F_QUESTION_ALREADY_RESOLVED';
    end if;
    if target.message_kind = 'initial_question' then
      if actor_role <> 'freelancer' or locked_application.stage <> 'under_review'
         or not is_never_advanced then
        raise exception using errcode='P0001', message='M7F_QA_THREAD_READ_ONLY';
      end if;
    elsif locked_application.stage <> 'advanced' then
      raise exception using errcode='P0001', message='M7F_QA_THREAD_READ_ONLY';
    end if;
    message_kind := p_operation;
  else
    select m.* into target from public.application_qa_messages m
    where m.application_id = locked_application.id and m.id = p_target_message_id
    for update;
    if target.id is null or target.sender_user_id <> p_acting_user_id then
      raise exception using errcode='22023', message='M7F_INVALID_MESSAGE_REFERENCE';
    end if;
    if locked_application.stage = 'under_review' then
      if not is_never_advanced or locked_thread.pre_advance_stopped_at is not null then
        raise exception using errcode='P0001', message='M7F_QA_THREAD_READ_ONLY';
      end if;
      if actor_role = 'client' then
        if locked_thread.initial_client_turn_count >= 2 then
          raise exception using errcode='P0001', message='M7F_INITIAL_QUESTION_LIMIT_REACHED';
        end if;
      end if;
    elsif locked_application.stage <> 'advanced' then
      raise exception using errcode='P0001', message='M7F_QA_THREAD_READ_ONLY';
    end if;
    message_kind := 'correction';
  end if;

  retry_after := private.qa_retry_after(
    locked_application.id, p_acting_user_id, effective_now,
    p_burst_limit, p_burst_minutes, p_daily_limit
  );
  if retry_after > 0 then
    raise exception using errcode='P0001',
      message='M7F_QA_RATE_LIMITED:' || retry_after::text;
  end if;

  allocated_sequence := locked_thread.next_message_sequence;
  insert into public.application_qa_messages(
    id, application_id, gig_id, sequence_number, sender_user_id, sender_role,
    message_kind, topic, other_topic_detail, body, in_reply_to_message_id,
    corrects_message_id, decline_reason_code, decline_reason_detail,
    request_id, request_fingerprint, created_at
  ) values (
    message_id, locked_application.id, locked_application.gig_id, allocated_sequence,
    p_acting_user_id, actor_role, message_kind,
    case when message_kind in ('initial_question', 'question', 'clarification') then p_topic else null end,
    case when p_topic = 'other_job_related' then btrim(p_other_topic_detail) else null end,
    nullif(btrim(coalesce(p_body, '')), ''),
    case when message_kind in ('answer', 'decline') then target.id else null end,
    case when message_kind = 'correction' then target.id else null end,
    p_decline_reason_code, nullif(btrim(coalesce(p_decline_reason_detail, '')), ''),
    p_request_id, fingerprint, effective_now
  );

  update public.application_qa_threads
  set next_message_sequence = next_message_sequence + 1,
      initial_client_turn_count = initial_client_turn_count +
        case when actor_role = 'client' and locked_application.stage = 'under_review'
          and message_kind in ('initial_question', 'correction') then 1 else 0 end,
      updated_at = effective_now
  where application_id = locked_application.id;

  result := jsonb_build_object(
    'code', 'qa_message_created', 'application_id', locked_application.id,
    'message_id', message_id, 'sequence_number', allocated_sequence,
    'message_kind', message_kind, 'idempotent_replay', false
  );
  perform private.qa_record_operation(
    locked_application.id, locked_application.gig_id, p_acting_user_id,
    p_operation, p_request_id, fingerprint, result, effective_now
  );
  return result;
exception
  when unique_violation then
    if sqlerrm like '%primary_resolution%' then
      raise exception using errcode='P0001', message='M7F_QUESTION_ALREADY_RESOLVED';
    end if;
    raise;
end;
$$;

create or replace function public.qa_stop_pre_advancement(
  p_application_id uuid,
  p_acting_user_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_gig_id uuid; g public.gigs; a public.applications;
  q public.application_qa_threads; actor_role text; effective_now timestamptz;
  fingerprint text; replay jsonb; result jsonb;
begin
  if p_application_id is null or p_acting_user_id is null or p_request_id is null then
    raise exception using errcode='22023', message='M7F_QA_ACTION_NOT_ALLOWED';
  end if;
  select gig_id into resolved_gig_id from public.applications where id=p_application_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  select * into a from public.applications where id=p_application_id for update;
  actor_role:=private.qa_participant_role(a.id,a.gig_id,p_acting_user_id);
  if actor_role<>'freelancer' then raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND'; end if;
  effective_now:=clock_timestamp();
  insert into public.application_qa_threads(application_id,gig_id,created_at,updated_at)
  values(a.id,a.gig_id,effective_now,effective_now) on conflict(application_id) do nothing;
  select * into q from public.application_qa_threads where application_id=a.id for update;
  fingerprint:=private.qa_fingerprint(jsonb_build_object(
    'actor_user_id',p_acting_user_id,'application_id',p_application_id,
    'operation','stop_pre_advancement'
  ));
  replay:=private.qa_replay(a.id,p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  if q.pre_advance_stopped_at is not null then
    result:=jsonb_build_object('code','pre_advance_discussion_stopped',
      'application_id',a.id,'idempotent_replay',true);
    perform private.qa_record_operation(a.id,a.gig_id,p_acting_user_id,
      'stop_pre_advancement',p_request_id,fingerprint,result,effective_now);
    return result;
  end if;
  if a.stage<>'under_review' or q.full_discussion_unlocked_at is not null
     or g.opportunity_lifecycle<>'active' then
    raise exception using errcode='P0001',message='M7F_QA_ACTION_NOT_ALLOWED';
  end if;
  update public.application_qa_threads set
    pre_advance_stopped_at=effective_now,
    pre_advance_stopped_by_user_id=p_acting_user_id,
    updated_at=effective_now where application_id=a.id;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,event_payload,occurred_at
  ) values(
    'qa_pre_advance_discussion_stopped','participants','user',p_acting_user_id,
    a.gig_id,a.id,jsonb_build_object('thread_control','pre_advance_stopped'),effective_now
  );
  result:=jsonb_build_object('code','pre_advance_discussion_stopped',
    'application_id',a.id,'idempotent_replay',false);
  perform private.qa_record_operation(a.id,a.gig_id,p_acting_user_id,
    'stop_pre_advancement',p_request_id,fingerprint,result,effective_now);
  return result;
end;
$$;

create or replace function public.qa_report_message(
  p_application_id uuid,
  p_acting_user_id uuid,
  p_request_id uuid,
  p_message_id uuid,
  p_category text,
  p_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_gig_id uuid; a public.applications;
  target public.application_qa_messages;
  actor_role text; effective_now timestamptz; fingerprint text; replay jsonb;
  report_id uuid:=gen_random_uuid(); result jsonb;
begin
  if p_application_id is null or p_acting_user_id is null or p_request_id is null
     or p_message_id is null or p_category not in (
       'free_work_request','complete_solution_request','unpaid_design_request',
       'contact_information_request','banking_information_request',
       'credential_or_secret_request','harassment','spam',
       'suspicious_payment_request','other'
     )
     or (p_category='other' and not private.qa_valid_text(btrim(p_detail),3,600,true))
     or (p_category<>'other' and p_detail is not null) then
    raise exception using errcode='22023',message='M7F_QA_ACTION_NOT_ALLOWED';
  end if;
  select gig_id into resolved_gig_id from public.applications where id=p_application_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND'; end if;
  perform 1 from public.gigs where id=resolved_gig_id for update;
  select * into a from public.applications where id=p_application_id for update;
  actor_role:=private.qa_participant_role(a.id,a.gig_id,p_acting_user_id);
  if actor_role is null then raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND'; end if;
  effective_now:=clock_timestamp();
  insert into public.application_qa_threads(application_id,gig_id,created_at,updated_at)
  values(a.id,a.gig_id,effective_now,effective_now) on conflict(application_id) do nothing;
  perform 1 from public.application_qa_threads where application_id=a.id for update;
  select * into target from public.application_qa_messages
  where application_id=a.id and id=p_message_id for update;
  if target.id is null or target.sender_user_id=p_acting_user_id then
    raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND';
  end if;
  fingerprint:=private.qa_fingerprint(jsonb_strip_nulls(jsonb_build_object(
    'actor_user_id',p_acting_user_id,'application_id',a.id,'operation','report',
    'message_id',p_message_id,'category',p_category,'detail',nullif(btrim(coalesce(p_detail,'')),'')
  )));
  replay:=private.qa_replay(a.id,p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  if exists(select 1 from public.application_question_reports
      where reporter_user_id=p_acting_user_id and message_id=target.id) then
    raise exception using errcode='P0001',message='M7F_QA_ACTION_NOT_ALLOWED';
  end if;
  insert into public.application_question_reports(
    id,application_id,gig_id,message_id,reporter_user_id,category,detail,
    request_id,request_fingerprint,created_at
  ) values(
    report_id,a.id,a.gig_id,target.id,p_acting_user_id,p_category,
    nullif(btrim(coalesce(p_detail,'')),''),p_request_id,fingerprint,effective_now
  );
  result:=jsonb_build_object('code','question_reported','application_id',a.id,
    'message_id',target.id,'report_id',report_id,'idempotent_replay',false);
  perform private.qa_record_operation(a.id,a.gig_id,p_acting_user_id,
    'report',p_request_id,fingerprint,result,effective_now);
  return result;
end;
$$;

create or replace function public.revision_create_request(
  p_application_id uuid,
  p_acting_user_id uuid,
  p_request_id uuid,
  p_reason_code text,
  p_reason_detail text,
  p_expected_application_version_id uuid,
  p_expected_material_gig_version_id uuid,
  p_daily_limit integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_gig_id uuid; g public.gigs; sr public.selection_requests;
  a public.applications;
  actor_role text; effective_now timestamptz; fingerprint text; replay jsonb;
  revision_id uuid:=gen_random_uuid(); result jsonb; creation_count integer;
  oldest_creation timestamptz; retry_after integer;
begin
  if p_application_id is null or p_acting_user_id is null or p_request_id is null
     or p_expected_application_version_id is null or p_expected_material_gig_version_id is null
     or p_daily_limit not between 1 and 50
     or p_reason_code not in (
       'clarify_scope','revise_budget','revise_timeline','explain_exclusions',
       'update_availability','correct_assumptions','other'
     )
     or (p_reason_code='other' and not private.qa_valid_text(btrim(p_reason_detail),3,800,true))
     or (p_reason_code<>'other' and p_reason_detail is not null
       and not private.qa_valid_text(btrim(p_reason_detail),3,800,true)) then
    raise exception using errcode='22023',message='M7F_QA_ACTION_NOT_ALLOWED';
  end if;
  select gig_id into resolved_gig_id from public.applications where id=p_application_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  select * into sr from public.selection_requests
    where gig_id=g.id and application_id=p_application_id and status='pending'
    order by id limit 1 for update;
  select * into a from public.applications where id=p_application_id for update;
  actor_role:=private.qa_participant_role(a.id,a.gig_id,p_acting_user_id);
  if actor_role<>'client' then raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND'; end if;
  effective_now:=clock_timestamp();
  insert into public.application_qa_threads(
    application_id,gig_id,full_discussion_unlocked_at,created_at,updated_at
  ) values(a.id,a.gig_id,effective_now,effective_now,effective_now)
  on conflict(application_id) do nothing;
  perform 1 from public.application_qa_threads where application_id=a.id for update;
  fingerprint:=private.qa_fingerprint(jsonb_strip_nulls(jsonb_build_object(
    'actor_user_id',p_acting_user_id,'application_id',a.id,'operation','revision_create',
    'reason_code',p_reason_code,'reason_detail',nullif(btrim(coalesce(p_reason_detail,'')),''),
    'application_version_id',p_expected_application_version_id,
    'material_gig_version_id',p_expected_material_gig_version_id
  )));
  replay:=private.qa_replay(a.id,p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  if g.opportunity_lifecycle<>'active' or g.operational_state<>'active'
     or a.stage<>'advanced' then
    raise exception using errcode='P0001',message='M7F_REVISION_NOT_ACTIONABLE';
  end if;
  if a.current_version_id<>p_expected_application_version_id then
    raise exception using errcode='40001',message='M7F_STALE_APPLICATION_VERSION';
  end if;
  if g.current_material_gig_version_id<>p_expected_material_gig_version_id then
    raise exception using errcode='40001',message='M7F_STALE_GIG_VERSION';
  end if;
  if not exists(select 1 from public.application_versions av
      where av.id=a.current_version_id and av.gig_version_id=g.current_material_gig_version_id) then
    raise exception using errcode='P0001',message='M7F_REVISION_NOT_ACTIONABLE';
  end if;
  if sr.id is not null and sr.expires_at>effective_now then
    raise exception using errcode='P0001',message='M7F_PENDING_SELECTION_BLOCKS_REVISION';
  end if;
  if exists(select 1 from public.application_revision_requests
      where application_id=a.id and status='open') then
    raise exception using errcode='P0001',message='M7F_REVISION_ALREADY_OPEN';
  end if;
  if exists(select 1 from public.application_revision_requests
      where application_id=a.id and status='declined'
        and request_fingerprint=fingerprint) then
    raise exception using errcode='P0001',message='M7F_REVISION_NOT_ACTIONABLE';
  end if;
  select count(*),min(created_at) into creation_count,oldest_creation
  from public.application_revision_requests
  where application_id=a.id and created_by_user_id=p_acting_user_id
    and created_at>effective_now-interval '24 hours';
  if creation_count>=p_daily_limit then
    retry_after:=greatest(1,ceil(extract(epoch from
      (oldest_creation+interval '24 hours'-effective_now)))::integer);
    raise exception using errcode='P0001',
      message='M7F_QA_RATE_LIMITED:'||retry_after::text;
  end if;
  insert into public.application_revision_requests(
    id,application_id,gig_id,requested_application_version_id,
    requested_material_gig_version_id,created_by_user_id,reason_code,reason_detail,
    status,created_at,request_id,request_fingerprint
  ) values(
    revision_id,a.id,a.gig_id,a.current_version_id,g.current_material_gig_version_id,
    p_acting_user_id,p_reason_code,nullif(btrim(coalesce(p_reason_detail,'')),''),
    'open',effective_now,p_request_id,fingerprint
  );
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,event_payload,occurred_at
  ) values(
    'revision_request_created','participants','user',p_acting_user_id,a.gig_id,a.id,
    jsonb_build_object('revision_request_id',revision_id,
      'requested_application_version_id',a.current_version_id,
      'requested_material_gig_version_id',g.current_material_gig_version_id,
      'reason_code',p_reason_code),effective_now
  );
  result:=jsonb_build_object('code','revision_request_created','application_id',a.id,
    'revision_request_id',revision_id,'idempotent_replay',false);
  perform private.qa_record_operation(a.id,a.gig_id,p_acting_user_id,
    'revision_create',p_request_id,fingerprint,result,effective_now);
  return result;
end;
$$;

create or replace function public.revision_decline_request(
  p_application_id uuid,
  p_revision_request_id uuid,
  p_acting_user_id uuid,
  p_request_id uuid,
  p_reason_code text,
  p_reason_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_gig_id uuid; g public.gigs; a public.applications;
  rr public.application_revision_requests;
  actor_role text; effective_now timestamptz; fingerprint text; replay jsonb; result jsonb;
begin
  if p_application_id is null or p_revision_request_id is null
     or p_acting_user_id is null or p_request_id is null
     or p_reason_code not in (
       'scope_stands','budget_stands','timeline_stands','availability_unchanged',
       'request_unclear','unable_to_revise','other'
     )
     or (p_reason_code='other' and not private.qa_valid_text(btrim(p_reason_detail),3,600,true))
     or (p_reason_code<>'other' and p_reason_detail is not null
       and not private.qa_valid_text(btrim(p_reason_detail),3,600,true)) then
    raise exception using errcode='22023',message='M7F_INVALID_REVISION_RESPONSE';
  end if;
  select gig_id into resolved_gig_id from public.applications where id=p_application_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  select * into a from public.applications where id=p_application_id for update;
  actor_role:=private.qa_participant_role(a.id,a.gig_id,p_acting_user_id);
  if actor_role<>'freelancer' then raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND'; end if;
  effective_now:=clock_timestamp();
  insert into public.application_qa_threads(
    application_id,gig_id,full_discussion_unlocked_at,created_at,updated_at
  ) values(a.id,a.gig_id,case when a.stage='advanced' then effective_now end,effective_now,effective_now)
  on conflict(application_id) do nothing;
  perform 1 from public.application_qa_threads where application_id=a.id for update;
  select * into rr from public.application_revision_requests
  where application_id=a.id and id=p_revision_request_id for update;
  if rr.id is null then raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND'; end if;
  fingerprint:=private.qa_fingerprint(jsonb_strip_nulls(jsonb_build_object(
    'actor_user_id',p_acting_user_id,'application_id',a.id,'operation','revision_decline',
    'revision_request_id',rr.id,'reason_code',p_reason_code,
    'reason_detail',nullif(btrim(coalesce(p_reason_detail,'')),''),
    'application_version_id',a.current_version_id,
    'material_gig_version_id',g.current_material_gig_version_id
  )));
  replay:=private.qa_replay(a.id,p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  if rr.status<>'open' then raise exception using errcode='P0001',message='M7F_REVISION_SUPERSEDED'; end if;
  if g.opportunity_lifecycle<>'active' or g.operational_state<>'active'
     or a.stage<>'advanced' then
    raise exception using errcode='P0001',message='M7F_REVISION_NOT_ACTIONABLE';
  end if;
  if rr.requested_application_version_id<>a.current_version_id then
    raise exception using errcode='40001',message='M7F_STALE_APPLICATION_VERSION';
  end if;
  if rr.requested_material_gig_version_id<>g.current_material_gig_version_id then
    raise exception using errcode='40001',message='M7F_STALE_GIG_VERSION';
  end if;
  update public.application_revision_requests set
    status='declined',terminal_at=effective_now,response_by_user_id=p_acting_user_id,
    response_reason_code=p_reason_code,
    response_reason_detail=nullif(btrim(coalesce(p_reason_detail,'')),''),
    terminal_request_id=p_request_id,terminal_request_fingerprint=fingerprint
  where id=rr.id;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,event_payload,occurred_at
  ) values(
    'revision_request_declined','participants','user',p_acting_user_id,a.gig_id,a.id,
    jsonb_build_object('revision_request_id',rr.id,'reason_code',p_reason_code),effective_now
  );
  result:=jsonb_build_object('code','revision_request_declined','application_id',a.id,
    'revision_request_id',rr.id,'idempotent_replay',false);
  perform private.qa_record_operation(a.id,a.gig_id,p_acting_user_id,
    'revision_decline',p_request_id,fingerprint,result,effective_now);
  return result;
end;
$$;

create or replace function public.revision_submit_update(
  p_application_id uuid,
  p_revision_request_id uuid,
  p_acting_user_id uuid,
  p_request_id uuid,
  p_expected_application_version_token text,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_id uuid; resolved_gig_id uuid; g public.gigs; sr public.selection_requests;
  a public.applications;
  rr public.application_revision_requests; gv public.gig_versions;
  canonical jsonb; effective_now timestamptz; fingerprint text; replay jsonb;
  inserted record; result jsonb;
begin
  if p_application_id is null or p_revision_request_id is null
     or p_acting_user_id is null or p_request_id is null
     or btrim(coalesce(p_expected_application_version_token,''))=''
     or jsonb_typeof(p_snapshot) is distinct from 'object' then
    raise exception using errcode='22023',message='M7F_INVALID_REVISION_RESPONSE';
  end if;
  profile_id:=private.resolve_freelancer_profile(p_acting_user_id);
  select gig_id into resolved_gig_id from public.applications where id=p_application_id;
  if resolved_gig_id is null then raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND'; end if;
  select * into g from public.gigs where id=resolved_gig_id for update;
  select * into sr from public.selection_requests
    where gig_id=g.id and status='pending' order by id limit 1 for update;
  select * into a from public.applications where id=p_application_id for update;
  if not found or a.freelancer_profile_id<>profile_id then
    raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND';
  end if;
  effective_now:=clock_timestamp();
  insert into public.application_qa_threads(
    application_id,gig_id,full_discussion_unlocked_at,created_at,updated_at
  ) values(a.id,a.gig_id,case when a.stage='advanced' then effective_now end,effective_now,effective_now)
  on conflict(application_id) do nothing;
  perform 1 from public.application_qa_threads where application_id=a.id for update;
  select * into rr from public.application_revision_requests
  where application_id=a.id and id=p_revision_request_id for update;
  if rr.id is null then raise exception using errcode='P0002',message='M7F_APPLICATION_QA_NOT_FOUND'; end if;
  canonical:=private.canonicalize_application_json(p_snapshot);
  fingerprint:=private.qa_fingerprint(jsonb_build_object(
    'actor_user_id',p_acting_user_id,'application_id',a.id,
    'operation','revision_submit_update','revision_request_id',rr.id,
    'requested_application_version_id',rr.requested_application_version_id,
    'requested_material_gig_version_id',rr.requested_material_gig_version_id,
    'snapshot',canonical
  ));
  replay:=private.qa_replay(a.id,p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then return replay; end if;
  if rr.status<>'open' then raise exception using errcode='P0001',message='M7F_REVISION_SUPERSEDED'; end if;
  if g.opportunity_lifecycle<>'active' or g.operational_state<>'active'
     or a.stage<>'advanced' then
    raise exception using errcode='P0001',message='M7F_REVISION_NOT_ACTIONABLE';
  end if;
  if private.application_version_token(a.id,a.current_version_id)
      <>p_expected_application_version_token
     or rr.requested_application_version_id<>a.current_version_id then
    raise exception using errcode='40001',message='M7F_STALE_APPLICATION_VERSION';
  end if;
  if rr.requested_material_gig_version_id<>g.current_material_gig_version_id then
    raise exception using errcode='40001',message='M7F_STALE_GIG_VERSION';
  end if;
  select * into gv from public.gig_versions where id=g.current_material_gig_version_id;
  if not private.validate_application_snapshot(canonical,gv.terms_snapshot) then
    raise exception using errcode='22023',message='M7F_INVALID_REVISION_RESPONSE';
  end if;
  if sr.id is not null and sr.expires_at>effective_now and sr.application_id=a.id then
    update public.selection_requests set status='invalidated',terminal_at=effective_now,
      invalidation_reason='application_version_changed' where id=sr.id;
    insert into public.marketplace_events(
      event_type,visibility,actor_type,actor_user_id,gig_id,application_id,
      selection_request_id,event_payload,occurred_at
    ) values(
      'selection_request_invalidated_by_application_edit','participants','user',
      p_acting_user_id,g.id,a.id,sr.id,
      jsonb_build_object('reason','application_version_changed'),effective_now
    );
  end if;
  select * into inserted from private.insert_application_version(
    a.id,g.id,gv.id,'proposal_revision_response',canonical,p_acting_user_id,effective_now
  );
  update public.application_revision_requests set
    status='fulfilled',terminal_at=effective_now,
    response_application_version_id=inserted.version_id,
    response_by_user_id=p_acting_user_id,
    terminal_request_id=p_request_id,terminal_request_fingerprint=fingerprint
  where id=rr.id;
  update public.applications set current_version_id=inserted.version_id,
    last_updated_at=effective_now where id=a.id;
  insert into public.marketplace_events(
    event_type,visibility,actor_type,actor_user_id,gig_id,application_id,event_payload,occurred_at
  ) values(
    'revision_request_fulfilled','participants','user',p_acting_user_id,g.id,a.id,
    jsonb_build_object('revision_request_id',rr.id,
      'previous_application_version_id',a.current_version_id,
      'response_application_version_id',inserted.version_id,
      'version_number',inserted.version_number,
      'material_gig_version_id',gv.id),effective_now
  );
  result:=jsonb_build_object('code','revision_request_fulfilled','application_id',a.id,
    'revision_request_id',rr.id,'application_version_id',inserted.version_id,
    'version_number',inserted.version_number,'idempotent_replay',false);
  perform private.qa_record_operation(a.id,a.gig_id,p_acting_user_id,
    'revision_submit_update',p_request_id,fingerprint,result,effective_now);
  return result;
end;
$$;

create or replace function private.sync_application_qa_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare effective_now timestamptz; rr record; closure_status text; event_type text;
begin
  effective_now:=coalesce(new.stage_changed_at,clock_timestamp());
  if new.stage='advanced' and new.stage is distinct from old.stage then
    insert into public.application_qa_threads(
      application_id,gig_id,full_discussion_unlocked_at,created_at,updated_at
    ) values(new.id,new.gig_id,effective_now,effective_now,effective_now)
    on conflict(application_id) do update set
      full_discussion_unlocked_at=coalesce(
        public.application_qa_threads.full_discussion_unlocked_at,
        excluded.full_discussion_unlocked_at
      ),
      updated_at=greatest(public.application_qa_threads.updated_at,excluded.updated_at);
  end if;
  if new.stage is distinct from old.stage and new.stage<>'advanced' then
    closure_status:='closed_by_stage_change';
    event_type:='revision_request_closed_by_stage_change';
  elsif new.current_version_id is distinct from old.current_version_id then
    closure_status:='superseded';
    event_type:='revision_request_superseded';
  else
    return new;
  end if;
  for rr in
    select id from public.application_revision_requests
    where application_id=new.id and status='open' order by id for update
  loop
    update public.application_revision_requests set
      status=closure_status,terminal_at=effective_now where id=rr.id;
    insert into public.marketplace_events(
      event_type,visibility,actor_type,actor_user_id,gig_id,application_id,event_payload,occurred_at
    ) values(
      event_type,'participants',
      case when new.stage_changed_by_user_id is null then 'system' else 'user' end,
      new.stage_changed_by_user_id,new.gig_id,new.id,
      jsonb_build_object('revision_request_id',rr.id,'status',closure_status),effective_now
    );
  end loop;
  return new;
end;
$$;

create trigger sync_application_qa_lifecycle
after update of stage, current_version_id on public.applications
for each row execute function private.sync_application_qa_lifecycle();

create or replace function private.sync_gig_revision_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare effective_now timestamptz; rr record; closure_status text; event_type text;
begin
  if new.opportunity_lifecycle in ('filled','cancelled')
     and new.opportunity_lifecycle is distinct from old.opportunity_lifecycle then
    closure_status:='closed_by_gig_state';
    event_type:='revision_request_closed_by_gig_state';
  elsif new.current_material_gig_version_id is distinct from old.current_material_gig_version_id then
    closure_status:='superseded';
    event_type:='revision_request_superseded';
  else
    return new;
  end if;
  perform a.id from public.applications a
  where a.gig_id=new.id order by a.id for update;
  effective_now:=clock_timestamp();
  for rr in
    select id,application_id from public.application_revision_requests
    where gig_id=new.id and status='open' order by id for update
  loop
    update public.application_revision_requests set
      status=closure_status,terminal_at=effective_now where id=rr.id;
    insert into public.marketplace_events(
      event_type,visibility,actor_type,actor_user_id,gig_id,application_id,event_payload,occurred_at
    ) values(
      event_type,'participants','system',null,new.id,rr.application_id,
      jsonb_build_object('revision_request_id',rr.id,'status',closure_status),effective_now
    );
  end loop;
  return new;
end;
$$;

create trigger sync_gig_revision_lifecycle
after update of opportunity_lifecycle, current_material_gig_version_id on public.gigs
for each row execute function private.sync_gig_revision_lifecycle();

revoke all on function public.qa_write_message(
    uuid,uuid,uuid,text,text,text,text,uuid,text,text,integer,integer,integer
  ),
  public.qa_stop_pre_advancement(uuid,uuid,uuid),
  public.qa_report_message(uuid,uuid,uuid,uuid,text,text),
  public.revision_create_request(uuid,uuid,uuid,text,text,uuid,uuid,integer),
  public.revision_decline_request(uuid,uuid,uuid,uuid,text,text),
  public.revision_submit_update(uuid,uuid,uuid,uuid,text,jsonb)
from public, anon, authenticated;

grant execute on function public.qa_write_message(
    uuid,uuid,uuid,text,text,text,text,uuid,text,text,integer,integer,integer
  ),
  public.qa_stop_pre_advancement(uuid,uuid,uuid),
  public.qa_report_message(uuid,uuid,uuid,uuid,text,text),
  public.revision_create_request(uuid,uuid,uuid,text,text,uuid,uuid,integer),
  public.revision_decline_request(uuid,uuid,uuid,uuid,text,text),
  public.revision_submit_update(uuid,uuid,uuid,uuid,text,jsonb)
to service_role;

comment on table public.application_qa_threads is
'Lazy application-specific Q&A control projection. No message or proposal bodies.';
comment on table public.application_qa_messages is
'Immutable participant structured Q&A history ordered by per-application sequence.';
comment on table public.application_question_reports is
'Immutable reporter-private question reports; unavailable to browser roles.';
comment on table public.application_revision_requests is
'Structured revision lifecycle bound to exact application and material gig versions.';
comment on function public.qa_write_message(
  uuid,uuid,uuid,text,text,text,text,uuid,text,text,integer,integer,integer
) is
'Backend-only structured message mutation with idempotency, safety, allowance and rate enforcement.';
comment on function public.revision_submit_update(uuid,uuid,uuid,uuid,text,jsonb) is
'Backend-only linked proposal revision using the verified 7D snapshot validator and version inserter.';

commit;
