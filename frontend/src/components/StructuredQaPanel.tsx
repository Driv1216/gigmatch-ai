import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "./Button";
import { ChoiceGroup } from "./ChoiceGroup";
import { GigSelect } from "./GigSelect";
import { revisionEditPath } from "../lib/applicationEditMode";
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
import type { QaMessage, RevisionRequest } from "../lib/qaContracts";
import {
  chronologicalMessages,
  likelySensitiveContent,
  messageRelationship,
  qaBlockerLabel,
  qaCanCompose,
  qaErrorMessage,
  qaModeDescription,
  qaModeLabel,
  qaPanelState,
  questionResolutionIds,
  requiresAuthoritativeRefresh,
  revisionConsequence,
  revisionStatusLabel,
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

const declineReasons = [
  "outside_proposal_scope",
  "requires_unpaid_work",
  "sensitive_information",
  "not_comfortable_answering",
  "insufficient_context",
  "other",
] as const;

const revisionReasons = [
  "clarify_scope",
  "revise_budget",
  "revise_timeline",
  "explain_exclusions",
  "update_availability",
  "correct_assumptions",
  "other",
] as const;

const revisionDeclineReasons = [
  "scope_stands",
  "budget_stands",
  "timeline_stands",
  "availability_unchanged",
  "request_unclear",
  "unable_to_revise",
  "other",
] as const;

type StructuredQaPanelProps = {
  applicationId: string;
  authorityRefreshKey?: number;
  onAttentionChange?: () => void;
};

export function StructuredQaPanel({ applicationId, authorityRefreshKey = 0, onAttentionChange }: StructuredQaPanelProps) {
  const [thread, setThread] = useState<QaThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<(typeof topics)[number]>("proposal_scope");
  const [otherTopic, setOtherTopic] = useState("");
  const [kind, setKind] = useState<"question" | "clarification">("question");
  const [draft, setDraft] = useState("");
  const [composerRequestId, setComposerRequestId] = useState(newOperationId);
  const [responseTarget, setResponseTarget] = useState<QaMessage | null>(null);
  const [responseMode, setResponseMode] = useState<"answer" | "decline">("answer");
  const [responseDraft, setResponseDraft] = useState("");
  const [responseRequestId, setResponseRequestId] = useState(newOperationId);
  const [declineReason, setDeclineReason] = useState<(typeof declineReasons)[number]>("insufficient_context");
  const [reportTarget, setReportTarget] = useState<QaMessage | null>(null);
  const [reportCategory, setReportCategory] = useState<(typeof reportCategories)[number]>("free_work_request");
  const [reportDetail, setReportDetail] = useState("");
  const [reportRequestId, setReportRequestId] = useState(newOperationId);
  const [correctionTarget, setCorrectionTarget] = useState<QaMessage | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState("");
  const [correctionRequestId, setCorrectionRequestId] = useState(newOperationId);
  const [stopRequestId, setStopRequestId] = useState(newOperationId);
  const [revisionReason, setRevisionReason] = useState<(typeof revisionReasons)[number]>("clarify_scope");
  const [revisionDetail, setRevisionDetail] = useState("");
  const [revisionCreateRequestId, setRevisionCreateRequestId] = useState(newOperationId);
  const [revisionDeclineReason, setRevisionDeclineReason] = useState<(typeof revisionDeclineReasons)[number]>("request_unclear");
  const [revisionDeclineDetail, setRevisionDeclineDetail] = useState("");
  const [revisionDeclineRequestId, setRevisionDeclineRequestId] = useState(newOperationId);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const authorityRefreshRef = useRef(authorityRefreshKey);

  const load = useCallback(async () => {
    const value = await fetchQaThread(applicationId);
    setThread(value);
    return value;
  }, [applicationId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setThread(null);
    setError(null);
    setResponseTarget(null);
    setReportTarget(null);
    setCorrectionTarget(null);
    setDraft("");
    setResponseDraft("");
    setReportDetail("");
    setCorrectionDraft("");
    setRevisionDetail("");
    setComposerRequestId(newOperationId());
    setResponseRequestId(newOperationId());
    setReportRequestId(newOperationId());
    setCorrectionRequestId(newOperationId());
    setStopRequestId(newOperationId());
    setRevisionCreateRequestId(newOperationId());
    setRevisionDeclineRequestId(newOperationId());
    load()
      .catch((value) => { if (active) setError(qaErrorMessage(value)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (authorityRefreshRef.current === authorityRefreshKey) return;
    authorityRefreshRef.current = authorityRefreshKey;
    void load().catch((value: unknown) => setError(qaErrorMessage(value)));
  }, [authorityRefreshKey, load]);

  async function mutate(action: () => Promise<QaThread>, afterSuccess?: () => void) {
    setWorking(true);
    setError(null);
    try {
      setThread(await action());
      afterSuccess?.();
      onAttentionChange?.();
    } catch (value) {
      setError(qaErrorMessage(value));
      if (requiresAuthoritativeRefresh(value)) await load().catch(() => undefined);
    } finally {
      setWorking(false);
    }
  }

  function rememberTrigger(element: HTMLElement) {
    returnFocusRef.current = element;
  }

  function closeAction(close: () => void) {
    close();
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }

  async function submitComposer(event: FormEvent) {
    event.preventDefault();
    const current = thread?.application_id === applicationId ? thread : null;
    if (!current || !draft.trim()) return;
    if (likelySensitiveContent(`${draft} ${otherTopic}`)) {
      setError("Contact, credential, or financial identifiers may not be shared before an engagement. This advisory check did not send or consume your draft.");
      return;
    }
    const payload = {
      request_id: composerRequestId,
      topic,
      other_topic_detail: topic === "other_job_related" ? otherTopic.trim() : undefined,
      body: draft.trim(),
    };
    const effectiveKind = current.mode === "advanced_discussion" ? kind : "question";
    await mutate(
      effectiveKind === "clarification"
        ? () => addClarification(applicationId, payload)
        : () => askQuestion(applicationId, payload),
      () => {
        setDraft("");
        setOtherTopic("");
        setComposerRequestId(newOperationId());
      },
    );
  }

  async function submitResponse(event: FormEvent) {
    event.preventDefault();
    if (!responseTarget) return;
    if (responseMode === "answer" && likelySensitiveContent(responseDraft)) {
      setError("Contact, credential, or financial identifiers may not be shared before an engagement. This advisory check did not send or consume your response.");
      return;
    }
    await mutate(
      () => responseMode === "answer"
        ? answerQuestion(applicationId, responseTarget.id, {
            request_id: responseRequestId,
            body: responseDraft.trim(),
          })
        : declineQuestion(applicationId, responseTarget.id, {
            request_id: responseRequestId,
            reason_code: declineReason,
            note: responseDraft.trim() || undefined,
          }),
      () => {
        setResponseTarget(null);
        setResponseDraft("");
        setResponseRequestId(newOperationId());
        closeAction(() => undefined);
      },
    );
  }

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    if (!reportTarget) return;
    await mutate(
      () => reportMessage(applicationId, reportTarget.id, {
        request_id: reportRequestId,
        category: reportCategory,
        detail: reportCategory === "other" ? reportDetail.trim() : undefined,
      }),
      () => {
        setReportTarget(null);
        setReportDetail("");
        setReportRequestId(newOperationId());
        closeAction(() => undefined);
      },
    );
  }

  async function submitCorrection(event: FormEvent) {
    event.preventDefault();
    if (!correctionTarget || !correctionDraft.trim()) return;
    if (likelySensitiveContent(correctionDraft)) {
      setError("Contact, credential, or financial identifiers may not be shared before an engagement. This advisory check did not send or consume your correction.");
      return;
    }
    await mutate(
      () => correctMessage(applicationId, correctionTarget.id, {
        request_id: correctionRequestId,
        body: correctionDraft.trim(),
      }),
      () => {
        setCorrectionTarget(null);
        setCorrectionDraft("");
        setCorrectionRequestId(newOperationId());
        closeAction(() => undefined);
      },
    );
  }

  async function loadOlder() {
    if (!thread?.pagination.before_sequence) return;
    setWorking(true);
    setError(null);
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

  const visibleThread = thread?.application_id === applicationId ? thread : null;
  const viewState = qaPanelState(loading, visibleThread);
  if (viewState === "loading") return <QaState title="Loading structured workflow" body="Retrieving discussion mode, permanent allowance, attention, immutable history, and revision authority…" />;
  if (viewState === "error" || !visibleThread) return <QaState title="Structured Q&A unavailable" body={error ?? "The application-specific workflow could not be loaded."} error onRetry={() => void load()} />;

  const ordered = chronologicalMessages(visibleThread.messages);
  const resolvedQuestionIds = questionResolutionIds(ordered);
  const canCompose = qaCanCompose(visibleThread);
  const historicalRevisions = visibleThread.revision_history.filter((request) => request.id !== visibleThread.open_revision_request?.id);

  return (
    <section className="stage-six-workspace" aria-labelledby={`qa-${applicationId}-title`}>
      <header className="stage-six-header">
        <div>
          <span>Stage 6 / Application-specific structured workflow</span>
          <h2 id={`qa-${applicationId}-title`}>Structured Q&amp;A and proposal revision</h2>
          <p>Focused questions produce structured responses, declines, or append-only corrections. This is not chat.</p>
        </div>
        <dl>
          <Fact label="Participant" value={label(visibleThread.viewer_role)} />
          <Fact label="Application stage" value={label(visibleThread.current_application_stage)} />
        </dl>
      </header>

      {error ? <div className="stage-six-notice is-error" role="alert"><strong>Operation stopped</strong><p>{error}</p><small>The local draft and operation identity remain available for deliberate review.</small></div> : null}

      <section className="stage-six-state-board" aria-labelledby={`qa-${applicationId}-state`}>
        <header><span>01 / Discussion state</span><h3 id={`qa-${applicationId}-state`}>{qaModeLabel(visibleThread.mode)}</h3><p>{qaModeDescription(visibleThread.mode)}</p></header>
        <div className="stage-six-state-grid">
          <article><small>Permanent pre-advancement allowance</small><strong>{visibleThread.initial_question_allowance.remaining} remaining</strong><p>{visibleThread.initial_question_allowance.used} of {visibleThread.initial_question_allowance.limit} server-counted turns used across this application history. Eligible client corrections consume the same allowance.</p></article>
          <article><small>Response attention</small><strong>{visibleThread.pending_question_count} for you</strong><p>{visibleThread.pending_question_count_for_other_participant} awaiting the other participant. These are pending responses—not unread messages.</p></article>
          <article><small>Latest projected activity</small><strong>{formatDate(visibleThread.latest_qa_activity_at)}</strong><p>Counts come from the complete backend summary, including unresolved questions outside the loaded message page.</p></article>
        </div>
        {visibleThread.blockers.length ? <div className="stage-six-blocker-strip"><strong>Current server-projected controls</strong>{visibleThread.blockers.map((code) => <span key={code}>{qaBlockerLabel(code)}</span>)}</div> : null}
      </section>

      {(responseTarget || correctionTarget || reportTarget) ? (
        <section className="stage-six-action-region" aria-label="Current structured action">
          {responseTarget ? (
            <InlineForm
              title={`${responseMode === "answer" ? "Answer" : "Decline"} question #${responseTarget.sequence_number}`}
              eyebrow="Required response / One primary resolution"
              onSubmit={submitResponse}
              onCancel={() => closeAction(() => setResponseTarget(null))}
              working={working}
              submitDisabled={responseMode === "answer" ? responseDraft.trim().length < 2 : declineReason === "other" && responseDraft.trim().length < 2}
            >
              {responseMode === "decline" ? <SelectField label="Structured decline reason" value={declineReason} onChange={(value) => setDeclineReason(value as (typeof declineReasons)[number])} values={declineReasons} /> : null}
              <TextAreaField autoFocus label={responseMode === "answer" ? "Structured answer" : declineReason === "other" ? "Required explanation" : "Optional note"} value={responseDraft} onChange={setResponseDraft} maxLength={responseMode === "answer" ? 1200 : 400} />
              <p className="stage-six-form-note">A decline resolves this question only. It does not withdraw, rank, or change the application proposal.</p>
            </InlineForm>
          ) : null}
          {correctionTarget ? (
            <InlineForm title={`Correction to message #${correctionTarget.sequence_number}`} eyebrow="Append-only correction" onSubmit={submitCorrection} onCancel={() => closeAction(() => setCorrectionTarget(null))} working={working} submitDisabled={correctionDraft.trim().length < 2}>
              <p className="stage-six-form-note">The original remains immutable and visible. Before advancement, an authorized client correction consumes the same permanent allowance.</p>
              <TextAreaField autoFocus label="Corrected statement" value={correctionDraft} onChange={setCorrectionDraft} maxLength={1200} />
            </InlineForm>
          ) : null}
          {reportTarget ? (
            <InlineForm title={`Private report for message #${reportTarget.sequence_number}`} eyebrow="Private safety record" onSubmit={submitReport} onCancel={() => closeAction(() => setReportTarget(null))} working={working} submitDisabled={reportCategory === "other" && reportDetail.trim().length < 3}>
              <p className="stage-six-form-note">The original message remains visible. Reporting does not alter ranking, application state, proposal truth, or automatically punish the other participant.</p>
              <SelectField autoFocus label="Report category" value={reportCategory} onChange={(value) => setReportCategory(value as (typeof reportCategories)[number])} values={reportCategories} />
              {reportCategory === "other" ? <TextAreaField autoFocus label="Required private detail" value={reportDetail} onChange={setReportDetail} maxLength={600} /> : null}
            </InlineForm>
          ) : null}
        </section>
      ) : null}

      {canCompose ? (
        <form onSubmit={submitComposer} className="stage-six-composer">
          <header><span>02 / Authorized composer</span><h3>{visibleThread.mode === "initial_clarification" ? "Use one focused clarification turn" : "Add a structured discussion entry"}</h3><p>Server permission, allowance, rate limits, exact time, and write sequence are rechecked on submission.</p></header>
          <div className="stage-six-form-grid">
            {visibleThread.mode === "advanced_discussion" ? <ChoiceGroup legend="Entry type" name="qa_entry_type" value={kind} onValueChange={setKind} options={[{ value: "question", label: "Question" }, { value: "clarification", label: "Clarification" }]} /> : null}
            <SelectField label="One job-related topic" value={topic} onChange={(value) => setTopic(value as (typeof topics)[number])} values={topics} />
          </div>
          {topic === "other_job_related" ? <InputField label="Short topic description" value={otherTopic} onChange={setOtherTopic} maxLength={120} /> : null}
          <TextAreaField label="Focused plain-text entry" value={draft} onChange={setDraft} maxLength={visibleThread.mode === "initial_clarification" ? 600 : 1200} />
          <footer><p>Advisory checks flag high-confidence contact, credential, secret, bank, and payment identifiers. Backend validation remains authoritative; no AI moderation claim is made.</p><Button type="submit" disabled={working || draft.trim().length < 8 || (topic === "other_job_related" && otherTopic.trim().length < 3)}>{working ? "Submitting…" : kind === "clarification" && visibleThread.mode === "advanced_discussion" ? "Add clarification" : "Send structured question"}</Button></footer>
        </form>
      ) : null}

      <section className="stage-six-history" aria-labelledby={`qa-${applicationId}-history`}>
        <header><span>03 / Immutable communication</span><h3 id={`qa-${applicationId}-history`}>Sequence-ordered history</h3><p>Source → response → consequence relationships use server sequence numbers. Committed entries cannot be edited or deleted.</p></header>
        {ordered.length ? (
          <ol>
            {ordered.map((message) => {
              const relationship = messageRelationship(message, ordered);
              const unresolved = (message.message_kind === "initial_question" || message.message_kind === "question") && !resolvedQuestionIds.has(message.id);
              return (
                <li key={message.id} className={`stage-six-message is-${message.message_kind}`}>
                  <div className="stage-six-message-index"><span>#{message.sequence_number}</span><small>{label(message.message_kind)}</small></div>
                  <article>
                    <header><div><span>{message.is_mine ? "You" : label(message.sender_role)}</span>{message.topic ? <strong>{label(message.topic)}</strong> : null}</div><time dateTime={message.created_at}>{formatDate(message.created_at)}</time></header>
                    {relationship ? <p className="stage-six-relationship">{relationship}</p> : null}
                    {message.body ? <p className="stage-six-message-body">{message.body}</p> : null}
                    {message.message_kind === "decline" ? <p className="stage-six-message-body is-decline"><strong>Structured decline:</strong> {label(message.decline_reason_code ?? "declined")}{message.decline_reason_detail ? ` — ${message.decline_reason_detail}` : ""}</p> : null}
                    <footer>
                      {unresolved ? <span className="stage-six-resolution-state">Awaiting one primary response</span> : null}
                      {!message.is_mine && unresolved && visibleThread.permissions.answer_question ? <button type="button" onClick={(event) => { rememberTrigger(event.currentTarget); setResponseTarget(message); setResponseMode("answer"); setResponseDraft(""); setResponseRequestId(newOperationId()); }}>Answer</button> : null}
                      {!message.is_mine && unresolved && visibleThread.permissions.decline_question ? <button type="button" onClick={(event) => { rememberTrigger(event.currentTarget); setResponseTarget(message); setResponseMode("decline"); setResponseDraft(""); setResponseRequestId(newOperationId()); }}>Decline</button> : null}
                      {message.is_mine && visibleThread.permissions.correct_own_message ? <button type="button" onClick={(event) => { rememberTrigger(event.currentTarget); setCorrectionTarget(message); setCorrectionDraft(""); setCorrectionRequestId(newOperationId()); }}>Append correction</button> : null}
                      {!message.is_mine && visibleThread.permissions.report_message && !message.reported_by_viewer ? <button type="button" onClick={(event) => { rememberTrigger(event.currentTarget); setReportTarget(message); setReportDetail(""); setReportRequestId(newOperationId()); }}>Report privately</button> : null}
                      {message.reported_by_viewer ? <span>Reported privately by you</span> : null}
                    </footer>
                  </article>
                </li>
              );
            })}
          </ol>
        ) : <div className="stage-six-empty"><strong>No structured entries yet</strong><p>The thread projection remains authoritative and the immutable message row is created only by a successful action.</p></div>}
        {visibleThread.pagination.has_more ? <footer className="stage-six-history-pagination"><Button type="button" variant="secondary" disabled={working} onClick={() => void loadOlder()}>Load earlier sequence</Button><p>Cursor {visibleThread.pagination.before_sequence ?? "unavailable"}; no array-index sequence is invented.</p></footer> : null}
      </section>

      {visibleThread.permissions.stop_pre_advancement ? (
        <section className="stage-six-stop-board">
          <div><span>Freelancer control</span><h3>Stop new pre-advancement client turns</h3><p>Open questions remain resolvable. This does not withdraw the application, block the client, change suitability or proposal truth, or prevent later Advanced discussion when the backend authorizes it.</p></div>
          <Button type="button" variant="secondary" disabled={working} onClick={() => void mutate(() => stopPreAdvancement(applicationId, stopRequestId), () => setStopRequestId(newOperationId()))}>Stop pre-advancement turns</Button>
        </section>
      ) : null}

      <section className="stage-six-proposal-boundary" aria-labelledby={`qa-${applicationId}-proposal`}>
        <span>04 / Official proposal authority</span>
        <h3 id={`qa-${applicationId}-proposal`}>Discussion does not modify the official proposal.</h3>
        <p>{visibleThread.proposal_authority_notice}</p>
        <small>Price, scope, timeline, availability, application version, and gig binding change only through a complete validated proposal workflow.</small>
      </section>

      <section className="stage-six-revision-board" aria-labelledby={`qa-${applicationId}-revisions`}>
        <header><span>05 / Exact-version workflow</span><h3 id={`qa-${applicationId}-revisions`}>Proposal revision</h3><p>One structured request may be actionable at a time. Historical requests remain readable without exposing action tokens.</p></header>
        {visibleThread.open_revision_request ? (
          <RevisionCard
            thread={visibleThread}
            revision={visibleThread.open_revision_request}
            working={working}
            declineReason={revisionDeclineReason}
            declineDetail={revisionDeclineDetail}
            setDeclineReason={setRevisionDeclineReason}
            setDeclineDetail={setRevisionDeclineDetail}
            onDecline={() => void mutate(
              () => declineRevisionRequest(applicationId, visibleThread.open_revision_request!.id, {
                request_id: revisionDeclineRequestId,
                reason_code: revisionDeclineReason,
                reason_detail: revisionDeclineReason === "other" ? revisionDeclineDetail.trim() : undefined,
              }),
              () => {
                setRevisionDeclineDetail("");
                setRevisionDeclineRequestId(newOperationId());
              },
            )}
          />
        ) : <div className="stage-six-revision-empty"><strong>No open revision request</strong><p>The current proposal remains official. Historical lifecycle records appear below.</p></div>}

        {visibleThread.permissions.create_revision_request ? (
          <form className="stage-six-revision-create" onSubmit={(event) => {
            event.preventDefault();
            void mutate(
              () => createRevisionRequest(applicationId, {
                request_id: revisionCreateRequestId,
                reason_code: revisionReason,
                reason_detail: revisionDetail.trim() || undefined,
                expected_application_version_id: visibleThread.current_application_version_id,
                expected_material_gig_version_id: visibleThread.current_material_gig_version_id,
              }),
              () => {
                setRevisionDetail("");
                setRevisionCreateRequestId(newOperationId());
              },
            );
          }}>
            <div><span>Client-authorized action</span><h4>Request a complete proposal revision</h4><p>The backend rechecks Advanced stage, exact current versions, gig state, material response, selection, open-request, rate, and idempotency authority.</p></div>
            <SelectField label="Revision reason" value={revisionReason} onChange={(value) => setRevisionReason(value as (typeof revisionReasons)[number])} values={revisionReasons} />
            <InputField label={revisionReason === "other" ? "Required bounded detail" : "Optional bounded detail"} value={revisionDetail} onChange={setRevisionDetail} maxLength={800} />
            <Button type="submit" disabled={working || (revisionReason === "other" && revisionDetail.trim().length < 3)}>Send revision request</Button>
          </form>
        ) : null}

        {historicalRevisions.length ? (
          <div className="stage-six-revision-history"><h4>Revision lifecycle history</h4><ol>{historicalRevisions.map((request) => <RevisionHistoryRow key={request.id} request={request} />)}</ol></div>
        ) : null}
      </section>
    </section>
  );
}

function RevisionCard({
  thread,
  revision,
  working,
  declineReason,
  declineDetail,
  setDeclineReason,
  setDeclineDetail,
  onDecline,
}: {
  thread: QaThread;
  revision: RevisionRequest;
  working: boolean;
  declineReason: (typeof revisionDeclineReasons)[number];
  declineDetail: string;
  setDeclineReason: (value: (typeof revisionDeclineReasons)[number]) => void;
  setDeclineDetail: (value: string) => void;
  onDecline: () => void;
}) {
  return (
    <article className="stage-six-open-revision">
      <header><span>{revisionStatusLabel(revision.status)}</span><h4>{label(revision.reason_code)}</h4><time dateTime={revision.created_at}>{formatDate(revision.created_at)}</time></header>
      {revision.reason_detail ? <p>{revision.reason_detail}</p> : null}
      <dl><Fact label="Proposal binding" value="Exact requested application version" /><Fact label="Gig binding" value="Exact requested material version" /></dl>
      <p className="stage-six-revision-consequence">{revisionConsequence(revision)}</p>
      {thread.permissions.respond_to_revision_request ? (
        <div className="stage-six-revision-response">
          <SelectField label="Structured decline reason" value={declineReason} onChange={(value) => setDeclineReason(value as (typeof revisionDeclineReasons)[number])} values={revisionDeclineReasons} />
          {declineReason === "other" ? <InputField label="Required decline detail" value={declineDetail} onChange={setDeclineDetail} maxLength={600} /> : null}
          <div><Button type="button" variant="secondary" disabled={working || (declineReason === "other" && declineDetail.trim().length < 3)} onClick={onDecline}>Decline revision request</Button><Button to={revisionEditPath(thread.application_id, revision.id)}>Submit complete updated proposal</Button></div>
          <small>Declining creates no application version. Submitting an update opens the complete Stage 6 proposal form.</small>
        </div>
      ) : null}
    </article>
  );
}

function RevisionHistoryRow({ request }: { request: RevisionRequest }) {
  return <li><div><span>{revisionStatusLabel(request.status)}</span><strong>{label(request.reason_code)}</strong></div><time dateTime={request.terminal_at ?? request.created_at}>{formatDate(request.terminal_at ?? request.created_at)}</time><p>{revisionConsequence(request)}</p>{request.response_reason_code ? <small>Response: {label(request.response_reason_code)}{request.response_reason_detail ? ` — ${request.response_reason_detail}` : ""}</small> : null}</li>;
}

function InlineForm({ title, eyebrow, onSubmit, onCancel, working, submitDisabled = false, children }: {
  title: string;
  eyebrow: string;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  working: boolean;
  submitDisabled?: boolean;
  children: ReactNode;
}) {
  return <form onSubmit={onSubmit} className="stage-six-inline-form"><header><span>{eyebrow}</span><h3>{title}</h3></header>{children}<footer><Button type="submit" disabled={working || submitDisabled}>{working ? "Saving…" : "Confirm structured action"}</Button><Button type="button" variant="secondary" disabled={working} onClick={onCancel}>Cancel</Button></footer></form>;
}

function QaState({ title, body, error = false, onRetry }: { title: string; body: string; error?: boolean; onRetry?: () => void }) {
  return <section className={`stage-six-state-panel${error ? " is-error" : ""}`} role={error ? "alert" : "status"} aria-busy={!error}><span>Structured Q&amp;A / Proposal revision</span><h2>{title}</h2><p>{body}</p>{onRetry ? <Button type="button" variant="secondary" onClick={onRetry}>Retry authoritative load</Button> : null}</section>;
}

function SelectField({ label: title, value, onChange, values, autoFocus = false }: { label: string; value: string; onChange: (value: string) => void; values: readonly string[]; autoFocus?: boolean }) {
  return <label className="stage-six-field"><span>{title}</span><GigSelect autoFocus={autoFocus} value={value} onValueChange={onChange} options={values.map((item) => ({ value: item, label: label(item) }))} /></label>;
}

function InputField({ label: title, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength: number }) {
  return <label className="stage-six-field"><span>{title}</span><input value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} /></label>;
}

function TextAreaField({ label: title, value, onChange, maxLength, autoFocus = false }: { label: string; value: string; onChange: (value: string) => void; maxLength: number; autoFocus?: boolean }) {
  return <label className="stage-six-field"><span>{title}</span><textarea autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} rows={4} maxLength={maxLength} /></label>;
}

function Fact({ label: title, value }: { label: string; value: string }) {
  return <div><dt>{title}</dt><dd>{value}</dd></div>;
}

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "No activity recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

function newOperationId(): string {
  return crypto.randomUUID();
}
