import {
  ArrowLeft, ArrowRight, Check, ChevronRight, Circle, Compass,
  Flag, Lock, MoveRight, RotateCcw, Send, ShieldCheck, X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import "./waypoint.css";

const stages = [
  { id: "explore", number: "01", freelancer: "Explore", client: "Open" },
  { id: "propose", number: "02", freelancer: "Propose", client: "Review" },
  { id: "decide", number: "03", freelancer: "Decide", client: "Decide" },
  { id: "confirm", number: "04", freelancer: "Confirm", client: "Confirm" },
  { id: "work", number: "05", freelancer: "Work", client: "Work" },
] as const;

function stageFor(view: ViewId): string {
  if (["home", "discover", "gig"].includes(view)) return "explore";
  if (["proposal", "applications"].includes(view)) return "propose";
  if (["review", "candidate"].includes(view)) return "decide";
  if (view === "selection") return "confirm";
  return "work";
}

export function Waypoint() {
  const location = useLocation();
  const route = useConceptRoute("waypoint");
  if (location.pathname === "/waypoint" || location.pathname === "/waypoint/") return <WaypointLanding />;
  return <WaypointJourney {...route} />;
}

function WaypointLanding() {
  return (
    <main id="main-content" className="wp-public">
      <header><Link to="/" className="wp-symbol"><Compass size={20} /></Link><b>WAYPOINT</b><span>GigMatch AI · Direction 03</span><Link to="/waypoint/freelancer/home">Start the route <ArrowRight size={16} /></Link></header>
      <section className="wp-public-hero">
        <div><p>Five stages. Two parties. One exact agreement.</p><h1>KNOW<br />WHAT’S<br />NEXT.</h1></div>
        <aside><span>LIVE ROUTE · TH/042</span><ol>{stages.map((stage, index) => <li key={stage.id} className={index < 3 ? "is-done" : index === 3 ? "is-current" : ""}><i>{index < 3 ? <Check size={12} /> : stage.number}</i><div><b>{stage.freelancer}</b><small>{["Evidence fit established", "Application v2 recorded", "Advanced by Ternary", "Exact terms due in 31h", "Begins after acceptance"][index]}</small></div></li>)}</ol></aside>
      </section>
      <section className="wp-public-choice"><p>A marketplace should feel less like a dashboard and more like a route you can trust.</p><div><Link to="/waypoint/freelancer/home"><span>FOR SPECIALISTS</span><b>Find the next right project.</b><ArrowRight /></Link><Link to="/waypoint/client/home"><span>FOR CLIENTS</span><b>Make one clear decision.</b><ArrowRight /></Link></div></section>
    </main>
  );
}

interface JourneyProps {
  role: Role;
  view: ViewId;
  go: (view: ViewId) => void;
  switchRole: (role: Role) => void;
  state: ReturnType<typeof useConceptRoute>["state"];
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
}

function WaypointJourney({ role, view, go, switchRole, state, dispatch }: JourneyProps) {
  const current = stageFor(view);
  const stageGo = (id: string) => {
    const routes: Record<string, ViewId> = role === "client"
      ? { explore: "home", propose: "review", decide: "candidate", confirm: "selection", work: "engagement" }
      : { explore: "discover", propose: "proposal", decide: "applications", confirm: "selection", work: "engagement" };
    go(routes[id]);
  };
  return (
    <div className={`wp-app wp-stage-${current}`}>
      <header className="wp-header">
        <Link to="/waypoint" className="wp-symbol"><Compass size={19} /></Link><b>WAYPOINT</b>
        <span className="wp-coordinate">TH/042 · {current.toUpperCase()}</span>
        <div className="wp-role"><button className={role === "freelancer" ? "is-active" : ""} onClick={() => switchRole("freelancer")}>Specialist</button><button className={role === "client" ? "is-active" : ""} onClick={() => switchRole("client")}>Client</button></div>
        <button className="wp-reset" onClick={() => dispatch({ type: "reset" })}><RotateCcw size={14} /> Reset</button>
        <Link to="/" className="wp-exit"><X size={18} /><span>Concepts</span></Link>
      </header>
      <main id="main-content" className="wp-main">
        <aside className="wp-stage-label"><span>{stages.find((item) => item.id === current)?.number}</span><p>{current}</p></aside>
        <div className="wp-view">
          {view === "home" && <WaypointHome role={role} go={go} />}
          {view === "discover" && <WaypointExplore go={go} />}
          {view === "gig" && <WaypointGig go={go} />}
          {view === "proposal" && <WaypointProposal go={go} state={state} dispatch={dispatch} />}
          {view === "applications" && <WaypointApplication go={go} state={state} dispatch={dispatch} />}
          {view === "review" && <WaypointReview go={go} state={state} />}
          {view === "candidate" && <WaypointCandidate go={go} state={state} dispatch={dispatch} />}
          {view === "selection" && <WaypointConfirm role={role} go={go} state={state} dispatch={dispatch} />}
          {view === "engagement" && <WaypointWork state={state} dispatch={dispatch} />}
        </div>
      </main>
      <nav className="wp-route" aria-label="Workflow stages">{stages.map((stage) => <button key={stage.id} className={current === stage.id ? "is-active" : ""} onClick={() => stageGo(stage.id)}><span>{stage.number}</span><b>{role === "client" ? stage.client : stage.freelancer}</b><i /></button>)}</nav>
      {state.toast && <div className="wp-toast" role="status"><span>ROUTE UPDATED</span>{state.toast}</div>}
    </div>
  );
}

function WaypointHome({ role, go }: Pick<JourneyProps, "role" | "go">) {
  const client = role === "client";
  return (
    <section className="wp-intro">
      <p className="wp-kicker">{client ? "CLIENT ROUTE" : "SPECIALIST ROUTE"} · 28 JUL 2026</p>
      <h1>{client ? <>THE NEXT<br />DECISION IS<br /><em>KAVYA.</em></> : <>YOUR NEXT<br />DECISION IS<br /><em>EXACT.</em></>}</h1>
      <div className="wp-intro-bottom"><p>{client ? "Evidence reviewed. Proposal revised. One exact-version selection is currently active." : "Ternary Health has sent exact terms bound to your current application version."}</p><button onClick={() => go(client ? "candidate" : "selection")}>Continue at waypoint 04 <MoveRight size={20} /></button></div>
      <aside className="wp-status-ticket"><span>ACTIVE ROUTE</span><b>TH/042</b><small>31h remaining</small><i>{TERMS.proposal}</i></aside>
    </section>
  );
}

function WaypointExplore({ go }: Pick<JourneyProps, "go">) {
  const [active, setActive] = useState(0);
  return (
    <section className="wp-explore">
      <header><p className="wp-kicker">OPEN ROUTES · PROFILE EVIDENCE APPLIED</p><h1>Choose the work.<br />See the reason.</h1></header>
      <div className="wp-opportunity-field">
        <nav>{GIGS.map((gig, index) => <button className={active === index ? "is-active" : ""} onClick={() => setActive(index)} key={gig.id}><span>0{index + 1}</span><b>{gig.company}</b><small>{gig.title}</small></button>)}</nav>
        <article>
          <div className="wp-match-orbit"><strong>{GIGS[active].match}</strong><span>EVIDENCE<br />FIT</span></div>
          <p className="wp-kicker">{GIGS[active].company} · {GIGS[active].workMode}</p><h2>{GIGS[active].title}</h2><p>{GIGS[active].summary}</p>
          <dl><div><dt>Terms</dt><dd>{GIGS[active].budget}</dd></div><div><dt>Time</dt><dd>{GIGS[active].duration}</dd></div><div><dt>Closes</dt><dd>{GIGS[active].deadline}</dd></div></dl>
          <footer><span><Check size={14} />{GIGS[active].matchingSkills.length} capabilities evidenced</span><button onClick={() => go("gig")}>Enter brief <ArrowRight size={18} /></button></footer>
        </article>
      </div>
    </section>
  );
}

function WaypointGig({ go }: Pick<JourneyProps, "go">) {
  const gig = GIGS[0];
  return (
    <section className="wp-brief">
      <header><button onClick={() => go("discover")}><ArrowLeft size={16} /> Routes</button><p className="wp-kicker">TERNARY HEALTH · MATERIAL BRIEF v3</p><h1>{gig.title}</h1><div><span>{gig.budget}</span><span>{gig.duration}</span><span>{gig.commitment}</span></div></header>
      <div className="wp-brief-body"><article><h2>THE OUTCOME</h2><p>{gig.summary}</p><ol>{gig.deliverables.map((item, index) => <li key={item}><span>0{index + 1}</span>{item}</li>)}</ol></article><aside><div className="wp-fit"><strong>{gig.match}</strong><b>STRONG EVIDENCE FIT</b><p>{gig.matchReason}</p></div><h3>ALIGNED</h3>{gig.matchingSkills.map((skill) => <span className="wp-chip" key={skill}><Check size={12} />{skill}</span>)}<h3>DISCLOSED GAP</h3><p>{gig.missingSkills[0]}</p></aside></div>
      <footer><p>PRICE DOES NOT CHANGE EVIDENCE FIT.</p><button onClick={() => go("proposal")}>Move to proposal <ArrowRight /></button></footer>
    </section>
  );
}

function WaypointProposal({ go, state, dispatch }: Pick<JourneyProps, "go" | "state" | "dispatch">) {
  const [step, setStep] = useState(1);
  const [scope, setScope] = useState("Four product-team workshops");
  const invalid = scope.trim().length < 10;
  return (
    <section className="wp-compose">
      <header><p className="wp-kicker">PROPOSAL ROUTE · VERSION {state.applicationVersion}</p><h1>Build one<br />reviewable answer.</h1><div>{[1,2,3].map((item) => <button className={step === item ? "is-active" : ""} onClick={() => setStep(item)} key={item}><span>0{item}</span>{["Terms","Scope","Confirm"][item-1]}</button>)}</div></header>
      <form onSubmit={(event) => { event.preventDefault(); if (step < 3) setStep(step + 1); else if (!invalid) { dispatch({ type: "submit-revision" }); go("applications"); } }}>
        {step === 1 && <div className="wp-form-stage"><span>01 / TERMS</span><label>FIXED PROPOSAL<div><b>₹</b><input defaultValue="5,80,000" /></div></label><div className="wp-form-pair"><label>DELIVERY<input defaultValue="14 weeks" /></label><label>CAPACITY<input defaultValue="28 hours/week" /></label></div></div>}
        {step === 2 && <div className="wp-form-stage"><span>02 / SCOPE</span><label>APPROACH<textarea defaultValue="Inventory the system, establish the accessibility baseline, then migrate the two highest-risk investigator workflows." /></label><label>CLARIFIED IN VERSION {state.applicationVersion}<input value={scope} onChange={(event) => setScope(event.target.value)} aria-invalid={invalid} /></label>{invalid && <p role="alert">State the clarified scope in at least ten characters.</p>}</div>}
        {step === 3 && <div className="wp-form-stage wp-confirm-card"><span>03 / CONFIRM</span><h2>{TERMS.proposal}</h2><p>{TERMS.timeline} · {TERMS.availability}</p><div><Lock size={20} /><p>Submitting creates application v{state.applicationVersion + 1}. Any pending selection tied to v{state.applicationVersion} becomes invalid.</p></div></div>}
        <footer><button type="button" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}><ArrowLeft /> Back</button><button disabled={step === 2 && invalid}>{step === 3 ? "Record version" : "Next stage"} <ArrowRight /></button></footer>
      </form>
    </section>
  );
}

function WaypointApplication({ go, state, dispatch }: Pick<JourneyProps, "go" | "state" | "dispatch">) {
  return (
    <section className="wp-application">
      <header><p className="wp-kicker">YOUR ROUTE · TH/042</p><h1>PROPOSAL<br />RECORDED.</h1><span>{state.applicationStage}</span></header>
      <div className="wp-application-track">{["Applied","Shortlisted privately","Advanced","Revision v2","Selection"].map((item, index) => <div className={index <= 4 ? "is-done" : ""} key={item}><i>{index + 1}</i><span>{item}</span><small>{["25 Jul","25 Jul · client only","26 Jul","27 Jul","27 Jul · 31h left"][index]}</small></div>)}</div>
      <div className="wp-question-route"><span>CLARIFICATION</span><blockquote>{QA.question}</blockquote>{state.qaAnswered ? <blockquote className="is-answer">{QA.answer}</blockquote> : <button onClick={() => dispatch({ type: "answer-qa" })}>Answer in record</button>}</div>
      <footer><div><span>APPLICATION v{state.applicationVersion}</span><b>{TERMS.proposal} · {TERMS.timeline}</b></div><button onClick={() => go(state.selectionStatus === "pending" ? "selection" : "proposal")}>{state.selectionStatus === "pending" ? "Review selection" : "Create version"} <ArrowRight /></button></footer>
    </section>
  );
}

function WaypointReview({ go, state }: Pick<JourneyProps, "go" | "state">) {
  const [order, setOrder] = useState("Evidence");
  return (
    <section className="wp-review">
      <header><p className="wp-kicker">DECISION FIELD · 14 ACTIVE</p><h1>Four people.<br />Different reasons.</h1><div>{["Evidence","Newest","Shortlist","Advanced"].map((item) => <button className={order === item ? "is-active" : ""} onClick={() => setOrder(item)} key={item}>{item}</button>)}</div></header>
      <div className="wp-people-field">{APPLICANTS.map((person, index) => <button key={person.id} onClick={() => go("candidate")}><span className="wp-person-index">0{index + 1}</span><div className="wp-person-score"><strong>{person.match}</strong><small>EVIDENCE</small></div><div><p>{person.stage}</p><h2>{person.name}</h2><span>{person.headline}</span></div><dl><dt>PROPOSAL</dt><dd>{person.proposal}</dd><dt>TIME</dt><dd>{person.timeline}</dd></dl><footer><span>{person.id === "kavya" ? (state.shortlisted ? "PRIVATE SHORTLIST" : "NOT SHORTLISTED") : person.gap}</span><ChevronRight /></footer></button>)}</div>
    </section>
  );
}

function WaypointCandidate({ go, state, dispatch }: Pick<JourneyProps, "go" | "state" | "dispatch">) {
  const person = APPLICANTS[0];
  return (
    <section className="wp-candidate">
      <header><button onClick={() => go("review")}><ArrowLeft /> FIELD</button><span className="wp-person-index">01</span><div><p className="wp-kicker">APPLICATION v{state.applicationVersion}</p><h1>KAVYA<br />MENON</h1><span>{person.headline}</span></div><strong>{person.match}<small>EVIDENCE FIT</small></strong></header>
      <div className="wp-candidate-body"><section><h2>WHY KAVYA</h2><p>{person.note}</p><div className="wp-skill-map">{person.skills.map((skill, index) => <span key={skill} style={{"--shift": `${index * 7}%`} as React.CSSProperties}><Check />{skill}</span>)}</div><aside><b>DISCLOSED GAP</b><p>{person.gap}</p></aside></section><section><h2>EXACT PROPOSAL</h2><strong>{person.proposal}</strong><dl><div><dt>DELIVERY</dt><dd>{person.timeline}</dd></div><div><dt>AVAILABLE</dt><dd>{person.availability}</dd></div><div><dt>WORKSHOPS</dt><dd>4 included</dd></div><div><dt>RECORD</dt><dd>v{state.applicationVersion}</dd></div></dl><button onClick={() => dispatch({ type: "request-revision" })}>Request another revision</button></section></div>
      <footer><div><button className={state.shortlisted ? "is-active" : ""} onClick={() => dispatch({ type: "toggle-shortlist" })}>{state.shortlisted ? "✓ PRIVATE SHORTLIST" : "+ PRIVATE SHORTLIST"}</button><button onClick={() => dispatch({ type: "toggle-advance" })}>{state.advanced ? "RETURN TO REVIEW" : "ADVANCE"}</button></div><button onClick={() => go("selection")}>MOVE TO EXACT SELECTION <ArrowRight /></button></footer>
    </section>
  );
}

function WaypointConfirm({ role, go, state, dispatch }: Pick<JourneyProps, "role" | "go" | "state" | "dispatch">) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const client = role === "client";
  return (
    <section className="wp-confirm">
      <header><p className="wp-kicker">WAYPOINT 04 · EXACT TERM BOUNDARY</p><h1>STOP.<br />READ.<br />CONFIRM.</h1><aside><ShieldCheck /><p>{client ? "You are asking Kavya to accept one exact proposal version." : "Acceptance fills the gig and creates a shared engagement record."}</p></aside></header>
      <div className="wp-term-wall"><div><span>PROPOSAL</span><b>{TERMS.proposal}</b></div><div><span>APPLICATION</span><b>VERSION {state.applicationVersion}</b></div><div><span>TIME</span><b>{TERMS.timeline}</b></div><div><span>CAPACITY</span><b>28 HRS / WEEK</b></div><div className="wp-term-scope"><span>INCLUDED</span>{TERMS.included.map((item) => <p key={item}><Check />{item}</p>)}</div><div className="wp-term-scope"><span>EXCLUDED</span>{TERMS.excluded.map((item) => <p key={item}><Circle />{item}</p>)}</div></div>
      {client && state.selectionStatus !== "pending" && <footer><label>OPEN FOR<select value={deadline} onChange={(event) => setDeadline(event.target.value as "24"|"48"|"72")}><option value="24">24 HOURS</option><option value="48">48 HOURS</option><option value="72">72 HOURS</option></select></label><button onClick={() => dispatch({ type: "send-selection", deadline })}>SEND EXACT TERMS <Send /></button></footer>}
      {!client && state.selectionStatus === "pending" && <footer><p>31 HOURS REMAIN · APPLICATION v{state.applicationVersion}</p><button onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>ACCEPT EXACT TERMS <Flag /></button></footer>}
      {state.selectionStatus === "accepted" && <footer><p>CONFIRMED · GIG FILLED</p><button onClick={() => go("engagement")}>ENTER WORKSPACE <ArrowRight /></button></footer>}
    </section>
  );
}

function WaypointWork({ state, dispatch }: Pick<JourneyProps, "state" | "dispatch">) {
  return (
    <section className="wp-work">
      <header><p className="wp-kicker">WAYPOINT 05 · SHARED SPACE</p><h1>THE TERMS<br />ARRIVED INTACT.</h1><div><Flag /><span>{state.engagementStatus.replace("_"," ")}</span></div></header>
      <div className="wp-work-grid"><section><span>IMMUTABLE SNAPSHOT</span><h2>{TERMS.proposal}</h2><p>{TERMS.timeline} · starts 10 Aug · 28 hrs/week</p><dl><div><dt>APPLICATION</dt><dd>v{state.applicationVersion}</dd></div><div><dt>GIG TERMS</dt><dd>v3</dd></div><div><dt>WORKSHOPS</dt><dd>4</dd></div></dl><button onClick={() => dispatch({ type: "advance-engagement" })} disabled={state.engagementStatus === "completed"}>MOVE WORK FORWARD <ArrowRight /></button></section><section><span>SECURE CONTACT</span>{!state.contactShared || state.contactRevoked ? <><Lock /><h2>{state.contactRevoked ? "DISPLAY STOPPED" : "NOT SHARED"}</h2><p>Permission applies to this engagement only.</p><button onClick={() => dispatch({ type: "share-contact" })}>SHARE VERIFIED EMAIL</button></> : <><ShieldCheck /><h2>{state.contactRevealed ? "kavya.menon@example.com" : "k•••••@example.com"}</h2><p>Reveal requires membership and active sharing consent.</p><button onClick={() => dispatch({ type: state.contactRevealed ? "revoke-contact" : "reveal-contact" })}>{state.contactRevealed ? "STOP FUTURE DISPLAY" : "AUTHORIZE REVEAL"}</button></>}</section></div>
      <aside><b>SAFETY LINE</b><p>GigMatch does not process payments or provide escrow. Never share passwords, OTPs, access tokens, or banking credentials.</p></aside>
    </section>
  );
}
