import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { GigRouteContextRail } from "../components/GigRouteContextRail";
import { useAuth } from "../context/AuthContext";
import { fetchApplicationContext, type ApplicationContext } from "../lib/applications";
import { gigApplicationPanel } from "../lib/applicationView";
import { fetchGigDetail, MarketplaceApiError, type GigDetailResponse } from "../lib/marketplace";
import { availabilityMessage, formatDateTime, formatDuration, formatPayment, formatRange } from "../lib/marketplaceView";

type ApplicationContextState = "idle" | "loading" | "ready" | "error";

export function GigDetailPage() {
  const { gigId } = useParams();
  const [detail, setDetail] = useState<GigDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationContext, setApplicationContext] = useState<ApplicationContext | null>(null);
  const [applicationContextState, setApplicationContextState] = useState<ApplicationContextState>("idle");
  const { role } = useAuth();
  const returnDestination = viewerReturnDestination(role);

  useEffect(() => {
    let active = true;
    if (!gigId) {
      setError("Gig identifier is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchGigDetail(gigId)
      .then((response) => { if (active) setDetail(response); })
      .catch((reason: unknown) => {
        if (!active) return;
        setDetail(null);
        if (reason instanceof MarketplaceApiError && reason.status === 404) {
          setError("This gig was not found or is not available to view.");
        } else {
          setError(reason instanceof Error ? reason.message : "Unable to load gig details.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gigId]);

  useEffect(() => {
    let active = true;
    if (!gigId || role !== "freelancer") {
      setApplicationContext(null);
      setApplicationContextState("idle");
      return;
    }
    setApplicationContext(null);
    setApplicationContextState("loading");
    fetchApplicationContext(gigId)
      .then((value) => {
        if (!active) return;
        setApplicationContext(value);
        setApplicationContextState("ready");
      })
      .catch(() => {
        if (!active) return;
        setApplicationContext(null);
        setApplicationContextState("error");
      });
    return () => { active = false; };
  }, [gigId, role]);

  if (loading) {
    return <section className="stage-two-page"><StatePanel title="Loading gig detail" body="Retrieving the current sanitized opportunity record…" /></section>;
  }
  if (error || !detail) {
    return <section className="stage-two-page"><ErrorPanel message={error ?? "Unable to load gig details."} returnTo={returnDestination.to} returnLabel={returnDestination.label} /></section>;
  }
  if (detail.response_kind === "tombstone") {
    return (
      <section className="stage-two-page gig-detail-page">
        <GigRouteContextRail title={detail.title} state={detail.product_state} phase="Terminal notice" returnTo={returnDestination.to} returnLabel={returnDestination.label} />
        <div className="stage-two-tombstone">
          <span>{detail.product_state.replace(/_/g, " ")}</span>
          <h1>{detail.title}</h1>
          <p>{detail.message}</p>
          <Button to={returnDestination.to} variant="secondary">{returnDestination.label}</Button>
        </div>
      </section>
    );
  }

  const applicationPanel = gigApplicationPanel(role, applicationContextState, applicationContext);

  return (
    <section className="stage-two-page gig-detail-page">
      <GigRouteContextRail title={detail.title} state={detail.product_state} phase="Opportunity detail" returnTo={returnDestination.to} returnLabel={returnDestination.label} />
      <header className="stage-two-editorial-header gig-detail-header">
        <div>
          <p>OPPORTUNITY / SANITIZED PUBLISHED DETAIL</p>
          <h1>{detail.title}</h1>
        </div>
        <div className="stage-two-editorial-context">
          <span>{detail.category} · {detail.work_mode.replace(/_/g, " ")}</span>
          <p>{detail.published_summary}</p>
        </div>
      </header>

      <p className={`gig-availability ${detail.accepting_applications ? "is-open" : "is-unavailable"}`}>
        <strong>{detail.product_state.replace(/_/g, " ")}</strong>
        <span>{availabilityMessage(detail)}</span>
      </p>

      <div className="gig-detail-board">
        <DetailLane index="01" title="Published scope" summary="What the client has authorized for ordinary viewing" tone="bone">
          <p className="gig-detail-description">{detail.description}</p>
          <NumberedList values={detail.deliverables} empty="No deliverables were specified." />
        </DetailLane>

        <DetailLane index="02" title="Skills and operating fit" summary="Inputs disclosed by the gig, not a freelancer match score" tone="glass">
          <div className="gig-detail-skill-grid">
            <SkillGroup label="Required skills" values={detail.required_skills} />
            <SkillGroup label="Preferred skills" values={detail.preferred_skills} />
          </div>
          <Details rows={[
            ["Experience", detail.experience_requirement.replace(/_/g, " ")],
            ["Work mode", detail.work_mode.replace(/_/g, " ")],
            ["Location", detail.location_requirement ?? "Not specified"],
          ]} />
        </DetailLane>

        <DetailLane index="03" title="Terms and timing" summary="Commercial basis, capacity, and current deadlines" tone="coral">
          <div className="gig-terms-lead">
            <span>Payment summary</span>
            <strong>{formatPayment(detail.payment)}</strong>
            <small>{detail.payment.payment_structure.replace(/_/g, " ")} · {detail.payment.currency}</small>
          </div>
          <Details rows={[
            ["Apply by", formatDateTime(detail.application_deadline)],
            ["Project deadline", formatDateTime(detail.project_deadline)],
            ["Weekly commitment", formatRange(detail.expected_weekly_commitment ?? detail.payment.weekly_commitment)],
            ["Expected duration", formatDuration(detail.expected_duration ?? detail.payment.engagement_duration)],
            ["Terms updated", formatDateTime(detail.material_updated_at)],
          ]} />
        </DetailLane>

        <DetailLane index="04" title="Source and next step" summary="Safe client context and viewer-authorized destinations" tone="ocean">
          <div className="gig-source-action-grid">
            <div className="gig-client-source">
              <span>Published by</span>
              <h3>{detail.client.company_name ?? detail.client.display_name}</h3>
              {detail.client.company_name ? <p>{detail.client.display_name}</p> : null}
              {detail.client.industry ? <p>{detail.client.industry}</p> : null}
              {detail.client.company_summary ? <p>{detail.client.company_summary}</p> : null}
            </div>
            {applicationPanel.kind !== "hidden" ? (
              <div className={`gig-application-panel is-${applicationPanel.kind}`} aria-live="polite">
                <span>Application context</span>
                {applicationPanel.kind === "action" ? (
                  <>
                    <p>The marketplace confirmed the current action for this freelancer and gig.</p>
                    <Button to={applicationPanel.destination === "apply" ? `/gigs/${encodeURIComponent(gigId ?? "")}/apply` : applicationPanel.destination}>{applicationPanel.label}</Button>
                  </>
                ) : <p>{applicationPanel.label}</p>}
              </div>
            ) : null}
          </div>
        </DetailLane>
      </div>
    </section>
  );
}

function DetailLane({ index, title, summary, tone, children }: { index: string; title: string; summary: string; tone: "bone" | "glass" | "coral" | "ocean"; children: ReactNode }) {
  return (
    <section className={`gig-detail-lane is-${tone}`}>
      <header><span>{index}</span><div><h2>{title}</h2><p>{summary}</p></div></header>
      <div className="gig-detail-lane-body">{children}</div>
    </section>
  );
}

function SkillGroup({ label, values }: { label: string; values: string[] }) {
  return <div className="gig-detail-skill-group"><h3>{label}</h3><ul>{values.length ? values.map((value) => <li key={value}>{value}</li>) : <li>None specified</li>}</ul></div>;
}

function NumberedList({ values, empty }: { values: string[]; empty: string }) {
  if (!values.length) return <p className="gig-detail-empty">{empty}</p>;
  return <ol className="gig-detail-numbered-list">{values.map((value, index) => <li key={value}><span>{String(index + 1).padStart(2, "0")}</span>{value}</li>)}</ol>;
}

function Details({ rows }: { rows: [string, string][] }) {
  return <dl className="gig-detail-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function StatePanel({ title, body }: { title: string; body: string }) {
  return <div className="stage-two-state-panel" role="status"><span>Gig detail</span><h1>{title}</h1><p>{body}</p></div>;
}

function ErrorPanel({ message, returnTo, returnLabel }: { message: string; returnTo: string; returnLabel: string }) {
  return <div className="stage-two-state-panel is-error" role="alert"><span>Controlled error</span><h1>Gig details unavailable</h1><p>{message}</p><Button to={returnTo} variant="secondary">{returnLabel}</Button></div>;
}

function viewerReturnDestination(role: string | null) {
  if (role === "client") return { to: "/gigs/manage", label: "Return to managed gigs" };
  if (role === "admin") return { to: "/dashboard/admin", label: "Return to admin evaluation" };
  return { to: "/gigs", label: "Return to open gigs" };
}
