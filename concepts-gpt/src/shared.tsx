import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  FileCheck2,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { AppState, Gig, Role, ViewId } from "./types";

export function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""}`}>
      <span className="brand-glyph" aria-hidden="true"><span /><span /></span>
      <span className="brand-word">GigMatch</span>
    </div>
  );
}

export function MatchStamp({ gig, quiet = false }: { gig: Gig; quiet?: boolean }) {
  return (
    <div className={`match-stamp ${quiet ? "match-stamp--quiet" : ""}`}>
      <div className="match-stamp__score">{gig.match}<small>%</small></div>
      <div>
        <strong>{gig.matchLabel}</strong>
        <span><Sparkles size={12} /> AI-assisted suitability</span>
      </div>
    </div>
  );
}

export function GigMeta({ gig, compact = false }: { gig: Gig; compact?: boolean }) {
  return (
    <div className={`gig-meta ${compact ? "gig-meta--compact" : ""}`}>
      <span><MapPin size={14} /> {gig.workMode} · {gig.location}</span>
      <span><CalendarDays size={14} /> Apply by {gig.deadline}</span>
      <span><Clock3 size={14} /> {gig.duration}</span>
    </div>
  );
}

export function SkillList({
  skills,
  missing = false,
  minimal = false,
}: {
  skills: string[];
  missing?: boolean;
  minimal?: boolean;
}) {
  return (
    <div className={`skill-list ${missing ? "skill-list--missing" : ""} ${minimal ? "skill-list--minimal" : ""}`}>
      {skills.map((skill) => <span key={skill}>{missing ? <Circle size={8} /> : <Check size={12} />} {skill}</span>)}
    </div>
  );
}

export function CommercialTerms({ gig, condensed = false }: { gig: Gig; condensed?: boolean }) {
  return (
    <dl className={`terms-grid ${condensed ? "terms-grid--condensed" : ""}`}>
      <div><dt>Structure</dt><dd>{gig.paymentStructure}</dd></div>
      <div><dt>Client budget</dt><dd>{gig.budget}</dd></div>
      <div><dt>Commitment</dt><dd>{gig.weeklyCommitment}</dd></div>
      <div><dt>Expected duration</dt><dd>{gig.duration}</dd></div>
    </dl>
  );
}

export function TrustNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`trust-note ${compact ? "trust-note--compact" : ""}`}>
      <ShieldCheck size={17} />
      <div>
        <strong>Terms are recorded, not processed</strong>
        <span>GigMatch does not provide contracts, payment processing, or escrow.</span>
      </div>
    </div>
  );
}

export function SelectionNotice({
  state,
  onAccept,
  onToast,
}: {
  state: AppState;
  onAccept: () => void;
  onToast: (message: string) => void;
}) {
  if (state.accepted) {
    return (
      <div className="selection-notice selection-notice--accepted">
        <CheckCircle2 size={22} />
        <div><strong>Exact terms accepted</strong><span>Engagement GM-2048 is now confirmed.</span></div>
      </div>
    );
  }

  return (
    <section className="selection-notice">
      <div className="selection-notice__head">
        <span><LockKeyhole size={16} /> Version-bound request</span>
        <time>Respond by 26 Jul · 6:00 PM IST</time>
      </div>
      <h3>Northstar wants to proceed with proposal version 2</h3>
      <p>Accepting confirms the unchanged ₹5.6L proposal, 14-week timeline, and scope recorded in version 2.</p>
      <div className="button-row">
        <button className="primary-action" onClick={onAccept}>Accept exact terms <ArrowRight size={16} /></button>
        <button className="secondary-action" onClick={() => onToast("Revised terms request opened")}>Request revised terms</button>
        <button className="text-action" onClick={() => onToast("Decline options opened")}>Decline</button>
      </div>
      <p className="selection-notice__foot"><AlertTriangle size={13} /> You cannot accept while adding new conditions. Request revised terms instead.</p>
    </section>
  );
}

export function ProcessRail({ state }: { state: AppState }) {
  const steps = [
    ["Submitted", true],
    ["Advanced", state.advanced || state.selectionSent || state.accepted],
    ["Selection", state.selectionSent || state.accepted],
    ["Confirmed", state.accepted],
  ] as const;
  return (
    <ol className="process-rail">
      {steps.map(([label, done], index) => (
        <li key={label} className={done ? "is-done" : ""}>
          <span>{done ? <Check size={12} /> : index + 1}</span>
          <small>{label}</small>
        </li>
      ))}
    </ol>
  );
}

export function VersionSeal({ version = 2 }: { version?: number }) {
  return (
    <span className="version-seal"><FileCheck2 size={14} /> Proposal v{version} · current</span>
  );
}

export function ConceptNavigation({
  role,
  active,
  onNavigate,
  mode = "default",
}: {
  role: Role;
  active: ViewId;
  onNavigate: (view: ViewId) => void;
  mode?: "default" | "compact" | "icons";
}) {
  const items: Array<[ViewId, string]> = role === "freelancer"
    ? [["overview", "Home"], ["market", "Find work"], ["applications", "Applications"], ["engagement", "Engagement"]]
    : [["overview", "Home"], ["review", "Applicant review"], ["engagement", "Engagement"]];
  return (
    <nav className={`concept-nav concept-nav--${mode}`} aria-label={`${role} concept navigation`}>
      {items.map(([id, label]) => (
        <button key={id} className={active === id ? "is-active" : ""} onClick={() => onNavigate(id)}>
          <span>{label}</span>{mode === "default" ? <ChevronRight size={13} /> : null}
        </button>
      ))}
    </nav>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty-state"><Circle size={18} /><strong>{title}</strong><p>{body}</p></div>;
}
