import {
  formatScoreValue,
  getReasonLabel,
  getScoreEvidenceRows,
  getScoreLabel,
  getSkillGapSeverityLabel,
  getSkillGapSeverityTone,
  hasExplanationEvidence,
  hasSkillGapEvidence,
  normalizeArray,
  normalizeSkillEvidence,
  type ExplanationReason,
  type MatchExplanation,
  type ScoreExplanation,
  type SkillEvidence,
  type SkillGapSeverity,
} from "../lib/matchingExplanations";

type MatchExplanationPanelProps = {
  explanation?: MatchExplanation | null;
  title?: string;
  showReasonDetails?: boolean;
  className?: string;
};

type SkillEvidenceListProps = {
  title: string;
  skills?: SkillEvidence[] | null;
  emptyLabel?: string;
  tone?: "matched" | "missing" | "neutral";
};

type FocusSkillsListProps = {
  skills?: SkillEvidence[] | null;
};

type SkillGapBadgeProps = {
  severity?: SkillGapSeverity | null;
};

type ScoreEvidenceMiniProps = {
  score?: ScoreExplanation | null;
};

const severityToneClasses = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  attention: "border-teal-200 bg-teal-50 text-teal-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-line bg-slate-50 text-muted",
};

const skillToneClasses = {
  matched: "border-emerald-200 bg-emerald-50 text-emerald-700",
  missing: "border-amber-200 bg-amber-50 text-amber-800",
  neutral: "border-line bg-slate-50 text-ink",
};

export function MatchExplanationPanel({
  explanation,
  title = "Why this match",
  showReasonDetails = true,
  className = "",
}: MatchExplanationPanelProps) {
  const skillGap = explanation?.skill_gap;
  const hasSkillGap = hasSkillGapEvidence(skillGap);
  const reasons = normalizeArray(explanation?.reasons);

  if (!hasExplanationEvidence(explanation)) {
    return (
      <section className={`rounded-lg border border-line bg-white p-5 shadow-sm ${className}`.trim()}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold tracking-normal text-ink">{title}</h2>
          {hasSkillGap ? <SkillGapBadge severity={skillGap?.severity} /> : null}
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">No explanation details available yet.</p>
      </section>
    );
  }

  return (
    <section className={`rounded-lg border border-line bg-white p-5 shadow-sm ${className}`.trim()}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Match explanation</p>
          <h2 className="mt-1 text-base font-bold tracking-normal text-ink">{title}</h2>
        </div>
        {hasSkillGap ? <SkillGapBadge severity={skillGap?.severity} /> : null}
      </div>

      {explanation?.summary ? <p className="mt-4 text-sm leading-6 text-muted">{explanation.summary}</p> : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <SkillEvidenceList title="Matched required skills" skills={skillGap?.matched_required_skills} tone="matched" />
        <SkillEvidenceList title="Matched preferred skills" skills={skillGap?.matched_preferred_skills} tone="matched" />
        <SkillEvidenceList title="Missing required skills" skills={skillGap?.missing_required_skills} tone="missing" />
        <SkillEvidenceList title="Missing preferred skills" skills={skillGap?.missing_preferred_skills} tone="missing" />
      </div>

      <div className="mt-5 grid gap-5 border-t border-line pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
        <FocusSkillsList skills={skillGap?.focus_skills} />
        <ScoreEvidenceMini score={explanation?.score} />
      </div>

      {showReasonDetails && reasons.length > 0 ? <ReasonDetails reasons={reasons} /> : null}
    </section>
  );
}

export function SkillEvidenceList({
  title,
  skills,
  emptyLabel = "None listed",
  tone = "neutral",
}: SkillEvidenceListProps) {
  const normalizedSkills = normalizeSkillEvidence(skills);

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {normalizedSkills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {normalizedSkills.map((skill) => (
            <SkillChip key={`${skill.normalized_name ?? skill.skill_name}-${skill.category ?? "uncategorized"}`} skill={skill} tone={tone} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">{emptyLabel}</p>
      )}
    </div>
  );
}

export function SkillGapBadge({ severity }: SkillGapBadgeProps) {
  const tone = getSkillGapSeverityTone(severity);

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${severityToneClasses[tone]}`}
    >
      {getSkillGapSeverityLabel(severity)}
    </span>
  );
}

export function ScoreEvidenceMini({ score }: ScoreEvidenceMiniProps) {
  const rows = getScoreEvidenceRows(score);

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">Score evidence</h3>
      {rows.length > 0 ? (
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
              <dt className="text-xs font-medium text-muted">{row.label}</dt>
              <dd className="text-sm font-semibold tabular-nums text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-muted">No compact score evidence available.</p>
      )}
    </div>
  );
}

export function FocusSkillsList({ skills }: FocusSkillsListProps) {
  const focusSkills = normalizeSkillEvidence(skills);

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">Focus skills</h3>
      {focusSkills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {focusSkills.map((skill) => (
            <SkillChip key={`${skill.normalized_name ?? skill.skill_name}-${skill.category ?? "focus"}`} skill={skill} tone="neutral" />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">No focus skills returned.</p>
      )}
    </div>
  );
}

function ReasonDetails({ reasons }: { reasons: ExplanationReason[] }) {
  return (
    <div className="mt-5 border-t border-line pt-5">
      <h3 className="text-sm font-semibold text-ink">Reason details</h3>
      <ul className="mt-3 space-y-3">
        {reasons.map((reason, index) => (
          <li key={`${reason.code ?? "reason"}-${index}`} className="text-sm leading-6 text-muted">
            <span className="font-semibold text-ink">{getReasonLabel(reason.code)}</span>
            {renderReasonEvidence(reason)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderReasonEvidence(reason: ExplanationReason) {
  const skillNames = normalizeArray(reason.skill_names).filter((skillName) => skillName.trim().length > 0);
  const scoreValue = formatScoreValue(reason.score_value);

  if (skillNames.length > 0) {
    return (
      <span className="mt-2 flex flex-wrap gap-2">
        {skillNames.map((skillName) => (
          <span key={skillName} className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-xs font-semibold text-ink">
            {skillName}
          </span>
        ))}
      </span>
    );
  }

  if (scoreValue) {
    return (
      <span className="ml-2 text-xs font-semibold text-muted">
        {getScoreLabel(reason.score_name)}: {scoreValue}
      </span>
    );
  }

  return null;
}

function SkillChip({ skill, tone }: { skill: SkillEvidence; tone: "matched" | "missing" | "neutral" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${skillToneClasses[tone]}`}>
      {skill.skill_name}
    </span>
  );
}
