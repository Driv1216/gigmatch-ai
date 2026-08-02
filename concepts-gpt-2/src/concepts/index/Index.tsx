import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, LockKeyhole, RotateCcw, Send, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import { changedFacets, indexApplicantRows, indexOpportunityRows, type IndexAxis } from "./model";
import "./index.css";

export function Index() {
  const location = useLocation();
  const route = useConceptRoute("index");
  return location.pathname === "/index" || location.pathname === "/index/" ? <Landing /> : <IndexApp {...route} />;
}

function Landing() {
  return <main id="main-content" className="ix-public"><header><Link to="/">20 / INDEX</Link><b>INDEX</b><span>MONUMENT × FACET</span></header><section><span>NORMALIZED EVIDENCE. UNCOMPROMISED TYPE.</span><h1>THE MARKET,<br /><em>ALIGNED.</em></h1><p>Full-width opportunity and applicant indexes that keep evidence, gaps, commitment, versions, and commercial terms comparable without confusing them.</p><nav><Link to="/index/freelancer/home">INDEX WORK <ArrowRight /></Link><Link to="/index/client/home">INDEX APPLICANTS <ArrowRight /></Link></nav></section><footer><span>01 / EVIDENCE</span><span>02 / GAP</span><span>03 / AVAILABILITY</span><span>04 / VERSION</span><span>05 / COMMERCIAL</span></footer></main>;
}

interface Props { role: Role; view: ViewId; go: (view: ViewId) => void; switchRole: (role: Role) => void; state: ReturnType<typeof useConceptRoute>["state"]; dispatch: ReturnType<typeof useConceptRoute>["dispatch"] }
const nav = (role: Role): { v: ViewId; label: string }[] => [{ v: "home", label: "Front" }, { v: role === "client" ? "review" : "discover", label: role === "client" ? "Applicants" : "Market" }, { v: role === "client" ? "candidate" : "applications", label: "Dossier" }, { v: "selection", label: "Exact terms" }, { v: "engagement", label: "Engagement" }];

function IndexApp({ role, view, go, switchRole, state, dispatch }: Props) {
  return <div className="ix-app"><header className="ix-header"><Link to="/index">INDEX <small>20</small></Link><nav>{nav(role).map((item, index) => <button className={view === item.v ? "is-active" : ""} key={item.v} onClick={() => go(item.v)}><span>0{index + 1}</span>{item.label}</button>)}</nav><div><button className={role === "freelancer" ? "is-active" : ""} onClick={() => switchRole("freelancer")}>FREELANCER</button><button className={role === "client" ? "is-active" : ""} onClick={() => switchRole("client")}>CLIENT</button></div></header><main id="main-content">
    {view === "home" && <Home role={role} go={go} state={state} />}
    {view === "discover" && <Discover go={go} />}
    {view === "gig" && <Gig go={go} />}
    {view === "proposal" && <Proposal go={go} state={state} dispatch={dispatch} />}
    {view === "applications" && <Application go={go} state={state} dispatch={dispatch} />}
    {view === "review" && <Review go={go} state={state} />}
    {view === "candidate" && <Candidate go={go} state={state} dispatch={dispatch} />}
    {view === "selection" && <Selection role={role} go={go} state={state} dispatch={dispatch} />}
    {view === "engagement" && <Engagement state={state} dispatch={dispatch} />}
  </main><footer className="ix-footer"><Link to="/"><ArrowLeft /> CONCEPTS</Link><span>TH–042 / APPLICATION v{state.applicationVersion} / GIG v3</span><button onClick={() => dispatch({ type: "reset" })}><RotateCcw /> RESET</button></footer>{state.toast && <div className="ix-toast" role="status">{state.toast}</div>}</div>;
}

function Title({ number, title, copy }: { number: string; title: string; copy: string }) { return <header className="ix-title"><span>{number}</span><h1>{title}</h1><p>{copy}</p></header>; }

function Home({ role, go, state }: Pick<Props, "role" | "go" | "state">) {
  return <section className="ix-page ix-home"><Title number="00 / ACTIVE INDEX" title={role === "client" ? "FOUR PEOPLE. ONE BRIEF." : "ONE DECISION. ALL CONTEXT."} copy="The index remains dense, legible, and exact. Expand only the row needed for the next decision." /><div className="ix-home-index"><button onClick={() => go(role === "client" ? "review" : "discover")}><span>01</span><h2>{role === "client" ? "APPLICANT REGISTER" : "OPPORTUNITY MARKET"}</h2><p>{role === "client" ? "4 normalized dossiers" : "3 evidence-matched briefs"}</p><ArrowRight /></button><button onClick={() => go(role === "client" ? "candidate" : "applications")}><span>02</span><h2>APPLICATION v{state.applicationVersion}</h2><p>{state.applicationStage}</p><ArrowRight /></button><button className="is-signal" onClick={() => go("selection")}><span>03</span><h2>EXACT SELECTION</h2><p>{state.selectionStatus} · {state.selectionDeadline}h window</p><ArrowRight /></button></div></section>;
}

function Discover({ go }: Pick<Props, "go">) {
  const rows = indexOpportunityRows(); const [active, setActive] = useState<string | null>("ternary-clinical");
  return <section className="ix-page"><Title number="01 / MARKET INDEX" title="THREE BRIEFS. SAME AXES." copy="Evidence fit remains separate from commercial guidance. Expand a row without losing the comparison." /><div className="ix-market-head"><b>#</b><b>OPPORTUNITY</b><b>EVIDENCE</b><b>COMMITMENT</b><b>COMMERCIAL</b><b>DEADLINE</b></div>{rows.map((row, index) => <div className={`ix-market-row ${active === row.id ? "is-open" : ""}`} key={row.id}><button onClick={() => setActive(active === row.id ? null : row.id)}><span>0{index + 1}</span><p><b>{row.company}</b><small>{row.title}</small></p><strong>{row.evidence}</strong><span>{row.commitment}</span><span>{row.commercial}</span><span>{row.deadline}</span><ChevronDown /></button>{active === row.id && <article><div><span>DISCLOSED GAP</span><b>{row.gap}</b></div><div><span>RECOMMENDATION BASIS</span><b>{GIGS.find((gig) => gig.id === row.id)?.matchReason}</b></div><button onClick={() => go("gig")}>OPEN COMPLETE BRIEF <ArrowRight /></button></article>}</div>)}</section>;
}

function Gig({ go }: Pick<Props, "go">) {
  const gig = GIGS[0];
  return <section className="ix-page"><button className="ix-back" onClick={() => go("discover")}><ArrowLeft /> MARKET INDEX</button><Title number="02 / BRIEF TH–042 / v3" title="SENIOR FRONTEND SYSTEMS ENGINEER" copy={gig.summary} /><div className="ix-brief"><section><header><b>REQUIREMENT</b><b>TYPE</b><b>EVIDENCE EXPECTATION</b></header>{gig.requiredSkills.map((item, index) => <div key={item}><span>0{index + 1}</span><strong>{item}</strong><em>MATERIAL</em><p>Reviewed delivery artifact or validation record</p></div>)}</section><aside><div><span>FIXED GUIDANCE</span><b>{gig.budget}</b></div><div><span>DURATION</span><b>{gig.duration}</b></div><div><span>CAPACITY</span><b>{gig.commitment}</b></div><div className="is-gap"><span>DISCLOSED GAP</span><b>{gig.missingSkills[0]}</b></div></aside></div><button className="ix-primary" onClick={() => go("proposal")}>COMPOSE INDEXED PROPOSAL <ArrowRight /></button></section>;
}

function Proposal({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  const [note, setNote] = useState(""); const invalid = note.trim().length < 24; const facets = changedFacets(state.applicationVersion + 1);
  return <section className="ix-page"><Title number={`03 / PROPOSAL v${state.applicationVersion + 1}`} title="CHANGE ONLY WHAT CHANGED." copy="Each proposal facet is explicit; unchanged evidence cannot be made to look newly stronger." /><form className="ix-proposal" onSubmit={(event) => { event.preventDefault(); if (!invalid) { dispatch({ type: "submit-revision" }); go("applications"); } }}><header><b>FACET</b><b>VALUE</b><b>REVISION STATE</b></header>{facets.map((facet) => <div className={facet.changed ? "is-changed" : ""} key={facet.label}><span>{facet.label}</span><input aria-label={facet.label} defaultValue={facet.value} /><em>{facet.changed ? "CHANGED" : "UNCHANGED"}</em></div>)}<label>REVISION NOTE<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe the commercial or scope change." />{invalid && <small role="alert">Enter at least 24 characters.</small>}</label><footer><p>Active selection for v{state.applicationVersion} → invalidated</p><button disabled={invalid}>RECORD VERSION <Send /></button></footer></form></section>;
}

function Application({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  return <section className="ix-page"><Title number={`04 / APPLICATION AP.001 / v${state.applicationVersion}`} title="THE COMPLETE RECORD." copy={`${state.applicationStage} · evidence, commercial terms, Q&A, stage, and immutable history.`} /><div className="ix-facets">{changedFacets(state.applicationVersion).map((facet, index) => <div key={facet.label}><span>0{index + 1}</span><b>{facet.label}</b><strong>{facet.value}</strong><em>{facet.changed ? "CURRENT VERSION" : "STABLE"}</em></div>)}</div><section className="ix-qa"><span>STRUCTURED Q&A</span><blockquote>{QA.question}</blockquote>{state.qaAnswered ? <p>{QA.answer}</p> : <button onClick={() => dispatch({ type: "answer-qa" })}>RECORD ANSWER</button>}<footer><button onClick={() => go("proposal")}>CREATE REVISION</button><button onClick={() => go("selection")}>REVIEW EXACT TERMS <ArrowRight /></button></footer></section></section>;
}

function Review({ go, state }: Pick<Props, "go" | "state">) {
  const [axis, setAxis] = useState<IndexAxis>("evidence"); const rows = indexApplicantRows(axis);
  return <section className="ix-page"><Title number="05 / APPLICANT INDEX" title="COMPARE EVIDENCE. KEEP PRICE IN ITS COLUMN." copy="Sorting commercial terms never changes evidence rank; each axis answers one marketplace question." /><nav className="ix-axis" aria-label="Sort applicants">{(["evidence", "gap", "availability", "version", "commercial"] as IndexAxis[]).map((item) => <button className={axis === item ? "is-active" : ""} key={item} onClick={() => setAxis(item)}>{item}</button>)}</nav><div className="ix-applicant-head"><b>#</b><b>APPLICANT</b><b>EVIDENCE</b><b>AVAILABILITY</b><b>VERSION</b><b>COMMERCIAL</b></div>{rows.map((row, index) => <button className="ix-applicant-row" key={row.id} onClick={() => go("candidate")}><span>0{index + 1}</span><p><b>{row.name}</b><small>{row.gap}</small></p><strong>{row.evidence}</strong><span>{row.availability}</span><span>v{row.id === "kavya" ? state.applicationVersion : row.version}</span><span>{row.commercial}</span><ChevronRight /></button>)}</section>;
}

function Candidate({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  const person = APPLICANTS[0];
  return <section className="ix-page"><button className="ix-back" onClick={() => go("review")}><ArrowLeft /> APPLICANT INDEX</button><Title number={`06 / DOSSIER KM / v${state.applicationVersion}`} title="KAVYA MENON." copy={person.headline} /><div className="ix-dossier"><section><header><b>EVIDENCE AXIS</b><b>REVIEWED VALUE</b></header>{person.skills.map((skill, index) => <div key={skill}><span>0{index + 1}</span><b>{skill}</b><em>SUPPORTED</em></div>)}<div className="is-gap"><span>05</span><b>Direct clinical-trial work</b><em>DISCLOSED GAP</em></div></section><aside><div><span>EVIDENCE FIT</span><strong>{person.match}</strong></div><div><span>COMMERCIAL</span><strong>{person.proposal}</strong><small>Excluded from fit</small></div><div><span>AVAILABILITY</span><b>{person.availability}</b></div></aside></div><footer className="ix-actions"><button onClick={() => dispatch({ type: "toggle-shortlist" })}>{state.shortlisted ? "✓ PRIVATE SHORTLIST" : "+ PRIVATE SHORTLIST"}</button><button onClick={() => dispatch({ type: "toggle-advance" })}>{state.advanced ? "RETURN TO REVIEW" : "ADVANCE"}</button><button onClick={() => dispatch({ type: "request-revision" })}>REQUEST REVISION</button><button onClick={() => go("selection")}>REDUCE TO EXACT TERMS <ArrowRight /></button></footer></section>;
}

function Selection({ role, go, state, dispatch }: Pick<Props, "role" | "go" | "state" | "dispatch">) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  return <section className="ix-page ix-selection"><Title number="07 / EXACT SELECTION" title="THIS CANDIDATE. THIS VERSION. THESE TERMS." copy="The comparison collapses to one consequential record. Acceptance fills the gig and creates the engagement atomically." /><div className="ix-exact"><header><span>TERNARY HEALTH</span><span>×</span><span>KAVYA MENON</span></header><section><div><span>APPLICATION</span><b>v{state.applicationVersion}</b></div><div><span>GIG TERMS</span><b>v3</b></div><div><span>FIXED PROPOSAL</span><b>{TERMS.proposal}</b></div><div><span>DELIVERY</span><b>14 WEEKS</b></div><div><span>CAPACITY</span><b>28 HRS/WEEK</b></div><div><span>WINDOW</span><b>{state.selectionDeadline} HOURS</b></div></section><footer>MARKETPLACE ACKNOWLEDGEMENT · NOT A LEGAL CONTRACT OR PAYMENT INSTRUCTION</footer></div>{state.selectionStatus === "invalidated" && <div className="ix-invalid" role="alert"><X /><p><b>SELECTION INVALIDATED</b>Application v{state.applicationVersion} requires a fresh request.</p></div>}
    {role === "client" && state.selectionStatus !== "pending" && <footer className="ix-selection-actions"><label>RESPONSE WINDOW<select value={deadline} onChange={(event) => setDeadline(event.target.value as "24" | "48" | "72")}><option value="24">24 HOURS</option><option value="48">48 HOURS</option><option value="72">72 HOURS</option></select></label><button onClick={() => dispatch({ type: "send-selection", deadline })}>SEND EXACT REQUEST <Send /></button></footer>}
    {role === "freelancer" && state.selectionStatus === "pending" && <footer className="ix-selection-actions"><p>31 HOURS REMAIN</p><button onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>ACCEPT EXACT TERMS <Check /></button></footer>}
    {state.selectionStatus === "accepted" && <footer className="ix-selection-actions"><p>GIG FILLED · ENGAGEMENT CREATED</p><button onClick={() => go("engagement")}>OPEN ENGAGEMENT <ArrowRight /></button></footer>}
  </section>;
}

function Engagement({ state, dispatch }: Pick<Props, "state" | "dispatch">) {
  return <section className="ix-page"><Title number="08 / ENGAGEMENT EN.001" title="THE ACCEPTED INDEX." copy={`${state.engagementStatus.replaceAll("_", " ")} · application v${state.applicationVersion} · gig terms v3`} /><div className="ix-engagement"><section><header><b>IMMUTABLE TERM</b><b>VALUE</b></header><div><span>FIXED PROPOSAL</span><strong>{TERMS.proposal}</strong></div><div><span>DELIVERY</span><strong>{TERMS.timeline}</strong></div><div><span>CAPACITY</span><strong>28 HOURS/WEEK</strong></div><div><span>ACCEPTED VERSIONS</span><strong>APPLICATION v{state.applicationVersion} / GIG v3</strong></div><button disabled={state.engagementStatus === "completed"} onClick={() => dispatch({ type: "advance-engagement" })}>ADVANCE LIFECYCLE <ArrowRight /></button></section><section><header><b>ACTIVITY</b><b>TIME</b></header>{state.activity.slice(0, 5).map((item) => <div key={item.id}><span>{item.title}</span><time>{item.at}</time></div>)}</section><aside><span>CONTACT PERMISSION</span>{!state.contactShared || state.contactRevoked ? <><LockKeyhole /><h2>{state.contactRevoked ? "DISPLAY STOPPED" : "MASKED"}</h2><p>k•••••@example.com</p><button onClick={() => dispatch({ type: "share-contact" })}>SHARE VERIFIED EMAIL</button></> : <><ShieldCheck /><h2>{state.contactRevealed ? "REVEALED" : "MASKED"}</h2><p>{state.contactRevealed ? "kavya.menon@example.com" : "k•••••@example.com"}</p><button onClick={() => dispatch({ type: state.contactRevealed ? "revoke-contact" : "reveal-contact" })}>{state.contactRevealed ? "REVOKE FUTURE DISPLAY" : "AUTHORIZE REVEAL"}</button></>}</aside></div></section>;
}
