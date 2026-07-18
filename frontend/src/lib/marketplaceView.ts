import type { DurationSummary, GigDetail, PaymentSummary, StructuredRange } from "./marketplaceContracts";
import type { RankingContext } from "./matchingContracts";

export type CollectionViewState = "loading" | "error" | "empty" | "ready";

export function collectionViewState(loading: boolean, error: string | null, itemCount: number): CollectionViewState {
  if (loading) return "loading";
  if (error) return "error";
  if (itemCount === 0) return "empty";
  return "ready";
}

export function paginationState(page: number, totalPages: number) {
  return {
    canGoPrevious: page > 1,
    canGoNext: totalPages > 0 && page < totalPages,
  };
}

export function gigDetailPath(gigId: string) {
  return `/gigs/${encodeURIComponent(gigId)}`;
}

export function rankingPresentation(context: RankingContext) {
  if (context.ranking_mode === "keyword_fallback") {
    return {
      label: "Keyword ranking",
      message: "Semantic matching is temporarily unavailable, so these recommendations use keyword evidence.",
      showHybridScore: false,
      showSemanticScore: false,
    };
  }
  if (context.ranking_mode === "hybrid") {
    return {
      label: "Hybrid ranking",
      message: "Recommendations combine keyword and semantic matching evidence.",
      showHybridScore: true,
      showSemanticScore: true,
    };
  }
  return {
    label: context.ranking_mode === "semantic" ? "Semantic ranking" : "Keyword ranking",
    message: context.ranking_mode === "semantic" ? "Recommendations use semantic matching evidence." : "Recommendations use keyword evidence.",
    showHybridScore: false,
    showSemanticScore: context.ranking_mode === "semantic",
  };
}

export function availabilityMessage(detail: Pick<GigDetail, "availability_reason" | "accepting_applications">) {
  if (detail.accepting_applications) return "This opportunity is currently accepting applications.";
  return {
    opportunity_paused: "This opportunity is paused and is not accepting applications right now.",
    applications_closed: "Applications are closed for this opportunity.",
    application_deadline_passed: "The application deadline has passed.",
    opportunity_not_application_ready: "This opportunity is not currently application-ready.",
  }[detail.availability_reason] ?? "This opportunity is not accepting applications.";
}

export function formatPayment(payment: PaymentSummary): string {
  const prefix = `${payment.currency} `;
  const range = payment.payment_structure === "hourly" ? payment.hourly_rate : payment.budget ?? payment.guidance_range;
  if (range?.minimum != null && range.maximum != null) {
    const suffix = payment.payment_structure === "hourly" ? " / hour" : "";
    return `${prefix}${formatNumber(range.minimum)}–${formatNumber(range.maximum)}${suffix}`;
  }
  if (payment.maximum_budget != null) return `Up to ${prefix}${formatNumber(payment.maximum_budget)}`;
  if (payment.no_estimate_explanation) return "Open to proposals";
  return payment.payment_structure.replace(/_/g, " ");
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Not specified";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatRange(value: StructuredRange | null): string {
  if (!value || (value.minimum == null && value.maximum == null)) return "Not specified";
  const unit = value.unit ? ` ${value.unit}` : "";
  if (value.minimum != null && value.maximum != null) return `${formatNumber(value.minimum)}–${formatNumber(value.maximum)}${unit}`;
  return `${formatNumber(value.minimum ?? value.maximum ?? 0)}${unit}`;
}

export function formatDuration(value: DurationSummary | null): string {
  if (!value) return "Not specified";
  const unit = value.unit ? ` ${value.unit}` : "";
  if (value.exact_value != null) return `${formatNumber(value.exact_value)}${unit}`;
  if (value.minimum != null && value.maximum != null) return `${formatNumber(value.minimum)}–${formatNumber(value.maximum)}${unit}`;
  return value.mode?.replace(/_/g, " ") ?? "Not specified";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}
