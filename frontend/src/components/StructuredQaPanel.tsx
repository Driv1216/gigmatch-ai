import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "./Button";
import {
  addClarification,
  answerQuestion,
  askQuestion,
  correctMessage,
  createRevisionRequest,
  declineQuestion,
  declineRevisionRequest,
  fetchQaThread,
  reportMessage,
  stopPreAdvancement,
  type QaThread,
} from "../lib/qa";
import type { QaMessage } from "../lib/qaContracts";
import {
  chronologicalMessages,
  likelySensitiveContent,
  qaCanCompose,
  qaErrorMessage,
  qaModeLabel,
  qaPanelState,
  requiresAuthoritativeRefresh,
} from "../lib/qaView";

const topics = [
  "proposal_scope",
  "budget",
  "timeline",
  "availability",
  "relevant_experience",
  "included_work",
  "excluded_work",
  "technical_assumptions",
  "commercial_assumptions",
  "other_job_related",
] as const;

const reportCategories = [
  "free_work_request",
  "complete_solution_request",
  "unpaid_design_request",
  "contact_information_request",
  "banking_information_request",
  "credential_or_secret_request",
  "harassment",
  "spam",
  "suspicious_payment_request",
  "other",
] as const;

type StructuredQaPanelProps = {
  applicationId: string;
  onAttentionChange?: () => void;
};

export function StructuredQaPanel({
  applicationId,
  onAttentionChange,
}: StructuredQaPanelProps) {
  const [thread, setThread] = useState<QaThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<(typeof topics)[number]>("proposal_scope");
  const [otherTopic, setOtherTopic] = useState("");
  const [kind, setKind] = useState<"question" | "clarification">("question");
  const [draft, setDraft] = useState("");
  const [composerRequestId, setComposerRequestId] = useState(() => crypto.randomUUID());
  const [responseTarget, setResponseTarget] = useState<QaMessage | null>(null);
  const [responseMode, setResponseMode] = useState<"answer" | "decline">("answer");
  const [responseDraft, setResponseDraft] = useState("");
  const [declineReason, setDeclineReason] = useState("insufficient_context");
  const [reportTarget, setReportTarget] = useState<QaMessage | null>(null);
  const [reportCategory, setReportCategory] = useState<(typeof reportCategories)[number]>("free_work_request");
  const [reportDetail, setReportDetail] = useState("");
  const [correctionTarget, setCorrectionTarget] = useState<QaMessage | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState("");
  const [revisionReason, setRevisionReason] = useState("clarify_scope");
  const [revisionDetail, setRevisionDetail] = useState("");
  const [revisionDeclineReason, setRevisionDeclineReason] = useState("request_unclear");

  const load = useCallback(async () => {
    const value = await fetchQaThread(applicationId);
    setThread(value);
    return value;
  }, [applicationId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .catch((value) => { if (active) setError(qaErrorMessage(value)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  async function mutate(action: () => Promise<QaThread>, afterSuccess?: () => void) {
    setWorking(true);
    setError(null);
    try {
      setThread(await action());
      afterSuccess?.();
      onAttentionChange?.();
    } catch (value) {
      setError(qaErrorMessage(value));
      if (requiresAuthoritativeRefresh(value)) {
        await load().catch(() => undefined);
      }
    } finally {
      setWorking(false);
    }
  }

  async function submitComposer(event: FormEvent) {
    event.preventDefault();
    if (!thread || !draft.trim()) return;
    if (likelySensitiveContent(`${draft} ${otherTopic}`)) {
      setError("Contact, credential, or financial identifiers cannot be shared before an engagement. Edit the draft to continue.");
      return;
    }
    const payload = {
      request_id: composerRequestId,
      topic,
      other_topic_detail: topic === "other_job_related" ? otherTopic.trim() : undefined,
      body: draft.trim(),
    };
    const action = kind === "clarification"
      ? () => addClarification(applicationId, payload)
      : () => askQuestion(applicationId, payload);
    await mutate(action, () => {
      setDraft("");
      setOtherTopic("");
      setComposerRequestId(crypto.randomUUID());
    });
  }

  async function submitResponse(event: FormEvent) {
    event.preventDefault();
    if (!responseTarget) return;
    const requestId = crypto.randomUUID();
    if (responseMode === "answer" && likelySensitiveContent(responseDraft)) {
      setError("Contact, credential, or financial identifiers cannot be shared before an engagement. Edit the response to continue.");
      return;
    }
    await mutate(
      () => responseMode === "answer"
        ? answerQuestion(applicationId, responseTarget.id, {
            request_id: requestId,
            body: responseDraft.trim(),
          })
        : declineQuestion(applicationId, responseTarget.id, {
            request_id: requestId,
            reason_code: declineReason,
            note: responseDraft.trim() || undefined,
          }),
      () => {
        setResponseTarget(null);
        setResponseDraft("");
      },
    );
  }

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    if (!reportTarget) return;
    await mutate(
      () => reportMessage(applicationId, reportTarget.id, {
        request_id: crypto.randomUUID(),
        category: reportCategory,
        detail: reportCategory === "other" ? reportDetail.trim() : undefined,
      }),
      () => {
        setReportTarget(null);
        setReportDetail("");
      },
    );
  }

  async function submitCorrection(event: FormEvent) {
    event.preventDefault();
    if (!correctionTarget || !correctionDraft.trim()) return;
    if (likelySensitiveContent(correctionDraft)) {
      setError("Contact, credential, or financial identifiers cannot be shared before an engagement. Edit the correction to continue.");
      return;
    }
    await mutate(
      () => correctMessage(applicationId, correctionTarget.id, {
        request_id: crypto.randomUUID(),
        body: correctionDraft.trim(),
      }),
      () => {
        setCorrectionTarget(null);
        setCorrectionDraft("");
      },
    );
  }

  async function loadOlder() {
    if (!thread?.pagination.before_sequence) return;
    setWorking(true);
    try {
      const older = await fetchQaThread(applicationId, thread.pagination.before_sequence);
      const byId = new Map([...thread.messages, ...older.messages].map((message) => [message.id, message]));
      setThread({
        ...older,
        messages: [...byId.values()].sort((a, b) => b.sequence_number - a.sequence_number),
      });
    } catch (value) {
      setError(qaErrorMessage(value));
    } finally {
      setWorking(false);
    }
  }

  const viewState = qaPanelState(loading, thread);
  if (viewState === "loading") {
    return <section aria-busy="true" className="rounded-lg border border-line bg-white p-6"><p className="text-sm text-muted">Loading structured Q&amp;A…</p></section>;
  }
  if (viewState === "error" || !thread) {
    return <section className="rounded-lg border border-red-200 bg-red-50 p-6" role="alert"><h2 className="font-bold text-red-900">Structured Q&amp;A unavailable</h2><p className="mt-2 text-sm text-red-700">{error}</p></section>;
  }

  const ordered = chronologicalMessages(thread.messages);
  const resolvedQuestionIds = new Set(
    ordered.flatMap((message) => message.in_reply_to_message_id ? [message.in_reply_to_message_id] : []),
  );
  const canCompose = qaCanCompose(thread);

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <header className="border-b border-line bg-slate-50 px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Application-specific workspace</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Structured Q&amp;A</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{thread.proposal_authority_notice}</p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-sm font-semibold text-ink">{qaModeLabel(thread.mode)}</p>
            <p className="mt-1 text-xs text-muted">
              {thread.initial_question_allowance.used} of {thread.initial_question_allowance.limit} initial client turns used
            </p>
          </div>
        </div>
      </header>

      {error ? <div role="alert" className="border-b border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-950">{error}</div> : null}
      {thread.blockers.length ? (
        <div className="border-b border-line px-6 py-4">
          <p className="text-sm font-semibold text-ink">Current controls</p>
          <p className="mt-1 text-sm text-muted">{thread.blockers.map(label).join(" · ")}</p>
        </div>
      ) : null}

      {thread.open_revision_request ? (
        <RevisionCard
          thread={thread}
          working={working}
          declineReason={revisionDeclineReason}
          setDeclineReason={setRevisionDeclineReason}
          onDecline={() => void mutate(() => declineRevisionRequest(
            applicationId,
            thread.open_revision_request!.id,
            { request_id: crypto.randomUUID(), reason_code: revisionDeclineReason },
          ))}
        />
      ) : null}

      <div className="px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-ink">Preserved message history</h3>
          {thread.pending_question_count > 0 ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              {thread.pending_question_count} response{thread.pending_question_count === 1 ? "" : "s"} requested
            </span>
          ) : null}
        </div>
        {ordered.length ? (
          <ol className="mt-4 divide-y divide-line border-y border-line">
            {ordered.map((message) => (
              <li key={message.id} className="py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-accent">{label(message.message_kind)}</span>
                  {message.topic ? <span className="rounded bg-slate-100 px-2 py-1 text-xs text-muted">{label(message.topic)}</span> : null}
                  <span className="text-xs text-muted">{message.is_mine ? "You" : label(message.sender_role)} · {formatDate(message.created_at)}</span>
                </div>
                {message.body ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{message.body}</p> : null}
                {message.message_kind === "decline" ? <p className="mt-3 text-sm text-muted">Declined · {label(message.decline_reason_code ?? "")}{message.decline_reason_detail ? ` — ${message.decline_reason_detail}` : ""}</p> : null}
                {message.corrects_message_id ? <p className="mt-2 text-xs text-muted">Correction to message #{sequenceFor(ordered, message.corrects_message_id)}</p> : null}
                {message.in_reply_to_message_id ? <p className="mt-2 text-xs text-muted">Response to question #{sequenceFor(ordered, message.in_reply_to_message_id)}</p> : null}
                <div className="mt-3 flex flex-wrap gap-3">
                  {!message.is_mine && message.message_kind.includes("question") &&
                  !resolvedQuestionIds.has(message.id) && thread.permissions.answer_question ? (
                    <>
                      <button type="button" className="text-sm font-semibold text-brand" onClick={() => { setResponseTarget(message); setResponseMode("answer"); }}>Answer</button>
                      {thread.permissions.decline_question ? <button type="button" className="text-sm font-semibold text-muted" onClick={() => { setResponseTarget(message); setResponseMode("decline"); }}>Decline</button> : null}
                    </>
                  ) : null}
                  {message.is_mine && thread.permissions.correct_own_message ? (
                    <button type="button" className="text-sm font-semibold text-muted" onClick={() => { setCorrectionTarget(message); setCorrectionDraft(""); }}>Add correction</button>
                  ) : null}
                  {!message.is_mine && thread.permissions.report_message && !message.reported_by_viewer ? (
                    <button type="button" className="text-sm font-semibold text-muted" onClick={() => setReportTarget(message)}>Report privately</button>
                  ) : null}
                  {message.reported_by_viewer ? <span className="text-xs font-semibold text-muted">Reported privately</span> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : <div className="mt-4 rounded-md border border-dashed border-line p-6 text-sm text-muted">No messages yet. The thread row remains lazy until the first action.</div>}
        {thread.pagination.has_more ? <div className="mt-4"><Button variant="secondary" disabled={working} onClick={() => void loadOlder()}>Load earlier messages</Button></div> : null}
      </div>

      {responseTarget ? (
        <InlineForm title={`${responseMode === "answer" ? "Answer" : "Decline"} question #${responseTarget.sequence_number}`} onSubmit={submitResponse} onCancel={() => setResponseTarget(null)} working={working}>
          {responseMode === "decline" ? (
            <label className="block text-sm font-semibold text-ink">Reason
              <select value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} className={controlClass}>
                {["outside_proposal_scope", "requires_unpaid_work", "sensitive_information", "not_comfortable_answering", "insufficient_context", "other"].map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </select>
            </label>
          ) : null}
          <label className="block text-sm font-semibold text-ink">{responseMode === "answer" ? "Structured answer" : "Optional note"}
            <textarea value={responseDraft} onChange={(event) => setResponseDraft(event.target.value)} rows={4} maxLength={responseMode === "answer" ? 1200 : 400} className={controlClass} />
          </label>
        </InlineForm>
      ) : null}

      {correctionTarget ? (
        <InlineForm title={`Correction to message #${correctionTarget.sequence_number}`} onSubmit={submitCorrection} onCancel={() => setCorrectionTarget(null)} working={working}>
          <p className="text-sm text-muted">The original stays in history. A correction never edits or hides it.</p>
          <textarea value={correctionDraft} onChange={(event) => setCorrectionDraft(event.target.value)} rows={4} maxLength={1200} className={controlClass} />
        </InlineForm>
      ) : null}

      {reportTarget ? (
        <InlineForm title={`Private report for message #${reportTarget.sequence_number}`} onSubmit={submitReport} onCancel={() => setReportTarget(null)} working={working}>
          <p className="text-sm text-muted">The other participant will not receive your category or detail. Reporting does not automatically alter the application.</p>
          <label className="block text-sm font-semibold text-ink">Category
            <select value={reportCategory} onChange={(event) => setReportCategory(event.target.value as (typeof reportCategories)[number])} className={controlClass}>
              {reportCategories.map((value) => <option key={value} value={value}>{label(value)}</option>)}
            </select>
          </label>
          {reportCategory === "other" ? <textarea value={reportDetail} onChange={(event) => setReportDetail(event.target.value)} rows={3} maxLength={600} className={controlClass} /> : null}
        </InlineForm>
      ) : null}

      {canCompose ? (
        <form onSubmit={submitComposer} className="border-t border-line bg-slate-50 px-6 py-5">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {thread.mode === "advanced_discussion" ? (
                <label className="block text-sm font-semibold text-ink">Message type
                  <select value={kind} onChange={(event) => setKind(event.target.value as "question" | "clarification")} className={controlClass}>
                    <option value="question">Structured question</option>
                    <option value="clarification">Clarification</option>
                  </select>
                </label>
              ) : null}
              <label className="block text-sm font-semibold text-ink">One job-related topic
                <select value={topic} onChange={(event) => setTopic(event.target.value as (typeof topics)[number])} className={controlClass}>
                  {topics.map((value) => <option key={value} value={value}>{label(value)}</option>)}
                </select>
              </label>
            </div>
            {topic === "other_job_related" ? <input value={otherTopic} onChange={(event) => setOtherTopic(event.target.value)} maxLength={120} placeholder="Short topic description" className={controlClass} /> : null}
            <label className="block text-sm font-semibold text-ink">Focused plain-text message
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} maxLength={thread.mode === "initial_clarification" ? 600 : 1200} className={controlClass} />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-xs leading-5 text-muted">Do not share contact details, external communication links, passwords, OTPs, tokens, banking details, or payment identifiers.</p>
              <Button type="submit" disabled={working || draft.trim().length < 8}>{working ? "Sending…" : kind === "clarification" ? "Add clarification" : "Send question"}</Button>
            </div>
          </div>
        </form>
      ) : null}

      {thread.permissions.stop_pre_advancement ? (
        <div className="border-t border-line px-6 py-4">
          <button
            type="button"
            disabled={working}
            onClick={() => void mutate(() => stopPreAdvancement(applicationId, crypto.randomUUID()))}
            className="text-sm font-semibold text-muted underline underline-offset-4"
          >
            Stop further pre-advancement discussion
          </button>
          <p className="mt-1 text-xs text-muted">Existing unanswered questions can still be answered or declined. This does not withdraw the application.</p>
        </div>
      ) : null}

      {thread.permissions.create_revision_request ? (
        <form
          className="border-t border-line px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            void mutate(() => createRevisionRequest(applicationId, {
              request_id: crypto.randomUUID(),
              reason_code: revisionReason,
              reason_detail: revisionDetail.trim() || undefined,
              expected_application_version_id: thread.current_application_version_id,
              expected_material_gig_version_id: thread.current_material_gig_version_id,
            }), () => setRevisionDetail(""));
          }}
        >
          <h3 className="font-bold text-ink">Request an official proposal revision</h3>
          <p className="mt-2 text-sm text-muted">The current proposal stays authoritative until the freelancer submits a complete validated version.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <select value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)} className={controlClass}>
              {["clarify_scope", "revise_budget", "revise_timeline", "explain_exclusions", "update_availability", "correct_assumptions", "other"].map((value) => <option key={value} value={value}>{label(value)}</option>)}
            </select>
            <input value={revisionDetail} onChange={(event) => setRevisionDetail(event.target.value)} maxLength={800} placeholder={revisionReason === "other" ? "Required detail" : "Optional bounded detail"} className={controlClass} />
          </div>
          <div className="mt-4"><Button type="submit" disabled={working || (revisionReason === "other" && !revisionDetail.trim())}>Send revision request</Button></div>
        </form>
      ) : null}
    </section>
  );
}

function RevisionCard({
  thread,
  working,
  declineReason,
  setDeclineReason,
  onDecline,
}: {
  thread: QaThread;
  working: boolean;
  declineReason: string;
  setDeclineReason: (value: string) => void;
  onDecline: () => void;
}) {
  const revision = thread.open_revision_request;
  if (!revision) return null;
  return (
    <section className="border-b border-blue-200 bg-blue-50 px-6 py-5">
      <p className="text-xs font-semibold uppercase text-brand">Open proposal-revision request</p>
      <h3 className="mt-1 font-bold text-ink">{label(revision.reason_code)}</h3>
      {revision.reason_detail ? <p className="mt-2 text-sm text-muted">{revision.reason_detail}</p> : null}
      <p className="mt-2 text-xs text-muted">Targets exact application version {shortId(revision.requested_application_version_id)}. The old proposal remains active.</p>
      {thread.permissions.respond_to_revision_request ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold text-ink">Decline reason
            <select value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} className={controlClass}>
              {["scope_stands", "budget_stands", "timeline_stands", "availability_unchanged", "request_unclear", "unable_to_revise"].map((value) => <option key={value} value={value}>{label(value)}</option>)}
            </select>
          </label>
          <Button variant="secondary" disabled={working} onClick={onDecline}>Decline request</Button>
          <Button to={`/applications/${thread.application_id}/edit?mode=revision&revisionRequestId=${revision.id}`}>Open complete proposal update</Button>
        </div>
      ) : null}
    </section>
  );
}

function InlineForm({
  title,
  onSubmit,
  onCancel,
  working,
  children,
}: {
  title: string;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  working: boolean;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 border-t border-line bg-slate-50 px-6 py-5">
      <h3 className="font-bold text-ink">{title}</h3>
      {children}
      <div className="flex gap-3">
        <Button type="submit" disabled={working}>{working ? "Saving…" : "Confirm"}</Button>
        <Button type="button" variant="secondary" disabled={working} onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

function sequenceFor(messages: QaMessage[], id: string): number | string {
  return messages.find((message) => message.id === id)?.sequence_number ?? "earlier";
}

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

const controlClass = "mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent";
