import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "./Button";
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
import type {
  ContactMethod,
  ContactShare,
} from "../lib/contactExchangeContracts";
import { deriveContactExchangeViewState } from "../lib/contactExchangeView";

const URL_METHODS = new Set<ContactMethod>([
  "meeting_link",
  "professional_profile",
]);
const REPORT_CATEGORIES = [
  "harassment",
  "spam",
  "fraudulent_request",
  "identity_misrepresentation",
  "abusive_communication",
  "suspicious_payment_request",
  "request_for_credentials",
  "other",
];

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
  const [reportCategory, setReportCategory] = useState("spam");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSent, setReportSent] = useState(false);

  const clearRevealed = useCallback(() => setRevealed({}), []);
  const load = useCallback(async () => {
    clearRevealed();
    const next = await fetchContactExchange(engagementId);
    setExchange(next);
    setError(null);
  }, [clearRevealed, engagementId]);

  useEffect(() => {
    let active = true;
    clearRevealed();
    fetchContactExchange(engagementId)
      .then((next) => {
        if (active) {
          setExchange(next);
          setError(null);
        }
      })
      .catch((value: unknown) => {
        if (active) {
          setError(
            value instanceof Error
              ? value.message
              : "Unable to load contact exchange.",
          );
        }
      });
    return () => {
      active = false;
      clearRevealed();
    };
  }, [clearRevealed, engagementId]);

  const viewState = deriveContactExchangeViewState(exchange, error);
  const hasHistory = useMemo(
    () =>
      (exchange?.shared_by_you.length ?? 0) +
        (exchange?.shared_with_you.length ?? 0) >
      0,
    [exchange],
  );

  async function mutate(operation: () => Promise<unknown>) {
    setWorking(true);
    setError(null);
    clearRevealed();
    try {
      await operation();
      await load();
    } catch (value) {
      setError(contactError(value));
      if (value instanceof ContactExchangeApiError && value.status === 409) {
        await load().catch(() => undefined);
      }
    } finally {
      setWorking(false);
    }
  }

  async function share(method: ContactMethod, actionToken?: string) {
    if (!actionToken) return;
    const value = urlValues[method]?.trim();
    await mutate(() =>
      shareContact(engagementId, {
        method,
        share_action_token: actionToken,
        request_id: crypto.randomUUID(),
        ...(URL_METHODS.has(method) ? { value } : {}),
      }),
    );
    if (URL_METHODS.has(method)) {
      setUrlValues((current) => ({ ...current, [method]: "" }));
    }
  }

  async function reveal(share: ContactShare) {
    const action = share.actions.find((item) => item.action === "reveal");
    if (!action) return;
    setWorking(true);
    setError(null);
    try {
      const result = await revealContact(share.share_id, {
        reveal_action_token: action.action_token,
        request_id: crypto.randomUUID(),
      });
      setRevealed((current) => ({ ...current, [share.share_id]: result }));
    } catch (value) {
      clearRevealed();
      setError(contactError(value));
      await load().catch(() => undefined);
    } finally {
      setWorking(false);
    }
  }

  if (viewState === "loading") {
    return (
      <section className="rounded-lg border border-line bg-white p-6" aria-busy="true">
        <h2 className="text-xl font-bold text-ink">Secure Contact Exchange</h2>
        <p className="mt-3 text-sm text-muted">Loading masked contact permissions…</p>
      </section>
    );
  }
  if (viewState === "error" || exchange === null) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-6" role="alert">
        <h2 className="text-xl font-bold text-red-900">Secure Contact Exchange</h2>
        <p className="mt-3 text-sm text-red-800">{error ?? "Contact exchange is unavailable."}</p>
        <Button className="mt-4" variant="secondary" onClick={() => void load()}>
          Try Again
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-white p-6">
      <h2 className="text-xl font-bold text-ink">Secure Contact Exchange</h2>
      <p className="mt-2 text-sm text-muted">
        Sharing is limited to this engagement. Details stay masked until the other
        participant explicitly reveals them.
      </p>
      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      {exchange.blocked ? (
        <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-950">
            Contact and optional interaction are blocked for this engagement.
          </p>
          <p className="mt-1 text-sm text-amber-900">
            This is not a platform-wide block. Engagement history and required
            completion or cancellation actions remain available.
          </p>
        </div>
      ) : null}
      {!exchange.exchange_available && !exchange.blocked ? (
        <p className="mt-5 rounded-md border border-line bg-slate-50 p-4 text-sm text-muted">
          New sharing and reveal are unavailable for this engagement. You may still
          revoke prior consent or submit a safety report.
        </p>
      ) : null}
      {viewState === "empty" ? (
        <p className="mt-5 text-sm text-muted">
          No contact method has been shared for this engagement.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold text-ink">Share a contact method</h3>
          <div className="mt-3 space-y-3">
            {exchange.available_methods.map((method) => (
              <div key={method.method} className="rounded-md border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{label(method.method)}</p>
                    <VerificationLabel
                      ownership={method.ownership_verification}
                      whatsapp={method.whatsapp_availability}
                    />
                  </div>
                  {!URL_METHODS.has(method.method) ? (
                    <Button
                      disabled={working || !method.available}
                      onClick={() => void share(method.method, method.share_action_token)}
                    >
                      Share
                    </Button>
                  ) : null}
                </div>
                {URL_METHODS.has(method.method) && method.available ? (
                  <div className="mt-3">
                    <label className="text-sm font-medium text-ink">
                      HTTPS URL
                      <input
                        type="url"
                        value={urlValues[method.method] ?? ""}
                        onChange={(event) =>
                          setUrlValues((current) => ({
                            ...current,
                            [method.method]: event.target.value,
                          }))
                        }
                        placeholder="https://…"
                        className="mt-2 block w-full rounded-md border border-line px-3 py-2"
                      />
                    </label>
                    <Button
                      className="mt-3"
                      disabled={working || !(urlValues[method.method] ?? "").trim()}
                      onClick={() => void share(method.method, method.share_action_token)}
                    >
                      Share Provided URL
                    </Button>
                  </div>
                ) : null}
                {!method.available && method.unavailable_reason ? (
                  <p className="mt-2 text-xs text-muted">{label(method.unavailable_reason)}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-ink">Shared with you</h3>
          {exchange.shared_with_you.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing has been shared with you.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {exchange.shared_with_you.map((share) => (
                <ContactRow
                  key={share.share_id}
                  share={share}
                  revealed={revealed[share.share_id]}
                  working={working}
                  onReveal={() => void reveal(share)}
                  onHide={() =>
                    setRevealed((current) => {
                      const next = { ...current };
                      delete next[share.share_id];
                      return next;
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {hasHistory ? (
        <div className="mt-6">
          <h3 className="font-semibold text-ink">Your sharing history</h3>
          <div className="mt-3 space-y-3">
            {exchange.shared_by_you.map((share) => {
              const revoke = share.actions.find((item) => item.action === "revoke");
              return (
                <div key={share.share_id} className="rounded-md border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">
                        {label(share.method)} · {share.masked_value}
                      </p>
                      <p className="text-xs text-muted">
                        {label(share.consent_status)} · {label(share.source_status)}
                      </p>
                    </div>
                    {revoke ? (
                      <Button
                        variant="secondary"
                        disabled={working}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Revoke this share? GigMatch cannot erase information already viewed, copied or saved.",
                            )
                          ) {
                            void mutate(() =>
                              revokeContact(share.share_id, {
                                action_token: revoke.action_token,
                                request_id: crypto.randomUUID(),
                              }),
                            );
                          }
                        }}
                      >
                        Revoke Sharing
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-7 border-t border-line pt-6">
        <h3 className="font-semibold text-ink">Safety actions</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {exchange.block_action_token ? (
            <Button
              variant="secondary"
              disabled={working}
              onClick={() => {
                if (
                  window.confirm(
                    "Block contact and optional interaction for this engagement? This is not platform-wide and no unblock flow is available.",
                  )
                ) {
                  void mutate(() =>
                    blockEngagementContact(engagementId, {
                      action_token: exchange.block_action_token,
                      request_id: crypto.randomUUID(),
                    }),
                  );
                }
              }}
            >
              Block for This Engagement
            </Button>
          ) : null}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,240px)_1fr_auto]">
          <label className="text-sm font-medium text-ink">
            Report category
            <select
              value={reportCategory}
              onChange={(event) => setReportCategory(event.target.value)}
              className="mt-2 block w-full rounded-md border border-line px-3 py-2"
            >
              {REPORT_CATEGORIES.map((category) => (
                <option key={category} value={category}>{label(category)}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-ink">
            Detail {reportCategory === "other" ? "(required)" : "(optional)"}
            <input
              value={reportDetail}
              onChange={(event) => setReportDetail(event.target.value)}
              className="mt-2 block w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <Button
            className="self-end"
            variant="secondary"
            disabled={
              working ||
              reportSent ||
              (reportCategory === "other" && !reportDetail.trim())
            }
            onClick={() =>
              void mutate(async () => {
                await reportEngagementContact(engagementId, {
                  report_action_token: exchange.report_action_token,
                  request_id: crypto.randomUUID(),
                  category: reportCategory,
                  detail: reportDetail.trim() || undefined,
                });
                setReportSent(true);
              })
            }
          >
            {reportSent ? "Report Submitted" : "Submit Private Report"}
          </Button>
        </div>
      </div>

      <aside className="mt-7 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p>
          Revoking access hides the detail inside GigMatch but cannot erase
          information already viewed, copied or saved.
        </p>
        <p className="mt-2">
          GigMatch does not currently process payments or provide escrow. Never
          share passwords, OTPs, access tokens or sensitive banking credentials.
        </p>
      </aside>
    </section>
  );
}

function ContactRow({
  share,
  revealed,
  working,
  onReveal,
  onHide,
}: {
  share: ContactShare;
  revealed?: RevealedContact;
  working: boolean;
  onReveal: () => void;
  onHide: () => void;
}) {
  const reveal = share.actions.find((item) => item.action === "reveal");
  return (
    <div className="rounded-md border border-line p-4">
      <p className="font-medium text-ink">{label(share.method)}</p>
      <VerificationLabel
        ownership={share.ownership_verification}
        whatsapp={share.whatsapp_availability}
      />
      <p className="mt-2 break-all text-sm text-muted">
        {revealed?.value ?? share.masked_value}
      </p>
      <p className="mt-1 text-xs text-muted">
        {label(share.consent_status)} · {label(share.source_status)}
      </p>
      {revealed ? (
        <Button className="mt-3" variant="secondary" onClick={onHide}>
          Hide
        </Button>
      ) : reveal ? (
        <Button className="mt-3" disabled={working} onClick={onReveal}>
          Reveal
        </Button>
      ) : null}
    </div>
  );
}

function VerificationLabel({
  ownership,
  whatsapp,
}: {
  ownership: "verified" | "user_provided";
  whatsapp?: "self_declared";
}) {
  return (
    <p className="mt-1 text-xs text-muted">
      {ownership === "verified"
        ? "Ownership verified by GigMatch Auth"
        : "Provided by user · not verified by GigMatch"}
      {whatsapp === "self_declared"
        ? " · WhatsApp availability self-declared"
        : ""}
    </p>
  );
}

function contactError(value: unknown): string {
  if (value instanceof ContactExchangeApiError) {
    const messages: Record<string, string> = {
      contact_source_invalidated:
        "The verified source changed. Ask the sharer to share it again.",
      contact_exchange_blocked:
        "Contact exchange is blocked for this engagement.",
      contact_share_not_active: "This contact share is no longer active.",
      stale_contact_action:
        "Contact permissions changed. Review the refreshed state before retrying.",
      contact_reveal_rate_limited:
        "Reveal limit reached. Wait before revealing another contact.",
    };
    return messages[value.code] ?? value.message;
  }
  return value instanceof Error ? value.message : "Contact exchange failed.";
}

function label(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
