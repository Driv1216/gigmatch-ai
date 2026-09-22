import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileDiff,
  FileText,
  Inbox,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { ConceptProps } from "../types";
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
import { ACTIVITY } from "../data";

export function Workroom(props: ConceptProps) {
  return (
    <div className="concept workroom">
      <aside className="workroom__rail">
        <Mark compact />
        <nav aria-label="Deal room navigation">
          {(props.role === "freelancer"
            ? [["overview", Inbox, "Inbox"], ["market", Search, "Find"], ["applications", FileText, "Applications"], ["engagement", BriefcaseBusiness, "Engagement"]]
            : [["overview", Inbox, "Inbox"], ["review", UsersRound, "Review"], ["engagement", BriefcaseBusiness, "Engagement"]]
          ).map(([view, Icon, label]) => {
            const IconComponent = Icon as typeof Inbox;
            return <button key={String(view)} className={props.view === view ? "is-active" : ""} onClick={() => props.onNavigate(view as typeof props.view)}><IconComponent size={19} /><span>{String(label)}</span></button>;
          })}
        </nav>
        <div className="workroom__profile"><span>{props.role === "freelancer" ? "AR" : "NH"}</span><div><strong>{props.role === "freelancer" ? "Aisha" : "Northstar"}</strong><small>{props.role}</small></div></div>
      </aside>
      <main className="workroom__main">
        {props.view === "overview" && <RoomOverview {...props} />}
        {props.view === "market" && <RoomMarket {...props} />}
        {props.view === "proposal" && <RoomProposal {...props} />}
        {props.view === "applications" && <RoomApplication {...props} />}
        {props.view === "review" && <RoomReview {...props} />}
        {props.view === "engagement" && <RoomEngagement {...props} />}
      </main>
    </div>
  );
}

function RoomBar({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return <header className="room-bar"><div><p>{subtitle}</p><h1>{title}</h1></div><div className="room-bar__actions">{children}<button aria-label="More options"><MoreHorizontal size={18} /></button></div></header>;
}

function RoomOverview(props: ConceptProps) {
  const freelancer = props.role === "freelancer";
  return (
    <>
      <RoomBar title={freelancer ? "Aisha’s workroom" : "Northstar hiring room"} subtitle="Friday · 24 July 2026"><button onClick={() => props.onToast("Command search opened")}><Search size={16} /> Search</button></RoomBar>
      <div className="room-dashboard">
        <section className="room-inbox">
          <div className="room-section-title"><div><h2>Needs attention</h2><p>Decisions and changes, not generic notifications.</p></div><span>{freelancer ? "2" : "3"}</span></div>
          <button className="attention-item is-urgent" onClick={() => props.onNavigate(freelancer ? (props.state.selectionSent ? "applications" : "market") : "review")}>
            <span><LockKeyhole size={18} /></span><div><small>{freelancer ? "Selection · Northstar" : "Proposal change · Meera Shah"}</small><strong>{freelancer ? (props.state.selectionSent ? "Exact terms ready for response" : "Strong-fit brief ready to review") : "Version 2 needs a fresh review"}</strong><p>{freelancer ? "Respond by 26 Jul · 6:00 PM IST" : "₹5.4L → ₹5.6L · scope unchanged"}</p></div><ArrowRight size={17} />
          </button>
          <button className="attention-item" onClick={() => props.onToast("Clarification thread opened")}><span><MessageSquareText size={18} /></span><div><small>Clarification</small><strong>{freelancer ? "One focused question from Northstar" : "Aisha answered the tablet-coverage question"}</strong><p>Participant-visible · immutable message</p></div><ArrowRight size={17} /></button>
        </section>
        <aside className="room-context">
          <div className="room-section-title"><div><h2>Active case</h2><p>GM-2048</p></div></div>
          <span className="company-tile">NH</span><h3>{props.activeGig.title}</h3><p>{props.activeGig.company}</p>
          <ProcessRail state={props.state} />
          <dl><div><dt>Terms</dt><dd>Gig v3</dd></div><div><dt>Proposal</dt><dd>Application v2</dd></div><div><dt>Last event</dt><dd>Today · 10:42</dd></div></dl>
          <button onClick={() => props.onNavigate(freelancer ? "applications" : "review")}>Open case room <ArrowRight size={15} /></button>
        </aside>
        <section className="room-activity">
          <div className="room-section-title"><div><h2>Recent case activity</h2><p>Events with product consequence</p></div><Activity size={17} /></div>
          {ACTIVITY.slice(0, 3).map(([time, title, detail]) => <div key={title}><span /><p><strong>{title}</strong><small>{detail}</small></p><time>{time.split("·")[0]}</time></div>)}
        </section>
      </div>
    </>
  );
}

function RoomMarket(props: ConceptProps) {
  return (
    <>
      <RoomBar title="Opportunity room" subtitle="Profile-matched open work"><button onClick={() => props.onToast("Marketplace filters opened")}><Layers3 size={16} /> Refine</button></RoomBar>
      <div className="room-market">
        <section className="room-market__stack">
          <div className="room-section-title"><div><h2>Recommended briefs</h2><p>Suitability does not include price.</p></div><span>{props.gigs.length}</span></div>
          {props.gigs.map((gig) => <button key={gig.id} className={gig.id === props.activeGig.id ? "is-active" : ""} onClick={() => props.onSelectGig(gig.id)}><span className="company-tile">{gig.company.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span><div><small>{gig.company}</small><strong>{gig.title}</strong><p>{gig.budget} · {gig.workMode} · {gig.duration}</p></div><b>{gig.match}%</b></button>)}
        </section>
        <article className="brief-room">
          <div className="brief-room__top"><div><span className="company-tile">NH</span><p><strong>{props.activeGig.company}</strong><small>Company profile reviewed</small></p></div><button onClick={() => props.onToast("Saved to private list")}><Bookmark size={17} /> Save</button></div>
          <h1>{props.activeGig.title}</h1><p className="brief-room__summary">{props.activeGig.summary}</p>
          <div className="brief-room__tabs"><button className="is-active">Brief</button><button onClick={() => props.onToast("Terms tab opened")}>Terms</button><button onClick={() => props.onToast("Version history opened")}>History</button></div>
          <div className="brief-room__content">
            <section><h3>Expected outcomes</h3><ul>{props.activeGig.deliverables.map((item) => <li key={item}><Check size={13} /> {item}</li>)}</ul><h3>Required capabilities</h3><SkillList skills={props.activeGig.requiredSkills} minimal /></section>
            <aside><MatchStamp gig={props.activeGig} quiet /><p>{props.activeGig.matchReason}</p><div className="consideration"><small>Preferred gap</small><strong>{props.activeGig.missingSkills.join(", ")}</strong></div><CommercialTerms gig={props.activeGig} condensed /></aside>
          </div>
          <footer><span>Apply by {props.activeGig.deadline}</span><button className="room-primary" onClick={() => props.onNavigate("proposal")}>Prepare proposal <ArrowRight size={16} /></button></footer>
        </article>
      </div>
    </>
  );
}

function RoomProposal(props: ConceptProps) {
  if (props.state.applied) {
    return <div className="room-complete"><span><CheckCircle2 size={31} /></span><h1>Proposal room created</h1><p>Application version 2 is now under review. The official record is separate from any clarification thread.</p><button className="room-primary" onClick={() => props.onNavigate("applications")}>Enter application room <ArrowRight size={16} /></button></div>;
  }
  return (
    <>
      <RoomBar title="Proposal builder" subtitle="Northstar · Gig terms v3"><button onClick={() => props.onNavigate("market")}><ArrowLeft size={15} /> Back to brief</button></RoomBar>
      <form className="room-proposal" onSubmit={(e) => { e.preventDefault(); props.onApply(); }}>
        <aside className="proposal-outline"><span>APPLICATION SECTIONS</span><button className="is-active"><b>1</b> Evidence</button><button><b>2</b> Commercial</button><button><b>3</b> Scope</button><button><b>4</b> Review</button><div><ShieldCheck size={17} /><p><strong>Version-safe</strong><small>Every submitted edit creates a new immutable record.</small></p></div></aside>
        <section className="proposal-canvas">
          <div className="proposal-canvas__title"><span>01</span><div><h2>Make the case for this work</h2><p>Use specific, verifiable experience from your reviewed profile.</p></div></div>
          <label>Cover note<textarea defaultValue="I’ve led two multi-product design-system migrations, including accessibility remediation and adoption documentation. I would begin with a component and workflow inventory." /></label>
          <div className="evidence-picker"><span>Linked profile evidence</span><button type="button"><Check size={13} /> Multi-product design system · 2025</button><button type="button"><Check size={13} /> WCAG remediation programme · 2024</button><button type="button" className="is-off"><Circle size={9} /> React platform migration · 2023</button></div>
          <div className="proposal-canvas__title"><span>02</span><div><h2>Record commercial terms</h2><p>Posted guidance remains visible beside your response.</p></div></div>
          <div className="field-grid"><label>Exact total<input defaultValue="₹ 5,60,000" /></label><label>Timeline<input defaultValue="14 weeks" /></label><label>Available from<input type="date" defaultValue="2026-08-10" /></label><label>Capacity<input defaultValue="28 hours / week" /></label></div>
          <label>Included scope<textarea defaultValue={"Component audit and migration plan\nAccessible React component library\nTwo clinical workflow migrations\nAdoption documentation"} /></label>
          <footer><label><input type="checkbox" defaultChecked /> I confirm the structured terms above.</label><button className="room-primary">Submit proposal <LockKeyhole size={15} /></button></footer>
        </section>
        <aside className="proposal-reference"><small>LIVE REFERENCE</small><h3>{props.activeGig.title}</h3><CommercialTerms gig={props.activeGig} condensed /><TrustNote compact /></aside>
      </form>
    </>
  );
}

function RoomApplication(props: ConceptProps) {
  return (
    <>
      <RoomBar title="Northstar application room" subtitle="GM-A-1182 · Participant-visible"><VersionSeal version={props.state.applicationVersion} /></RoomBar>
      <div className="application-room">
        <aside className="case-tabs"><button className="is-active"><FileText size={16} /> Proposal</button><button onClick={() => props.onToast("Clarification thread opened")}><MessageSquareText size={16} /> Clarification <span>1</span></button><button onClick={() => props.onToast("Version diff opened")}><FileDiff size={16} /> Versions</button><button onClick={() => props.onToast("Activity history opened")}><Activity size={16} /> Activity</button></aside>
        <section className="case-canvas">
          <ProcessRail state={props.state} />
          {props.state.selectionSent && <SelectionNotice state={props.state} onAccept={props.onAccept} onToast={props.onToast} />}
          <div className="case-canvas__head"><div><small>Current official proposal</small><h2>₹5.6L fixed · 14 weeks</h2><p>Available 10 Aug · 28 hours/week</p></div><VersionSeal version={2} /></div>
          <h3>Cover note</h3><p>I’ve led two multi-product design-system migrations, including accessibility remediation and adoption documentation.</p>
          <h3>Included scope</h3><ul>{props.activeGig.deliverables.map((item) => <li key={item}><Check size={13} /> {item}</li>)}</ul>
        </section>
        <aside className="case-sidebar"><span>CASE CONTEXT</span><div><small>Stage</small><strong>{props.state.applicationStage}</strong></div><div><small>Gig terms</small><strong>Version 3</strong></div><div><small>Proposal</small><strong>Version 2</strong></div><button onClick={() => props.onToast("Withdraw flow opened")}>Application options <MoreHorizontal size={15} /></button></aside>
      </div>
    </>
  );
}

function RoomReview(props: ConceptProps) {
  const lead = props.applicants[0];
  return (
    <>
      <RoomBar title="Northstar applicant room" subtitle="Clinical operations design system"><button><Search size={15} /> Find applicant</button></RoomBar>
      <div className="client-room">
        <aside className="client-room__people"><div className="room-section-title"><div><h2>Applicants</h2><p>Best match</p></div><span>12</span></div>{props.applicants.map((app, i) => <button key={app.id} className={i === 0 ? "is-active" : ""} onClick={() => i > 0 && props.onToast(`${app.name} opened`)}><span>{app.initials}</span><div><strong>{app.name}</strong><small>{app.proposal} · {app.stage}</small></div><b>{app.match}</b></button>)}</aside>
        <article className="client-room__case">
          <div className="candidate-room-head"><div><span className="large-avatar">{lead.initials}</span><p><small>{lead.headline}</small><h1>{lead.name}</h1><span>{lead.location} · {lead.experience}</span></p></div><MatchStamp gig={{ ...props.activeGig, match: lead.match, matchLabel: "Strong match" }} quiet /></div>
          <div className="case-tabs-horizontal"><button className="is-active">Review</button><button onClick={() => props.onToast("Full proposal opened")}>Proposal v2</button><button onClick={() => props.onToast("Clarification opened")}>Clarification</button><button onClick={() => props.onToast("History opened")}>History</button></div>
          <div className="candidate-room-grid"><section><h3>Matching evidence</h3><p>{lead.coverNote}</p><SkillList skills={lead.skills} /><div className="consideration"><small>Gap to consider</small><strong>{lead.gap}</strong></div></section><section><h3>Commercial response</h3><dl><div><dt>Proposal</dt><dd>{lead.proposal}</dd></div><div><dt>Timeline</dt><dd>{lead.timeline}</dd></div><div><dt>Availability</dt><dd>{lead.availability}</dd></div></dl><VersionSeal version={lead.version} /><button onClick={() => props.onToast("Version difference opened")}><FileDiff size={15} /> Compare v1 → v2</button></section></div>
        </article>
        <aside className="decision-dock"><span>CLIENT DECISION</span><button className={props.state.shortlisted ? "is-active" : ""} onClick={props.onShortlist}><Bookmark size={16} /> {props.state.shortlisted ? "Privately saved" : "Save privately"}</button><button className={props.state.advanced ? "is-active" : ""} onClick={props.onAdvance}><UsersRound size={16} /> {props.state.advanced ? "Advanced" : "Advance"}</button><div className="decision-dock__rule"><LockKeyhole size={15} /><p>One active selection request per gig. Request binds proposal v2.</p></div><button className="room-primary" disabled={!props.state.advanced} onClick={props.onSendSelection}>Send selection <ArrowRight size={15} /></button><button className="text-action" onClick={() => props.onToast("Not selected reasons opened")}>Mark not selected</button></aside>
      </div>
    </>
  );
}

function RoomEngagement(props: ConceptProps) {
  return (
    <>
      <RoomBar title="Northstar engagement room" subtitle="GM-E-2048 · Shared workspace"><span className="status-chip">{props.state.accepted ? "Confirmed" : "Preview"}</span></RoomBar>
      <div className="engagement-room">
        <aside className="case-tabs"><button className="is-active"><BriefcaseBusiness size={16} /> Summary</button><button onClick={() => props.onToast("Activity opened")}><Activity size={16} /> Activity</button><button onClick={() => props.onToast("Contact exchange opened")}><ShieldCheck size={16} /> Contact exchange</button></aside>
        <section className="engagement-room__main"><div className="engagement-people"><span className="company-tile">NH</span><div /><span className="company-tile">AR</span></div><p className="eyebrow">Confirmed participants</p><h1>Northstar Health Systems × {props.role === "freelancer" ? "Aisha Raman" : "Meera Shah"}</h1><div className="accepted-snapshot"><div><LockKeyhole size={18} /><span><strong>Accepted proposal snapshot</strong><small>Application v2 · Gig terms v3</small></span></div><CommercialTerms gig={props.activeGig} /><h3>Included scope</h3><ul>{props.activeGig.deliverables.map((item) => <li key={item}><Check size={13} /> {item}</li>)}</ul></div></section>
        <aside className="engagement-room__activity"><div className="room-section-title"><div><h2>Activity</h2><p>Shared record</p></div></div>{ACTIVITY.slice(0, 3).map(([time, title]) => <div key={title}><span /><p><strong>{title}</strong><small>{time}</small></p></div>)}<button onClick={() => props.onToast("Full activity opened")}>View full history <ChevronRight size={14} /></button><TrustNote compact /></aside>
      </div>
    </>
  );
}
