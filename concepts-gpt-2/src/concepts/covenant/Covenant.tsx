import {
  ArrowLeft, ArrowRight, Bookmark, Check, FileClock, FilePenLine,
  Fingerprint, LockKeyhole, Menu, RotateCcw, Scale, Send, ShieldCheck, X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import "./covenant.css";

export function Covenant() {
  const location = useLocation();
  const route = useConceptRoute("covenant");
  if (location.pathname === "/covenant" || location.pathname === "/covenant/") return <CovenantLanding />;
  return <CovenantCasebook {...route} />;
}

function CovenantLanding() {
  return (
    <main id="main-content" className="cv-public">
      <nav><Link to="/" className="cv-seal">C</Link><b>Covenant</b><span>GigMatch AI · Record-led marketplace</span><Link to="/covenant/client/home">Open the casebook <ArrowRight size={15} /></Link></nav>
      <section className="cv-public-hero">
        <p>For independent specialists and exacting teams</p>
        <h1>Good work begins<br />with a clear record.</h1>
        <div className="cv-public-intro"><p>Covenant turns a marketplace decision into a legible case: the brief, evidence, questions, revisions, exact terms, and the record both parties carry forward.</p><div><Link to="/covenant/freelancer/home">I’m a specialist</Link><Link to="/covenant/client/home">I’m hiring</Link></div></div>
      </section>
      <section className="cv-public-record">
        <header><span>CASE № TH–042</span><span>PRIVATE REVIEW</span><span>27 JUL 2026</span></header>
        <div><small>MATTER</small><h2>Senior Frontend Systems Engineer</h2><p>Ternary Health · Clinical trial operations</p></div>
        <dl><div><dt>Current proposal</dt><dd>₹5.8L fixed</dd></div><div><dt>Record version</dt><dd>Application v2</dd></div><div><dt>Review state</dt><dd>Selection pending</dd></div></dl>
        <footer><Fingerprint size={20} /><p>Every formal decision points to the exact record that was reviewed.</p><span className="cv-stamp">TERMS<br />PRESERVED</span></footer>
      </section>
      <section className="cv-public-values"><div><b>Evidence is attributable.</b><p>Suitability includes strengths and gaps—not a black-box verdict.</p></div><div><b>Revisions remain visible.</b><p>A new proposal never erases the terms that came before it.</p></div><div><b>Consent is specific.</b><p>Private contact details belong to one confirmed engagement.</p></div></section>
    </main>
  );
}

interface CasebookProps {
  role: Role;
  view: ViewId;
  go: (view: ViewId) => void;
  switchRole: (role: Role) => void;
  state: ReturnType<typeof useConceptRoute>["state"];
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
}

function CovenantCasebook({ role, view, go, switchRole, state, dispatch }: CasebookProps) {
  const [drawer, setDrawer] = useState(false);
  const sections = role === "client"
    ? [["home", "Case index"], ["review", "Applicant register"], ["candidate", "Kavya Menon"], ["selection", "Selection instrument"], ["engagement", "Engagement record"]]
    : [["home", "Case index"], ["discover", "Open matters"], ["gig", "Ternary brief"], ["proposal", "Proposal record"], ["applications", "My application"], ["selection", "Selection instrument"], ["engagement", "Engagement record"]];
  return (
    <div className="cv-app">
      <header className="cv-header">
        <button className="cv-menu" onClick={() => setDrawer(true)} aria-label="Open case index" aria-expanded={drawer}><Menu size={18} /></button>
        <Link to="/covenant" className="cv-seal">C</Link>
        <div><b>Covenant</b><span>Private marketplace casebook</span></div>
        <p>CASE TH–042 · TERMS v3</p>
        <div className="cv-role"><button className={role === "freelancer" ? "is-active" : ""} onClick={() => switchRole("freelancer")}>Specialist</button><button className={role === "client" ? "is-active" : ""} onClick={() => switchRole("client")}>Client</button></div>
      </header>
      <aside className={`cv-index ${drawer ? "is-open" : ""}`}>
        <header><small>CONTENTS</small><button onClick={() => setDrawer(false)} aria-label="Close case index"><X size={17} /></button></header>
        <nav aria-label="Casebook sections">{sections.map(([id, label], index) => <button key={id} className={view === id ? "is-active" : ""} onClick={() => { go(id as ViewId); setDrawer(false); }}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button>)}</nav>
        <footer><button onClick={() => dispatch({ type: "reset" })}><RotateCcw size={14} /> Restore reference case</button><Link to="/"><ArrowLeft size={14} /> All concepts</Link></footer>
      </aside>
      <main id="main-content" className="cv-paper">
        {view === "home" && <CovenantHome role={role} go={go} state={state} />}
        {view === "discover" && <CovenantDiscover go={go} />}
        {view === "gig" && <CovenantGig go={go} />}
        {view === "proposal" && <CovenantProposal go={go} state={state} dispatch={dispatch} />}
        {view === "applications" && <CovenantApplication go={go} state={state} dispatch={dispatch} />}
        {view === "review" && <CovenantReview go={go} state={state} />}
        {view === "candidate" && <CovenantCandidate go={go} state={state} dispatch={dispatch} />}
        {view === "selection" && <CovenantSelection role={role} go={go} state={state} dispatch={dispatch} />}
        {view === "engagement" && <CovenantEngagement state={state} dispatch={dispatch} />}
      </main>
      {drawer && <button className="cv-backdrop" aria-label="Close case index" onClick={() => setDrawer(false)} />}
      {state.toast && <div className="cv-toast" role="status">{state.toast}<Check size={14} /></div>}
    </div>
  );
}

function RecordHead({ code, title, subtitle, status }: { code: string; title: string; subtitle: string; status?: string }) {
  return <header className="cv-recordhead"><div><p>{code}</p><h1>{title}</h1><span>{subtitle}</span></div>{status && <strong>{status}</strong>}</header>;
}

function CovenantHome({ role, go, state }: Pick<CasebookProps, "role" | "go" | "state">) {
  const client = role === "client";
  return (
    <>
      <RecordHead code="CASEBOOK · 28 JUL 2026" title={client ? "Hiring matters" : "Your active matters"} subtitle={client ? "Ternary Health · authorized client record" : "Kavya Menon · verified specialist record"} />
      <section className="cv-docket">
        <header><span>REQUIRES ATTENTION</span><span>RESPONSE WINDOW · 31 HOURS</span></header>
        <div><span className="cv-case-number">TH<br />042</span><div><small>SELECTION INSTRUMENT</small><h2>{client ? "Kavya Menon" : "Ternary Health"}</h2><p>Senior Frontend Systems Engineer for Clinical Trial Operations</p></div><dl><dt>Bound record</dt><dd>Application v{state.applicationVersion}</dd><dt>Consideration</dt><dd>{TERMS.proposal}</dd></dl><button onClick={() => go("selection")}>Examine instrument <ArrowRight size={15} /></button></div>
      </section>
      <div className="cv-case-grid">
        <section><header><span>ACTIVE RECORD</span><Bookmark size={16} /></header><h2>{client ? "Applicant review" : "Application record"}</h2><p>The current record contains evidence, Q&A, two proposal versions, and one pending exact-term request.</p><dl><div><dt>Stage</dt><dd>{state.applicationStage}</dd></div><div><dt>Proposal</dt><dd>{TERMS.proposal}</dd></div><div><dt>Last filing</dt><dd>27 Jul · 16:42</dd></div></dl><button onClick={() => go(client ? "candidate" : "applications")}>Open complete record</button></section>
        <section className="cv-note"><small>CASEBOOK PRINCIPLE</small><blockquote>“A marketplace decision should remain understandable after the moment has passed.”</blockquote><p>Every material term, revision, and participant-visible decision stays attached to its author and version.</p></section>
      </div>
    </>
  );
}

function CovenantDiscover({ go }: Pick<CasebookProps, "go">) {
  return (
    <>
      <RecordHead code="OPEN MATTERS · SPECIALIST INDEX" title="Work worth examining" subtitle="Three briefs aligned with the reviewed Kavya Menon profile" />
      <section className="cv-matter-list">{GIGS.map((gig, index) => <button key={gig.id} onClick={() => go("gig")}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{gig.company} · {gig.category}</small><h2>{gig.title}</h2><p>{gig.summary}</p></div><dl><dt>Evidence fit</dt><dd>{gig.match} · {gig.matchLabel}</dd><dt>Terms</dt><dd>{gig.budget}</dd><dt>Closes</dt><dd>{gig.deadline}</dd></dl><ArrowRight size={18} /></button>)}</section>
    </>
  );
}

function CovenantGig({ go }: Pick<CasebookProps, "go">) {
  const gig = GIGS[0];
  return (
    <>
      <RecordHead code="BRIEF TH–042 · MATERIAL TERMS v3" title={gig.title} subtitle={`${gig.company} · ${gig.workMode} · ${gig.location}`} status="OPEN" />
      <section className="cv-document">
        <aside><span>BRIEF</span><p>Published 24 Jul 2026<br />Closes {gig.deadline}<br />14 active applications</p><hr /><p>This brief is material terms version 3. Any later change requires applicant response.</p></aside>
        <article><p className="cv-lead">{gig.summary}</p><h2>Mandate</h2><ol>{gig.deliverables.map((item) => <li key={item}>{item}</li>)}</ol><h2>Required evidence</h2><div className="cv-skill-lines">{gig.requiredSkills.map((skill) => <span key={skill}>{skill}</span>)}</div><h2>Commercial framework</h2><dl className="cv-two-col"><div><dt>Budget guidance</dt><dd>{gig.budget}</dd></div><div><dt>Duration</dt><dd>{gig.duration}</dd></div><div><dt>Commitment</dt><dd>{gig.commitment}</dd></div><div><dt>Work mode</dt><dd>{gig.workMode}</dd></div></dl></article>
        <aside className="cv-margin-note"><small>EVIDENCE NOTE</small><strong>92</strong><b>Strong evidence fit</b><p>{gig.matchReason}</p><span>Gap disclosed:<br />{gig.missingSkills[0]}</span></aside>
      </section>
      <footer className="cv-document-action"><p><ShieldCheck size={15} /> Price is not used to calculate evidence fit.</p><button onClick={() => go("proposal")}>Prepare proposal record <ArrowRight size={15} /></button></footer>
    </>
  );
}

function CovenantProposal({ go, state, dispatch }: Pick<CasebookProps, "go" | "state" | "dispatch">) {
  const [workshops, setWorkshops] = useState("4");
  const invalid = !workshops || Number(workshops) < 1;
  return (
    <>
      <RecordHead code={`DRAFT FILING · APPLICATION v${state.applicationVersion}`} title="Proposal record" subtitle="Prepared by Kavya Menon · answers Ternary Health brief v3" />
      <form className="cv-proposal" onSubmit={(event) => { event.preventDefault(); if (!invalid) { dispatch({ type: "submit-revision" }); go("applications"); } }}>
        <div className="cv-proposal-title"><span>PROPOSED CONSIDERATION</span><label>₹ <input defaultValue="5,80,000" aria-label="Fixed proposal amount" /> <small>INR · fixed</small></label></div>
        <section><h2>I. Period and availability</h2><div className="cv-two-col"><label>Commencement<input type="date" defaultValue="2026-08-10" /></label><label>Delivery period<input defaultValue="14 weeks" /></label><label>Weekly capacity<input defaultValue="28 hours" /></label><label>Product-team workshops<input value={workshops} onChange={(event) => setWorkshops(event.target.value)} aria-invalid={invalid} /></label></div>{invalid && <p className="cv-error" role="alert">At least one workshop must be stated.</p>}</section>
        <section><h2>II. Included work</h2>{TERMS.included.map((item, index) => <label className="cv-line-input" key={item}><span>{index + 1}.</span><input defaultValue={item} /></label>)}</section>
        <section><h2>III. Exclusions and assumptions</h2><textarea defaultValue={`${TERMS.excluded.join("\n")}\n\nAssumptions:\n${TERMS.assumptions.join("\n")}`} /></section>
        <footer><p><LockKeyhole size={16} /> Filing creates an immutable version. A pending selection tied to the prior version will be invalidated.</p><button disabled={invalid}>File proposal version <FilePenLine size={16} /></button></footer>
      </form>
    </>
  );
}

function CovenantApplication({ go, state, dispatch }: Pick<CasebookProps, "go" | "state" | "dispatch">) {
  return (
    <>
      <RecordHead code={`APPLICATION TH–042–KM · VERSION ${state.applicationVersion}`} title="Kavya Menon × Ternary Health" subtitle="Participant-visible record · answered brief v3" status={state.applicationStage.toUpperCase()} />
      <nav className="cv-tabs"><a href="#terms">Terms</a><a href="#evidence">Evidence</a><a href="#qa">Q&A</a><a href="#history">History</a></nav>
      <section id="terms" className="cv-record-section"><header><span>01</span><div><small>OFFICIAL PROPOSAL</small><h2>{TERMS.proposal}</h2></div><button onClick={() => go("proposal")}>File new version</button></header><div className="cv-two-col"><dl><dt>Timeline</dt><dd>{TERMS.timeline}</dd></dl><dl><dt>Availability</dt><dd>{TERMS.availability}</dd></dl><dl><dt>Included workshops</dt><dd>Four</dd></dl><dl><dt>Answered brief</dt><dd>v3</dd></dl></div>{state.selectionStatus === "pending" && <div className="cv-instrument-callout"><Scale size={19} /><div><b>Selection instrument awaits your response.</b><p>It cites this exact application version and expires in 31 hours.</p></div><button onClick={() => go("selection")}>Examine</button></div>}</section>
      <section id="qa" className="cv-record-section"><header><span>02</span><div><small>STRUCTURED CLARIFICATION</small><h2>Questions and answers</h2></div></header><blockquote><small>TERNARY HEALTH · 26 JUL</small>{QA.question}</blockquote>{state.qaAnswered ? <blockquote className="is-response"><small>KAVYA MENON · IMMUTABLE RESPONSE</small>{QA.answer}</blockquote> : <button onClick={() => dispatch({ type: "answer-qa" })}>File response</button>}</section>
      <section id="history" className="cv-record-section"><header><span>03</span><div><small>FILING HISTORY</small><h2>Versions and decisions</h2></div></header><div className="cv-redline"><div><span>v1 · superseded</span><del>{TERMS.previousProposal} · two workshops</del></div><div><span>v2 · current</span><ins>{TERMS.proposal} · four workshops</ins></div></div>{state.activity.slice(0, 5).map((item) => <div className="cv-history-row" key={item.id}><span>{item.at}</span><div><b>{item.title}</b><p>{item.detail}</p></div></div>)}</section>
    </>
  );
}

function CovenantReview({ go, state }: Pick<CasebookProps, "go" | "state">) {
  const [filter, setFilter] = useState("Best evidence");
  return (
    <>
      <RecordHead code="CLIENT REGISTER · BRIEF TH–042" title="Applicant register" subtitle="14 active applications · commercial terms excluded from evidence fit" />
      <div className="cv-register-filter"><span>ORDER OF REVIEW</span>{["Best evidence", "Newest", "Shortlist", "Advanced"].map((item) => <button className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
      <section className="cv-register"><header><span>APPLICANT</span><span>EVIDENCE</span><span>COMMERCIAL</span><span>RECORD</span><span>REVIEW STATE</span></header>{APPLICANTS.map((person, index) => <button key={person.id} onClick={() => go("candidate")}><span><i>{String(index + 1).padStart(2, "0")}</i><b>{person.name}</b><small>{person.headline}</small></span><span><strong>{person.match}</strong><small>{person.gap}</small></span><span><b>{person.proposal}</b><small>{person.timeline}</small></span><span><b>Application v{person.id === "kavya" ? state.applicationVersion : person.version}</b><small>{person.availability}</small></span><span><em>{person.id === "kavya" ? state.applicationStage : person.stage}</em>{person.id === "kavya" && state.shortlisted && <small>Private shortlist</small>}</span></button>)}</section>
    </>
  );
}

function CovenantCandidate({ go, state, dispatch }: Pick<CasebookProps, "go" | "state" | "dispatch">) {
  const person = APPLICANTS[0];
  return (
    <>
      <RecordHead code={`CANDIDATE RECORD · APPLICATION v${state.applicationVersion}`} title={person.name} subtitle={`${person.headline} · ${person.location}`} status={state.applicationStage.toUpperCase()} />
      <div className="cv-candidate-actions"><button className={state.shortlisted ? "is-active" : ""} onClick={() => dispatch({ type: "toggle-shortlist" })}><Bookmark size={15} />{state.shortlisted ? "On private shortlist" : "Add to private shortlist"}</button><button onClick={() => dispatch({ type: "toggle-advance" })}>{state.advanced ? "Return to review" : "Advance applicant"}</button></div>
      <section className="cv-document cv-document--candidate"><aside><span>EVIDENCE</span><strong className="cv-score">{person.match}</strong><b>Strong fit</b><p>Evidence and gaps are independent of proposal price.</p></aside><article><h2>Reviewed suitability</h2><p className="cv-lead">Kavya demonstrates direct ownership of multi-product design systems and accessible React migrations.</p><div className="cv-skill-lines">{person.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><h3>Disclosed gap</h3><p>{person.gap}</p><h2>Proposal statement</h2><blockquote>{person.note}</blockquote><dl className="cv-two-col"><div><dt>Proposal</dt><dd>{person.proposal}</dd></div><div><dt>Timeline</dt><dd>{person.timeline}</dd></div><div><dt>Availability</dt><dd>{person.availability}</dd></div><div><dt>Record</dt><dd>Application v{state.applicationVersion}</dd></div></dl></article><aside className="cv-margin-note"><small>CLIENT NOTE</small><p>Shortlist state is never visible to Kavya.</p><hr /><button onClick={() => dispatch({ type: "request-revision" })}>Request revision</button></aside></section>
      <footer className="cv-document-action"><p>{state.selectionStatus === "invalidated" ? "Prior selection invalidated by a newer proposal." : "One active selection is permitted for this gig."}</p><button onClick={() => go("selection")}>{state.selectionStatus === "pending" ? "Open instrument" : "Prepare selection instrument"} <ArrowRight size={15} /></button></footer>
    </>
  );
}

function CovenantSelection({ role, go, state, dispatch }: Pick<CasebookProps, "role" | "go" | "state" | "dispatch">) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const client = role === "client";
  return (
    <>
      <RecordHead code="SELECTION INSTRUMENT · CASE TH–042" title="Exact terms for confirmation" subtitle="This instrument is not a legal contract or payment guarantee" status={state.selectionStatus.toUpperCase()} />
      <section className="cv-instrument">
        <header><div><small>BETWEEN</small><h2>Ternary Health</h2><p>the Client</p></div><span>×</span><div><small>AND</small><h2>Kavya Menon</h2><p>the Specialist</p></div></header>
        <p className="cv-recital">The Client proposes to confirm the engagement described below, bound exclusively to application version <b>{state.applicationVersion}</b> and material gig terms version <b>3</b>.</p>
        <ol><li><span>1.</span><div><b>Consideration</b><p>{TERMS.proposal}</p></div></li><li><span>2.</span><div><b>Period and availability</b><p>{TERMS.timeline} · {TERMS.availability}</p></div></li><li><span>3.</span><div><b>Included work</b>{TERMS.included.map((item) => <p key={item}>— {item}</p>)}</div></li><li><span>4.</span><div><b>Exclusions</b>{TERMS.excluded.map((item) => <p key={item}>— {item}</p>)}</div></li></ol>
        {client && state.selectionStatus !== "pending" && <footer><label>Instrument remains open for<select value={deadline} onChange={(event) => setDeadline(event.target.value as "24" | "48" | "72")}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button onClick={() => dispatch({ type: "send-selection", deadline })}>Issue exact instrument <Send size={15} /></button></footer>}
        {!client && state.selectionStatus === "pending" && <footer><p><FileClock size={16} /> 31 hours remain. A revision requires a new instrument.</p><button onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Accept exact record <Fingerprint size={15} /></button></footer>}
        {state.selectionStatus === "accepted" && <footer><p><Check size={16} /> Accepted and recorded.</p><button onClick={() => go("engagement")}>Open engagement record</button></footer>}
      </section>
    </>
  );
}

function CovenantEngagement({ state, dispatch }: Pick<CasebookProps, "state" | "dispatch">) {
  return (
    <>
      <RecordHead code="ENGAGEMENT RECORD · GM–TH–2048" title="Confirmed terms and activity" subtitle={`Ternary Health × Kavya Menon · application v${state.applicationVersion}`} status={state.engagementStatus.replace("_", " ").toUpperCase()} />
      <section className="cv-engagement-cover"><Fingerprint size={32} /><p>CONFIRMED RECORD</p><h2>Clinical Trial Operations</h2><span>{TERMS.proposal} · {TERMS.timeline} · gig terms v3</span></section>
      <div className="cv-case-grid">
        <section><header><span>ACCEPTED TERMS</span><LockKeyhole size={16} /></header><dl><div><dt>Proposal</dt><dd>{TERMS.proposal}</dd></div><div><dt>Commencement</dt><dd>10 Aug 2026</dd></div><div><dt>Capacity</dt><dd>28 hours/week</dd></div><div><dt>Proposal record</dt><dd>v{state.applicationVersion}</dd></div></dl><button onClick={() => dispatch({ type: "advance-engagement" })} disabled={state.engagementStatus === "completed"}>Record next lifecycle state</button></section>
        <section><header><span>CONTACT PERMISSION</span><ShieldCheck size={16} /></header>{!state.contactShared || state.contactRevoked ? <><h2>{state.contactRevoked ? "Permission revoked" : "No details shared"}</h2><p>Sharing applies only to this confirmed engagement.</p><button onClick={() => dispatch({ type: "share-contact" })}>Share verified email</button></> : <><small>VERIFIED EMAIL</small><h2>{state.contactRevealed ? "kavya.menon@example.com" : "k•••••@example.com"}</h2><p>Reveal is authorized and added to the engagement record.</p><button onClick={() => dispatch({ type: state.contactRevealed ? "revoke-contact" : "reveal-contact" })}>{state.contactRevealed ? "Revoke future display" : "Authorize reveal"}</button></>}</section>
      </div>
      <section className="cv-record-section"><header><span>ACTIVITY</span><div><small>APPEND-ONLY HISTORY</small><h2>Participant record</h2></div></header>{state.activity.slice(0, 7).map((item) => <div className="cv-history-row" key={item.id}><span>{item.at}</span><div><b>{item.title}</b><p>{item.detail}</p></div></div>)}</section>
    </>
  );
}
