import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  FileText,
  Home,
  Inbox,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import type { ConceptProps, ViewId } from "../types";
import {
  CommercialTerms,
  Mark,
  MatchStamp,
  ProcessRail,
  SelectionNotice,
  SkillList,
  TrustNote,
  VersionSeal,
} from "../shared";

export function Pocket(props: ConceptProps) {
  const items: Array<[ViewId, typeof Home, string]> = props.role === "freelancer"
    ? [["overview", Home, "Home"], ["market", Search, "Find"], ["applications", FileText, "Applications"], ["engagement", BriefcaseBusiness, "Engagement"]]
    : [["overview", Home, "Home"], ["review", UsersRound, "Applicants"], ["engagement", BriefcaseBusiness, "Engagement"]];
  return (
    <div className="concept pocket">
      <header className="pocket__header">
        <Mark compact />
        <div><button aria-label="Notifications"><Bell size={18} /><span /></button><button className="pocket-avatar">{props.role === "freelancer" ? "AR" : "NH"}</button></div>
      </header>
      <main className="pocket__main">
        {props.view === "overview" && <PocketHome {...props} />}
        {props.view === "market" && <PocketMarket {...props} />}
        {props.view === "proposal" && <PocketProposal {...props} />}
        {props.view === "applications" && <PocketApplications {...props} />}
        {props.view === "review" && <PocketReview {...props} />}
        {props.view === "engagement" && <PocketEngagement {...props} />}
      </main>
      <nav className="pocket__nav" aria-label="Pocket Desk navigation">
        {items.map(([id, Icon, label]) => <button key={id} className={props.view === id ? "is-active" : ""} onClick={() => props.onNavigate(id)}><Icon size={19} /><span>{label}</span></button>)}
      </nav>
    </div>
  );
}

function PocketTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <header className="pocket-title"><div><span>{eyebrow}</span><h1>{title}</h1></div>{action}</header>;
}

function PocketHome(props: ConceptProps) {
  const freelancer = props.role === "freelancer";
  return (
    <>
      <PocketTitle eyebrow="Friday, 24 July" title={`Good morning, ${freelancer ? "Aisha" : "Kavya"}`} action={<button aria-label="Menu"><Menu size={20} /></button>} />
      <section className="pocket-priority">
        <div className="pocket-priority__top"><span><Sparkles size={14} /> {freelancer ? "Your next decision" : "Review ready"}</span><small>{freelancer ? "Due in 2 days" : "3 applicants"}</small></div>
        <h2>{freelancer ? (props.state.selectionSent ? "Northstar wants to proceed" : "A strong-fit brief is closing soon") : "Meera’s updated proposal is ready"}</h2>
        <p>{freelancer ? (props.state.selectionSent ? "Review the frozen ₹5.6L proposal before accepting." : "Clinical operations design system · 88% match") : "Compare v1 and v2 before making the next formal decision."}</p>
        <button onClick={() => props.onNavigate(freelancer ? (props.state.selectionSent ? "applications" : "market") : "review")}>Open <ArrowRight size={16} /></button>
      </section>
      <section className="pocket-section">
        <div className="pocket-section__head"><h2>At a glance</h2><button onClick={() => props.onToast("All activity opened")}>See all</button></div>
        <div className="pocket-status-grid">
          <button onClick={() => props.onNavigate(freelancer ? "applications" : "review")}><span><FileText size={17} /></span><strong>{freelancer ? "2" : "12"}</strong><small>{freelancer ? "Active applications" : "Active applicants"}</small></button>
          <button onClick={() => props.onNavigate("engagement")}><span><ShieldCheck size={17} /></span><strong>{props.state.accepted ? "1" : "0"}</strong><small>Confirmed engagements</small></button>
        </div>
      </section>
      <section className="pocket-section">
        <div className="pocket-section__head"><h2>Recent</h2></div>
        <button className="pocket-activity" onClick={() => props.onToast("Clarification opened")}><span><MessageSquareText size={17} /></span><div><strong>{freelancer ? "Northstar asked a clarification" : "Aisha answered your clarification"}</strong><small>Today · Participant-visible</small></div><ChevronRight size={16} /></button>
        <button className="pocket-activity" onClick={() => props.onNavigate(freelancer ? "applications" : "review")}><span><FileText size={17} /></span><div><strong>Proposal version 2 recorded</strong><small>₹5.4L → ₹5.6L</small></div><ChevronRight size={16} /></button>
      </section>
    </>
  );
}

function PocketMarket(props: ConceptProps) {
  return (
    <>
      <PocketTitle eyebrow="Open opportunities" title="Find work" action={<button aria-label="Search"><Search size={19} /></button>} />
      <div className="pocket-filters"><button className="is-active">Best fit</button><button>Remote</button><button>Fixed price</button><button aria-label="More filters"><Menu size={15} /></button></div>
      <section className="pocket-card-stack">
        {props.gigs.map((gig, i) => (
          <article key={gig.id} className={gig.id === props.activeGig.id ? "is-active" : ""}>
            <div className="pocket-gig__top"><span className="company-tile">{gig.company.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span><div><strong>{gig.company}</strong><small>{gig.category}</small></div><button onClick={() => props.onToast("Opportunity saved")}><Bookmark size={17} /></button></div>
            <h2>{gig.title}</h2><p>{gig.summary}</p>
            <div className="pocket-gig__facts"><span>{gig.budget}</span><span>{gig.duration}</span><span>{gig.workMode}</span></div>
            <div className="pocket-gig__match"><span><Sparkles size={14} /><b>{gig.match}%</b> {gig.matchLabel}</span><button onClick={() => props.onSelectGig(gig.id)}>{gig.id === props.activeGig.id ? "Evidence open" : "View evidence"} <ChevronDown size={13} /></button></div>
            {gig.id === props.activeGig.id && <div className="pocket-evidence"><p>{gig.matchReason}</p><SkillList skills={gig.matchingSkills} minimal /><button className="pocket-primary" onClick={() => props.onNavigate("proposal")}>View terms & apply <ArrowRight size={15} /></button></div>}
          </article>
        ))}
      </section>
    </>
  );
}

function PocketProposal(props: ConceptProps) {
  if (props.state.applied) {
    return <div className="pocket-complete"><CheckCircle2 size={38} /><span>Application submitted</span><h1>Your official proposal is recorded.</h1><p>Proposal v2 responded to gig terms v3.</p><button className="pocket-primary" onClick={() => props.onNavigate("applications")}>Track application</button></div>;
  }
  return (
    <>
      <PocketTitle eyebrow="Northstar · Application" title="Your proposal" action={<button onClick={() => props.onNavigate("market")}><X size={19} /></button>} />
      <div className="pocket-step"><span>Step 3 of 4</span><div><i /><i /><i /><i /></div><small>Scope and assumptions</small></div>
      <form className="pocket-form" onSubmit={(e) => { e.preventDefault(); props.onApply(); }}>
        <section><label>Cover note<textarea defaultValue="I’ve led two multi-product design-system migrations, including accessibility remediation and adoption documentation." /></label></section>
        <section><div className="pocket-form__head"><h2>Commercial response</h2><span>Client: {props.activeGig.budget}</span></div><label>Exact total<input defaultValue="₹ 5,60,000" /></label><div className="field-grid"><label>Timeline<input defaultValue="14 weeks" /></label><label>Available from<input type="date" defaultValue="2026-08-10" /></label></div></section>
        <section><label>Included work<textarea defaultValue={"Component audit and migration plan\nAccessible React component library\nTwo workflow migrations\nAdoption documentation"} /></label><label>Assumption<textarea defaultValue="Access to current repositories and one product owner for weekly decisions." /></label></section>
        <TrustNote compact />
        <div className="pocket-submit"><label><input type="checkbox" defaultChecked /> I reviewed these terms.</label><button className="pocket-primary">Submit proposal <LockKeyhole size={15} /></button></div>
      </form>
    </>
  );
}

function PocketApplications(props: ConceptProps) {
  return (
    <>
      <PocketTitle eyebrow="Your records" title="Applications" action={<button aria-label="Application options"><Menu size={19} /></button>} />
      <div className="pocket-segment"><button className="is-active">Active <span>2</span></button><button>Closed <span>1</span></button></div>
      {props.state.selectionSent && <SelectionNotice state={props.state} onAccept={props.onAccept} onToast={props.onToast} />}
      <article className="pocket-application">
        <div><span className="company-tile">NH</span><p><strong>Northstar Health Systems</strong><small>{props.activeGig.title}</small></p><span className="status-chip">{props.state.applicationStage}</span></div>
        <ProcessRail state={props.state} />
        <div className="pocket-application__terms"><VersionSeal version={2} /><strong>₹5.6L · 14 weeks</strong></div>
        <button onClick={() => props.onToast("Full application record opened")}>Open record <ChevronRight size={15} /></button>
      </article>
      <article className="pocket-application pocket-application--quiet"><div><span className="company-tile">FC</span><p><strong>Fable Commerce</strong><small>React storefront performance</small></p><span className="status-chip">Under review</span></div><div className="pocket-application__terms"><VersionSeal version={1} /><strong>₹2,900 / hour</strong></div><button onClick={() => props.onToast("Fable record opened")}>Open record <ChevronRight size={15} /></button></article>
    </>
  );
}

function PocketReview(props: ConceptProps) {
  const lead = props.applicants[0];
  return (
    <>
      <PocketTitle eyebrow="Northstar · 1 of 12" title="Applicant review" action={<button aria-label="Applicant review options"><Menu size={19} /></button>} />
      <div className="pocket-sort"><button>Best match <ChevronDown size={13} /></button><span>Shortlist 1 / 5</span></div>
      <section className="pocket-candidate">
        <div className="pocket-candidate__identity"><span className="large-avatar">{lead.initials}</span><div><h2>{lead.name}</h2><p>{lead.headline}</p><small>{lead.location} · {lead.experience}</small></div></div>
        <MatchStamp gig={{ ...props.activeGig, match: lead.match, matchLabel: "Strong match" }} quiet />
        <div className="pocket-tabs"><button className="is-active">Evidence</button><button onClick={() => props.onToast("Proposal tab opened")}>Proposal</button><button onClick={() => props.onToast("Activity tab opened")}>Activity</button></div>
        <p className="candidate-note">{lead.coverNote}</p><SkillList skills={lead.skills} />
        <div className="pocket-gap"><span>Gap to consider</span><p>{lead.gap}</p></div>
        <div className="pocket-proposal-strip"><div><small>Proposal</small><strong>{lead.proposal}</strong></div><div><small>Timeline</small><strong>{lead.timeline}</strong></div><VersionSeal version={lead.version} /></div>
      </section>
      <div className="pocket-decision-bar">
        <button className={props.state.shortlisted ? "is-active" : ""} onClick={props.onShortlist}><Bookmark size={17} /><span>{props.state.shortlisted ? "Saved" : "Save"}</span></button>
        <button className={props.state.advanced ? "is-active" : ""} onClick={props.onAdvance}><UsersRound size={17} /><span>{props.state.advanced ? "Advanced" : "Advance"}</span></button>
        <button className="pocket-primary" disabled={!props.state.advanced} onClick={props.onSendSelection}><LockKeyhole size={15} /> Select</button>
      </div>
    </>
  );
}

function PocketEngagement(props: ConceptProps) {
  return (
    <>
      <PocketTitle eyebrow="GM-E-2048" title="Engagement" action={<button aria-label="Engagement options"><Menu size={19} /></button>} />
      <section className="pocket-engagement-hero"><div className="engagement-people"><span className="company-tile">NH</span><div /><span className="company-tile">AR</span></div><span className="status-chip">{props.state.accepted ? "Confirmed" : "Preview"}</span><h2>Northstar × {props.role === "freelancer" ? "Aisha" : "Meera"}</h2><p>Clinical operations design system</p></section>
      <section className="pocket-section">
        <div className="pocket-section__head"><h2>Accepted terms</h2><VersionSeal version={2} /></div>
        <CommercialTerms gig={props.activeGig} />
        <button className="pocket-activity" onClick={() => props.onToast("Accepted scope opened")}><span><FileText size={17} /></span><div><strong>Confirmed scope</strong><small>{props.activeGig.deliverables.length} recorded deliverables</small></div><ChevronRight size={16} /></button>
      </section>
      <section className="pocket-section contact-pocket"><div className="pocket-section__head"><h2>Secure contact exchange</h2><ShieldCheck size={18} /></div><p>Details stay masked until both parties consent for this engagement.</p><div><span>p•••••@northstar.health</span><LockKeyhole size={14} /></div><button className="pocket-primary" onClick={() => props.onToast("Consent controls opened")}>Review sharing consent</button></section>
      <TrustNote compact />
    </>
  );
}
