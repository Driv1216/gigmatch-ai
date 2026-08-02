import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleDot, Command, CornerDownLeft, GitBranch, LockKeyhole, RotateCcw, Search, Send, ShieldCheck, Unplug } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import { contactLineage, resolveVectorCommand, vectorSelectionPath } from "./model";
import "./vector.css";

export function Vector() {
  const location = useLocation();
  const route = useConceptRoute("vector");
  return location.pathname === "/vector" || location.pathname === "/vector/" ? <Landing /> : <VectorApp {...route} />;
}

function Landing() {
  return <main id="main-content" className="vc-public"><header><Link to="/">20 CONCEPTS</Link><b>VECTOR / 18</b><span>COMMAND × TRACE</span></header><section><div><span>INTENT IN. CONSEQUENCE OUT.</span><h1>Know what<br />every action<br /><em>depends on.</em></h1><p>Direct marketplace navigation with inspectable evidence, authority, version, and permission lineage.</p><nav><Link to="/vector/freelancer/home">Open specialist vector <ArrowRight /></Link><Link to="/vector/client/home">Open client vector <ArrowRight /></Link></nav></div><aside><div className="vc-terminal"><Search /><span>review selection</span><CornerDownLeft /></div><div className="vc-path"><p><b>Gig terms v3</b><small>source</small></p><i /><p><b>Application v2</b><small>exact response</small></p><i /><p><b>Selection pending</b><small>authority</small></p><i className="is-waiting" /><p><b>Engagement</b><small>consequence</small></p></div></aside></section></main>;
}

interface Props { role: Role; view: ViewId; go: (view: ViewId) => void; switchRole: (role: Role) => void; state: ReturnType<typeof useConceptRoute>["state"]; dispatch: ReturnType<typeof useConceptRoute>["dispatch"] }

function VectorApp({ role, view, go, switchRole, state, dispatch }: Props) {
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("Ready · try “review selection”");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const field = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  useEffect(() => { const focus = (event: KeyboardEvent) => { if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName ?? "")) { event.preventDefault(); field.current?.focus(); } }; window.addEventListener("keydown", focus); return () => window.removeEventListener("keydown", focus); }, []);
  function run(raw = input) {
    const result = resolveVectorCommand(raw);
    setSuggestions([]);
    if (result.kind === "route") { const targetRole = result.role ?? role; if (targetRole !== role) dispatch({ type: "set-role", role: targetRole }); navigate(`/vector/${targetRole}/${result.view}`); setNotice(`${result.label} · source context retained`); }
    else if (result.kind === "role") { switchRole(result.role); setNotice(`Authority changed to ${result.role}`); }
    else if (result.kind === "reset") { dispatch({ type: "reset" }); setNotice("Scenario restored to reference state"); }
    else { setNotice(`No safe action matches “${raw}”`); setSuggestions(result.suggestions.map((item) => item.aliases[0])); }
    setInput("");
  }
  const nav: { view: ViewId; label: string }[] = [{ view: "home", label: "Context" }, { view: role === "client" ? "review" : "discover", label: role === "client" ? "Compare" : "Market" }, { view: role === "client" ? "candidate" : "applications", label: "Record" }, { view: "selection", label: "Authority" }, { view: "engagement", label: "Outcome" }];
  return <div className="vc-app"><header className="vc-header"><Link to="/vector"><GitBranch />VECTOR <small>18</small></Link><form onSubmit={(event) => { event.preventDefault(); run(); }}><Search /><input ref={field} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type an intent or press /" aria-label="Vector command" /><kbd>/</kbd><button aria-label="Run command"><CornerDownLeft /></button></form><div className="vc-role"><button className={role === "freelancer" ? "is-active" : ""} onClick={() => switchRole("freelancer")}>F</button><button className={role === "client" ? "is-active" : ""} onClick={() => switchRole("client")}>C</button></div></header><aside className="vc-nav"><div><span>ACTIVE RECORD</span><b>TH–042</b><small>application v{state.applicationVersion}</small></div><nav>{nav.map((item) => <button key={item.view} className={view === item.view ? "is-active" : ""} onClick={() => go(item.view)}><CircleDot />{item.label}</button>)}</nav><div className="vc-authority"><span>CURRENT AUTHORITY</span><b>{role === "client" ? "Issue exact terms" : "Acknowledge terms"}</b><small>{state.selectionStatus}</small></div><Link to="/"><ArrowLeft /> Concept index</Link></aside><main id="main-content"><header className="vc-context"><span>ROLE / {role}</span><span>VIEW / {view}</span><span>APPLICATION / v{state.applicationVersion}</span><span>GIG / v3</span></header>
    {view === "home" && <Home role={role} go={go} state={state} />}
    {view === "discover" && <Discover go={go} />}
    {view === "gig" && <Gig go={go} />}
    {view === "proposal" && <Proposal go={go} state={state} dispatch={dispatch} />}
    {view === "applications" && <Application go={go} state={state} dispatch={dispatch} />}
    {view === "review" && <Review go={go} state={state} />}
    {view === "candidate" && <Candidate go={go} state={state} dispatch={dispatch} />}
    {view === "selection" && <Selection role={role} go={go} state={state} dispatch={dispatch} />}
    {view === "engagement" && <Engagement state={state} dispatch={dispatch} />}
  </main><footer className="vc-status"><span><i />{notice}</span><button onClick={() => dispatch({ type: "reset" })}><RotateCcw /> Reset</button><b>LOCAL · NO NETWORK</b></footer>{suggestions.length > 0 && <div className="vc-suggestions" role="status"><span>SAFE SUGGESTIONS</span>{suggestions.map((item) => <button key={item} onClick={() => run(item)}><Command />{item}</button>)}</div>}{state.toast && <div className="vc-toast" role="status">{state.toast}</div>}</div>;
}

function Title({ code, title, copy }: { code: string; title: string; copy: string }) { return <header className="vc-title"><span>{code}</span><h1>{title}</h1><p>{copy}</p></header>; }
function Path({ state }: Pick<Props, "state">) { return <section className="vc-lineage">{vectorSelectionPath(state).map((node, index) => <div key={node.id} className={`is-${node.state}`}><i>{index + 1}</i><p><span>{node.source}</span><b>{node.consequence}</b></p>{index < 3 && <ChevronRight />}</div>)}</section>; }

function Home({ role, go, state }: Pick<Props, "role" | "go" | "state">) {
  return <section className="vc-page"><Title code="ACTIVE CONTEXT / TH–042" title={role === "client" ? "One authority path remains unresolved." : "One consequential action is waiting."} copy="Each action below exposes the source record it uses and the state it will create." /><Path state={state} /><div className="vc-next"><button onClick={() => go(role === "client" ? "review" : "discover")}><span>01 / INSPECT</span><b>{role === "client" ? "Compare four applicant records" : "Open evidence-matched market"}</b><ArrowRight /></button><button onClick={() => go(role === "client" ? "candidate" : "applications")}><span>02 / VERIFY</span><b>Inspect application v{state.applicationVersion}</b><ArrowRight /></button><button className="is-authority" onClick={() => go("selection")}><span>03 / EXERCISE AUTHORITY</span><b>Review exact selection</b><ArrowRight /></button></div></section>;
}

function Discover({ go }: Pick<Props, "go">) {
  const [active, setActive] = useState(0); const gig = GIGS[active];
  return <section className="vc-page"><Title code="MARKET / SOURCE-VERIFIED OPPORTUNITIES" title="Open work with visible evidence logic." copy="Recommendation evidence terminates at disclosed gaps instead of producing false certainty." /><div className="vc-market"><nav>{GIGS.map((item, index) => <button key={item.id} className={active === index ? "is-active" : ""} onClick={() => setActive(index)}><span>0{index + 1}</span><p><b>{item.company}</b><small>{item.title}</small></p><strong>{item.match}</strong></button>)}</nav><article><span>SOURCE / GIG RECORD</span><h2>{gig.title}</h2><p>{gig.summary}</p><div className="vc-traces">{gig.requiredSkills.map((skill) => <p key={skill}><span>Gig terms</span><i /><b>{skill}</b><i /><em>Reviewed evidence</em></p>)}<p className="is-broken"><span>Preferred</span><i /><b>{gig.missingSkills[0]}</b><i /><em>No direct artifact</em></p></div><button onClick={() => go("gig")}>Open source record <ArrowRight /></button></article></div></section>;
}

function Gig({ go }: Pick<Props, "go">) {
  return <section className="vc-page"><button className="vc-back" onClick={() => go("discover")}><ArrowLeft /> Market</button><Title code="SOURCE RECORD / GIG TERMS v3" title={GIGS[0].title} copy={GIGS[0].summary} /><div className="vc-source-grid"><section><span>REQUIREMENT SOURCES</span>{GIGS[0].requiredSkills.map((item, index) => <p key={item}><i>{index + 1}</i><b>{item}</b><small>Material · terms v3</small></p>)}</section><section><span>CONSEQUENCES</span>{GIGS[0].deliverables.map((item, index) => <p key={item}><i>{index + 1}</i><b>{item}</b><small>Proposal must address</small></p>)}</section><aside><span>COMMERCIAL SOURCE</span><strong>{GIGS[0].budget}</strong><p>{GIGS[0].duration} · {GIGS[0].commitment}</p><small>Excluded from recommendation fit.</small></aside></div><button className="vc-primary" onClick={() => go("proposal")}>Compose attributable response <ArrowRight /></button></section>;
}

function Proposal({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  const [note, setNote] = useState(""); const invalid = note.trim().length < 24;
  return <section className="vc-page"><Title code={`ACTION / REVISE APPLICATION v${state.applicationVersion}`} title="Change the source. See the consequence." copy="The new immutable proposal cannot inherit authority granted to the earlier version." /><form className="vc-revise" onSubmit={(event) => { event.preventDefault(); if (!invalid) { dispatch({ type: "submit-revision" }); go("applications"); } }}><section><label>Fixed proposal<input defaultValue="₹5,80,000" /></label><label>Delivery<input defaultValue="14 weeks · 28 hours/week" /></label><label>Revision source<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe what changed and why." />{invalid && <small role="alert">Enter at least 24 characters.</small>}</label></section><aside><span>RESULTING PATH</span><p><b>Application v{state.applicationVersion}</b><em>superseded</em></p><i /><p><b>Application v{state.applicationVersion + 1}</b><em>new source</em></p><i className="is-broken" /><p><b>Selection</b><em>invalidated</em></p><button disabled={invalid}>Execute revision <Send /></button></aside></form></section>;
}

function Application({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  return <section className="vc-page"><Title code={`APPLICATION RECORD / AP.001 / v${state.applicationVersion}`} title="Every version remains attributable." copy={`${state.applicationStage} · the active application is the only valid source for future selection.`} /><Path state={state} /><div className="vc-record"><section><span>PROPOSAL SOURCE</span><strong>{TERMS.proposal}</strong><p>{TERMS.timeline} · {TERMS.availability}</p><button onClick={() => go("proposal")}>Revise source</button></section><section><span>STRUCTURED Q&A</span><blockquote>{QA.question}</blockquote>{state.qaAnswered ? <p>{QA.answer}</p> : <button onClick={() => dispatch({ type: "answer-qa" })}>Record sourced answer</button>}</section><section><span>ACTIVITY SOURCES</span>{state.activity.slice(0, 3).map((item) => <p key={item.id}><b>{item.title}</b><small>{item.at} · {item.actor}</small></p>)}</section></div></section>;
}

function Review({ go, state }: Pick<Props, "go" | "state">) {
  const [active, setActive] = useState(0);
  return <section className="vc-page"><Title code="COMPARE / APPLICANT SOURCES" title="Four records. No inferred claims." copy="Each evidence, availability, proposal, version, and stage value links to its originating record." /><div className="vc-compare"><header><b>APPLICANT</b><b>EVIDENCE SOURCE</b><b>AVAILABILITY</b><b>PROPOSAL</b><b>VERSION</b></header>{APPLICANTS.map((person, index) => <button key={person.id} className={active === index ? "is-active" : ""} onClick={() => setActive(index)} onDoubleClick={() => go("candidate")}><span><strong>{person.match}</strong><b>{person.name}</b></span><span>{person.skills.slice(0, 2).join(" · ")}</span><span>{person.availability}</span><span>{person.proposal}</span><span>v{person.id === "kavya" ? state.applicationVersion : person.version}</span></button>)}</div><footer className="vc-open"><span>Selected source: {APPLICANTS[active].name}</span><button onClick={() => go("candidate")}>Inspect provenance <ArrowRight /></button></footer></section>;
}

function Candidate({ go, state, dispatch }: Pick<Props, "go" | "state" | "dispatch">) {
  const person = APPLICANTS[0];
  return <section className="vc-page"><button className="vc-back" onClick={() => go("review")}><ArrowLeft /> Compare</button><Title code={`APPLICANT SOURCE / KAVYA / v${state.applicationVersion}`} title="Kavya Menon" copy={person.headline} /><div className="vc-candidate"><section><span>REQUIREMENT → EVIDENCE → RESULT</span>{person.skills.map((skill) => <p key={skill}><b>{skill}</b><i /><em>Reviewed artifact</em><i /><strong>covered</strong></p>)}<p className="is-broken"><b>Clinical trials</b><i /><em>No direct artifact</em><i /><strong>gap</strong></p></section><aside><span>COMMERCIAL RECORD</span><strong>{person.proposal}</strong><p>{person.timeline}<br />{person.availability}</p><small>Not connected to evidence score.</small></aside></div><footer className="vc-actions"><button onClick={() => dispatch({ type: "toggle-shortlist" })}>{state.shortlisted ? "✓ Private shortlist" : "+ Private shortlist"}</button><button onClick={() => dispatch({ type: "toggle-advance" })}>{state.advanced ? "Return to review" : "Advance"}</button><button onClick={() => dispatch({ type: "request-revision" })}>Request revision</button><button onClick={() => go("selection")}>Inspect selection path <ArrowRight /></button></footer></section>;
}

function Selection({ role, go, state, dispatch }: Pick<Props, "role" | "go" | "state" | "dispatch">) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  return <section className="vc-page"><Title code={`AUTHORITY / ${role.toUpperCase()}`} title="Every source required. Every consequence explicit." copy="Selection is effective only for the exact gig and application versions shown in this path." /><Path state={state} /><div className="vc-exact"><div><span>Gig source</span><b>TH–042 / terms v3</b></div><div><span>Application source</span><b>AP.001 / v{state.applicationVersion}</b></div><div><span>Commercial</span><b>{TERMS.proposal}</b></div><div><span>Capacity</span><b>14 weeks · 28h/week</b></div></div>{state.selectionStatus === "invalidated" && <div className="vc-broken" role="alert"><Unplug /><p><b>Authority path broken</b>A new application version requires a fresh client request.</p></div>}
    {role === "client" && state.selectionStatus !== "pending" && <footer className="vc-selection-actions"><label>Authority window<select value={deadline} onChange={(event) => setDeadline(event.target.value as "24" | "48" | "72")}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button onClick={() => dispatch({ type: "send-selection", deadline })}>Issue fresh authority <Send /></button></footer>}
    {role === "freelancer" && state.selectionStatus === "pending" && <footer className="vc-selection-actions"><p>31 hours remain · all sources verified.</p><button onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Acknowledge and create engagement <Check /></button></footer>}
    {state.selectionStatus === "accepted" && <footer className="vc-selection-actions"><p>Engagement created from exact sources.</p><button onClick={() => go("engagement")}>Inspect consequence <ArrowRight /></button></footer>}
  </section>;
}

function Engagement({ state, dispatch }: Pick<Props, "state" | "dispatch">) {
  const lineage = contactLineage(state);
  return <section className="vc-page"><Title code="CONSEQUENCE / ENGAGEMENT EN.001" title="Terms and permission retain their lineage." copy={`${state.engagementStatus.replaceAll("_", " ")} · accepted application v${state.applicationVersion} · gig terms v3`} /><div className="vc-engagement"><section><span>IMMUTABLE TERM PATH</span><Path state={state} /><div><strong>{TERMS.proposal}</strong><p>{TERMS.timeline} · 28 hours/week</p></div><button disabled={state.engagementStatus === "completed"} onClick={() => dispatch({ type: "advance-engagement" })}>Advance lifecycle <ArrowRight /></button></section><aside><span>CONTACT PERMISSION LINEAGE</span><div className="vc-permission">{lineage.map((item, index) => <p key={item.label} className={item.complete ? "is-complete" : ""}><i>{item.complete ? <Check /> : index + 1}</i><b>{item.label}</b></p>)}</div>{!state.contactShared || state.contactRevoked ? <><LockKeyhole /><strong>{state.contactRevoked ? "Display revoked" : "k•••••@example.com"}</strong><button onClick={() => dispatch({ type: "share-contact" })}>Record consent</button></> : <><ShieldCheck /><strong>{state.contactRevealed ? "kavya.menon@example.com" : "k•••••@example.com"}</strong><button onClick={() => dispatch({ type: state.contactRevealed ? "revoke-contact" : "reveal-contact" })}>{state.contactRevealed ? "Record revocation" : "Authorize reveal"}</button></>}</aside></div></section>;
}
