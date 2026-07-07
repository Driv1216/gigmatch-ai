export type ExplanationReasonCode =
  | "required_skill_match"
  | "preferred_skill_match"
  | "missing_required_skill"
  | "missing_preferred_skill"
  | "high_semantic_similarity"
  | "low_semantic_similarity"
  | "category_alignment"
  | "seniority_alignment"
  | "keyword_score_support"
  | "semantic_score_support"
  | "hybrid_score_support";

export type SkillGapSeverity = "none" | "low" | "medium" | "high";
export type MatchExplanationEntityType = "freelancer" | "gig";

export type SkillEvidence = {
  skill_name: string;
  normalized_name?: string | null;
  category?: string | null;
};

export type ExplanationReason = {
  code?: ExplanationReasonCode | null;
  skill_names?: string[] | null;
  score_name?: string | null;
  score_value?: number | null;
};

export type ScoreExplanation = {
  hybrid_score?: number | null;
  keyword_score?: number | null;
  semantic_score?: number | null;
  keyword_weight?: number | null;
  semantic_weight?: number | null;
  required_skill_coverage?: number | null;
  preferred_skill_coverage?: number | null;
  category_alignment?: number | null;
  missing_required_skill_penalty?: number | null;
};

export type SkillGapSummary = {
  severity?: SkillGapSeverity | null;
  matched_required_skills?: SkillEvidence[] | null;
  matched_preferred_skills?: SkillEvidence[] | null;
  missing_required_skills?: SkillEvidence[] | null;
  missing_preferred_skills?: SkillEvidence[] | null;
  focus_skills?: SkillEvidence[] | null;
};

export type MatchExplanation = {
  summary?: string | null;
  subject_id?: string | null;
  subject_type?: MatchExplanationEntityType | null;
  candidate_id?: string | null;
  candidate_type?: MatchExplanationEntityType | null;
  rank?: number | null;
  reasons?: ExplanationReason[] | null;
  score?: ScoreExplanation | null;
  skill_gap?: SkillGapSummary | null;
};

export type SkillGapSeverityTone = "neutral" | "positive" | "attention" | "warning" | "critical";

export type ScoreEvidenceRow = {
  key: keyof ScoreExplanation;
  label: string;
  value: string;
};

const reasonLabels: Record<ExplanationReasonCode, string> = {
  required_skill_match: "Required skill overlap",
  preferred_skill_match: "Preferred skill overlap",
  missing_required_skill: "Missing required skill",
  missing_preferred_skill: "Missing preferred skill",
  high_semantic_similarity: "Strong semantic similarity",
  low_semantic_similarity: "Limited semantic similarity",
  category_alignment: "Category alignment",
  seniority_alignment: "Seniority alignment",
  keyword_score_support: "Keyword score contributed",
  semantic_score_support: "Semantic similarity contributed",
  hybrid_score_support: "Hybrid score included",
};

const scoreLabels: Record<keyof ScoreExplanation, string> = {
  hybrid_score: "Hybrid score",
  keyword_score: "Keyword score",
  semantic_score: "Semantic score",
  keyword_weight: "Keyword weight",
  semantic_weight: "Semantic weight",
  required_skill_coverage: "Required skill coverage",
  preferred_skill_coverage: "Preferred skill coverage",
  category_alignment: "Category alignment",
  missing_required_skill_penalty: "Missing required skill penalty",
};

const scoreOrder: (keyof ScoreExplanation)[] = [
  "hybrid_score",
  "keyword_score",
  "semantic_score",
  "required_skill_coverage",
  "preferred_skill_coverage",
  "category_alignment",
  "missing_required_skill_penalty",
  "keyword_weight",
  "semantic_weight",
];

export function normalizeArray<T>(value: T[] | readonly T[] | null | undefined): T[] {
  return Array.isArray(value) ? [...value] : [];
}

export function normalizeSkillEvidence(value: SkillEvidence[] | readonly SkillEvidence[] | null | undefined) {
  return normalizeArray(value).filter((skill) => skill.skill_name.trim().length > 0);
}

export function getSkillGapSeverityLabel(severity: SkillGapSeverity | null | undefined) {
  switch (severity) {
    case "high":
      return "High gap";
    case "medium":
      return "Medium gap";
    case "low":
      return "Low gap";
    case "none":
      return "No gap";
    default:
      return "Unknown gap";
  }
}

export function getSkillGapSeverityTone(severity: SkillGapSeverity | null | undefined): SkillGapSeverityTone {
  switch (severity) {
    case "none":
      return "positive";
    case "low":
      return "attention";
    case "medium":
      return "warning";
    case "high":
      return "critical";
    default:
      return "neutral";
  }
}

export function getReasonLabel(code: ExplanationReasonCode | string | null | undefined) {
  if (!code) {
    return "Explanation evidence";
  }

  if (isExplanationReasonCode(code)) {
    return reasonLabels[code];
  }

  return code
    .split("_")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function getScoreLabel(scoreName: keyof ScoreExplanation | string | null | undefined) {
  if (!scoreName) {
    return "Score";
  }

  if (isScoreExplanationKey(scoreName)) {
    return scoreLabels[scoreName];
  }

  return scoreName
    .split("_")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function formatScoreValue(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const percentage = value * 100;

  if (Number.isInteger(percentage)) {
    return `${percentage}%`;
  }

  return `${percentage.toFixed(1)}%`;
}

export function getScoreEvidenceRows(score: ScoreExplanation | null | undefined): ScoreEvidenceRow[] {
  if (!score) {
    return [];
  }

  return scoreOrder.flatMap((key) => {
    const value = score[key];
    const formattedValue = formatScoreValue(value);

    if (!formattedValue) {
      return [];
    }

    return [{ key, label: scoreLabels[key], value: formattedValue }];
  });
}

export function hasSkillGapEvidence(skillGap: SkillGapSummary | null | undefined) {
  if (!skillGap) {
    return false;
  }

  return (
    normalizeSkillEvidence(skillGap.matched_required_skills).length > 0 ||
    normalizeSkillEvidence(skillGap.matched_preferred_skills).length > 0 ||
    normalizeSkillEvidence(skillGap.missing_required_skills).length > 0 ||
    normalizeSkillEvidence(skillGap.missing_preferred_skills).length > 0 ||
    normalizeSkillEvidence(skillGap.focus_skills).length > 0 ||
    Boolean(skillGap.severity && skillGap.severity !== "none")
  );
}

export function hasExplanationEvidence(explanation: MatchExplanation | null | undefined) {
  if (!explanation) {
    return false;
  }

  return (
    Boolean(explanation.summary) ||
    normalizeArray(explanation.reasons).length > 0 ||
    getScoreEvidenceRows(explanation.score).length > 0 ||
    hasSkillGapEvidence(explanation.skill_gap)
  );
}

function isExplanationReasonCode(code: string): code is ExplanationReasonCode {
  return code in reasonLabels;
}

function isScoreExplanationKey(scoreName: string): scoreName is keyof ScoreExplanation {
  return scoreName in scoreLabels;
}
