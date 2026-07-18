import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { fetchGigDetail, MarketplaceApiError, type GigDetailResponse } from "../lib/marketplace";
import { availabilityMessage, formatDateTime, formatDuration, formatPayment, formatRange } from "../lib/marketplaceView";

export function GigDetailPage() {
  const { gigId } = useParams();
  const [detail, setDetail] = useState<GigDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <PageContainer><p className="text-sm font-medium text-muted">Loading gig details...</p></PageContainer>;
  }
  if (error || !detail) {
    return <PageContainer><ErrorPanel message={error ?? "Unable to load gig details."} /></PageContainer>;
  }
  if (detail.response_kind === "tombstone") {
    return (
      <PageContainer>
        <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
          <span className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold uppercase text-muted">{detail.product_state}</span>
          <h1 className="mt-5 text-3xl font-bold text-ink">{detail.title}</h1>
          <p className="mt-4 text-base text-muted">{detail.message}</p>
          <div className="mt-8"><Button to="/gigs" variant="secondary">Browse open gigs</Button></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <header className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${detail.accepting_applications ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {detail.product_state.replace(/_/g, " ")}
          </span>
          <span className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold text-muted">{detail.work_mode}</span>
        </div>
        <h1 className="mt-5 text-3xl font-bold text-ink">{detail.title}</h1>
        <p className="mt-3 text-sm font-semibold text-accent">{detail.category}</p>
        <p className={`mt-6 rounded-md border px-4 py-3 text-sm font-medium ${detail.accepting_applications ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {availabilityMessage(detail)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <main className="space-y-6">
          <Section title="Published scope"><p className="whitespace-pre-wrap text-sm leading-7 text-muted">{detail.description}</p></Section>
          <Section title="Deliverables"><List values={detail.deliverables} /></Section>
          <Section title="Skills">
            <SkillGroup label="Required" values={detail.required_skills} />
            <div className="mt-5"><SkillGroup label="Preferred" values={detail.preferred_skills} /></div>
          </Section>
        </main>
        <aside className="space-y-6">
          <Section title="Payment terms">
            <p className="text-lg font-bold text-ink">{formatPayment(detail.payment)}</p>
            <p className="mt-2 text-sm capitalize text-muted">{detail.payment.payment_structure.replace(/_/g, " ")}</p>
          </Section>
          <Section title="Schedule and requirements">
            <Details rows={[
              ["Apply by", formatDateTime(detail.application_deadline)],
              ["Project deadline", formatDateTime(detail.project_deadline)],
              ["Experience", detail.experience_requirement],
              ["Work mode", detail.work_mode],
              ["Location", detail.location_requirement ?? "Not specified"],
              ["Weekly commitment", formatRange(detail.expected_weekly_commitment ?? detail.payment.weekly_commitment)],
              ["Expected duration", formatDuration(detail.expected_duration ?? detail.payment.engagement_duration)],
              ["Terms updated", formatDateTime(detail.material_updated_at)],
            ]} />
          </Section>
          <Section title="Client">
            <p className="font-bold text-ink">{detail.client.company_name ?? detail.client.display_name}</p>
            {detail.client.company_name ? <p className="mt-1 text-sm text-muted">Contact: {detail.client.display_name}</p> : null}
            {detail.client.industry ? <p className="mt-3 text-sm text-muted">{detail.client.industry}</p> : null}
            {detail.client.company_summary ? <p className="mt-3 text-sm leading-6 text-muted">{detail.client.company_summary}</p> : null}
          </Section>
          <Button to="/gigs" variant="secondary" className="w-full">Back to open gigs</Button>
        </aside>
      </div>
    </PageContainer>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-line bg-white p-6 shadow-soft"><h2 className="text-lg font-bold text-ink">{title}</h2><div className="mt-4">{children}</div></section>;
}

function SkillGroup({ label, values }: { label: string; values: string[] }) {
  return <div><h3 className="text-sm font-semibold text-ink">{label}</h3><div className="mt-3 flex flex-wrap gap-2">{values.length ? values.map((value) => <span key={value} className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink">{value}</span>) : <span className="text-sm text-muted">None specified</span>}</div></div>;
}

function List({ values }: { values: string[] }) {
  return <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted">{values.map((value) => <li key={value}>{value}</li>)}</ul>;
}

function Details({ rows }: { rows: [string, string][] }) {
  return <dl className="space-y-3">{rows.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase text-muted">{label}</dt><dd className="mt-1 text-sm font-medium text-ink">{value}</dd></div>)}</dl>;
}

function ErrorPanel({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-8"><h1 className="text-2xl font-bold text-red-800">Gig details unavailable</h1><p className="mt-3 text-sm text-red-700">{message}</p><div className="mt-6"><Button to="/gigs" variant="secondary">Browse open gigs</Button></div></div>;
}
