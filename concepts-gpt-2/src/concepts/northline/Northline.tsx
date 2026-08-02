import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Check, ChevronRight, CircleUserRound,
  Clock3, FileCheck2, LayoutDashboard, LockKeyhole, MessageSquareText, RotateCcw,
  Search, Send, ShieldCheck, Sparkles, UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import "./northline.css";

const freelancerNav: { view: ViewId; label: string; icon: typeof Search }[] = [
  { view: "home", label: "Workspace", icon: LayoutDashboard },
  { view: "discover", label: "Find work", icon: Search },
  { view: "applications", label: "Applications", icon: FileCheck2 },
  { view: "engagement", label: "Engagement", icon: BriefcaseBusiness },
];
const clientNav: { view: ViewId; label: string; icon: typeof Search }[] = [
  { view: "home", label: "Workspace", icon: LayoutDashboard },
  { view: "review", label: "Applicant review", icon: UsersRound },
  { view: "candidate", label: "Candidate record", icon: CircleUserRound },
  { view: "engagement", label: "Engagement", icon: BriefcaseBusiness },
];

export function Northline() {
  const location = useLocation();
  const route = useConceptRoute("northline");
  if (location.pathname === "/northline" || location.pathname === "/northline/") return <NorthlineLanding />;
  return <NorthlineWorkspace {...route} />;
}

function NorthlineLanding() {
  return (
    <main id="main-content" className="nl-landing">
      <nav className="nl-public-nav">
        <Link to="/" className="nl-mark">N</Link>
        <b>Northline</b>
        <div><a href="#principles">How it works</a><Link to="/northline/client/home">For clients</Link></div>
        <Link className="nl-enter" to="/northline/freelancer/home">Enter workspace <ArrowRight size={15} /></Link>
      </nav>
      <section className="nl-hero">
        <div>
          <p className="nl-eyebrow">GigMatch AI · Direction 01</p>
          <h1>Clear work.<br />Exact terms.<br />No guesswork.</h1>
          <p className="nl-hero-copy">A professional marketplace that helps specialists and serious teams move from evidence to a confirmed engagement—with every decision visible and every term preserved.</p>
          <div className="nl-hero-actions">
            <Link to="/northline/freelancer/home">Find aligned work <ArrowRight size={16} /></Link>
            <Link to="/northline/client/home">Review specialists</Link>
          </div>
        </div>
        <aside className="nl-hero-panel" aria-label="Live workflow preview">
          <header><span>Needs attention</span><small>1 decision</small></header>
          <div className="nl-preview-person"><span>KM</span><div><b>Kavya Menon</b><small>Selection response due in 31h</small></div></div>
          <dl><div><dt>Exact proposal</dt><dd>₹5.8L fixed</dd></div><div><dt>Version</dt><dd>Application v2</dd></div><div><dt>Evidence fit</dt><dd>Strong · 92</dd></div></dl>
          <footer><ShieldCheck size={17} /><span>Terms are frozen until Kavya responds.</span></footer>
        </aside>
      </section>
      <section id="principles" className="nl-proof">
        <div><span>01</span><b>Evidence before price</b><p>Skills, relevant work, and disclosed gaps remain distinct from commercial terms.</p></div>
        <div><span>02</span><b>One formal selection</b><p>A client selects one exact proposal version without prematurely closing other candidates.</p></div>
        <div><span>03</span><b>Private by default</b><p>Contact information appears only after confirmation and explicit consent.</p></div>
      </section>
    </main>
  );
}

interface WorkspaceProps {
  role: Role;
  view: ViewId;
  go: (view: ViewId) => void;
  switchRole: (role: Role) => void;
  state: ReturnType<typeof useConceptRoute>["state"];
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
}

function NorthlineWorkspace({ role, view, go, switchRole, state, dispatch }: WorkspaceProps) {
  const nav = role === "client" ? clientNav : freelancerNav;
  return (
    <div className="nl-app">
      <aside className="nl-rail">
        <div><Link to="/northline" className="nl-logo">N</Link><Link to="/" className="nl-back"><ArrowLeft size={14} /> Concepts</Link></div>
        <nav aria-label="Northline workspace">
          {nav.map((item) => {
            const Icon = item.icon;
            return <button key={item.view} className={view === item.view ? "is-active" : ""} onClick={() => go(item.view)}><Icon size={18} /><span>{item.label}</span>{item.label === "Applications" && <em>1</em>}</button>;
          })}
        </nav>
        <div className="nl-rail-foot">
          <button onClick={() => dispatch({ type: "reset" })}><RotateCcw size={16} /><span>Reset scenario</span></button>
          <div className="nl-user"><span>{role === "client" ? "TH" : "KM"}</span><div><b>{role === "client" ? "Ternary Health" : "Kavya Menon"}</b><small>Verified {role}</small></div></div>
        </div>
      </aside>
      <div className="nl-main">
        <header className="nl-topbar">
          <div><b>{titleFor(view, role)}</b><span>Clinical trial operations · terms v3</span></div>
          <div className="nl-role" aria-label="Change role"><button className={role === "freelancer" ? "is-active" : ""} onClick={() => switchRole("freelancer")}>Freelancer</button><button className={role === "client" ? "is-active" : ""} onClick={() => switchRole("client")}>Client</button></div>
        </header>
        <main id="main-content" className="nl-content">
          {view === "home" && <NorthlineHome role={role} go={go} state={state} />}
          {view === "discover" && <NorthlineDiscover go={go} />}
          {view === "gig" && <NorthlineGig go={go} />}
          {view === "proposal" && <NorthlineProposal go={go} state={state} dispatch={dispatch} />}
          {view === "applications" && <NorthlineApplication go={go} state={state} dispatch={dispatch} />}
          {view === "review" && <NorthlineReview go={go} state={state} />}
          {view === "candidate" && <NorthlineCandidate go={go} state={state} dispatch={dispatch} />}
          {view === "selection" && <NorthlineSelection role={role} go={go} state={state} dispatch={dispatch} />}
          {view === "engagement" && <NorthlineEngagement state={state} dispatch={dispatch} />}
        </main>
      </div>
      {state.toast && <div className="nl-toast" role="status"><Check size={15} />{state.toast}</div>}
    </div>
  );
}

function NorthlineHome({ role, go, state }: Pick<WorkspaceProps, "role" | "go" | "state">) {
  const client = role === "client";
  return (
    <>
      <section className="nl-pagehead">
        <div><p className="nl-eyebrow">{client ? "Client workspace" : "Freelancer workspace"}</p><h1>{client ? "One decision needs your review." : "You have one time-sensitive decision."}</h1><p>{client ? "Review Kavya’s exact proposal and current evidence before the selection window closes." : "Ternary Health has selected your current proposal. The terms are unchanged since version 2."}</p></div>
        <button className="nl-primary" onClick={() => go(client ? "candidate" : "selection")}>{client ? "Open candidate record" : "Review exact terms"} <ArrowRight size={16} /></button>
      </section>
      <section className="nl-attention">
        <div className="nl-attention-icon"><Clock3 size={20} /></div>
        <div><small>{client ? "SELECTION ACTIVE" : "RESPONSE DUE · 31H"}</small><h2>{client ? "Kavya Menon · application v2" : "Senior Frontend Systems Engineer"}</h2><p>{client ? "₹5.8L fixed · 14 weeks · strong evidence fit" : "₹5.8L fixed · 14 weeks · 28 hours/week"}</p></div>
        <span className="nl-stage">{state.applicationStage}</span>
        <button onClick={() => go("selection")}>Review <ChevronRight size={16} /></button>
      </section>
      <div className="nl-homegrid">
        <section className="nl-section">
          <header><div><small>ACTIVE WORKFLOW</small><h2>{client ? "Hiring overview" : "Your application"}</h2></div><button onClick={() => go(client ? "review" : "applications")}>View all</button></header>
          <div className="nl-flowline">
            {["Submitted", "Advanced", "Selection", "Engagement"].map((item, index) => <div key={item} className={index <= (state.selectionStatus === "accepted" ? 3 : 2) ? "is-done" : ""}><span>{index < 2 ? <Check size={12} /> : index + 1}</span><b>{item}</b></div>)}
          </div>
          <div className="nl-record-row"><span className="nl-avatar">KM</span><div><b>{client ? "Kavya Menon" : "Ternary Health"}</b><p>{client ? "Frontend systems engineer" : "Clinical operations software"}</p></div><dl><dt>Current version</dt><dd>v{state.applicationVersion}</dd></dl><dl><dt>Last activity</dt><dd>Today, 16:42</dd></dl></div>
        </section>
        <aside className="nl-trust">
          <ShieldCheck size={22} />
          <h2>Terms stay attributable.</h2>
          <p>Every revision creates a new immutable proposal. Selection always points to one exact version.</p>
          <button onClick={() => go(client ? "candidate" : "applications")}>View version history</button>
        </aside>
      </div>
    </>
  );
}

function NorthlineDiscover({ go }: Pick<WorkspaceProps, "go">) {
  const [active, setActive] = useState(GIGS[0].id);
  const gig = GIGS.find((item) => item.id === active) ?? GIGS[0];
  return (
    <>
      <section className="nl-pagehead nl-pagehead--compact"><div><p className="nl-eyebrow">Open opportunities</p><h1>Work with enough detail to decide.</h1></div><label className="nl-search"><Search size={16} /><span className="sr-only">Search opportunities</span><input placeholder="Search skill, company, or outcome" /></label></section>
      <div className="nl-split">
        <section className="nl-index" aria-label="Open gigs">
          <header><b>Recommended for your reviewed profile</b><span>3 open</span></header>
          {GIGS.map((item) => <button key={item.id} className={active === item.id ? "is-active" : ""} onClick={() => setActive(item.id)}><div><span>{item.match} evidence fit</span><small>{item.posted}</small></div><h2>{item.title}</h2><p>{item.company} · {item.workMode}</p><footer><b>{item.budget}</b><span>{item.deadline}</span></footer></button>)}
        </section>
        <aside className="nl-inspector">
          <p className="nl-eyebrow">{gig.company}</p><h2>{gig.title}</h2><p>{gig.summary}</p>
          <div className="nl-matchbox"><strong>{gig.match}</strong><div><b>{gig.matchLabel}</b><p>{gig.matchReason}</p></div></div>
          <div className="nl-tags">{gig.matchingSkills.map((skill) => <span key={skill}><Check size={11} />{skill}</span>)}</div>
          <dl><div><dt>Terms</dt><dd>{gig.budget}</dd></div><div><dt>Timing</dt><dd>{gig.duration}</dd></div><div><dt>Response</dt><dd>{gig.deadline}</dd></div></dl>
          <button className="nl-primary" onClick={() => go("gig")}>Open complete brief <ArrowRight size={16} /></button>
        </aside>
      </div>
    </>
  );
}

function NorthlineGig({ go }: Pick<WorkspaceProps, "go">) {
  const gig = GIGS[0];
  return (
    <>
      <button className="nl-textback" onClick={() => go("discover")}><ArrowLeft size={15} /> Back to opportunities</button>
      <section className="nl-gighead"><div><p className="nl-eyebrow">{gig.company} · Verified client</p><h1>{gig.title}</h1><p>{gig.summary}</p><div className="nl-tags">{gig.requiredSkills.map((skill) => <span key={skill}>{skill}</span>)}</div></div><aside><small>Fixed-price guidance</small><strong>{gig.budget}</strong><p>{gig.duration} · {gig.commitment}</p><button className="nl-primary" onClick={() => go("proposal")}>Build proposal <ArrowRight size={16} /></button></aside></section>
      <div className="nl-detailgrid">
        <section className="nl-section"><h2>What success includes</h2><ol className="nl-deliverables">{gig.deliverables.map((item, index) => <li key={item}><span>0{index + 1}</span><p>{item}</p></li>)}</ol></section>
        <aside className="nl-section nl-evidence"><header><Sparkles size={17} /><b>Why this aligns</b><span>{gig.match}/100</span></header><p>{gig.matchReason}</p><h3>Reviewed evidence</h3>{gig.matchingSkills.map((skill) => <div key={skill}><Check size={13} />{skill}</div>)}<h3>Disclosed gap</h3><div className="is-gap">{gig.missingSkills[0]}</div><small>Suitability evidence does not include price.</small></aside>
      </div>
    </>
  );
}

function NorthlineProposal({ go, state, dispatch }: Pick<WorkspaceProps, "go" | "state" | "dispatch">) {
  const [amount, setAmount] = useState("580000");
  const invalid = Number(amount) < 100000;
  return (
    <>
      <section className="nl-pagehead nl-pagehead--compact"><div><p className="nl-eyebrow">Structured proposal · application v{state.applicationVersion}</p><h1>Make every term reviewable.</h1><p>Your proposal becomes an immutable version when submitted. Editing during selection invalidates the existing request.</p></div></section>
      <div className="nl-formlayout">
        <form className="nl-form" onSubmit={(event) => { event.preventDefault(); if (!invalid) { dispatch({ type: state.applicationVersion > 1 ? "submit-revision" : "apply" }); go("applications"); } }}>
          <fieldset><legend>01 · Commercial terms</legend><div className="nl-fieldrow"><label>Fixed proposal amount<span>INR</span><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" aria-invalid={invalid} /></label><label>Timeline<span>Weeks</span><input defaultValue="14" inputMode="numeric" /></label></div>{invalid && <p className="nl-error" role="alert">Enter a realistic fixed proposal above ₹1,00,000.</p>}</fieldset>
          <fieldset><legend>02 · Availability</legend><div className="nl-fieldrow"><label>Available from<input type="date" defaultValue="2026-08-10" /></label><label>Weekly capacity<span>Hours</span><input defaultValue="28" inputMode="numeric" /></label></div></fieldset>
          <fieldset><legend>03 · Scope</legend><label>Approach<textarea defaultValue="I will begin with a workflow and component inventory, establish the accessibility baseline, then migrate the highest-risk investigator journeys alongside your product team." /></label><label>Included work<textarea defaultValue={TERMS.included.join("\n")} /></label><label>Assumptions<textarea defaultValue={TERMS.assumptions.join("\n")} /></label></fieldset>
          <footer><p><LockKeyhole size={15} /> Submitting records a new immutable version.</p><button className="nl-primary" disabled={invalid}>Record proposal <Send size={15} /></button></footer>
        </form>
        <aside className="nl-formsummary"><small>LIVE SUMMARY</small><h2>Application v{state.applicationVersion}</h2><dl><div><dt>Gig terms</dt><dd>v3</dd></div><div><dt>Proposal</dt><dd>₹{Number(amount || 0).toLocaleString("en-IN")}</dd></div><div><dt>Timeline</dt><dd>14 weeks</dd></div><div><dt>Capacity</dt><dd>28 hrs/week</dd></div></dl><div className="nl-warning"><ShieldCheck size={17} /><p>Price never changes your evidence-fit score.</p></div></aside>
      </div>
    </>
  );
}

function NorthlineApplication({ go, state, dispatch }: Pick<WorkspaceProps, "go" | "state" | "dispatch">) {
  return (
    <>
      <section className="nl-pagehead nl-pagehead--compact"><div><p className="nl-eyebrow">Application record · v{state.applicationVersion}</p><h1>Ternary Health</h1><p>Senior Frontend Systems Engineer for Clinical Trial Operations</p></div><span className="nl-large-stage">{state.applicationStage}</span></section>
      <div className="nl-applicationgrid">
        <section className="nl-section">
          <header><div><small>CURRENT PROPOSAL</small><h2>{TERMS.proposal}</h2></div><button onClick={() => go("proposal")}>Create new version</button></header>
          <dl className="nl-terms"><div><dt>Timeline</dt><dd>{TERMS.timeline}</dd></div><div><dt>Availability</dt><dd>{TERMS.availability}</dd></div><div><dt>Answered terms</dt><dd>Gig v3</dd></div><div><dt>Workshops</dt><dd>4 included</dd></div></dl>
          {state.selectionStatus === "pending" && <div className="nl-notice"><Clock3 size={18} /><div><b>Selection response available</b><p>The request is bound to application v{state.applicationVersion} and expires in 31 hours.</p></div><button onClick={() => go("selection")}>Review</button></div>}
          {state.selectionStatus === "invalidated" && <div className="nl-notice is-warning"><ShieldCheck size={18} /><div><b>Previous request invalidated</b><p>Your new proposal version requires fresh client review.</p></div></div>}
        </section>
        <aside className="nl-section">
          <header><div><small>STRUCTURED Q&A</small><h2>Clarification record</h2></div><MessageSquareText size={18} /></header>
          <div className="nl-qa"><span>TH</span><div><small>Ternary Health</small><p>{QA.question}</p></div></div>
          {state.qaAnswered ? <div className="nl-qa is-answer"><span>KM</span><div><small>Your answer · immutable</small><p>{QA.answer}</p></div></div> : <button className="nl-primary" onClick={() => dispatch({ type: "answer-qa" })}>Record structured answer</button>}
        </aside>
      </div>
      <section className="nl-section nl-history"><header><div><small>PARTICIPANT-VISIBLE HISTORY</small><h2>Application activity</h2></div></header>{state.activity.slice(0, 6).map((item) => <div key={item.id}><span>{item.at}</span><i className={`is-${item.actor}`} /><div><b>{item.title}</b><p>{item.detail}</p></div></div>)}</section>
    </>
  );
}

function NorthlineReview({ go, state }: Pick<WorkspaceProps, "go" | "state">) {
  const [filter, setFilter] = useState("Best match");
  const visible = APPLICANTS.filter((item) => filter !== "Shortlist" || (item.id === "kavya" ? state.shortlisted : item.shortlisted)).filter((item) => filter !== "Advanced" || (item.id === "kavya" ? state.advanced : item.stage === "Advanced"));
  return (
    <>
      <section className="nl-pagehead nl-pagehead--compact"><div><p className="nl-eyebrow">Ternary Health · 14 active applicants</p><h1>Review evidence in context.</h1><p>Commercial terms remain visible, but never influence evidence fit.</p></div></section>
      <div className="nl-filterbar">{["Best match", "Newest", "Shortlist", "Advanced"].map((item) => <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{item}{item === "Shortlist" && <span>{state.shortlisted ? 1 : 0}</span>}</button>)}</div>
      <section className="nl-table">
        <header><span>Candidate</span><span>Evidence</span><span>Proposal</span><span>Availability</span><span>Stage</span><span /></header>
        {visible.map((item) => <button key={item.id} onClick={() => go("candidate")}><span className="nl-candidate"><i>{item.initials}</i><span><b>{item.name}</b><small>{item.headline}</small></span></span><span><strong>{item.match}</strong><small>{item.gap}</small></span><span><b>{item.proposal}</b><small>{item.timeline}</small></span><span><b>{item.availability.split(" · ")[0]}</b><small>{item.availability.split(" · ")[1]}</small></span><span className="nl-stage">{item.id === "kavya" ? state.applicationStage : item.stage}</span><ChevronRight size={17} /></button>)}
      </section>
    </>
  );
}

function NorthlineCandidate({ go, state, dispatch }: Pick<WorkspaceProps, "go" | "state" | "dispatch">) {
  const person = APPLICANTS[0];
  return (
    <>
      <button className="nl-textback" onClick={() => go("review")}><ArrowLeft size={15} /> Applicant register</button>
      <section className="nl-candidatehead"><div className="nl-bigavatar">{person.initials}</div><div><p className="nl-eyebrow">Application v{state.applicationVersion} · answered gig v3</p><h1>{person.name}</h1><p>{person.headline} · {person.location}</p></div><div className="nl-reviewactions"><button className={state.shortlisted ? "is-selected" : ""} onClick={() => dispatch({ type: "toggle-shortlist" })}>{state.shortlisted ? <Check size={15} /> : null}{state.shortlisted ? "Shortlisted" : "Add to shortlist"}</button><button onClick={() => dispatch({ type: "toggle-advance" })}>{state.advanced ? "Return to review" : "Advance"}</button></div></section>
      <div className="nl-candidatelayout">
        <div>
          <section className="nl-section nl-evidence"><header><b>Suitability evidence</b><span>{person.match}/100</span></header><p>Strong direct evidence across the required frontend system and accessibility work.</p><div className="nl-tags">{person.skills.map((skill) => <span key={skill}><Check size={11} />{skill}</span>)}</div><h3>Disclosed gap</h3><div className="is-gap">{person.gap}</div><small>AI-assisted evidence supports review. It does not make the decision.</small></section>
          <section className="nl-section"><header><div><small>PROPOSAL RECORD</small><h2>{person.proposal}</h2></div><span>v{state.applicationVersion}</span></header><p>{person.note}</p><dl className="nl-terms"><div><dt>Timeline</dt><dd>{person.timeline}</dd></div><div><dt>Availability</dt><dd>{person.availability}</dd></div><div><dt>Scope</dt><dd>4 workshops included</dd></div><div><dt>Gig terms</dt><dd>v3 answered</dd></div></dl><button onClick={() => dispatch({ type: "request-revision" })}>Request proposal revision</button></section>
        </div>
        <aside className="nl-decision">
          <small>FORMAL DECISION</small><h2>{state.selectionStatus === "pending" ? "Selection awaiting response" : state.selectionStatus === "invalidated" ? "Fresh request required" : "Ready for selection"}</h2><p>Selection binds the current application, gig version, financial terms, timeline, and scope.</p><dl><div><dt>Application</dt><dd>v{state.applicationVersion}</dd></div><div><dt>Gig terms</dt><dd>v3</dd></div><div><dt>Proposal</dt><dd>{TERMS.proposal}</dd></div></dl><button className="nl-primary" onClick={() => go("selection")}>{state.selectionStatus === "pending" ? "Open request" : "Prepare selection"} <ArrowRight size={15} /></button>
        </aside>
      </div>
    </>
  );
}

function NorthlineSelection({ role, go, state, dispatch }: Pick<WorkspaceProps, "role" | "go" | "state" | "dispatch">) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const client = role === "client";
  return (
    <div className="nl-selection">
      <header><ShieldCheck size={22} /><p className="nl-eyebrow">Exact-term selection</p><h1>{client ? "Confirm what Kavya is being asked to accept." : "Review the exact terms before accepting."}</h1><p>Any proposal change invalidates this request. Acceptance confirms the engagement and fills the gig.</p></header>
      <section>
        <div className="nl-selection-title"><div><span>Application v{state.applicationVersion}</span><b>Kavya Menon × Ternary Health</b></div><span className={`nl-stage is-${state.selectionStatus}`}>{state.selectionStatus}</span></div>
        <dl className="nl-frozen"><div><dt>Fixed proposal</dt><dd>{TERMS.proposal}</dd></div><div><dt>Timeline</dt><dd>{TERMS.timeline}</dd></div><div><dt>Availability</dt><dd>10 Aug · 28 hrs/week</dd></div><div><dt>Gig terms</dt><dd>Version 3</dd></div></dl>
        <div className="nl-scope"><div><h3>Included</h3>{TERMS.included.map((item) => <p key={item}><Check size={12} />{item}</p>)}</div><div><h3>Excluded</h3>{TERMS.excluded.map((item) => <p key={item}>— {item}</p>)}</div></div>
        {client && state.selectionStatus !== "pending" ? <footer><div><label>Response window<select value={deadline} onChange={(event) => setDeadline(event.target.value as "24" | "48" | "72")}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><small>Only one active request is permitted for this gig.</small></div><button className="nl-primary" onClick={() => dispatch({ type: "send-selection", deadline })}>Send exact request <Send size={15} /></button></footer> : null}
        {!client && state.selectionStatus === "pending" ? <footer><div><b>31 hours remain</b><small>Accept only if every term above is correct.</small></div><button className="nl-primary" onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Accept exact terms <Check size={15} /></button></footer> : null}
        {state.selectionStatus === "accepted" && <footer><div><b>Terms accepted</b><small>The engagement workspace is ready.</small></div><button className="nl-primary" onClick={() => go("engagement")}>Open engagement <ArrowRight size={15} /></button></footer>}
      </section>
    </div>
  );
}

function NorthlineEngagement({ state, dispatch }: Pick<WorkspaceProps, "state" | "dispatch">) {
  const statusLabel = state.engagementStatus.replace("_", " ");
  return (
    <>
      <section className="nl-pagehead"><div><p className="nl-eyebrow">Confirmed engagement · GM-TH-2048</p><h1>Clinical Trial Operations</h1><p>Ternary Health × Kavya Menon · accepted application v{state.applicationVersion}</p></div><span className="nl-large-stage">{statusLabel}</span></section>
      <div className="nl-engagementgrid">
        <section className="nl-section"><header><div><small>IMMUTABLE ACCEPTED TERMS</small><h2>{TERMS.proposal} · {TERMS.timeline}</h2></div><LockKeyhole size={18} /></header><dl className="nl-terms"><div><dt>Application</dt><dd>v{state.applicationVersion}</dd></div><div><dt>Gig terms</dt><dd>v3</dd></div><div><dt>Start</dt><dd>10 Aug 2026</dd></div><div><dt>Capacity</dt><dd>28 hrs/week</dd></div></dl><h3>Included work</h3>{TERMS.included.map((item) => <p className="nl-listitem" key={item}><Check size={13} />{item}</p>)}</section>
        <aside className="nl-section nl-contact"><header><div><small>SECURE CONTACT EXCHANGE</small><h2>Shared for this engagement</h2></div><ShieldCheck size={19} /></header>{!state.contactShared || state.contactRevoked ? <div className="nl-contactempty"><LockKeyhole size={22} /><p>{state.contactRevoked ? "Sharing has been revoked inside GigMatch." : "No private contact details are shared yet."}</p><button onClick={() => dispatch({ type: "share-contact" })}>Share verified email</button></div> : <div className="nl-contactrow"><div><small>Verified email</small><b>{state.contactRevealed ? "kavya.menon@example.com" : "k•••••@example.com"}</b></div><button onClick={() => dispatch({ type: state.contactRevealed ? "revoke-contact" : "reveal-contact" })}>{state.contactRevealed ? "Stop sharing" : "Reveal"}</button></div>}<p className="nl-safety">GigMatch does not process payments or provide escrow. Never share passwords, OTPs, access tokens, or banking credentials.</p></aside>
      </div>
      <section className="nl-section nl-lifecycle"><header><div><small>PARTICIPANT-REPORTED STATUS</small><h2>Engagement progression</h2></div><button onClick={() => dispatch({ type: "advance-engagement" })} disabled={state.engagementStatus === "completed"}>Advance status <ArrowRight size={14} /></button></header><div>{["confirmed", "kickoff pending", "in progress", "completion pending", "completed"].map((item, index) => { const current = ["confirmed", "kickoff_pending", "in_progress", "completion_pending", "completed"].indexOf(state.engagementStatus); return <span key={item} className={index <= current ? "is-done" : ""}><i>{index < current ? <Check size={11} /> : index + 1}</i>{item}</span>; })}</div></section>
    </>
  );
}

function titleFor(view: ViewId, role: Role) {
  const titles: Record<ViewId, string> = {
    home: role === "client" ? "Hiring workspace" : "Work workspace",
    discover: "Opportunity index", gig: "Opportunity brief", proposal: "Proposal builder",
    applications: "Application record", review: "Applicant review", candidate: "Candidate record",
    selection: "Exact-term selection", engagement: "Engagement workspace",
  };
  return titles[view];
}
