import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FileClock,
  LockKeyhole,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import { capacityConflict, deadlineOrder, harborActions, harborSchedule } from "./model";
import "./harbor.css";

export function Harbor() {
  const location = useLocation();
  const route = useConceptRoute("harbor");
  if (location.pathname === "/harbor" || location.pathname === "/harbor/") return <HarborLanding />;
  return <HarborApp {...route} />;
}

function HarborLanding() {
  return (
    <main id="main-content" className="hb-public">
      <header><Link to="/">16 / Hybrid collection</Link><b>HARBOR</b><span>NORTHLINE × TEMPO</span></header>
      <section>
        <div className="hb-public__copy">
          <span>WORK THAT FITS THE CALENDAR</span>
          <h1>Decisions,<br />with time<br /><em>attached.</em></h1>
          <p>A calm marketplace workspace that keeps evidence, deadlines, capacity, and exact commitments in one operating view.</p>
          <nav><Link to="/harbor/freelancer/home">Plan specialist work <ArrowRight /></Link><Link to="/harbor/client/home">Plan a client decision <ArrowRight /></Link></nav>
        </div>
        <aside className="hb-public__plan">
          <header><span>AVAILABLE CAPACITY</span><strong>32h</strong><small>per week · August</small></header>
          {harborSchedule().map((phase) => <div key={phase.phase}><time>{phase.month}<b>{phase.start}</b></time><p><strong>{phase.phase}</strong><span>{phase.outcome}</span></p><em>{phase.capacity}</em></div>)}
          <footer><Check /> Ternary leaves a protected 4h weekly buffer</footer>
        </aside>
      </section>
    </main>
  );
}

interface Props {
  role: Role;
  view: ViewId;
  go: (view: ViewId) => void;
  switchRole: (role: Role) => void;
  state: ReturnType<typeof useConceptRoute>["state"];
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
}

const navigation = (role: Role): { view: ViewId; label: string }[] => [
  { view: "home", label: "Today" },
  { view: role === "client" ? "review" : "discover", label: role === "client" ? "Applicants" : "Opportunities" },
  { view: role === "client" ? "candidate" : "applications", label: role === "client" ? "Dossier" : "Application" },
  { view: "selection", label: "Confirm" },
  { view: "engagement", label: "Delivery" },
];

function HarborApp({ role, view, go, switchRole, state, dispatch }: Props) {
  return (
    <div className="hb-app">
      <aside className="hb-rail">
        <Link className="hb-mark" to="/harbor"><CalendarDays /><b>Harbor</b><small>16</small></Link>
        <nav aria-label="Harbor sections">{navigation(role).map((item, index) => <button key={item.view} className={view === item.view ? "is-active" : ""} onClick={() => go(item.view)}><span>0{index + 1}</span>{item.label}</button>)}</nav>
        <div className="hb-capacity"><span>AUG CAPACITY</span><strong>28 / 32h</strong><i><b /></i><small>4h protected weekly</small></div>
        <Link className="hb-back" to="/"><ArrowLeft /> All concepts</Link>
      </aside>
      <header className="hb-top">
        <div><span>TERNARY HEALTH</span><b>Clinical Trial Operations</b></div>
        <div className="hb-role" aria-label="Role"><button className={role === "freelancer" ? "is-active" : ""} onClick={() => switchRole("freelancer")}>Specialist</button><button className={role === "client" ? "is-active" : ""} onClick={() => switchRole("client")}>Client</button></div>
        <button className="hb-reset" onClick={() => dispatch({ type: "reset" })}><RotateCcw /> Reset</button>
      </header>
      <main id="main-content" className="hb-main">
        {view === "home" && <Home role={role} go={go} state={state} />}
        {view === "discover" && <Discover go={go} />}
        {view === "gig" && <Gig go={go} />}
        {view === "proposal" && <Proposal go={go} state={state} dispatch={dispatch} />}
        {view === "applications" && <Application go={go} state={state} dispatch={dispatch} />}
        {view === "review" && <Review go={go} state={state} />}
        {view === "candidate" && <Candidate go={go} state={state} dispatch={dispatch} />}
        {view === "selection" && <Selection role={role} go={go} state={state} dispatch={dispatch} />}
        {view === "engagement" && <Engagement state={state} dispatch={dispatch} />}
      </main>
      {state.toast && <div className="hb-toast" role="status"><Check />{state.toast}</div>}
    </div>
  );
}

function SectionHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="hb-section-head"><span>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></header>;
}

function Home({ role, go, state }: Pick<Props, "role" | "go" | "state">) {
  const client = role === "client";
  const actions = harborActions(state);
  return <section className="hb-home">
    <SectionHead eyebrow="THURSDAY · 30 JULY" title={client ? "One decision is approaching its window." : "Your next commitment is already visible."} copy={client ? "Review evidence and delivery fit before exercising selection authority." : "Priorities combine consequential actions, application deadlines, and real weekly capacity."} />
    <div className="hb-home-grid">
      <section className="hb-actions"><header><b>ACTION REGISTER</b><span>Ordered by consequence</span></header>{actions.map((action, index) => <button key={action.id} className={index === 0 ? "is-priority" : ""} onClick={() => go(action.id === "selection" ? "selection" : client ? "candidate" : "applications")}><time>{action.at}</time><span><b>{action.label}</b><small>{action.urgency > 3 ? "Action required" : "Context only"}</small></span><ChevronRight /></button>)}</section>
      <aside className="hb-today"><span>ACTIVE COMMITMENT</span><strong>28h</strong><b>of 32h available</b><div><span>Ternary Health</span><em>14 weeks</em></div><div><span>Protected buffer</span><em>4h/week</em></div><button onClick={() => go(client ? "review" : "selection")}>{client ? "Review applicant capacity" : "Review exact request"} <ArrowRight /></button></aside>
    </div>
  </section>;
}

function Discover({ go }: Pick<Props, "go">) {
  const ordered = deadlineOrder();
  const [selected, setSelected] = useState(ordered[0].id);
  const active = ordered.find((gig) => gig.id === selected) ?? ordered[0];
  return <section className="hb-discover">
    <SectionHead eyebrow="OPPORTUNITY AGENDA" title="What can fit next?" copy="Deadlines establish urgency. Evidence establishes suitability. Capacity establishes whether the promise is credible." />
    <div className="hb-agenda">
      <nav aria-label="Opportunity deadlines">{ordered.map((gig) => <button key={gig.id} className={selected === gig.id ? "is-active" : ""} onClick={() => setSelected(gig.id)}><time><b>{gig.deadline.slice(0, 2)}</b>AUG</time><span><strong>{gig.company}</strong><small>{gig.title}</small></span><em>{gig.match}</em></button>)}</nav>
      <article><span>EVIDENCE FIT · PRICE EXCLUDED</span><h2>{active.title}</h2><p>{active.matchReason}</p><dl><div><dt>Weekly load</dt><dd>{active.commitment}</dd></div><div><dt>Delivery</dt><dd>{active.duration}</dd></div><div><dt>Commercial</dt><dd>{active.budget}</dd></div></dl><div className="hb-fit">{active.matchingSkills.slice(0, 4).map((skill) => <b key={skill}><Check />{skill}</b>)}<b className="is-gap">{active.missingSkills[0]}</b></div><button onClick={() => go("gig")}>Inspect brief and capacity <ArrowRight /></button></article>
    </div>
  </section>;
}

function Gig({ go }: Pick<Props, "go">) {
  const gig = GIGS[0];
  return <section className="hb-gig">
    <button className="hb-text-button" onClick={() => go("discover")}><ArrowLeft /> Opportunity agenda</button>
    <SectionHead eyebrow="TERNARY HEALTH · GIG TERMS v3" title={gig.title} copy={gig.summary} />
    <div className="hb-brief-grid"><section><header><b>DELIVERY PLAN</b><span>14 weeks · 28h/week</span></header>{harborSchedule().map((phase) => <div key={phase.phase}><time>{phase.month}<b>{phase.start}</b></time><p><strong>{phase.phase}</strong><span>{phase.outcome}</span></p><em>{phase.capacity}</em></div>)}</section><aside><span>MATERIAL TERMS</span><strong>{gig.budget}</strong><p>{gig.workMode} · {gig.location}</p><hr /><span>DISCLOSED GAP</span><p>{gig.missingSkills[0]}</p><small>The gap is not converted into or hidden by the 92 evidence fit.</small></aside></div>
    <button className="hb-primary" onClick={() => go("proposal")}>Build capacity-aware proposal <ArrowRight /></button>
  </section>;
}

function Proposal({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  const [hours, setHours] = useState(28);
  const [reason, setReason] = useState("");
  const capacity = capacityConflict(hours);
  const invalid = capacity.conflict || reason.trim().length < 24;
  return <section className="hb-proposal">
    <SectionHead eyebrow={`PROPOSAL BUILDER · NEXT VERSION v${state.applicationVersion + 1}`} title="Make the time promise explicit." copy="The delivery plan and commercial terms become one immutable application version." />
    <form onSubmit={(event) => { event.preventDefault(); if (!invalid) { dispatch({ type: "submit-revision" }); go("applications"); } }}>
      <section><label>Fixed proposal<input defaultValue="₹5,80,000" /></label><label>Weekly commitment<div className="hb-hours"><input aria-label="Weekly hours" type="range" min="20" max="36" value={hours} onChange={(event) => setHours(Number(event.target.value))} /><b>{hours}h</b></div></label><label>Revision rationale<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain what changed in the delivery commitment." />{reason.length < 24 && <small role="alert">Enter at least 24 characters.</small>}</label></section>
      <aside className={capacity.conflict ? "is-conflict" : ""}><Clock3 /><span>CAPACITY CHECK</span><strong>{hours} / {capacity.available}h</strong><i><b style={{ width: `${Math.min(hours / capacity.available * 100, 100)}%` }} /></i><p>{capacity.conflict ? "This exceeds verified availability." : `${capacity.buffer} hours remain protected each week.`}</p><div><span>Weeks 01–14</span><b>10 Aug → 15 Nov</b></div><button disabled={invalid}>Record application v{state.applicationVersion + 1} <Send /></button></aside>
    </form>
    <p className="hb-warning"><FileClock /> A new version invalidates any selection tied to v{state.applicationVersion}.</p>
  </section>;
}

function Application({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  return <section className="hb-application"><SectionHead eyebrow={`APPLICATION AP.001 · v${state.applicationVersion}`} title="The commitment record." copy={`${state.applicationStage} · exact evidence, answers, revisions, and selection state remain together.`} /><div className="hb-application-grid"><section><header><b>DELIVERY</b><span>10 Aug → 15 Nov</span></header>{harborSchedule().map((phase) => <div key={phase.phase}><span>{phase.week}</span><b>{phase.phase}</b><p>{phase.outcome}</p><em>{phase.hours}h</em></div>)}<footer><button onClick={() => go("proposal")}>Create revised plan</button><button onClick={() => go("selection")}>Review selection <ArrowRight /></button></footer></section><aside><span>STRUCTURED Q&A</span><blockquote>{QA.question}</blockquote>{state.qaAnswered ? <p>{QA.answer}</p> : <button onClick={() => dispatch({ type: "answer-qa" })}>Record answer</button>}<hr /><span>HISTORY</span>{state.activity.slice(0, 3).map((item) => <div className="hb-log" key={item.id}><time>{item.at}</time><b>{item.title}</b></div>)}</aside></div></section>;
}

function Review({ go, state }: Pick<Props, "go" | "state">) {
  const [active, setActive] = useState(0);
  const person = APPLICANTS[active];
  return <section className="hb-review"><SectionHead eyebrow="CLIENT CAPACITY REGISTER" title="Evidence first. Delivery fit beside it." copy="Availability is assessed against the fixed 14-week brief; commercial terms remain a separate fact." /><div className="hb-review-grid"><section>{APPLICANTS.map((applicant, index) => <button key={applicant.id} className={active === index ? "is-active" : ""} onClick={() => setActive(index)}><span><b>{applicant.match}</b><small>evidence</small></span><p><strong>{applicant.name}</strong><small>{applicant.headline}</small></p><em>{applicant.availability}</em></button>)}</section><aside><span>ACTIVE DOSSIER</span><h2>{person.name}</h2><p>{person.note}</p><div><span>Application</span><b>v{person.id === "kavya" ? state.applicationVersion : person.version}</b></div><div><span>Delivery</span><b>{person.timeline}</b></div><div><span>Commercial</span><b>{person.proposal}</b></div><button onClick={() => go("candidate")}>Inspect evidence and plan <ArrowRight /></button></aside></div></section>;
}

function Candidate({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  const person = APPLICANTS[0];
  return <section className="hb-candidate"><button className="hb-text-button" onClick={() => go("review")}><ArrowLeft /> Applicant register</button><SectionHead eyebrow={`KAVYA MENON · APPLICATION v${state.applicationVersion}`} title="Strong evidence. Credible capacity." copy={person.headline} /><div className="hb-candidate-grid"><section><span>REVIEWED EVIDENCE</span>{person.skills.map((skill) => <div key={skill}><Check /><b>{skill}</b><small>Reviewed artifact attached</small></div>)}<div className="is-gap"><Clock3 /><b>Disclosed gap</b><small>{person.gap}</small></div></section><aside><span>DELIVERY FIT</span><strong>28h</strong><b>weekly commitment</b>{harborSchedule().map((phase) => <p key={phase.phase}><span>{phase.week}</span>{phase.phase}<em>{phase.hours}h</em></p>)}</aside></div><footer className="hb-decision-bar"><button className={state.shortlisted ? "is-active" : ""} onClick={() => dispatch({ type: "toggle-shortlist" })}>{state.shortlisted ? "✓ Privately shortlisted" : "+ Private shortlist"}</button><button onClick={() => dispatch({ type: "toggle-advance" })}>{state.advanced ? "Return to review" : "Advance applicant"}</button><button onClick={() => dispatch({ type: "request-revision" })}>Request revision</button><button onClick={() => go("selection")}>Prepare exact request <ArrowRight /></button></footer></section>;
}

function Selection({ role, go, state, dispatch }: Pick<Props, "role" | "go" | "state" | "dispatch">) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const client = role === "client";
  return <section className="hb-selection"><SectionHead eyebrow={`EXACT CAPACITY COMMITMENT · ${state.selectionStatus.toUpperCase()}`} title="Confirm the work and the time." copy="This marketplace acknowledgement creates the engagement; it is not a legal contract or payment instruction." /><div className="hb-confirm-grid"><section><div><span>APPLICATION</span><b>v{state.applicationVersion}</b></div><div><span>GIG TERMS</span><b>v3</b></div><div><span>FIXED PROPOSAL</span><b>{TERMS.proposal}</b></div><div><span>DELIVERY</span><b>{TERMS.timeline}</b></div><div><span>CAPACITY</span><b>28h/week · 4h protected</b></div></section><aside><CalendarDays /><span>DELIVERY WINDOW</span><strong>10 AUG</strong><b>through 15 NOV 2026</b><p>Four phases · fourteen weeks</p></aside></div>
    {state.selectionStatus === "invalidated" && <div className="hb-alert" role="alert"><FileClock /><p><b>Previous request invalidated</b>The application changed. Client authority must be renewed against v{state.applicationVersion}.</p></div>}
    {client && state.selectionStatus !== "pending" && <footer className="hb-selection-actions"><label>Response window<select value={deadline} onChange={(event) => setDeadline(event.target.value as "24" | "48" | "72")}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button onClick={() => dispatch({ type: "send-selection", deadline })}>Send exact request <Send /></button></footer>}
    {!client && state.selectionStatus === "pending" && <footer className="hb-selection-actions"><p><b>31 hours remain.</b> Capacity and exact terms shown above.</p><button onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Accept commitment <Check /></button></footer>}
    {state.selectionStatus === "accepted" && <footer className="hb-selection-actions"><p><b>Confirmed atomically.</b> The gig is filled.</p><button onClick={() => go("engagement")}>Open delivery workspace <ArrowRight /></button></footer>}
  </section>;
}

function Engagement({ state, dispatch }: Pick<Props, "state" | "dispatch">) {
  return <section className="hb-engagement"><SectionHead eyebrow="ENGAGEMENT EN.001 · IMMUTABLE TERMS" title="Ternary Health × Kavya Menon" copy={`${state.engagementStatus.replaceAll("_", " ")} · application v${state.applicationVersion} · gig terms v3`} /><div className="hb-engagement-grid"><section><header><b>DELIVERY AGENDA</b><button disabled={state.engagementStatus === "completed"} onClick={() => dispatch({ type: "advance-engagement" })}>Advance lifecycle <ArrowRight /></button></header>{harborSchedule().map((phase, index) => <div key={phase.phase} className={index === 0 ? "is-current" : ""}><time>{phase.month}<b>{phase.start}</b></time><p><strong>{phase.phase}</strong><span>{phase.outcome}</span></p><em>{index === 0 ? "CURRENT" : phase.capacity}</em></div>)}</section><aside><span>ENGAGEMENT CONTACT</span>{!state.contactShared || state.contactRevoked ? <><LockKeyhole /><strong>{state.contactRevoked ? "DISPLAY STOPPED" : "MASKED"}</strong><p>Verified contact remains private until explicit engagement-scoped consent.</p><button onClick={() => dispatch({ type: "share-contact" })}>Share verified email</button></> : <><ShieldCheck /><strong>{state.contactRevealed ? "kavya.menon@example.com" : "k•••••@example.com"}</strong><p>Consent is active for this engagement only.</p><button onClick={() => dispatch({ type: state.contactRevealed ? "revoke-contact" : "reveal-contact" })}>{state.contactRevealed ? "Revoke future display" : "Authorize reveal"}</button></>}</aside></div></section>;
}
