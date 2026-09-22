import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  Filter,
  LayoutList,
  LockKeyhole,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { ConceptProps, Gig } from "../types";
import {
  CommercialTerms,
  ConceptNavigation,
  Mark,
  MatchStamp,
  ProcessRail,
  SelectionNotice,
  SkillList,
  TrustNote,
  VersionSeal,
} from "../shared";

export function Exchange(props: ConceptProps) {
  return (
    <div className="concept exchange">
      <header className="exchange__header">
        <Mark />
        <div className="exchange__search"><Search size={17} /><input placeholder={props.role === "freelancer" ? "Search opportunities" : "Search applicants"} /><kbd>⌘ K</kbd></div>
        <ConceptNavigation role={props.role} active={props.view} onNavigate={props.onNavigate} mode="compact" />
        <button className="exchange__profile"><span>{props.role === "freelancer" ? "AR" : "NH"}</span><ChevronDown size={13} /></button>
      </header>
      {props.view === "overview" && <ExchangeOverview {...props} />}
      {props.view === "market" && <ExchangeMarket {...props} />}
      {props.view === "proposal" && <ExchangeProposal {...props} />}
      {props.view === "applications" && <ExchangeApplications {...props} />}
      {props.view === "review" && <ExchangeReview {...props} />}
      {props.view === "engagement" && <ExchangeEngagement {...props} />}
    </div>
  );
}

function ExchangeOverview(props: ConceptProps) {
  const freelancer = props.role === "freelancer";
  return (
    <main className="exchange-home">
      <section className="exchange-home__title"><div><span className="exchange-kicker">Professional marketplace</span><h1>{freelancer ? "Work matched to your evidence" : "Applicant decisions, without the noise"}</h1><p>{freelancer ? "Browse financially clear opportunities. Open the match evidence only when it helps you decide." : "Review actual applicants by suitability, then make client-controlled decisions."}</p></div><button className="exchange-cta" onClick={() => props.onNavigate(freelancer ? "market" : "review")}>{freelancer ? "Browse the exchange" : "Open applicant book"} <ArrowRight size={16} /></button></section>
      <section className="market-strip">
        <span>Today on GigMatch</span>
        <div><strong>{freelancer ? "3" : "12"}</strong><small>{freelancer ? "relevant open briefs" : "active applicants"}</small></div>
        <div><strong>{freelancer ? "1" : "3"}</strong><small>{freelancer ? "formal decision due" : "ready for focused review"}</small></div>
        <div><strong>0</strong><small>hidden contact details exposed</small></div>
      </section>
      <section className="exchange-feature">
        <div className="exchange-feature__visual">
          <span className="exchange-feature__label"><Sparkles size={14} /> FEATURED FIT</span>
          <div className="exchange-feature__score">88<small>%</small></div>
          <div className="alignment-lines"><span style={{ "--fill": "92%" } as React.CSSProperties} /><span style={{ "--fill": "84%" } as React.CSSProperties} /><span style={{ "--fill": "76%" } as React.CSSProperties} /><span style={{ "--fill": "94%" } as React.CSSProperties} /></div>
          <small>Required evidence alignment</small>
        </div>
        <div className="exchange-feature__copy">
          <span>Northstar Health Systems · Remote India</span>
          <h2>{props.activeGig.title}</h2>
          <p>{props.activeGig.summary}</p>
          <div className="inline-facts"><span>{props.activeGig.budget}</span><span>{props.activeGig.duration}</span><span>{props.activeGig.deadline}</span></div>
          <button onClick={() => props.onNavigate("market")}>Review brief and evidence <ArrowRight size={15} /></button>
        </div>
      </section>
      <section className="exchange-principles"><div><ShieldCheck /><h3>Explicit terms</h3><p>Budget, scope, availability, and versions remain visible.</p></div><div><Users /><h3>Human decision</h3><p>Matching supports review; it never hires automatically.</p></div><div><LockKeyhole /><h3>Private by design</h3><p>Contact exchange waits until a confirmed engagement.</p></div></section>
    </main>
  );
}

function ExchangeMarket(props: ConceptProps) {
  return (
    <main className="exchange-market">
      <header className="exchange-market__head"><div><span className="exchange-kicker">Open exchange</span><h1>Find the right brief, not the most listings</h1><p>3 opportunities meet your profile and availability preferences.</p></div><button className="filter-button"><SlidersHorizontal size={16} /> Filters <span>2</span></button></header>
      <div className="exchange-market__body">
        <aside className="facet-panel">
          <Facet title="Work mode" items={["Remote (3)", "Hybrid (0)", "On-site (0)"]} checked={["Remote (3)"]} />
          <Facet title="Payment" items={["Fixed price (1)", "Hourly (1)", "Open proposal (1)"]} checked={[]} />
          <Facet title="Evidence threshold" items={["Strong match 85%+", "Good match 75%+"]} checked={["Good match 75%+"]} />
          <button onClick={() => props.onToast("Filters cleared")}>Clear all</button>
        </aside>
        <section className="listing-results">
          <div className="listing-results__toolbar"><span><LayoutList size={15} /> 3 published briefs</span><button>Best fit <ChevronDown size={13} /></button></div>
          {props.gigs.map((gig, i) => <ExchangeGigRow key={gig.id} gig={gig} active={gig.id === props.activeGig.id} index={i + 1} onOpen={() => props.onSelectGig(gig.id)} onSave={() => props.onToast(`${gig.company} brief saved`)} />)}
        </section>
        <aside className="listing-inspector">
          <div className="listing-inspector__company"><span>NH</span><p><strong>{props.activeGig.company}</strong><small><BadgeCheck size={12} /> Company profile reviewed</small></p></div>
          <h2>{props.activeGig.title}</h2>
          <div className="inspector-score"><b>{props.activeGig.match}%</b><span>{props.activeGig.matchLabel}<small>AI-assisted suitability</small></span></div>
          <p>{props.activeGig.matchReason}</p>
          <h3>Matched evidence</h3><SkillList skills={props.activeGig.matchingSkills} minimal />
          <CommercialTerms gig={props.activeGig} condensed />
          <button className="exchange-cta" onClick={() => props.onNavigate("proposal")}>View full brief & apply <ArrowRight size={16} /></button>
          <small>Applications close {props.activeGig.deadline}</small>
        </aside>
      </div>
    </main>
  );
}

function Facet({ title, items, checked }: { title: string; items: string[]; checked: string[] }) {
  return <fieldset><legend>{title}</legend>{items.map((item) => <label key={item}><input type="checkbox" defaultChecked={checked.includes(item)} /><span>{item}</span></label>)}</fieldset>;
}

function ExchangeGigRow({ gig, active, index, onOpen, onSave }: { gig: Gig; active: boolean; index: number; onOpen: () => void; onSave: () => void }) {
  return <article className={active ? "is-active" : ""}><button className="listing-row__main" onClick={onOpen}><span className="listing-rank">0{index}</span><div><small>{gig.company} · {gig.category}</small><h2>{gig.title}</h2><div className="inline-facts"><span><MapPin size={12} /> {gig.workMode}</span><span><CircleDollarSign size={12} /> {gig.budget}</span><span><Clock3 size={12} /> {gig.duration}</span></div></div><div className="row-match"><strong>{gig.match}%</strong><small>{gig.matchLabel}</small></div></button><button className="row-save" onClick={onSave} aria-label="Save opportunity"><Bookmark size={16} /></button></article>;
}

function ExchangeProposal(props: ConceptProps) {
  if (props.state.applied) {
    return <main className="exchange-complete"><CheckCircle2 size={42} /><span className="exchange-kicker">Application submitted</span><h1>Your official proposal is on the record.</h1><p>Northstar will review proposal version 2 against gig terms version 3.</p><button className="exchange-cta" onClick={() => props.onNavigate("applications")}>Track application <ArrowRight size={16} /></button></main>;
  }
  return (
    <main className="exchange-apply">
      <header><div><span className="exchange-kicker">Application · Northstar Health Systems</span><h1>Make your commercial response unambiguous</h1></div><div><small>Client budget</small><strong>{props.activeGig.budget}</strong><span>Fixed price · slightly flexible</span></div></header>
      <div className="exchange-apply__layout">
        <form onSubmit={(e) => { e.preventDefault(); props.onApply(); }}>
          <section><div className="apply-section-head"><span>01</span><div><h2>Relevant case</h2><p>Explain why your evidence applies to this brief.</p></div></div><textarea defaultValue="I’ve led two multi-product design-system migrations, including accessibility remediation, component adoption, and documentation for operational workflows." /></section>
          <section><div className="apply-section-head"><span>02</span><div><h2>Commercial terms</h2><p>Structured values become part of the proposal record.</p></div></div><div className="field-grid"><label>Proposed total<input defaultValue="₹ 5,60,000" /></label><label>Delivery<select defaultValue="14 weeks"><option>14 weeks</option><option>12–14 weeks</option></select></label><label>Available from<input type="date" defaultValue="2026-08-10" /></label><label>Weekly capacity<input defaultValue="28 hours" /></label></div></section>
          <section><div className="apply-section-head"><span>03</span><div><h2>Scope boundary</h2><p>State what is and is not included.</p></div></div><label>Included work<textarea defaultValue={"Component inventory and migration plan\nAccessible React library\nTwo priority workflow migrations\nAdoption documentation"} /></label><label>Assumption<textarea defaultValue="Access to current repositories and one product owner for weekly scope decisions." /></label></section>
          <footer><label><input type="checkbox" defaultChecked /> I reviewed the scope, client budget, and deadline.</label><button className="exchange-cta">Submit official proposal <LockKeyhole size={15} /></button></footer>
        </form>
        <aside><div className="exchange-apply__sticky"><span className="exchange-kicker">Before you submit</span><h3>What becomes immutable?</h3><ul><li><Check size={13} /> This application version</li><li><Check size={13} /> The gig version you answered</li><li><Check size={13} /> The submission timestamp</li></ul><p>You can edit later. Each edit creates a new version and preserves the old one.</p><TrustNote compact /></div></aside>
      </div>
    </main>
  );
}

function ExchangeApplications(props: ConceptProps) {
  return (
    <main className="exchange-applications">
      <header><span className="exchange-kicker">Your work pipeline</span><h1>Applications</h1><div className="application-tabs"><button className="is-active">Active <span>2</span></button><button>Closed <span>1</span></button></div></header>
      {props.state.selectionSent && <SelectionNotice state={props.state} onAccept={props.onAccept} onToast={props.onToast} />}
      <article className="application-row">
        <div className="application-row__status"><span className="pulse-dot" /><strong>{props.state.applicationStage}</strong><small>Updated today</small></div>
        <div><small>Northstar Health Systems</small><h2>{props.activeGig.title}</h2><ProcessRail state={props.state} /></div>
        <div><VersionSeal version={props.state.applicationVersion} /><strong>₹5.6L · 14 weeks</strong><button onClick={() => props.onToast("Application record opened")}>Open record <ArrowRight size={14} /></button></div>
      </article>
      <article className="application-row application-row--quiet"><div className="application-row__status"><span /><strong>Under review</strong><small>Updated 21 Jul</small></div><div><small>Fable Commerce</small><h2>React storefront performance remediation</h2></div><div><VersionSeal version={1} /><strong>₹2,900 / hour</strong><button onClick={() => props.onToast("Fable application opened")}>Open record <ArrowRight size={14} /></button></div></article>
    </main>
  );
}

function ExchangeReview(props: ConceptProps) {
  const lead = props.applicants[0];
  return (
    <main className="exchange-review">
      <header><div><span className="exchange-kicker">Northstar · Clinical operations design system</span><h1>Applicant book</h1><p>Suitability first. Commercial terms beside—not inside—the ranking.</p></div><button className="filter-button"><Filter size={15} /> Best match <ChevronDown size={13} /></button></header>
      <div className="review-book">
        <aside className="candidate-list">
          {props.applicants.map((app, i) => <button key={app.id} className={i === 0 ? "is-active" : ""} onClick={() => i > 0 && props.onToast(`${app.name} selected`)}><span>{app.initials}</span><div><strong>{app.name}</strong><small>{app.headline}</small><em>{app.proposal} · v{app.version}</em></div><b>{app.match}%</b></button>)}
        </aside>
        <article className="candidate-inspector">
          <div className="candidate-inspector__head"><div><span className="candidate-photo">{lead.initials}</span><div><h2>{lead.name}</h2><p>{lead.headline}</p><small>{lead.location} · {lead.experience}</small></div></div><MatchStamp gig={{ ...props.activeGig, match: lead.match, matchLabel: "Strong match" }} quiet /></div>
          <div className="candidate-inspector__grid">
            <section><span className="exchange-kicker">Evidence</span><p>{lead.coverNote}</p><SkillList skills={lead.skills} /><div className="gap-note"><strong>Gap to consider</strong><p>{lead.gap}</p></div></section>
            <section><span className="exchange-kicker">Proposal</span><VersionSeal version={lead.version} /><dl><div><dt>Requested</dt><dd>{lead.proposal}</dd></div><div><dt>Timeline</dt><dd>{lead.timeline}</dd></div><div><dt>Availability</dt><dd>{lead.availability}</dd></div></dl><button onClick={() => props.onToast("Version comparison opened")}>Compare proposal versions</button></section>
          </div>
          <footer><button className={props.state.shortlisted ? "is-selected" : ""} onClick={props.onShortlist}><Bookmark size={15} /> {props.state.shortlisted ? "Saved privately" : "Save privately"}</button><button className={props.state.advanced ? "is-selected" : ""} onClick={props.onAdvance}><Users size={15} /> {props.state.advanced ? "Advanced" : "Advance"}</button><button className="exchange-cta" disabled={!props.state.advanced} onClick={props.onSendSelection}>Send selection request <LockKeyhole size={15} /></button></footer>
        </article>
      </div>
    </main>
  );
}

function ExchangeEngagement(props: ConceptProps) {
  return (
    <main className="exchange-engagement">
      <header><span className="exchange-kicker">Engagement GM-2048</span><h1>One secure record for the work you agreed</h1><p>Confirmed terms, limited status, activity, and consent-based contact sharing.</p></header>
      <div className="engagement-banner"><div><BriefcaseBusiness size={22} /><span><small>Status</small><strong>{props.state.accepted ? "Confirmed" : "Preview · not yet confirmed"}</strong></span></div><div><small>Participants</small><strong>Northstar × {props.role === "freelancer" ? "Aisha Raman" : "Meera Shah"}</strong></div><div><small>Start</small><strong>10 Aug 2026</strong></div><button onClick={() => props.onToast("Status options opened")}>Update status <ChevronDown size={13} /></button></div>
      <div className="exchange-engagement__grid">
        <section><div className="section-title"><h2>Confirmed proposal</h2><VersionSeal version={2} /></div><CommercialTerms gig={props.activeGig} /><h3>Scope</h3><ul>{props.activeGig.deliverables.map((item) => <li key={item}><Check size={13} /> {item}</li>)}</ul><TrustNote compact /></section>
        <aside><span className="exchange-kicker">Secure contact exchange</span><ShieldCheck size={26} /><h2>Sharing stays engagement-specific</h2><p>Each participant separately chooses which verified details to make available.</p><div className="masked-contact"><span>p•••••@northstar.health</span><LockKeyhole size={14} /></div><button className="exchange-cta" onClick={() => props.onToast("Contact consent opened")}>Review sharing consent</button></aside>
      </div>
    </main>
  );
}
