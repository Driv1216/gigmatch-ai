import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "./Button";
import {
  cancelSelectionRequest,
  fetchSelectionContext,
  fetchSelectionRequest,
  fetchSelectionRequestHistory,
  respondToSelectionRequest,
  SelectionApiError,
  sendSelectionRequest,
  type SelectionContext,
  type SelectionRequestDetail,
  type SelectionRequestHistory,
} from "../lib/selection";
import {
  humanize,
  informationalRemaining,
  operationKey,
  SELECTION_DURATION_OPTIONS,
  SelectionOperationRegistry,
  selectionAuthorityLabels,
  selectionHistoryConsequence,
  structuredValue,
  versionBoundary,
  type SelectionOperation,
} from "../lib/selectionView";

const cancellationReasons = [
  "terms_require_review",
  "gig_being_paused",
  "client_withdrew_request",
  "other",
] as const;
const withdrawalReasons = [
  "accepted_another_opportunity",
  "no_longer_available",
  "scope_or_terms_no_longer_fit",
  "timeline_changed",
  "budget_expectations_mismatch",
  "gig_changed_materially",
  "personal_circumstances",
  "other",
] as const;
const changeCategories = [
  "scope",
  "budget",
  "payment_structure",
  "timeline",
  "availability",
  "assumptions",
] as const;

type SelectionAction = "cancel" | "accept" | "decline-remain" | "decline-withdraw" | "revised-terms";

type SelectionPanelProps = {
  applicationId: string;
  authorityRefreshKey?: number;
  onChanged?: () => void | Promise<void>;
};

export function SelectionPanel({ applicationId, authorityRefreshKey = 0, onChanged }: SelectionPanelProps) {
  const [context, setContext] = useState<SelectionContext | null>(null);
  const [history, setHistory] = useState<SelectionRequestHistory | null>(null);
  const [requestDetails, setRequestDetails] = useState<SelectionRequestDetail[]>([]);
  const [duration, setDuration] = useState(48);
  const [acknowledged, setAcknowledged] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>("client_withdrew_request");
  const [cancelDetail, setCancelDetail] = useState("");
  const [declineDetail, setDeclineDetail] = useState("");
  const [withdrawReason, setWithdrawReason] = useState<string>("no_longer_available");
  const [withdrawDetail, setWithdrawDetail] = useState("");
  const [revisionDetail, setRevisionDetail] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeAction, setActiveAction] = useState<SelectionAction | null>(null);
  const [working, setWorking] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [remaining, setRemaining] = useState("");
  const [error, setError] = useState<string | null>(null);
  const operationIdsRef = useRef(new SelectionOperationRegistry(() => crypto.randomUUID()));
  const actionTriggerRef = useRef<HTMLElement | null>(null);
  const loadSequenceRef = useRef(0);
  const authorityRefreshRef = useRef(authorityRefreshKey);

  const load = useCallback(async () => {
    const sequence = ++loadSequenceRef.current;
    const [nextContext, nextHistory] = await Promise.all([
      fetchSelectionContext(applicationId),
      fetchSelectionRequestHistory(applicationId),
    ]);
    const detailIds = new Set(nextHistory.items.map((item) => item.selection_request_id));
    if (nextContext.active_request_id) detailIds.add(nextContext.active_request_id);
    if (nextContext.latest_request_id) detailIds.add(nextContext.latest_request_id);
    const nextDetails = await Promise.all([...detailIds].map(fetchSelectionRequest));
    if (sequence !== loadSequenceRef.current) return;
    setContext(nextContext);
    setHistory(nextHistory);
    setRequestDetails(nextDetails);
    setCheckingStatus(false);
  }, [applicationId]);

  useEffect(() => {
    let active = true;
    operationIdsRef.current.reset();
    setContext(null);
    setHistory(null);
    setRequestDetails([]);
    setActiveAction(null);
    setDuration(48);
    setAcknowledged(false);
    setError(null);
    load().catch((value: unknown) => {
      if (active) setError(selectionErrorMessage(value));
    });
    return () => {
      active = false;
      loadSequenceRef.current += 1;
    };
  }, [load]);

  useEffect(() => {
    if (authorityRefreshRef.current === authorityRefreshKey) return;
    authorityRefreshRef.current = authorityRefreshKey;
    void load().catch((value: unknown) => setError(selectionErrorMessage(value)));
  }, [authorityRefreshKey, load]);

  const activeRequestId = context?.active_request_id ?? context?.latest_request_id ?? null;
  const request = requestDetails.find((item) => item.selection_request_id === activeRequestId) ?? null;

  useEffect(() => {
    if (!request || request.status !== "pending") {
      setRemaining("");
      return;
    }
    const startedAt = performance.now();
    let refreshStarted = false;
    const refreshCountdown = () => {
      const presentation = informationalRemaining(
        request.expires_at,
        request.authoritative_now,
        performance.now() - startedAt,
      );
      setRemaining(presentation.label);
      if (presentation.reached && !refreshStarted) {
        refreshStarted = true;
        setCheckingStatus(true);
        void load().catch((value: unknown) => setError(selectionErrorMessage(value)));
      }
    };
    refreshCountdown();
    const timer = window.setInterval(refreshCountdown, 30_000);
    return () => window.clearInterval(timer);
  }, [load, request]);

  function openAction(action: SelectionAction, trigger: HTMLElement) {
    actionTriggerRef.current = trigger;
    setActiveAction(action);
  }

  function closeAction() {
    setActiveAction(null);
    window.requestAnimationFrame(() => actionTriggerRef.current?.focus());
  }

  function requestIdFor(key: string): string {
    return operationIdsRef.current.get(key);
  }

  async function run(
    operation: SelectionOperation,
    aggregateId: string,
    meaningfulInput: unknown,
    action: (requestId: string) => Promise<Record<string, unknown>>,
  ) {
    const key = operationKey(operation, aggregateId, meaningfulInput);
    setWorking(true);
    setError(null);
    try {
      await action(requestIdFor(key));
      operationIdsRef.current.settle(key);
      await load();
      await onChanged?.();
      setAcknowledged(false);
      setCancelDetail("");
      setDeclineDetail("");
      setWithdrawDetail("");
      setRevisionDetail("");
      setSelectedCategories([]);
      closeAction();
    } catch (value) {
      setError(selectionErrorMessage(value));
      if (value instanceof SelectionApiError && value.status === 409) {
        operationIdsRef.current.settle(key);
        await Promise.all([load().catch(() => undefined), Promise.resolve(onChanged?.())]);
      }
    } finally {
      setWorking(false);
    }
  }

  if (!context || !history) {
    return (
      <section className="selection-workspace selection-state" aria-busy="true" aria-live="polite">
        <p className="selection-kicker">Exact-version selection</p>
        <h2>Loading formal selection authority…</h2>
        {error ? <p role="alert" className="selection-notice is-error">{error}</p> : null}
      </section>
    );
  }

  const isClient = context.viewer_role === "client";
  const pending = request?.status === "pending";
  const canRespond = !isClient && pending && Boolean(request.response_token);
  const authority = selectionAuthorityLabels(context, request);
  const frozenSource = request ?? context;
  const applicationBoundary = versionBoundary(
    frozenSource.application_version_number,
    context.application_version_number,
    "Application",
  );
  const gigBoundary = versionBoundary(
    frozenSource.material_gig_version_number,
    context.material_gig_version_number,
    "Material gig",
  );

  return (
    <section className="selection-workspace" aria-labelledby="selection-title">
      <header className="selection-header">
        <div>
          <p className="selection-kicker">Stage 7 / Exact-version authority</p>
          <h2 id="selection-title">Formal selection request</h2>
          <p>One frozen source, one response window, one authoritative consequence.</p>
        </div>
        <div className="selection-authority-strip" aria-label="Application and selection status">
          <StatusBadge status={authority.application} />
          <StatusBadge status={authority.request} attention={pending} />
        </div>
      </header>

      {error ? <p role="alert" className="selection-notice is-error">{error}</p> : null}

      <section className="selection-source" aria-labelledby="selection-source-title">
        <header>
          <div>
            <p className="selection-kicker">Frozen source terms</p>
            <h3 id="selection-source-title">{request ? "Terms bound to this request" : "Current terms eligible for a request"}</h3>
          </div>
          <div className="selection-version-boundary">
            <VersionFact value={applicationBoundary.bound} changed={applicationBoundary.changed} current={applicationBoundary.current} />
            <VersionFact value={gigBoundary.bound} changed={gigBoundary.changed} current={gigBoundary.current} />
          </div>
        </header>
        {(applicationBoundary.changed || gigBoundary.changed) ? (
          <p className="selection-notice is-attention">
            The request remains an immutable record of its bound versions. Newer current terms are not substituted here.
          </p>
        ) : null}
        <ExactTerms
          proposal={frozenSource.proposal}
          timeline={frozenSource.timeline}
          availability={frozenSource.availability}
          scope={frozenSource.scope}
          scopeNotes={frozenSource.scope_notes}
          clientTerms={frozenSource.client_terms}
        />
      </section>

      {request ? (
        <section className="selection-window" aria-labelledby="selection-window-title">
          <div>
            <p className="selection-kicker">Authoritative response window</p>
            <h3 id="selection-window-title">Request timeline</h3>
          </div>
          <dl>
            <Fact label="Sent" value={<time dateTime={request.created_at}>{formatDate(request.created_at)}</time>} />
            <Fact label="Exact deadline" value={<time dateTime={request.expires_at}>{formatDate(request.expires_at)}</time>} />
            <Fact label="Current status" value={humanize(request.status)} />
          </dl>
          {pending ? (
            <p className="selection-countdown" aria-live="polite">
              {checkingStatus ? "Checking authoritative request status…" : remaining}
            </p>
          ) : null}
          {request.commercial_warning_code ? (
            <p className="selection-notice is-attention">
              Commercial warning acknowledged before send: {humanize(request.commercial_warning_code)}.
            </p>
          ) : null}
          {request.engagement ? (
            <div className="selection-engagement-summary">
              <div><p className="selection-kicker">Atomic confirmation complete</p><h3>Engagement confirmed</h3></div>
              <p>{humanize(request.engagement.status)} · <time dateTime={request.engagement.confirmed_at}>{formatDate(request.engagement.confirmed_at)}</time></p>
              <Button variant="secondary" to={`/engagements/${encodeURIComponent(request.engagement.engagement_id)}`}>Open Engagement Workspace</Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {isClient && !pending && context.can_send && context.send_token ? (
        <section className="selection-action-board" aria-labelledby="selection-send-title">
          <div>
            <p className="selection-kicker">Client request authority</p>
            <h3 id="selection-send-title">Send these exact terms</h3>
            <p>The request is bound to the versions above. It does not edit the proposal or create an engagement.</p>
          </div>
          <label>
            Response deadline
            <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
              {SELECTION_DURATION_OPTIONS.map((hours) => <option key={hours} value={hours}>{hours} hours{hours === 48 ? " · default" : ""}</option>)}
            </select>
          </label>
          {context.commercial_acknowledgement_required ? (
            <label className="selection-check">
              <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
              <span>I acknowledge {humanize(context.commercial_warning_code ?? "commercial warning")} and am sending these exact terms.</span>
            </label>
          ) : null}
          <ConsequenceList items={[
            "One formal request becomes Pending.",
            `The freelancer receives ${duration} hours to respond using server-authoritative time.`,
            "No second active selection request may coexist for this gig.",
          ]} />
          <Button
            disabled={working || (context.commercial_acknowledgement_required && !acknowledged)}
            onClick={() => void run("send", applicationId, { duration, acknowledged }, (requestId) => (
              sendSelectionRequest(applicationId, {
                duration_hours: duration,
                send_token: context.send_token,
                request_id: requestId,
                commercial_acknowledged: acknowledged,
              })
            ))}
          >
            {working ? "Sending exact request…" : "Send Exact-Version Request"}
          </Button>
        </section>
      ) : null}

      {isClient && pending && request?.management_token ? (
        <section className="selection-action-board is-management" aria-labelledby="selection-manage-title">
          <div><p className="selection-kicker">Client management authority</p><h3 id="selection-manage-title">Manage the pending request</h3><p>Cancellation ends only this request. It does not reject the freelancer or rewrite the proposal.</p></div>
          <Button variant="secondary" disabled={working} onClick={(event) => openAction("cancel", event.currentTarget)}>Review Request Cancellation</Button>
        </section>
      ) : null}

      {canRespond && request?.response_token ? (
        <section className="selection-response-board" aria-labelledby="selection-response-title">
          <header><p className="selection-kicker">Freelancer response authority</p><h3 id="selection-response-title">Choose one exact consequence</h3><p>Acceptance cannot add conditions. Editing the application may invalidate the pending request only through backend authority.</p></header>
          <div className="selection-response-grid">
            <ResponseChoice title="Accept Exact Terms" body="Confirm the frozen source and allow the server to complete the winner transaction atomically." onClick={(target) => openAction("accept", target)} disabled={working} />
            <ResponseChoice title="Decline while Remaining Interested" body="End this request while keeping the application Advanced and preserving proposal and Q&A history." onClick={(target) => openAction("decline-remain", target)} disabled={working} />
            <ResponseChoice title="Decline and Withdraw Completely" body="End this request and withdraw the application through the selection response—without a second withdrawal mutation." onClick={(target) => openAction("decline-withdraw", target)} disabled={working} />
            <ResponseChoice title="Request Revised Terms" body="End this selection request as Revised Terms Requested. This does not create a Stage 6 revision request or proposal version." onClick={(target) => openAction("revised-terms", target)} disabled={working} />
          </div>
        </section>
      ) : null}

      {isClient && context.blockers.length > 0 && !pending ? (
        <section className="selection-blockers" aria-labelledby="selection-blockers-title">
          <p className="selection-kicker">Server-projected blockers</p>
          <h3 id="selection-blockers-title">Selection request unavailable</h3>
          <ul>{context.blockers.map((blocker) => <li key={blocker}>{selectionMessage(blocker)}</li>)}</ul>
        </section>
      ) : null}

      <SelectionHistory history={history} details={requestDetails} />

      {activeAction && activeAction !== "cancel" && request?.response_token ? (
        <ResponseDialog
          action={activeAction}
          working={working}
          onDismiss={closeAction}
          declineDetail={declineDetail}
          setDeclineDetail={setDeclineDetail}
          withdrawReason={withdrawReason}
          setWithdrawReason={setWithdrawReason}
          withdrawDetail={withdrawDetail}
          setWithdrawDetail={setWithdrawDetail}
          revisionDetail={revisionDetail}
          setRevisionDetail={setRevisionDetail}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          request={request}
          onRun={run}
        />
      ) : activeAction === "cancel" && request?.management_token ? (
        <CancelDialog
          working={working}
          onDismiss={closeAction}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          detail={cancelDetail}
          setDetail={setCancelDetail}
          request={request}
          onRun={run}
        />
      ) : null}
    </section>
  );
}

type RunSelectionOperation = (
  operation: SelectionOperation,
  aggregateId: string,
  meaningfulInput: unknown,
  action: (requestId: string) => Promise<Record<string, unknown>>,
) => Promise<void>;

function CancelDialog({ working, onDismiss, cancelReason, setCancelReason, detail, setDetail, request, onRun }: {
  working: boolean;
  onDismiss: () => void;
  cancelReason: string;
  setCancelReason: (value: string) => void;
  detail: string;
  setDetail: (value: string) => void;
  request: SelectionRequestDetail;
  onRun: RunSelectionOperation;
}) {
  return (
    <SelectionDialog title="Cancel this selection request?" eyebrow="Client management consequence" confirmLabel="Cancel Selection Request" working={working} disabled={cancelReason === "other" && !detail.trim()} onDismiss={onDismiss} onConfirm={() => void onRun("cancel", request.selection_request_id, { cancelReason, detail: detail.trim() }, (requestId) => cancelSelectionRequest(request.selection_request_id, { management_token: request.management_token, request_id: requestId, reason_code: cancelReason, detail: detail.trim() || undefined }))}>
      <ConsequenceList items={["Request becomes Cancelled.", "Application remains Advanced.", "The freelancer is not rejected and frozen proposal history remains unchanged."]} />
      <SelectField label="Cancellation reason" value={cancelReason} onChange={setCancelReason} values={cancellationReasons} />
      <DetailInput value={detail} onChange={setDetail} required={cancelReason === "other"} />
    </SelectionDialog>
  );
}

function ResponseDialog({ action, working, onDismiss, declineDetail, setDeclineDetail, withdrawReason, setWithdrawReason, withdrawDetail, setWithdrawDetail, revisionDetail, setRevisionDetail, selectedCategories, setSelectedCategories, request, onRun }: {
  action: Exclude<SelectionAction, "cancel">;
  working: boolean;
  onDismiss: () => void;
  declineDetail: string;
  setDeclineDetail: (value: string) => void;
  withdrawReason: string;
  setWithdrawReason: (value: string) => void;
  withdrawDetail: string;
  setWithdrawDetail: (value: string) => void;
  revisionDetail: string;
  setRevisionDetail: (value: string) => void;
  selectedCategories: string[];
  setSelectedCategories: (value: string[] | ((current: string[]) => string[])) => void;
  request: SelectionRequestDetail;
  onRun: RunSelectionOperation;
}) {
  if (action === "accept") {
    return <SelectionDialog title="Accept Exact Terms" eyebrow="Atomic confirmation" confirmLabel="Confirm Exact Terms" working={working} onDismiss={onDismiss} onConfirm={() => void onRun("accept", request.selection_request_id, { exactTermsConfirmed: true }, (requestId) => respondToSelectionRequest(request.selection_request_id, "accept", { response_token: request.response_token, request_id: requestId, exact_terms_confirmed: true }))}><p>You cannot add conditions to this acceptance. It applies only to Application v{request.application_version_number} and Material gig v{request.material_gig_version_number}.</p><ConsequenceList items={["Request becomes Accepted.", "Selected application becomes Confirmed and gig becomes Filled.", "One engagement/current winner is created.", "Other active applicants receive authoritative Not Selected closure."]} /><p className="selection-dialog-caution">Nothing in the surrounding page changes until the server confirms the complete transaction.</p></SelectionDialog>;
  }
  if (action === "decline-remain") {
    return <SelectionDialog title="Decline while Remaining Interested" eyebrow="Request-only consequence" confirmLabel="Decline and Remain Interested" working={working} onDismiss={onDismiss} onConfirm={() => void onRun("decline-remain", request.selection_request_id, { detail: declineDetail.trim() }, (requestId) => respondToSelectionRequest(request.selection_request_id, "decline-remain-interested", { response_token: request.response_token, request_id: requestId, detail: declineDetail.trim() || undefined }))}><ConsequenceList items={["Request becomes Declined.", "Application remains Advanced.", "Proposal and structured Q&A history remain preserved."]} /><DetailInput value={declineDetail} onChange={setDeclineDetail} required={false} /></SelectionDialog>;
  }
  if (action === "decline-withdraw") {
    return <SelectionDialog title="Decline and Withdraw Completely" eyebrow="Terminal application consequence" confirmLabel="Decline and Withdraw Completely" working={working} disabled={withdrawReason === "other" && !withdrawDetail.trim()} onDismiss={onDismiss} onConfirm={() => void onRun("decline-withdraw", request.selection_request_id, { withdrawReason, detail: withdrawDetail.trim() }, (requestId) => respondToSelectionRequest(request.selection_request_id, "decline-withdraw", { response_token: request.response_token, request_id: requestId, reason_code: withdrawReason, detail: withdrawDetail.trim() || undefined }))}><ConsequenceList items={["Request becomes Declined.", "Application becomes Withdrawn.", "Existing terminal child-workflow effects follow backend authority; no separate withdrawal is sent."]} /><SelectField label="Withdrawal reason" value={withdrawReason} onChange={setWithdrawReason} values={withdrawalReasons} /><DetailInput value={withdrawDetail} onChange={setWithdrawDetail} required={withdrawReason === "other"} /></SelectionDialog>;
  }
  return <SelectionDialog title="Request Revised Terms" eyebrow="Selection response—not Stage 6 revision" confirmLabel="Request Revised Terms" working={working} disabled={selectedCategories.length === 0} onDismiss={onDismiss} onConfirm={() => void onRun("revised-terms", request.selection_request_id, { categories: [...selectedCategories].sort(), detail: revisionDetail.trim() }, (requestId) => respondToSelectionRequest(request.selection_request_id, "request-revised-terms", { response_token: request.response_token, request_id: requestId, change_categories: selectedCategories, detail: revisionDetail.trim() || undefined }))}><ConsequenceList items={["Selection request becomes Revised Terms Requested.", "Application remains Advanced.", "No Stage 6 revision request, editor route, or proposal version is created.", "A genuinely new application version is required before later reselection."]} /><fieldset className="selection-category-field"><legend>Terms that need revision</legend>{changeCategories.map((category) => <label key={category}><input type="checkbox" checked={selectedCategories.includes(category)} onChange={(event) => setSelectedCategories((current) => event.target.checked ? [...current, category] : current.filter((item) => item !== category))} /><span>{humanize(category)}</span></label>)}</fieldset><DetailInput value={revisionDetail} onChange={setRevisionDetail} required={false} /></SelectionDialog>;
}

function SelectionDialog({ title, eyebrow, confirmLabel, working, disabled = false, onDismiss, onConfirm, children }: { title: string; eyebrow: string; confirmLabel: string; working: boolean; disabled?: boolean; onDismiss: () => void; onConfirm: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialogRef.current?.showModal(); }, []);
  return (
    <dialog ref={dialogRef} className="selection-dialog" onCancel={(event) => { if (working) event.preventDefault(); else onDismiss(); }} onClose={() => { if (!working) onDismiss(); }}>
      <form method="dialog" onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
        <header><p className="selection-kicker">{eyebrow}</p><h2>{title}</h2></header>
        <div className="selection-dialog-body">{children}</div>
        <footer><Button type="button" variant="secondary" disabled={working} onClick={onDismiss}>Keep Request Unchanged</Button><Button type="submit" disabled={working || disabled}>{working ? "Waiting for server…" : confirmLabel}</Button></footer>
      </form>
    </dialog>
  );
}

function SelectionHistory({ history, details }: { history: SelectionRequestHistory; details: SelectionRequestDetail[] }) {
  const detailMap = new Map(details.map((detail) => [detail.selection_request_id, detail]));
  return (
    <section className="selection-history" aria-labelledby="selection-history-title">
      <header><p className="selection-kicker">Immutable request history</p><h3 id="selection-history-title">Formal request record</h3><p>{history.items.length ? `${history.items.length} request${history.items.length === 1 ? "" : "s"}, newest first.` : "No selection request has been sent for this application."}</p></header>
      {history.items.length ? <ol>{history.items.map((item, index) => {
        const detail = detailMap.get(item.selection_request_id);
        const ordinal = history.items.length - index;
        return <li key={item.selection_request_id}><details><summary><span>Request {ordinal}</span><strong>{humanize(item.status)}</strong><time dateTime={item.created_at}>{formatDate(item.created_at)}</time></summary><div className="selection-history-detail"><p>{selectionHistoryConsequence(item)}</p>{detail ? <><div className="selection-history-versions"><span>Application v{detail.application_version_number}</span><span>Material gig v{detail.material_gig_version_number}</span></div>{detail.decline_disposition ? <p>Response: {humanize(detail.decline_disposition)}</p> : null}{detail.cancellation_reason_code ? <p>Cancellation: {humanize(detail.cancellation_reason_code)}</p> : null}{detail.response_change_categories?.length ? <p>Requested changes: {detail.response_change_categories.map(humanize).join(" · ")}</p> : null}<ExactTerms proposal={detail.proposal} timeline={detail.timeline} availability={detail.availability} scope={detail.scope} scopeNotes={detail.scope_notes} clientTerms={detail.client_terms} compact /></> : <p>Exact bound terms are temporarily unavailable.</p>}</div></details></li>;
      })}</ol> : null}
    </section>
  );
}

function ExactTerms({ proposal, timeline, availability, scope, scopeNotes, clientTerms, compact = false }: { proposal: Record<string, unknown>; timeline: Record<string, unknown>; availability: Record<string, unknown>; scope: Record<string, unknown>; scopeNotes: string | null | undefined; clientTerms: Record<string, unknown>; compact?: boolean }) {
  return <div className={`selection-terms-grid${compact ? " is-compact" : ""}`}><TermsGroup title="Freelancer proposal" values={{ ...proposal, timeline, availability, scope, scope_notes: scopeNotes }} /><TermsGroup title="Client material terms" values={clientTerms} /></div>;
}

function TermsGroup({ title, values }: { title: string; values: Record<string, unknown> }) {
  return <section className="selection-terms-group"><h4>{title}</h4><dl>{Object.entries(values).map(([key, value]) => <div key={key}><dt>{humanize(key)}</dt><dd>{structuredValue(value)}</dd></div>)}</dl></section>;
}

function ResponseChoice({ title, body, onClick, disabled }: { title: string; body: string; onClick: (target: HTMLElement) => void; disabled: boolean }) {
  return <article><h4>{title}</h4><p>{body}</p><Button variant="secondary" disabled={disabled} onClick={(event) => onClick(event.currentTarget)}>{title}</Button></article>;
}

function ConsequenceList({ items }: { items: string[] }) { return <div className="selection-consequence"><strong>Authoritative consequence</strong><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>; }
function VersionFact({ value, changed, current }: { value: string; changed: boolean; current: string | null }) { return <div className={changed ? "is-changed" : ""}><strong>{value}</strong><span>{current ?? "Bound version is current"}</span></div>; }
function StatusBadge({ status, attention = false }: { status: string; attention?: boolean }) { return <span className={`selection-status${attention ? " is-pending" : ""}`}>{status}</span>; }
function Fact({ label, value }: { label: string; value: ReactNode }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function SelectField({ label, value, onChange, values }: { label: string; value: string; onChange: (value: string) => void; values: readonly string[] }) { return <label className="selection-field">{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{values.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>; }
function DetailInput({ value, onChange, required }: { value: string; onChange: (value: string) => void; required: boolean }) { return <label className="selection-field">Detail {required ? "(required)" : "(optional)"}<textarea value={value} onChange={(event) => onChange(event.target.value)} maxLength={800} /></label>; }

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function selectionMessage(code: string): string {
  const messages: Record<string, string> = {
    application_not_advanced: "Advance this applicant before sending a formal request.",
    application_response_to_gig_required: "The freelancer must respond to the current material gig terms.",
    proposal_not_selection_ready: "The proposal needs concrete financial, timeline, availability, and scope terms.",
    revision_request_blocks_selection: "Resolve the open Stage 6 proposal-revision request first.",
    selection_request_already_active: "This gig already has an active selection request.",
    unchanged_selection_resend_blocked: "Newly committed proposal terms are required before another request.",
    engagement_already_exists: "This gig already has a current engagement.",
    gig_already_filled: "This gig is already filled.",
    selection_action_not_allowed: "The current gig state does not allow a new request.",
  };
  return messages[code] ?? humanize(code);
}

function selectionErrorMessage(value: unknown): string {
  const code = value instanceof SelectionApiError ? value.code : "selection_service_unavailable";
  const messages: Record<string, string> = {
    stale_selection_action: "The applicant or gig changed. Review the refreshed exact terms before trying again.",
    stale_selection_management: "The request changed. Its authoritative state has been refreshed.",
    stale_selection_response: "The request or exact terms changed. Review the refreshed state.",
    selection_request_expired: "The response window passed. The server-authoritative status has been refreshed.",
    selection_response_already_resolved: "This request already has an authoritative response. The current result has been refreshed.",
    idempotency_conflict: "That logical operation conflicted with an authoritative prior operation. Review the refreshed state before trying again.",
    commercial_acknowledgement_required: "Acknowledge the commercial warning before sending.",
    unchanged_selection_resend_blocked: "Unchanged terms cannot be resent after this response.",
    selection_terms_changed: "The exact application or material gig version changed. The request has been refreshed.",
    selection_service_unavailable: "Selection authority is temporarily unavailable. Your logical operation can be retried safely.",
  };
  return messages[code] ?? humanize(code);
}
