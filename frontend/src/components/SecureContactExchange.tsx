import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button } from "./Button";
import { GigSelect } from "./GigSelect";
import {
  blockEngagementContact,
  ContactExchangeApiError,
  fetchContactExchange,
  reportEngagementContact,
  revealContact,
  revokeContact,
  shareContact,
  type ContactExchange,
  type RevealedContact,
} from "../lib/contactExchange";
import {
  contactReportCategories,
  type ContactMethod,
  type ContactReportCategory,
  type ContactShare,
} from "../lib/contactExchangeContracts";
import {
  contactErrorMessage,
  contactMethodLabel,
  ContactOperationRegistry,
  contactSourceLines,
  contactStatusPresentation,
  deriveContactExchangeViewState,
  humanizeContactMetadata,
  isControlledContactConflict,
} from "../lib/contactExchangeView";

const URL_METHODS = new Set<ContactMethod>([
  "meeting_link",
  "professional_profile",
]);

type UrlShareAttempt = {
  method: ContactMethod;
  value: string;
  requestId: string;
};

type ReportAttempt = {
  category: ContactReportCategory;
  detail: string;
  requestId: string;
};

type ConfirmAction =
  | { kind: "revoke"; share: ContactShare }
  | { kind: "block" };

type MutationOutcome = "success" | "conflict" | "error";

export function SecureContactExchange({
  engagementId,
}: {
  engagementId: string;
}) {
  const [exchange, setExchange] = useState<ContactExchange | null>(null);
  const [revealed, setRevealed] = useState<Record<string, RevealedContact>>({});
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [urlValues, setUrlValues] = useState<
    Partial<Record<ContactMethod, string>>
  >({});
  const [reportCategory, setReportCategory] =
    useState<ContactReportCategory>("spam");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const loadSequenceRef = useRef(0);
  const operationsRef = useRef(
    new ContactOperationRegistry(() => crypto.randomUUID()),
  );
  const urlShareAttemptRef = useRef<UrlShareAttempt | null>(null);
  const reportAttemptRef = useRef<ReportAttempt | null>(null);
  const revealAttemptsRef = useRef(new Map<string, string>());

  const clearRevealed = useCallback(() => setRevealed({}), []);
  const clearEphemeralAttempts = useCallback(() => {
    operationsRef.current.reset();
    urlShareAttemptRef.current = null;
    reportAttemptRef.current = null;
    revealAttemptsRef.current.clear();
  }, []);

  const load = useCallback(async () => {
    const sequence = ++loadSequenceRef.current;
    clearRevealed();
    setAnnouncement("");
    const next = await fetchContactExchange(engagementId);
    if (sequence !== loadSequenceRef.current) return;
    setExchange(next);
    setError(null);
  }, [clearRevealed, engagementId]);

  useEffect(() => {
    let active = true;
    loadSequenceRef.current += 1;
    setExchange(null);
    setError(null);
    setUrlValues({});
    setReportDetail("");
    setReportSent(false);
    setConfirmAction(null);
    setAnnouncement("");
    clearRevealed();
    clearEphemeralAttempts();
    fetchContactExchange(engagementId)
      .then((next) => {
        if (active) {
          setExchange(next);
          setError(null);
        }
      })
      .catch((value: unknown) => {
        if (active) setError(contactErrorMessage(value));
      });
    return () => {
      active = false;
      loadSequenceRef.current += 1;
      clearRevealed();
      clearEphemeralAttempts();
    };
  }, [clearEphemeralAttempts, clearRevealed, engagementId]);

  const viewState = deriveContactExchangeViewState(exchange, error);
  const totalHistory = useMemo(
    () =>
      (exchange?.shared_by_you.length ?? 0) +
      (exchange?.shared_with_you.length ?? 0),
    [exchange],
  );

  async function runOrdinaryMutation(input: {
    operation: "share_auth" | "revoke" | "block";
    subjectId: string;
    safeSignature?: string;
    execute: (requestId: string) => Promise<unknown>;
    successAnnouncement: string;
  }): Promise<MutationOutcome> {
    const requestId = operationsRef.current.get(
      input.operation,
      input.subjectId,
      input.safeSignature,
    );
    setWorking(true);
    setError(null);
    clearRevealed();
    try {
      await input.execute(requestId);
      operationsRef.current.settle(
        input.operation,
        input.subjectId,
        input.safeSignature,
      );
      await load();
      setAnnouncement(input.successAnnouncement);
      return "success";
    } catch (value) {
      const controlledConflict = isControlledContactConflict(value);
      if (controlledConflict) {
        operationsRef.current.settle(
          input.operation,
          input.subjectId,
          input.safeSignature,
        );
        await load().catch(() => undefined);
      }
      setError(contactErrorMessage(value));
      return controlledConflict ? "conflict" : "error";
    } finally {
      setWorking(false);
    }
  }

  async function shareAuthMethod(method: ContactMethod, actionToken?: string) {
    if (!actionToken || URL_METHODS.has(method)) return;
    await runOrdinaryMutation({
      operation: "share_auth",
      subjectId: engagementId,
      safeSignature: method,
      execute: (requestId) =>
        shareContact(engagementId, {
          method,
          share_action_token: actionToken,
          request_id: requestId,
        }),
      successAnnouncement: `${contactMethodLabel(method)} sharing recorded.`,
    });
  }

  async function shareUrlMethod(method: ContactMethod, actionToken?: string) {
    if (!actionToken || !URL_METHODS.has(method)) return;
    const value = urlValues[method]?.trim() ?? "";
    if (!value) return;
    const prior = urlShareAttemptRef.current;
    const attempt =
      prior?.method === method && prior.value === value
        ? prior
        : { method, value, requestId: crypto.randomUUID() };
    urlShareAttemptRef.current = attempt;
    setWorking(true);
    setError(null);
    clearRevealed();
    try {
      await shareContact(engagementId, {
        method,
        share_action_token: actionToken,
        request_id: attempt.requestId,
        value: attempt.value,
      });
      urlShareAttemptRef.current = null;
      setUrlValues((current) => ({ ...current, [method]: "" }));
      await load();
      setAnnouncement(`${contactMethodLabel(method)} sharing recorded.`);
    } catch (value) {
      if (isControlledContactConflict(value)) {
        urlShareAttemptRef.current = null;
        await load().catch(() => undefined);
      }
      setError(contactErrorMessage(value));
    } finally {
      setWorking(false);
    }
  }

  async function revealShare(share: ContactShare) {
    const action = share.actions.find((item) => item.action === "reveal");
    if (!action) return;
    const requestId =
      revealAttemptsRef.current.get(share.share_id) ?? crypto.randomUUID();
    revealAttemptsRef.current.set(share.share_id, requestId);
    setWorking(true);
    setError(null);
    clearRevealed();
    setAnnouncement("");
    try {
      const result = await revealContact(share.share_id, {
        reveal_action_token: action.action_token,
        request_id: requestId,
      });
      if (result.share_id !== share.share_id || result.method !== share.method) {
        throw new Error("Reveal authority did not match the requested share.");
      }
      revealAttemptsRef.current.delete(share.share_id);
      setRevealed({ [share.share_id]: result });
      setAnnouncement("Contact revealed.");
    } catch (value) {
      clearRevealed();
      setAnnouncement("Reveal stopped.");
      if (value instanceof ContactExchangeApiError) {
        revealAttemptsRef.current.delete(share.share_id);
        await load().catch(() => undefined);
      }
      setError(contactErrorMessage(value));
    } finally {
      setWorking(false);
    }
  }

  function hideReveal(shareId: string) {
    setRevealed((current) => {
      const next = { ...current };
      delete next[shareId];
      return next;
    });
    revealAttemptsRef.current.delete(shareId);
    setAnnouncement("Contact hidden.");
  }

  function cancelUrlDraft(method: ContactMethod) {
    setUrlValues((current) => ({ ...current, [method]: "" }));
    if (urlShareAttemptRef.current?.method === method) {
      urlShareAttemptRef.current = null;
    }
  }

  async function confirmSensitiveAction() {
    if (!confirmAction || !exchange) return;
    if (confirmAction.kind === "revoke") {
      const action = confirmAction.share.actions.find(
        (item) => item.action === "revoke",
      );
      if (!action) return;
      const outcome = await runOrdinaryMutation({
        operation: "revoke",
        subjectId: confirmAction.share.share_id,
        execute: (requestId) =>
          revokeContact(confirmAction.share.share_id, {
            action_token: action.action_token,
            request_id: requestId,
          }),
        successAnnouncement: "Contact sharing revoked.",
      });
      if (outcome !== "error") setConfirmAction(null);
      return;
    }
    if (!exchange.block_action_token) return;
    const outcome = await runOrdinaryMutation({
      operation: "block",
      subjectId: engagementId,
      execute: (requestId) =>
        blockEngagementContact(engagementId, {
          action_token: exchange.block_action_token,
          request_id: requestId,
        }),
      successAnnouncement: "Contact exchange blocked for this engagement.",
    });
    if (outcome !== "error") setConfirmAction(null);
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!exchange || reportSent) return;
    const detail = reportDetail.trim();
    if (reportCategory === "other" && !detail) return;
    const prior = reportAttemptRef.current;
    const attempt =
      prior?.category === reportCategory && prior.detail === detail
        ? prior
        : { category: reportCategory, detail, requestId: crypto.randomUUID() };
    reportAttemptRef.current = attempt;
    setWorking(true);
    setError(null);
    clearRevealed();
    try {
      await reportEngagementContact(engagementId, {
        report_action_token: exchange.report_action_token,
        request_id: attempt.requestId,
        category: attempt.category,
        detail: attempt.detail || undefined,
      });
      reportAttemptRef.current = null;
      setReportDetail("");
      setReportSent(true);
      await load();
      setAnnouncement("Private report submitted.");
    } catch (value) {
      if (isControlledContactConflict(value)) {
        reportAttemptRef.current = null;
        await load().catch(() => undefined);
      }
      setError(contactErrorMessage(value));
    } finally {
      setWorking(false);
    }
  }

  if (viewState === "loading") {
    return (
      <section className="stage-nine-contact-state" aria-busy="true">
        <span>Contact authority / loading</span>
        <h2>Retrieving masked contact permissions</h2>
        <p>No contact value is loaded until the server authorizes a deliberate reveal.</p>
      </section>
    );
  }

  if (viewState === "error" || exchange === null) {
    return (
      <section className="stage-nine-contact-state is-error" role="alert">
        <span>Contact authority / stopped</span>
        <h2>Secure Contact Exchange unavailable</h2>
        <p>{error ?? "Contact exchange is unavailable."}</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void load().catch((value: unknown) => setError(contactErrorMessage(value)))}
        >
          Retry Authority Check
        </Button>
      </section>
    );
  }

  return (
    <section className="stage-nine-contact-exchange" aria-labelledby="secure-contact-title">
      <header className="contact-exchange-header">
        <div>
          <span>Engagement-scoped contact authority</span>
          <h2 id="secure-contact-title">Choose what crosses the boundary.</h2>
          <p>
            Every method is directional and independent. The server controls consent,
            masks, source state, blockers, and each authorized action.
          </p>
        </div>
        <dl>
          <Fact label="Availability" value={exchange.exchange_available ? "Open" : "Restricted"} />
          <Fact label="History" value={`${totalHistory} share record${totalHistory === 1 ? "" : "s"}`} />
          <Fact label="Lifecycle" value={humanizeContactMetadata(exchange.engagement_status)} />
        </dl>
      </header>

      <p className="contact-local-announcement" aria-live="polite">
        {announcement}
      </p>

      {error ? (
        <div className="contact-exchange-notice is-error" role="alert">
          <strong>Contact action stopped</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {exchange.blocked ? (
        <div className="contact-exchange-notice is-blocked">
          <strong>
            {exchange.blocked_by_viewer
              ? "You permanently blocked contact for this engagement."
              : "The other participant blocked contact for this engagement."}
          </strong>
          <p>
            New sharing and reveal are denied in both directions. This is not an
            account-wide block, and engagement lifecycle actions remain independent.
          </p>
        </div>
      ) : null}

      {!exchange.exchange_available && !exchange.blocked ? (
        <div className="contact-exchange-notice is-restricted">
          <strong>New sharing and reveal are unavailable.</strong>
          <p>
            Rendered actions and blockers come from current server authority. Prior
            consent history remains visible; revocation and private reporting may remain available.
          </p>
        </div>
      ) : null}

      {viewState === "empty" ? (
        <div className="contact-exchange-notice">
          <strong>No share history yet.</strong>
          <p>Choose one method below. Sharing one method never shares another.</p>
        </div>
      ) : null}

      <div className="contact-direction-grid">
        <section className="contact-direction-board" aria-labelledby="contact-outgoing-title">
          <header>
            <span>Direction 01 / You → participant</span>
            <h3 id="contact-outgoing-title">You share</h3>
            <p>Choose one source and create a new masked consent record.</p>
          </header>
          <div className="contact-method-register">
            {exchange.available_methods.map((method, index) => (
              <article className="contact-method-row" key={method.method}>
                <span className="contact-row-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="contact-method-authority">
                  <strong>{contactMethodLabel(method.method)}</strong>
                  <SourceAuthority
                    method={method.method}
                    ownership={method.ownership_verification}
                    whatsapp={method.whatsapp_availability}
                  />
                  {!method.available && method.unavailable_reason ? (
                    <small>{humanizeContactMetadata(method.unavailable_reason)}</small>
                  ) : null}
                </div>
                {URL_METHODS.has(method.method) && method.available ? (
                  <div className="contact-url-action">
                    <label>
                      HTTPS URL
                      <input
                        type="url"
                        inputMode="url"
                        autoComplete="off"
                        spellCheck={false}
                        value={urlValues[method.method] ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setUrlValues((current) => ({
                            ...current,
                            [method.method]: value,
                          }));
                          if (
                            urlShareAttemptRef.current?.method === method.method &&
                            urlShareAttemptRef.current.value !== value.trim()
                          ) {
                            urlShareAttemptRef.current = null;
                          }
                        }}
                        placeholder="https://…"
                        aria-describedby={`${method.method}-url-boundary`}
                      />
                    </label>
                    <small id={`${method.method}-url-boundary`}>
                      Sent only when you choose Share. GigMatch does not fetch or preview it.
                    </small>
                    <div>
                      <Button
                        type="button"
                        disabled={working || !(urlValues[method.method] ?? "").trim()}
                        onClick={() =>
                          void shareUrlMethod(method.method, method.share_action_token)
                        }
                      >
                        Share URL
                      </Button>
                      {(urlValues[method.method] ?? "").length > 0 ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={working}
                          onClick={() => cancelUrlDraft(method.method)}
                        >
                          Cancel Draft
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    disabled={working || !method.available}
                    onClick={() =>
                      void shareAuthMethod(method.method, method.share_action_token)
                    }
                  >
                    Share Method
                  </Button>
                )}
              </article>
            ))}
          </div>
          <ContactHistory
            title="Your share history"
            empty="You have not shared a contact method in this engagement."
            shares={exchange.shared_by_you}
            working={working}
            revealed={revealed}
            onReveal={revealShare}
            onHide={hideReveal}
            onRevoke={(share) => setConfirmAction({ kind: "revoke", share })}
          />
        </section>

        <section className="contact-direction-board" aria-labelledby="contact-incoming-title">
          <header>
            <span>Direction 02 / Participant → you</span>
            <h3 id="contact-incoming-title">Shared with you</h3>
            <p>A masked destination remains private until the server authorizes reveal.</p>
          </header>
          <ContactHistory
            title="Incoming share history"
            empty="The other participant has not shared a contact method with you."
            shares={exchange.shared_with_you}
            working={working}
            revealed={revealed}
            onReveal={revealShare}
            onHide={hideReveal}
            onRevoke={(share) => setConfirmAction({ kind: "revoke", share })}
          />
        </section>
      </div>

      <section className="contact-safety-board" aria-labelledby="contact-safety-title">
        <header>
          <span>Separate authority / Safety</span>
          <h3 id="contact-safety-title">Private report, engagement block, off-platform boundary.</h3>
          <p>Reporting never automatically blocks or changes workflow authority.</p>
        </header>
        <div className="contact-safety-grid">
          <form className="contact-report-form" onSubmit={(event) => void submitReport(event)}>
            <div>
              <span>Private operation 01</span>
              <h4>Submit a private report</h4>
              <p>
                The counterparty does not receive these details. Reporting does not change
                this engagement, applications, selection, or ranking.
              </p>
            </div>
            <label>
              Category
              <GigSelect
                value={reportCategory}
                disabled={working || reportSent}
                onValueChange={(value) => {
                  setReportCategory(value);
                  reportAttemptRef.current = null;
                }}
                options={contactReportCategories.map((category) => ({ value: category, label: humanizeContactMetadata(category) }))}
              />
            </label>
            <label>
              Detail {reportCategory === "other" ? "(required)" : "(optional)"}
              <textarea
                value={reportDetail}
                disabled={working || reportSent}
                maxLength={1000}
                onChange={(event) => {
                  setReportDetail(event.target.value);
                  reportAttemptRef.current = null;
                }}
              />
            </label>
            <Button
              type="submit"
              variant="secondary"
              disabled={
                working ||
                reportSent ||
                (reportCategory === "other" && !reportDetail.trim())
              }
            >
              {reportSent ? "Private Report Submitted" : "Submit Private Report"}
            </Button>
          </form>

          <article className="contact-block-action">
            <span>Permanent operation 02</span>
            <h4>Block contact in this engagement</h4>
            <p>
              Blocking denies new sharing and reveal in both directions. It does not end
              the engagement or remove required lifecycle actions.
            </p>
            {exchange.block_action_token ? (
              <Button
                type="button"
                variant="secondary"
                disabled={working}
                onClick={() => setConfirmAction({ kind: "block" })}
              >
                Block for This Engagement
              </Button>
            ) : (
              <strong>{exchange.blocked ? "Block already permanent" : "Block action unavailable"}</strong>
            )}
          </article>

          <aside className="contact-offplatform-warning">
            <span>Safety boundary 03</span>
            <h4>After reveal, communication may leave GigMatch.</h4>
            <p>GigMatch controls consent and reveal inside Secure Contact Exchange.</p>
            <p>Communication after reveal may happen outside GigMatch.</p>
            <p>GigMatch does not process or guarantee off-platform payments.</p>
            <p>Do not share passwords, OTPs, private keys or sensitive payment credentials.</p>
            <strong>Server safety notes</strong>
            <ul>
              {exchange.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {confirmAction ? (
        <ContactConsequenceDialog
          action={confirmAction}
          working={working}
          error={error}
          onConfirm={() => void confirmSensitiveAction()}
          onDismiss={() => {
            if (!working) setConfirmAction(null);
          }}
        />
      ) : null}
    </section>
  );
}

function ContactHistory({
  title,
  empty,
  shares,
  working,
  revealed,
  onReveal,
  onHide,
  onRevoke,
}: {
  title: string;
  empty: string;
  shares: ContactShare[];
  working: boolean;
  revealed: Record<string, RevealedContact>;
  onReveal: (share: ContactShare) => void;
  onHide: (shareId: string) => void;
  onRevoke: (share: ContactShare) => void;
}) {
  return (
    <section className="contact-history">
      <header>
        <h4>{title}</h4>
        <span>{shares.length} record{shares.length === 1 ? "" : "s"}</span>
      </header>
      {shares.length === 0 ? <p className="contact-history-empty">{empty}</p> : null}
      <ol>
        {shares.map((share, index) => (
          <li key={share.share_id}>
            <ContactShareRow
              index={index + 1}
              share={share}
              revealed={revealed[share.share_id]}
              working={working}
              onReveal={() => onReveal(share)}
              onHide={() => onHide(share.share_id)}
              onRevoke={() => onRevoke(share)}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function ContactShareRow({
  index,
  share,
  revealed,
  working,
  onReveal,
  onHide,
  onRevoke,
}: {
  index: number;
  share: ContactShare;
  revealed?: RevealedContact;
  working: boolean;
  onReveal: () => void;
  onHide: () => void;
  onRevoke: () => void;
}) {
  const revealAction = share.actions.some((item) => item.action === "reveal");
  const revokeAction = share.actions.some((item) => item.action === "revoke");
  const state = contactStatusPresentation(share);
  return (
    <article className={`contact-share-row is-${state.tone}`}>
      <span className="contact-row-index">{String(index).padStart(2, "0")}</span>
      <div className="contact-share-source">
        <strong>{contactMethodLabel(share.method)}</strong>
        <SourceAuthority
          method={share.method}
          ownership={share.ownership_verification}
          whatsapp={share.whatsapp_availability}
        />
      </div>
      <div className="contact-share-state">
        <span>{state.consent}</span>
        <span>{state.source}</span>
        <small>{state.consequence}</small>
      </div>
      <div className="contact-share-value">
        <span>{revealed ? "Revealed value" : "Server mask"}</span>
        {revealed ? (
          <output aria-label={`${contactMethodLabel(share.method)} revealed contact value`}>
            {revealed.value}
          </output>
        ) : (
          <strong>{share.masked_value}</strong>
        )}
      </div>
      <div className="contact-share-meta">
        <time dateTime={share.created_at}>Shared {formatDate(share.created_at)}</time>
        {share.previous_share_id ? <span>New record after prior history</span> : null}
        {share.revoked_at ? <time dateTime={share.revoked_at}>Revoked {formatDate(share.revoked_at)}</time> : null}
        {share.invalidated_at ? <time dateTime={share.invalidated_at}>Invalidated {formatDate(share.invalidated_at)}</time> : null}
      </div>
      <div className="contact-share-actions">
        {revealed ? (
          <Button type="button" variant="secondary" onClick={onHide}>
            Hide
          </Button>
        ) : revealAction ? (
          <Button type="button" disabled={working} onClick={onReveal}>
            Reveal Through Server
          </Button>
        ) : null}
        {revokeAction ? (
          <Button type="button" variant="secondary" disabled={working} onClick={onRevoke}>
            Revoke Future Reveals
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function SourceAuthority({
  method,
  ownership,
  whatsapp,
}: {
  method: ContactMethod;
  ownership: ContactShare["ownership_verification"];
  whatsapp?: ContactShare["whatsapp_availability"];
}) {
  return (
    <span className="contact-source-lines">
      {contactSourceLines(method, ownership, whatsapp).map((line) => (
        <small key={line}>{line}</small>
      ))}
    </span>
  );
}

function ContactConsequenceDialog({
  action,
  working,
  error,
  onConfirm,
  onDismiss,
}: {
  action: ConfirmAction;
  working: boolean;
  error: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);
  const revoke = action.kind === "revoke";
  return (
    <dialog
      ref={dialogRef}
      className="contact-consequence-dialog"
      aria-labelledby="contact-consequence-title"
      aria-describedby="contact-consequence-description"
      onCancel={(event) => {
        if (working) event.preventDefault();
      }}
      onClose={onDismiss}
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <header>
          <span>{revoke ? "Consent consequence" : "Permanent contact consequence"}</span>
          <h2 id="contact-consequence-title">
            {revoke ? "Revoke future GigMatch reveals?" : "Block contact for this engagement?"}
          </h2>
        </header>
        <div className="contact-consequence-body" id="contact-consequence-description">
          {error ? <p className="is-error" role="alert">{error}</p> : null}
          {revoke ? (
            <>
              <p>Future reveals through GigMatch stop for this share.</p>
              <p>The revoked row remains historical and cannot be restored or reactivated.</p>
              <p>A later reshare creates a new record with its own mask and source evidence.</p>
              <p className="is-caution">
                GigMatch cannot erase information the recipient may already have retained.
              </p>
            </>
          ) : (
            <>
              <p>This block is permanent for this milestone and scoped only to this engagement.</p>
              <p>New sharing and reveals stop in both directions. Your active shares are revoked.</p>
              <p>The other participant’s consent history and the engagement itself remain intact.</p>
              <p className="is-caution">
                Required completion and cancellation actions remain available. External copies are not erased.
              </p>
            </>
          )}
        </div>
        <footer>
          <Button
            type="button"
            variant="secondary"
            disabled={working}
            onClick={() => dialogRef.current?.close()}
          >
            Keep Current Contact State
          </Button>
          <Button type="submit" disabled={working}>
            {working
              ? "Waiting for server…"
              : revoke
                ? "Revoke Future Reveals"
                : "Permanently Block Contact"}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
