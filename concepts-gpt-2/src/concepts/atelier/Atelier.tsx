import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Eye, Layers3, LockKeyhole, Maximize2, RotateCcw, Send, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { EVIDENCE_ARTIFACTS } from "../../domain/expansion";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import { atelierCoverage, atelierDepth, atelierTrail, unsupportedPromises } from "./model";
import "./atelier.css";

export function Atelier() {
  const location = useLocation();
  const route = useConceptRoute("atelier");
  return location.pathname === "/atelier" || location.pathname === "/atelier/" ? <Landing /> : <AtelierApp {...route} />;
}

function Landing() {
  return <main id="main-content" className="at-public"><header><Link to="/">INDEX / 19</Link><b>ATELIER</b><span>APERTURE × PROOFROOM</span></header><section><div><span>ENTER THROUGH THE EVIDENCE</span><h1>Look closer.<br />Then decide<br /><em>exactly.</em></h1><p>A marketplace of reviewed work artifacts, navigated by depth—from the open market to one quiet confirmation room.</p><nav><Link to="/atelier/freelancer/home">Enter specialist collection <ArrowRight /></Link><Link to="/atelier/client/home">Enter client collection <ArrowRight /></Link></nav></div><aside><div className="at-stack">{EVIDENCE_ARTIFACTS.slice(0, 4).map((artifact, index) => <article key={artifact.id} style={{ "--offset": index } as React.CSSProperties}><span>ROOM {artifact.room}</span><h2>{artifact.title}</h2><p>{artifact.kind}</p><b>{artifact.proves.length || "GAP"}</b></article>)}</div></aside></section></main>;
}

interface Props { role: Role; view: ViewId; go: (view: ViewId) => void; switchRole: (role: Role) => void; state: ReturnType<typeof useConceptRoute>["state"]; dispatch: ReturnType<typeof useConceptRoute>["dispatch"] }

function AtelierApp({ role, view, go, switchRole, state, dispatch }: Props) {
  const trail = atelierTrail(view);
  const nav: { view: ViewId; label: string }[] = [{ view: "home", label: "Foyer" }, { view: role === "client" ? "review" : "discover", label: role === "client" ? "Collections" : "Market" }, { view: role === "client" ? "candidate" : "applications", label: "Evidence" }, { view: "selection", label: "Private room" }, { view: "engagement", label: "Archive" }];
  return <div className={`at-app at-depth-${atelierDepth(view)}`}><header className="at-header"><Link to="/atelier"><Eye />ATELIER <small>19</small></Link><div className="at-crumbs" aria-label="Depth breadcrumb">{trail.map((item, index) => <span key={item}>{index > 0 && <ChevronRight />}{item}</span>)}</div><div className="at-role"><button className={role === "freelancer" ? "is-active" : ""} onClick={() => switchRole("freelancer")}>SPECIALIST</button><button className={role === "client" ? "is-active" : ""} onClick={() => switchRole("client")}>CLIENT</button></div></header><aside className="at-dock"><nav>{nav.map((item, index) => <button key={item.view} className={view === item.view ? "is-active" : ""} onClick={() => go(item.view)}><span>0{index}</span>{item.label}</button>)}</nav><Link to="/"><ArrowLeft /> All concepts</Link></aside><main id="main-content">
    {view === "home" && <Home role={role} go={go} state={state} />}
    {view === "discover" && <Discover go={go} />}
    {view === "gig" && <Gig go={go} />}
    {view === "proposal" && <Proposal go={go} state={state} dispatch={dispatch} />}
    {view === "applications" && <Application go={go} state={state} dispatch={dispatch} />}
    {view === "review" && <Review go={go} state={state} />}
    {view === "candidate" && <Candidate go={go} state={state} dispatch={dispatch} />}
    {view === "selection" && <Selection role={role} go={go} state={state} dispatch={dispatch} />}
    {view === "engagement" && <Engagement state={state} dispatch={dispatch} />}
  </main><footer className="at-footer"><span>DEPTH {atelierDepth(view)} / 5</span><i><b style={{ width: `${atelierDepth(view) * 20}%` }} /></i><button onClick={() => dispatch({ type: "reset" })}><RotateCcw /> Reset</button></footer>{state.toast && <div className="at-toast" role="status">{state.toast}</div>}</div>;
}

function Title({ room, title, copy }: { room: string; title: string; copy: string }) { return <header className="at-title"><span>{room}</span><h1>{title}</h1><p>{copy}</p></header>; }
function Artifact({ artifact, active, onClick }: { artifact: typeof EVIDENCE_ARTIFACTS[number]; active?: boolean; onClick?: () => void }) { return <button className={`at-artifact ${active ? "is-active" : ""} ${artifact.id === "gap" ? "is-gap" : ""}`} onClick={onClick}><header><span>ROOM {artifact.room}</span><em>{artifact.kind}</em></header><h3>{artifact.title}</h3><p>{artifact.note}</p><footer>{artifact.proves.length ? artifact.proves.map((item) => <b key={item}>{item}</b>) : <b>Explicit absence</b>}<Maximize2 /></footer></button>; }

function Home({ role, go, state }: Pick<Props, "role" | "go" | "state">) {
  return <section className="at-page at-home"><Title room="FOYER / DEPTH 00" title={role === "client" ? "Four collections surround one fixed brief." : "Your evidence already knows where it belongs."} copy="Move inward only when the decision needs more detail; parent context remains at the edge." /><div className="at-home-field"><article className="at-parent"><span>MARKET CONTEXT</span><h2>3 open briefs</h2><p>Evidence fit · material terms · deadlines</p></article><button className="at-focus" onClick={() => go(role === "client" ? "review" : "discover")}><Layers3 /><span>FOCUSED COLLECTION</span><h2>{role === "client" ? "Ternary applicant room" : "Kavya’s opportunity field"}</h2><p>Application v{state.applicationVersion} · {state.applicationStage}</p><b>Enter depth 01 <ArrowRight /></b></button><article className="at-parent"><span>EXACT OUTCOME</span><h2>{state.selectionStatus}</h2><p>Selection → engagement → contact</p></article></div></section>;
}

function Discover({ go }: Pick<Props, "go">) {
  const [active, setActive] = useState(0); const gig = GIGS[active];
  return <section className="at-page"><Title room="MARKET FIELD / DEPTH 01" title="Move the field until the right brief is central." copy="Opportunity scale reflects focus, not a recommendation score. Evidence and terms stay literal." /><div className="at-field">{GIGS.map((item, index) => <button key={item.id} className={active === index ? "is-active" : ""} onClick={() => setActive(index)}><span>{item.match} / EVIDENCE</span><h2>{item.company}</h2><p>{item.title}</p><footer><b>{item.deadline}</b><em>{item.budget}</em></footer></button>)}</div><article className="at-field-inspector"><span>CENTRAL BRIEF</span><h2>{gig.title}</h2><p>{gig.matchReason}</p><div>{gig.matchingSkills.slice(0, 4).map((item) => <b key={item}><Check />{item}</b>)}<b className="is-gap"><X />{gig.missingSkills[0]}</b></div><button onClick={() => go("gig")}>Zoom into brief <ArrowRight /></button></article></section>;
}

function Gig({ go }: Pick<Props, "go">) {
  const coverage = atelierCoverage([...GIGS[0].requiredSkills, "Clinical trials"]);
  return <section className="at-page"><button className="at-back" onClick={() => go("discover")}><ChevronLeft /> Market field</button><Title room="TERNARY BRIEF / DEPTH 02" title={GIGS[0].title} copy={GIGS[0].summary} /><div className="at-coverage"><header><b>REQUIREMENT</b><b>REVIEWED ARTIFACT</b><b>STATE</b></header>{coverage.map((item) => <div className={item.supported ? "" : "is-gap"} key={item.requirement}><span>{item.requirement}</span><b>ROOM {item.room} / {item.artifact}</b><em>{item.supported ? "SUPPORTED" : "DISCLOSED GAP"}</em></div>)}</div><aside className="at-terms"><div><span>FIXED GUIDANCE</span><b>{GIGS[0].budget}</b></div><div><span>DELIVERY</span><b>{GIGS[0].duration}</b></div><div><span>CAPACITY</span><b>{GIGS[0].commitment}</b></div><button onClick={() => go("proposal")}>Enter proposal studio <ArrowRight /></button></aside></section>;
}

function Proposal({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  const [promise, setPromise] = useState("Design systems");
  const [note, setNote] = useState("");
  const unsupported = unsupportedPromises([promise], APPLICANTS[0].skills);
  const invalid = note.trim().length < 24 || unsupported.length > 0;
  return <section className="at-page"><Title room={`PROPOSAL STUDIO / DEPTH 03 / v${state.applicationVersion + 1}`} title="Pair every promise with proof." copy="Unsupported delivery claims are blocked rather than softened by an overall match score." /><form className="at-studio" onSubmit={(event) => { event.preventDefault(); if (!invalid) { dispatch({ type: "submit-revision" }); go("applications"); } }}><section><label>Promised capability<select value={promise} onChange={(event) => setPromise(event.target.value)}><option>Design systems</option><option>TypeScript</option><option>WCAG 2.2</option><option>Clinical trials</option></select></label><label>Revision statement<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe the revised deliverable and evidence relationship." />{note.length < 24 && <small role="alert">Enter at least 24 characters.</small>}</label><label>Fixed terms<input defaultValue="₹5.8L · 14 weeks · 28 hours/week" /></label></section><aside><span>ATTACHED EVIDENCE</span>{unsupported.length ? <div className="at-unsupported"><X /><b>No reviewed artifact</b><p>{promise} cannot be claimed as covered.</p></div> : <Artifact artifact={EVIDENCE_ARTIFACTS.find((item) => item.proves.includes(promise as never)) ?? EVIDENCE_ARTIFACTS[0]} />}<p>Recording v{state.applicationVersion + 1} invalidates selection tied to v{state.applicationVersion}.</p><button disabled={invalid}>Record evidence-linked version <Send /></button></aside></form></section>;
}

function Application({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  const [active, setActive] = useState(0);
  return <section className="at-page"><Title room={`APPLICATION COLLECTION / DEPTH 03 / v${state.applicationVersion}`} title="The evidence room behind the proposal." copy={`${state.applicationStage} · artifacts, explicit gaps, Q&A, and immutable revisions.`} /><div className="at-room-grid"><nav>{EVIDENCE_ARTIFACTS.map((artifact, index) => <button className={active === index ? "is-active" : ""} key={artifact.id} onClick={() => setActive(index)}><span>{artifact.room}</span>{artifact.title}</button>)}</nav><Artifact artifact={EVIDENCE_ARTIFACTS[active]} active /><aside><span>STRUCTURED Q&A</span><blockquote>{QA.question}</blockquote>{state.qaAnswered ? <p>{QA.answer}</p> : <button onClick={() => dispatch({ type: "answer-qa" })}>Record answer</button>}<button onClick={() => go("proposal")}>Create revised collection</button><button onClick={() => go("selection")}>Enter private selection room</button></aside></div></section>;
}

function Review({ go, state }: Pick<Props, "go" | "state">) {
  const [active, setActive] = useState(0); const person = APPLICANTS[active];
  return <section className="at-page"><Title room="APPLICANT COLLECTIONS / DEPTH 01" title="Rotate the collection. Preserve the brief." copy="Reviewed artifacts lead; proposal price is available but cannot alter evidence coverage." /><div className="at-carousel"><button aria-label="Previous applicant" onClick={() => setActive((active + APPLICANTS.length - 1) % APPLICANTS.length)}><ChevronLeft /></button><article><span>COLLECTION 0{active + 1}</span><h2>{person.name}</h2><p>{person.headline}</p><div>{person.skills.map((skill) => <b key={skill}>{skill}</b>)}</div><footer><span>{person.match} evidence</span><span>{person.id === "kavya" ? `v${state.applicationVersion}` : `v${person.version}`}</span><span>{person.proposal}</span></footer><button onClick={() => go("candidate")}>Enter collection <ArrowRight /></button></article><button aria-label="Next applicant" onClick={() => setActive((active + 1) % APPLICANTS.length)}><ChevronRight /></button></div><div className="at-neighbors">{APPLICANTS.map((item, index) => <button key={item.id} className={active === index ? "is-active" : ""} onClick={() => setActive(index)}>{item.initials}<span>{item.match}</span></button>)}</div></section>;
}

function Candidate({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  const [active, setActive] = useState(0);
  return <section className="at-page"><button className="at-back" onClick={() => go("review")}><ChevronLeft /> Collections</button><Title room={`KAVYA COLLECTION / DEPTH 02 / v${state.applicationVersion}`} title="Five rooms. One honest absence." copy={APPLICANTS[0].headline} /><div className="at-candidate-rooms">{EVIDENCE_ARTIFACTS.map((artifact, index) => <Artifact key={artifact.id} artifact={artifact} active={active === index} onClick={() => setActive(index)} />)}</div><footer className="at-actions"><button onClick={() => dispatch({ type: "toggle-shortlist" })}>{state.shortlisted ? "✓ Private shortlist" : "+ Private shortlist"}</button><button onClick={() => dispatch({ type: "toggle-advance" })}>{state.advanced ? "Return to review" : "Advance"}</button><button onClick={() => dispatch({ type: "request-revision" })}>Request revision</button><button onClick={() => go("selection")}>Isolate exact terms <ArrowRight /></button></footer></section>;
}

function Selection({ role, go, state, dispatch }: Pick<Props, "role" | "go" | "state" | "dispatch">) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  return <section className="at-page at-private"><Title room="PRIVATE SELECTION ROOM / DEPTH 04" title="Only the consequential record remains." copy="Exact terms, evidence coverage, disclosed gap, and authority—nothing else competes for attention." /><div className="at-private-record"><header><span>TERNARY HEALTH × KAVYA MENON</span><b>{state.selectionStatus}</b></header><section><div><span>APPLICATION</span><strong>v{state.applicationVersion}</strong></div><div><span>GIG TERMS</span><strong>v3</strong></div><div><span>FIXED PROPOSAL</span><strong>{TERMS.proposal}</strong></div><div><span>DELIVERY</span><strong>14 weeks · 28h/week</strong></div></section><footer><p><Check /> 4 required evidence areas supported</p><p><X /> Direct clinical-trial artifact absent and disclosed</p></footer></div>{state.selectionStatus === "invalidated" && <div className="at-invalid" role="alert"><X /><p><b>This room references an obsolete application.</b>Issue fresh authority for v{state.applicationVersion}.</p></div>}
    {role === "client" && state.selectionStatus !== "pending" && <footer className="at-selection-actions"><label>Response window<select value={deadline} onChange={(event) => setDeadline(event.target.value as "24" | "48" | "72")}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button onClick={() => dispatch({ type: "send-selection", deadline })}>Open exact request <Send /></button></footer>}
    {role === "freelancer" && state.selectionStatus === "pending" && <footer className="at-selection-actions"><p>31 hours remain.</p><button onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Accept exact room <Check /></button></footer>}
    {state.selectionStatus === "accepted" && <footer className="at-selection-actions"><p>Accepted. Engagement archived from exact terms.</p><button onClick={() => go("engagement")}>Enter engagement archive <ArrowRight /></button></footer>}
  </section>;
}

function Engagement({ state, dispatch }: Pick<Props, "state" | "dispatch">) {
  return <section className="at-page"><Title room="ENGAGEMENT ARCHIVE / DEPTH 05" title="The accepted collection becomes durable." copy={`${state.engagementStatus.replaceAll("_", " ")} · application v${state.applicationVersion} · gig terms v3`} /><div className="at-archive"><section><span>IMMUTABLE TERMS</span><h2>{TERMS.proposal}</h2><p>{TERMS.timeline} · 28 hours/week</p>{TERMS.included.map((item) => <div key={item}><Check />{item}</div>)}<button disabled={state.engagementStatus === "completed"} onClick={() => dispatch({ type: "advance-engagement" })}>Advance lifecycle <ArrowRight /></button></section><section><span>ARCHIVE ACTIVITY</span>{state.activity.slice(0, 5).map((item) => <p key={item.id}><time>{item.at}</time><b>{item.title}</b></p>)}</section><aside><span>CONTACT VIEWING ROOM</span>{!state.contactShared || state.contactRevoked ? <><LockKeyhole /><h2>{state.contactRevoked ? "Display closed" : "k•••••@example.com"}</h2><p>Verified contact needs engagement-scoped consent.</p><button onClick={() => dispatch({ type: "share-contact" })}>Grant viewing consent</button></> : <><ShieldCheck /><h2>{state.contactRevealed ? "kavya.menon@example.com" : "k•••••@example.com"}</h2><p>Consent and authorization are recorded.</p><button onClick={() => dispatch({ type: state.contactRevealed ? "revoke-contact" : "reveal-contact" })}>{state.contactRevealed ? "Close future viewing" : "Reveal verified contact"}</button></>}</aside></div></section>;
}
