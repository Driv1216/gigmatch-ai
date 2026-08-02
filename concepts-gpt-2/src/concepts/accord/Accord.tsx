import { ArrowLeft, ArrowRight, Check, FileDiff, Landmark, LockKeyhole, RotateCcw, Scale, Send, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import { accordAlignment, accordDecision, proposalRedline } from "./model";
import "./accord.css";

export function Accord() {
  const location = useLocation();
  const route = useConceptRoute("accord");
  return location.pathname === "/accord" || location.pathname === "/accord/" ? <Landing /> : <AccordApp {...route} />;
}

function Landing() {
  return <main id="main-content" className="ac-public"><header><Link to="/">COLLECTION / 17</Link><b>ACCORD</b><span>COVENANT × DUET</span></header><section><div><span>ONE BRIEF. TWO POSITIONS. EXACT AGREEMENT.</span><h1>The record<br />between<br /><em>both parties.</em></h1><p>A premium marketplace case file where requirements, evidence, revisions, and authority are reconciled in view.</p><nav><Link to="/accord/client/home">Open as Ternary Health <ArrowRight /></Link><Link to="/accord/freelancer/home">Open as Kavya Menon <ArrowRight /></Link></nav></div><aside><header><span>CASE TH–042</span><b>OPEN FOR ACKNOWLEDGEMENT</b></header><div className="ac-mini"><section><small>CLIENT POSITION</small><strong>Gig terms v3</strong><p>Four required capabilities<br />14-week delivery</p></section><i><Scale /><b>4</b><span>aligned terms</span></i><section><small>SPECIALIST POSITION</small><strong>Application v2</strong><p>₹5.8L fixed<br />28 hours/week</p></section></div><footer>Selection expires in 31 hours</footer></aside></section></main>;
}

interface Props { role: Role; view: ViewId; go: (view: ViewId) => void; switchRole: (role: Role) => void; state: ReturnType<typeof useConceptRoute>["state"]; dispatch: ReturnType<typeof useConceptRoute>["dispatch"] }
const sections = (role: Role): { v: ViewId; label: string }[] => [{ v: "home", label: "Cover" }, { v: role === "client" ? "review" : "discover", label: role === "client" ? "Applicants" : "Briefs" }, { v: role === "client" ? "candidate" : "applications", label: role === "client" ? "Dossier" : "Application" }, { v: "selection", label: "Instrument" }, { v: "engagement", label: "Record" }];

function AccordApp({ role, view, go, switchRole, state, dispatch }: Props) {
  return <div className="ac-app"><header className="ac-header"><Link to="/accord"><Landmark />ACCORD <small>17</small></Link><nav>{sections(role).map((item) => <button key={item.v} className={view === item.v ? "is-active" : ""} onClick={() => go(item.v)}>{item.label}</button>)}</nav><div className="ac-role"><button className={role === "client" ? "is-active" : ""} onClick={() => switchRole("client")}>Client</button><span>↔</span><button className={role === "freelancer" ? "is-active" : ""} onClick={() => switchRole("freelancer")}>Specialist</button></div></header><main id="main-content">
    {view === "home" && <Home role={role} go={go} state={state} />}
    {view === "discover" && <Discover go={go} />}
    {view === "gig" && <Gig go={go} />}
    {view === "proposal" && <Proposal go={go} state={state} dispatch={dispatch} />}
    {view === "applications" && <Application go={go} state={state} dispatch={dispatch} />}
    {view === "review" && <Review go={go} state={state} />}
    {view === "candidate" && <Candidate go={go} state={state} dispatch={dispatch} />}
    {view === "selection" && <Selection role={role} go={go} state={state} dispatch={dispatch} />}
    {view === "engagement" && <Engagement state={state} dispatch={dispatch} />}
  </main><footer className="ac-footer"><Link to="/"><ArrowLeft /> Twenty concepts</Link><span>CASE TH–042 · RECORDS RETAINED LOCALLY</span><button onClick={() => dispatch({ type: "reset" })}><RotateCcw /> Reset case</button></footer>{state.toast && <div className="ac-toast" role="status">{state.toast}</div>}</div>;
}

function CaseTitle({ chapter, title, copy }: { chapter: string; title: string; copy: string }) {
  return <header className="ac-title"><span>{chapter}</span><h1>{title}</h1><p>{copy}</p></header>;
}

function Alignment({ state }: Pick<Props, "state">) {
  const rows = accordAlignment([...GIGS[0].requiredSkills, "Clinical trials"], APPLICANTS[0].skills);
  return <div className="ac-alignment">{rows.map((row) => <div key={row.requirement} className={row.state === "gap" ? "is-gap" : ""}><section><span>TERNARY REQUIRES</span><b>{row.requirement}</b></section><i>{row.state === "aligned" ? <Check /> : <X />}<small>{row.state}</small></i><section><span>KAVYA RECORDS</span><b>{row.evidence}</b></section></div>)}<footer><span>Commercial terms are excluded from evidence alignment.</span><b>4 aligned · 1 gap · application v{state.applicationVersion}</b></footer></div>;
}

function Home({ role, go, state }: Pick<Props, "role" | "go" | "state">) {
  const decision = accordDecision(state);
  return <section className="ac-page"><CaseTitle chapter="CASE COVER / TH–042" title={role === "client" ? "A decision ready for exact review." : "An agreement waiting for your acknowledgement."} copy="Every material position remains attributable to the party and version that stated it." /><div className="ac-cover"><section><span>CLIENT RECORD</span><h2>Ternary Health</h2><p>Gig terms v3 · four required capabilities · 14-week delivery</p><button onClick={() => go(role === "client" ? "review" : "gig")}>Read client position <ArrowRight /></button></section><i><Scale /><span>ALIGNMENT</span><strong>{decision.questions}</strong><b>open questions</b><small>{decision.exactVersion}</small></i><section><span>SPECIALIST RECORD</span><h2>Kavya Menon</h2><p>Application v{state.applicationVersion} · {TERMS.proposal} · 28 hours/week</p><button onClick={() => go(role === "client" ? "candidate" : "applications")}>Read specialist position <ArrowRight /></button></section></div><aside className="ac-authority"><b>{decision.authority}</b><button onClick={() => go("selection")}>Open confirmation instrument <ArrowRight /></button></aside></section>;
}

function Discover({ go }: Pick<Props, "go">) {
  const [active, setActive] = useState(0);
  const gig = GIGS[active];
  return <section className="ac-page"><CaseTitle chapter="CASE INDEX / OPEN BRIEFS" title="Work presented as a durable record." copy="Review the brief, evidence expectation, commercial guidance, and deadline before opening a case." /><div className="ac-index"><nav>{GIGS.map((item, index) => <button className={active === index ? "is-active" : ""} key={item.id} onClick={() => setActive(index)}><span>0{index + 1}</span><p><b>{item.company}</b><small>{item.title}</small></p><em>{item.match}</em></button>)}</nav><article><span>GIG RECORD / CURRENT TERMS</span><h2>{gig.title}</h2><p>{gig.summary}</p><dl><div><dt>Duration</dt><dd>{gig.duration}</dd></div><div><dt>Capacity</dt><dd>{gig.commitment}</dd></div><div><dt>Commercial</dt><dd>{gig.budget}</dd></div></dl><aside><b>Disclosed evidence gap</b><p>{gig.missingSkills[0]}</p></aside><button onClick={() => go("gig")}>Open complete case file <ArrowRight /></button></article></div></section>;
}

function Gig({ go }: Pick<Props, "go">) {
  return <section className="ac-page"><button className="ac-back" onClick={() => go("discover")}><ArrowLeft /> Brief index</button><CaseTitle chapter="GIG RECORD / TH–042 / TERMS v3" title={GIGS[0].title} copy={GIGS[0].summary} /><div className="ac-clauses"><section><span>§ 01 / REQUIRED EVIDENCE</span>{GIGS[0].requiredSkills.map((item) => <p key={item}><b>{item}</b><small>Material requirement</small></p>)}</section><section><span>§ 02 / DELIVERABLES</span>{GIGS[0].deliverables.map((item, index) => <p key={item}><b>0{index + 1}</b>{item}</p>)}</section><aside><span>§ 03 / MATERIAL TERMS</span><strong>{GIGS[0].budget}</strong><p>{GIGS[0].duration}<br />{GIGS[0].commitment}<br />Closes {GIGS[0].deadline}</p></aside></div><button className="ac-primary" onClick={() => go("proposal")}>Prepare specialist response <ArrowRight /></button></section>;
}

function Proposal({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  const [change, setChange] = useState("");
  const invalid = change.trim().length < 24;
  return <section className="ac-page"><CaseTitle chapter={`SPECIALIST RESPONSE / PROPOSED v${state.applicationVersion + 1}`} title="Amend the record, not the memory." copy="Changed terms are marked explicitly and any active selection for the earlier version becomes ineffective." /><form className="ac-redline" onSubmit={(event) => { event.preventDefault(); if (!invalid) { dispatch({ type: "submit-revision" }); go("applications"); } }}><header><b>CLAUSE</b><b>PREVIOUS RECORD</b><b>PROPOSED RECORD</b></header>{proposalRedline(state.applicationVersion + 1).map((line) => <div className={line.changed ? "is-changed" : ""} key={line.field}><b>{line.field}</b><del>{line.before}</del><ins>{line.after}</ins></div>)}<label>Reason for amendment<textarea value={change} onChange={(event) => setChange(event.target.value)} placeholder="Explain the changed workshops and delivery promise." />{invalid && <small role="alert">Enter at least 24 characters for the permanent record.</small>}</label><footer><p><FileDiff /> Selection tied to v{state.applicationVersion} will be invalidated.</p><button disabled={invalid}>Record amendment <Send /></button></footer></form></section>;
}

function Application({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  return <section className="ac-page"><CaseTitle chapter={`APPLICATION RECORD / AP.001 / v${state.applicationVersion}`} title="The complete specialist position." copy={`${state.applicationStage} · terms, evidence, Q&A, and history remain versioned.`} /><Alignment state={state} /><div className="ac-record-sections"><section><span>PROPOSAL TERMS</span><strong>{TERMS.proposal}</strong><p>{TERMS.timeline} · {TERMS.availability}</p><button onClick={() => go("proposal")}>Prepare amendment</button></section><section><span>STRUCTURED Q&A</span><blockquote>{QA.question}</blockquote>{state.qaAnswered ? <p>{QA.answer}</p> : <button onClick={() => dispatch({ type: "answer-qa" })}>Enter attributable answer</button>}</section><section><span>RECORD HISTORY</span>{state.activity.slice(0, 3).map((item) => <p key={item.id}><b>{item.title}</b><small>{item.at} · {item.actor}</small></p>)}</section></div></section>;
}

function Review({ go, state }: Pick<Props, "go" | "state">) {
  const [active, setActive] = useState(0);
  return <section className="ac-page"><CaseTitle chapter="CLIENT CASE INDEX / APPLICANTS" title="Keep the brief fixed while the respondent changes." copy="Applicant positions are compared against one durable client record." /><div className="ac-review"><aside><span>FIXED CLIENT RECORD</span><h2>Gig terms v3</h2>{GIGS[0].requiredSkills.map((item) => <p key={item}><Check />{item}</p>)}</aside><nav>{APPLICANTS.map((person, index) => <button key={person.id} className={active === index ? "is-active" : ""} onClick={() => setActive(index)}><span>{person.match}</span><p><b>{person.name}</b><small>{person.headline}</small></p><em>v{person.id === "kavya" ? state.applicationVersion : person.version}</em></button>)}</nav><article><span>RESPONDENT POSITION</span><h2>{APPLICANTS[active].name}</h2><p>{APPLICANTS[active].note}</p><dl><div><dt>Evidence</dt><dd>{APPLICANTS[active].match}</dd></div><div><dt>Availability</dt><dd>{APPLICANTS[active].availability}</dd></div><div><dt>Commercial</dt><dd>{APPLICANTS[active].proposal}</dd></div></dl><button onClick={() => go("candidate")}>Open bilateral dossier <ArrowRight /></button></article></div></section>;
}

function Candidate({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  return <section className="ac-page"><button className="ac-back" onClick={() => go("review")}><ArrowLeft /> Applicant index</button><CaseTitle chapter={`BILATERAL DOSSIER / APPLICATION v${state.applicationVersion}`} title="Ternary Health ↔ Kavya Menon" copy="Requirements and reviewed evidence are reconciled without collapsing either party’s position." /><Alignment state={state} /><footer className="ac-decisions"><button className={state.shortlisted ? "is-active" : ""} onClick={() => dispatch({ type: "toggle-shortlist" })}>{state.shortlisted ? "✓ Private shortlist" : "+ Private shortlist"}</button><button onClick={() => dispatch({ type: "toggle-advance" })}>{state.advanced ? "Return to review" : "Advance visibly"}</button><button onClick={() => dispatch({ type: "request-revision" })}>Request amendment</button><button onClick={() => go("selection")}>Prepare instrument <ArrowRight /></button></footer></section>;
}

function Selection({ role, go, state, dispatch }: Pick<Props, "role" | "go" | "state" | "dispatch">) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const decision = accordDecision(state);
  return <section className="ac-page ac-selection"><CaseTitle chapter="EXACT-TERM ACKNOWLEDGEMENT / NON-CONTRACTUAL" title="The confirmation instrument." copy="This acknowledgement records marketplace intent and atomically creates the engagement. It is not a legal contract." /><div className="ac-instrument"><header><Landmark /><span>CASE TH–042</span><b>{state.selectionStatus.toUpperCase()}</b></header><div className="ac-instrument__parties"><section><small>ISSUING PARTY</small><h2>Ternary Health</h2><p>Gig terms v3</p></section><i><Scale /><span>{decision.reconciled ? "ACKNOWLEDGED" : "EXACT VERSION LINK"}</span></i><section><small>RESPONDING PARTY</small><h2>Kavya Menon</h2><p>Application v{state.applicationVersion}</p></section></div><dl><div><dt>Fixed proposal</dt><dd>{TERMS.proposal}</dd></div><div><dt>Delivery</dt><dd>{TERMS.timeline}</dd></div><div><dt>Capacity</dt><dd>28 hours/week</dd></div><div><dt>Response window</dt><dd>{state.selectionDeadline} hours</dd></div></dl>{state.selectionStatus === "invalidated" && <aside role="alert"><FileDiff /><p><b>Instrument ineffective</b>The specialist position changed. Issue fresh authority for application v{state.applicationVersion}.</p></aside>}</div>
    {role === "client" && state.selectionStatus !== "pending" && <footer className="ac-selection-actions"><label>Response window<select value={deadline} onChange={(event) => setDeadline(event.target.value as "24" | "48" | "72")}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button onClick={() => dispatch({ type: "send-selection", deadline })}>Issue exact instrument <Send /></button></footer>}
    {role === "freelancer" && state.selectionStatus === "pending" && <footer className="ac-selection-actions"><p>31 hours remain for acknowledgement.</p><button onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Acknowledge exact terms <Check /></button></footer>}
    {state.selectionStatus === "accepted" && <footer className="ac-selection-actions"><p>Both positions reconciled. Engagement created.</p><button onClick={() => go("engagement")}>Open shared record <ArrowRight /></button></footer>}
  </section>;
}

function Engagement({ state, dispatch }: Pick<Props, "state" | "dispatch">) {
  return <section className="ac-page"><CaseTitle chapter="SHARED ENGAGEMENT RECORD / EN.001" title="Accepted terms become the center." copy={`${state.engagementStatus.replaceAll("_", " ")} · application v${state.applicationVersion} · gig terms v3`} /><div className="ac-engagement"><section><span>IMMUTABLE TERMS</span><h2>{TERMS.proposal}</h2><p>{TERMS.timeline} · 28 hours/week</p>{TERMS.included.map((item) => <div key={item}><Check />{item}</div>)}<button disabled={state.engagementStatus === "completed"} onClick={() => dispatch({ type: "advance-engagement" })}>Advance shared lifecycle <ArrowRight /></button></section><section><span>ACTIVITY LEDGER</span>{state.activity.slice(0, 5).map((item) => <p key={item.id}><time>{item.at}</time><b>{item.title}</b><small>{item.detail}</small></p>)}</section><aside><span>CONTACT PERMISSION</span>{!state.contactShared || state.contactRevoked ? <><LockKeyhole /><h2>{state.contactRevoked ? "Display revoked" : "Contact masked"}</h2><p>Consent is scoped to this engagement.</p><button onClick={() => dispatch({ type: "share-contact" })}>Grant verified-email consent</button></> : <><ShieldCheck /><h2>{state.contactRevealed ? "kavya.menon@example.com" : "k•••••@example.com"}</h2><p>Authorization is active and recorded.</p><button onClick={() => dispatch({ type: state.contactRevealed ? "revoke-contact" : "reveal-contact" })}>{state.contactRevealed ? "Revoke future display" : "Authorize reveal"}</button></>}</aside></div></section>;
}
