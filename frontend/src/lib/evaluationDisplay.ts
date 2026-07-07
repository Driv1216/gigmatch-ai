import type { EvaluationStrategy, MetricResult } from "./evaluationTypes";

export function formatStrategyLabel(strategy: EvaluationStrategy | string) {
  if (strategy === "keyword") {
    return "Keyword";
  }
  if (strategy === "semantic") {
    return "Semantic";
  }
  if (strategy === "hybrid") {
    return "Hybrid";
  }
  return strategy;
}

export function formatQueryType(value: string) {
  if (value === "freelancer_to_gigs") {
    return "Freelancer to gigs";
  }
  if (value === "gig_to_freelancers") {
    return "Gig to freelancers";
  }
  return value;
}

export function formatMetricName(metric: MetricResult) {
  const baseName = metric.metric_name
    .replace(/^mean_/, "Mean ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character: string) => character.toUpperCase());

  return metric.k ? `${baseName}@${metric.k}` : baseName;
}

export function formatMetricValue(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "Unavailable";
  }

  return value.toFixed(3);
}

export function formatCountDetail(value: unknown) {
  return typeof value === "number" ? String(value) : "0";
}
