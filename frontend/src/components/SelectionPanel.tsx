import { useCallback, useEffect, useState } from "react";
import { Button } from "./Button";
import {
  cancelSelectionRequest,
  fetchSelectionContext,
  fetchSelectionRequest,
  respondToSelectionRequest,
  SelectionApiError,
  sendSelectionRequest,
  type SelectionContext,
  type SelectionRequestDetail,
} from "../lib/selection";

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

type SelectionPanelProps = {
  applicationId: string;
  onChanged?: () => void;
};

export function SelectionPanel({ applicationId, onChanged }: SelectionPanelProps) {
  const [context, setContext] = useState<SelectionContext | null>(null);
  const [request, setRequest] = useState<SelectionRequestDetail | null>(null);
  const [duration, setDuration] = useState(48);
  const [acknowledged, setAcknowledged] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>("client_withdrew_request");
  const [withdrawReason, setWithdrawReason] = useState<string>("no_longer_available");
  const [detail, setDetail] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [remaining, setRemaining] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const nextContext = await fetchSelectionContext(applicationId);
    const requestId = nextContext.active_request_id ?? nextContext.latest_request_id;
    const nextRequest = requestId ? await fetchSelectionRequest(requestId) : null;
    setContext(nextContext);
    setRequest(nextRequest);
    setCheckingStatus(false);
  }, [applicationId]);

  useEffect(() => {
    let active = true;
    load().catch((value: unknown) => {
      if (active) setError(selectionErrorMessage(value));
    });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (!request || request.status !== "pending") {
      setRemaining("");
      return;
    }
    let refreshStarted = false;
    const refreshCountdown = () => {
      const milliseconds = new Date(request.expires_at).getTime() - Date.now();
      if (milliseconds <= 0) {
        setRemaining("Deadline reached");
        if (!refreshStarted) {
          refreshStarted = true;
          setCheckingStatus(true);
          void load().catch((value: unknown) => setError(selectionErrorMessage(value)));
        }
        return;
      }
      const totalMinutes = Math.ceil(milliseconds / 60_000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setRemaining(`${hours}h ${minutes}m remaining`);
    };
    refreshCountdown();
    const timer = window.setInterval(refreshCountdown, 30_000);
    return () => window.clearInterval(timer);
  }, [load, request]);

  async function run(action: () => Promise<Record<string, unknown>>) {
    setWorking(true);
    setError(null);
    try {
      await action();
      await load();
      onChanged?.();
      setDetail("");
      setSelectedCategories([]);
    } catch (value) {
      setError(selectionErrorMessage(value));
      if (value instanceof SelectionApiError && value.status === 409) {
        await load().catch(() => undefined);
      }
    } finally {
      setWorking(false);
    }
  }

  if (!context) {
    return (
      <section className="rounded-lg border border-line bg-white p-6" aria-busy="true">
        <p className="text-sm text-muted">Loading formal selection state…</p>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      </section>
    );
  }

  const isClient = context.viewer_role === "client";
  const pending = request?.status === "pending";
  const canRespond = !isClient && pending && Boolean(request.response_token);
  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-soft">
      <header className="border-b border-line bg-slate-50 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Formal selection</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Exact proposal and client terms</h2>
            <p className="mt-1 text-sm text-muted">
              Application v{context.application_version_number} · material gig v{context.material_gig_version_number}
            </p>
          </div>
          {request ? <StatusBadge status={request.status} /> : null}
        </div>
      </header>

      <div className="space-y-6 p-6">
        {error ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <ExactTerms
          proposal={request?.proposal ?? context.proposal}
          timeline={request?.timeline ?? context.timeline}
          availability={request?.availability ?? context.availability}
          scope={request?.scope ?? context.scope}
          scopeNotes={request?.scope_notes ?? context.scope_notes}
          clientTerms={request?.client_terms ?? context.client_terms}
        />

        {request ? (
          <div className="rounded-md border border-line p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink">Request sent {formatDate(request.created_at)}</p>
                <p className="mt-1 text-sm text-muted">Exact deadline: {formatDate(request.expires_at)}</p>
              </div>
              {pending ? (
                <p className="text-sm font-semibold text-ink" aria-live="polite">
                  {checkingStatus ? "Checking authoritative status…" : remaining}
                </p>
              ) : null}
            </div>
            {request.commercial_warning_code ? (
              <p className="mt-3 text-sm text-amber-800">
                Commercial warning acknowledged: {label(request.commercial_warning_code)}
              </p>
            ) : null}
            {request.engagement ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="font-semibold text-ink">Engagement confirmed</p>
                <p className="mt-1 text-sm text-muted">
                  {label(request.engagement.status)} · {formatDate(request.engagement.confirmed_at)}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {isClient && !pending && context.can_send && context.send_token ? (
          <div className="rounded-md border border-line p-4">
            <h3 className="font-semibold text-ink">Send exact-version selection request</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              This creates a time-limited formal request. Proposal terms cannot be edited here.
            </p>
            <label className="mt-4 block text-sm font-semibold text-ink">
              Response deadline
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="mt-2 block w-full max-w-xs rounded-md border border-line px-3 py-2"
              >
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
              </select>
            </label>
            {context.commercial_acknowledgement_required ? (
              <label className="mt-4 flex max-w-2xl items-start gap-3 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="mt-1"
                />
                I acknowledge {label(context.commercial_warning_code ?? "commercial warning")} and
                want to send these exact terms.
              </label>
            ) : null}
            <div className="mt-4">
              <Button
                disabled={working || (context.commercial_acknowledgement_required && !acknowledged)}
                onClick={() => void run(() => sendSelectionRequest(applicationId, {
                  duration_hours: duration,
                  send_token: context.send_token,
                  request_id: crypto.randomUUID(),
                  commercial_acknowledged: acknowledged,
                }))}
              >
                {working ? "Sending…" : "Send selection request"}
              </Button>
            </div>
          </div>
        ) : null}

        {isClient && pending && request?.management_token ? (
          <div className="rounded-md border border-line p-4">
            <h3 className="font-semibold text-ink">Manage active request</h3>
            <label className="mt-4 block text-sm font-semibold text-ink">
              Cancellation reason
              <select
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className="mt-2 block w-full max-w-md rounded-md border border-line px-3 py-2"
              >
                {cancellationReasons.map((reason) => (
                  <option key={reason} value={reason}>{label(reason)}</option>
                ))}
              </select>
            </label>
            <DetailInput value={detail} onChange={setDetail} required={cancelReason === "other"} />
            <div className="mt-4">
              <Button
                variant="secondary"
                disabled={working || (cancelReason === "other" && !detail.trim())}
                onClick={() => void run(() => cancelSelectionRequest(request.selection_request_id, {
                  management_token: request.management_token,
                  request_id: crypto.randomUUID(),
                  reason_code: cancelReason,
                  detail: detail.trim() || undefined,
                }))}
              >
                Cancel request
              </Button>
            </div>
          </div>
        ) : null}

        {canRespond && request?.response_token ? (
          <div className="space-y-5 rounded-md border border-line p-4">
            <div>
              <h3 className="font-semibold text-ink">Respond to these exact terms</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Editing your application invalidates this active request. Acceptance cannot add
                new conditions.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={working}
                onClick={() => {
                  if (window.confirm("Accept the exact frozen proposal and client terms?")) {
                    void run(() => respondToSelectionRequest(
                      request.selection_request_id,
                      "accept",
                      {
                        response_token: request.response_token,
                        request_id: crypto.randomUUID(),
                        exact_terms_confirmed: true,
                      },
                    ));
                  }
                }}
              >
                Accept Exact Terms
              </Button>
              <Button
                variant="secondary"
                disabled={working}
                onClick={() => void run(() => respondToSelectionRequest(
                  request.selection_request_id,
                  "decline-remain-interested",
                  {
                    response_token: request.response_token,
                    request_id: crypto.randomUUID(),
                    detail: detail.trim() || undefined,
                  },
                ))}
              >
                Decline and Remain Interested
              </Button>
            </div>
            <div className="border-t border-line pt-5">
              <label className="block text-sm font-semibold text-ink">
                Withdrawal reason
                <select
                  value={withdrawReason}
                  onChange={(event) => setWithdrawReason(event.target.value)}
                  className="mt-2 block w-full max-w-md rounded-md border border-line px-3 py-2"
                >
                  {withdrawalReasons.map((reason) => (
                    <option key={reason} value={reason}>{label(reason)}</option>
                  ))}
                </select>
              </label>
              <DetailInput
                value={detail}
                onChange={setDetail}
                required={withdrawReason === "other"}
              />
              <div className="mt-4">
                <Button
                  variant="secondary"
                  disabled={working || (withdrawReason === "other" && !detail.trim())}
                  onClick={() => {
                    if (window.confirm("Decline this request and withdraw the application?")) {
                      void run(() => respondToSelectionRequest(
                        request.selection_request_id,
                        "decline-withdraw",
                        {
                          response_token: request.response_token,
                          request_id: crypto.randomUUID(),
                          reason_code: withdrawReason,
                          detail: detail.trim() || undefined,
                        },
                      ));
                    }
                  }}
                >
                  Decline and Withdraw
                </Button>
              </div>
            </div>
            <fieldset className="border-t border-line pt-5">
              <legend className="font-semibold text-ink">Request revised terms</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {changeCategories.map((category) => (
                  <label key={category} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={(event) => setSelectedCategories((current) => (
                        event.target.checked
                          ? [...current, category]
                          : current.filter((item) => item !== category)
                      ))}
                    />
                    {label(category)}
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  disabled={working || selectedCategories.length === 0}
                  onClick={() => void run(() => respondToSelectionRequest(
                    request.selection_request_id,
                    "request-revised-terms",
                    {
                      response_token: request.response_token,
                      request_id: crypto.randomUUID(),
                      change_categories: selectedCategories,
                      detail: detail.trim() || undefined,
                    },
                  ))}
                >
                  Request Revised Terms
                </Button>
              </div>
            </fieldset>
          </div>
        ) : null}

        {isClient && context.blockers.length > 0 && !pending ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-950">Selection request unavailable</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-900">
              {context.blockers.map((blocker) => <li key={blocker}>{selectionMessage(blocker)}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

type ExactTermsProps = {
  proposal: Record<string, unknown>;
  timeline: Record<string, unknown>;
  availability: Record<string, unknown>;
  scope: Record<string, unknown>;
  scopeNotes: string | null | undefined;
  clientTerms: Record<string, unknown>;
};

function ExactTerms({
  proposal,
  timeline,
  availability,
  scope,
  scopeNotes,
  clientTerms,
}: ExactTermsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-md border border-line p-4">
        <h3 className="font-semibold text-ink">Freelancer proposal</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Term label="Pricing" value={proposal.mode ?? proposal.payment_structure} />
          <Term label="Currency" value={proposal.currency} />
          <Term label="Timeline" value={durationLabel(timeline)} />
          <Term label="Available from" value={availability.available_from} />
        </dl>
        <p className="mt-4 text-sm leading-6 text-muted">{scopeNotes || "No additional scope notes."}</p>
        <details className="mt-4 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Structured scope</summary>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-muted">
            {JSON.stringify(scope, null, 2)}
          </pre>
        </details>
      </div>
      <div className="rounded-md border border-line p-4">
        <h3 className="font-semibold text-ink">Client material terms</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Term label="Payment structure" value={clientTerms.payment_structure} />
          <Term label="Currency" value={clientTerms.currency} />
          <Term label="Project deadline" value={clientTerms.project_deadline} />
          <Term label="Work mode" value={clientTerms.work_mode} />
        </dl>
        <details className="mt-4 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Complete client terms</summary>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-muted">
            {JSON.stringify(clientTerms, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function Term({ label: termLabel, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted">{termLabel}</dt>
      <dd className="mt-1 text-ink">{value === null || value === undefined ? "Not specified" : String(value)}</dd>
    </div>
  );
}

function DetailInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  required: boolean;
}) {
  return (
    <label className="mt-4 block text-sm font-semibold text-ink">
      Detail {required ? "(required)" : "(optional)"}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={800}
        className="mt-2 block min-h-24 w-full max-w-2xl rounded-md border border-line px-3 py-2"
      />
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="w-fit rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink">
      {label(status)}
    </span>
  );
}

function durationLabel(value: Record<string, unknown>): string {
  if (value.mode === "exact") return `${String(value.exact_value)} ${String(value.unit)}`;
  if (value.mode === "range") {
    return `${String(value.minimum_value)}–${String(value.maximum_value)} ${String(value.unit)}`;
  }
  return label(String(value.mode ?? "Not specified"));
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function selectionMessage(code: string): string {
  const messages: Record<string, string> = {
    application_not_advanced: "Advance this applicant before sending a formal request.",
    application_response_to_gig_required: "The freelancer must respond to the current material gig terms.",
    proposal_not_selection_ready: "The proposal needs concrete financial, timeline, availability, and scope terms.",
    revision_request_blocks_selection: "Resolve the open proposal-revision request first.",
    selection_request_already_active: "This gig already has an active selection request.",
    unchanged_selection_resend_blocked: "Newly committed proposal terms are required before another request.",
    engagement_already_exists: "This gig already has an engagement.",
    gig_already_filled: "This gig is already filled.",
    selection_action_not_allowed: "The current gig state does not allow a new request.",
  };
  return messages[code] ?? label(code);
}

function selectionErrorMessage(value: unknown): string {
  const code = value instanceof SelectionApiError ? value.code : "selection_service_unavailable";
  const messages: Record<string, string> = {
    stale_selection_action: "The applicant or gig changed. Review the current terms and try again.",
    stale_selection_management: "The request changed. Its current state has been refreshed.",
    stale_selection_response: "The request or exact terms changed. Review the refreshed state.",
    selection_request_expired: "The response deadline passed. The authoritative status has been refreshed.",
    selection_response_already_resolved: "This response was already resolved.",
    idempotency_conflict: "That action identifier was already used for a different operation.",
    commercial_acknowledgement_required: "Acknowledge the commercial warning before sending.",
    unchanged_selection_resend_blocked: "Unchanged terms cannot be resent after this response.",
    selection_service_unavailable: "Selection state is temporarily unavailable.",
  };
  return messages[code] ?? label(code);
}
