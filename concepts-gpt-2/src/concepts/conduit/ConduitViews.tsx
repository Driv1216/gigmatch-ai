import { useState } from "react";
import { ArrowRight, Check, Eye, LockKeyhole, Send, ShieldCheck, X } from "lucide-react";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { ConceptViewProps } from "../command-current/Shared";

function Header({ label, title, copy }: { label: string; title: string; copy?: string }) {
  return <header className="co-v-head"><span>{label}</span><h1>{title}</h1>{copy ? <p>{copy}</p> : null}</header>;
}

function Home({ role, state, go }: ConceptViewProps) {
  const client = role === "client";
  const status = state.selectionRequest?.status ?? state.selectionStatus;
  return <section className="co-v co-v-home">
    <Header label="WORKSPACE.OPEN / TH–042" title={client ? "Four applicants. One unresolved authority." : "One exact request is waiting."} copy="Use the visible actions or type the same intent in the command bar." />
    <div className="co-action-list">
      <button onClick={() => go(client ? "review" : "discover")}><span>01</span><div><b>{client ? "compare applicants" : "open market"}</b><small>{client ? "Four normalized evidence records" : "Three evidence-matched opportunities"}</small></div><em>{client ? "4 records" : "3 records"}</em><ArrowRight/></button>
      <button onClick={() => go(client ? "candidate" : "applications")}><span>02</span><div><b>{client ? "open kavya" : "open application"}</b><small>Application v{state.applicationVersion} · {state.applicationStage}</small></div><em>current</em><ArrowRight/></button>
      <button className="is-authority" onClick={() => go("selection")}><span>03</span><div><b>review selection</b><small>{TERMS.proposal} · 31 hours remain</small></div><em>{status === "pending" ? "response requested" : status}</em><ArrowRight/></button>
    </div>
    <section className="co-activity-panel"><div><span className="co-kicker">Recent record activity</span><button onClick={() => go("engagement")}>View engagement</button></div>{state.activity.slice(0, 3).map(item => <article key={item.id}><i /><span><b>{item.title}</b><small>{item.detail}</small></span><time>{item.at}</time></article>)}</section>
  </section>;
}

function Market({ role, selectedRecord, setSelectedRecord, go }: ConceptViewProps) {
  const records = role === "client" ? APPLICANTS : GIGS;
  const active = records[selectedRecord] ?? records[0];
  const applicant = "name" in active;
  return <section className="co-v co-v-market">
    <Header label={applicant ? "Applicant queue" : "Opportunity queue"} title={applicant ? "Compare the evidence" : "Choose the right brief"} copy={`${records.length} records sorted by evidence fit.`} />
    <div className="co-market-layout">
      <div className="co-record-table" aria-label={applicant ? "Applicant records" : "Opportunity records"}>
        <div className="co-table-head"><span>Record</span><span>Fit</span><span>Timing</span></div>
        {records.map((record, index) => <button key={record.id} aria-pressed={selectedRecord === index} onClick={() => setSelectedRecord(index)}><span><b>{"name" in record ? record.name : record.company}</b><small>{"headline" in record ? record.headline : record.title}</small></span><strong>{record.match}%</strong><small>{"availability" in record ? record.availability : record.deadline}</small></button>)}
      </div>
      <article className="co-record-detail">
        <span className="co-kicker">Selected record</span>
        <h2>{applicant ? active.name : active.company}</h2>
        <p>{applicant ? active.headline : active.summary}</p>
        <dl><div><dt>Evidence fit</dt><dd>{active.match}%</dd></div><div><dt>{applicant ? "Proposal" : "Budget"}</dt><dd>{applicant ? active.proposal : active.budget}</dd></div><div><dt>Disclosed gap</dt><dd>{applicant ? active.gap : active.missingSkills[0]}</dd></div></dl>
        <button className="co-primary" onClick={() => go(applicant ? "candidate" : "gig")}>Open complete record <ArrowRight /></button>
      </article>
    </div>
  </section>;
}

function Gig({ go }: ConceptViewProps) {
  const gig = GIGS[0];
  return <section className="co-v co-v-gig">
    <Header label="Gig brief · TH–042" title="Senior frontend systems engineer" copy={gig.summary} />
    <div className="co-gig-grid">
      <section><span className="co-kicker">Required evidence</span>{gig.requiredSkills.map(skill => <p key={skill}><Check />{skill}</p>)}</section>
      <section><span className="co-kicker">Delivery plan</span>{gig.deliverables.map((item, index) => <p key={item}><b>0{index + 1}</b>{item}</p>)}</section>
      <aside><span className="co-kicker">Material terms</span><strong>{gig.budget}</strong><p>{gig.duration}</p><p>{gig.commitment}</p><small>Closes {gig.deadline}</small></aside>
    </div>
    <div className="co-action-row"><button className="co-primary" onClick={() => go("proposal")}>Shape your proposal <ArrowRight /></button></div>
  </section>;
}

function Proposal({ state, dispatch, go }: ConceptViewProps) {
  const [reason, setReason] = useState("");
  const invalid = reason.trim().length < 18;
  return <section className="co-v co-v-proposal">
    <Header label={`Proposal · Application v${state.applicationVersion}`} title="Update the promise" copy="Submitting creates a new immutable version and invalidates any stale confirmation." />
    <form onSubmit={event => { event.preventDefault(); if (!invalid) { dispatch({ type: "submit-revision" }); go("applications"); } }}>
      <section className="co-form-card"><div className="co-form-section"><h2>Commercial terms</h2><div className="co-field-grid"><label>Fixed proposal<input defaultValue="₹5.8L" /></label><label>Capacity per week<input type="number" min="26" max="30" defaultValue="28" /></label><label>Product workshops<input type="number" min="1" defaultValue="4" /></label></div></div><div className="co-form-section"><h2>Reason for revision</h2><label>Describe the changed delivery commitment<textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain what changed and why." />{invalid ? <small role="alert">Use at least 18 characters so the change is attributable.</small> : null}</label></div></section>
      <aside className="co-result-card"><span className="co-kicker">Resulting record</span><strong>Application v{state.applicationVersion + 1}</strong><p><X />Previous pending confirmation will be invalidated.</p><button className="co-primary" disabled={invalid}>Release new version <Send /></button></aside>
    </form>
  </section>;
}

function Application({ role, state, dispatch, go }: ConceptViewProps) {
  return <section className="co-v co-v-application">
    <Header label={`Application AP.001 · v${state.applicationVersion}`} title="Kavya Menon for Ternary" copy="Proposal, evidence, clarification, and authority remain one inspectable record." />
    <div className="co-record-sections">
      <section><div><span className="co-kicker">Proposal</span>{role === "freelancer" ? <button onClick={() => go("proposal")}>Revise</button> : null}</div><strong>{TERMS.proposal}</strong><p>{TERMS.timeline} · {TERMS.availability}</p></section>
      <section><div><span className="co-kicker">Structured clarification</span></div><blockquote>{QA.question}</blockquote>{state.qaAnswered ? <p>{QA.answer}</p> : role === "freelancer" ? <button onClick={() => dispatch({ type: "answer-qa" })}>Record answer</button> : <p>Waiting for Kavya’s response.</p>}</section>
      <section><div><span className="co-kicker">Review state</span></div><strong>{state.applicationStage}</strong><p>Confirmation: {state.selectionRequest?.status ?? state.selectionStatus}</p>{role === "client" ? <button onClick={() => dispatch({ type: "toggle-shortlist" })}>{state.shortlisted ? "Remove from shortlist" : "Add to shortlist"}</button> : null}</section>
    </div>
    <div className="co-action-row"><button className="co-primary" onClick={() => go("selection")}>Continue to confirmation <ArrowRight /></button></div>
  </section>;
}

function Selection({ role, state, dispatch, go }: ConceptViewProps) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const status = state.selectionRequest?.status ?? state.selectionStatus;
  return <section className="co-v co-v-selection">
    <Header label="Exact confirmation" title="Confirm the versions that govern work" copy="The gig, application, proposal, and delivery terms must match before engagement begins." />
    <article className={`co-confirm-card is-${status}`}>
      <header><ShieldCheck /><span><b>{status === "pending" ? "Awaiting response" : status}</b><small>Application v{state.applicationVersion} · Gig terms v{state.gigVersion}</small></span></header>
      <dl><div><dt>Gig</dt><dd>TH–042 · Terms v{state.gigVersion}</dd></div><div><dt>Application</dt><dd>AP.001 · Version {state.applicationVersion}</dd></div><div><dt>Proposal</dt><dd>{TERMS.proposal}</dd></div><div><dt>Delivery</dt><dd>{TERMS.timeline} · 28 hours/week</dd></div></dl>
      {status === "invalidated" || status === "expired" ? <p className="co-warning" role="alert"><X />{status === "expired" ? "This response window has closed." : "A proposal revision invalidated the previous confirmation. Send a fresh request."}</p> : null}
    </article>
    <div className="co-action-row">
      {role === "client" && status !== "pending" && status !== "accepted" ? <><label className="co-deadline">Response window<select value={deadline} onChange={event => setDeadline(event.target.value as typeof deadline)}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button className="co-primary" onClick={() => dispatch({ type: "send-selection", deadline })}>Send fresh confirmation <Send /></button></> : null}
      {role === "freelancer" && status === "pending" ? <button className="co-primary" onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Accept terms and start work <Check /></button> : null}
      {status === "accepted" ? <button className="co-primary" onClick={() => go("engagement")}>Open engagement <ArrowRight /></button> : null}
    </div>
  </section>;
}

function Engagement({ state, dispatch }: ConceptViewProps) {
  const permission = state.contactPermission;
  return <section className="co-v co-v-engagement">
    <Header label="Engagement EN.001" title="Work is connected to the accepted record" copy={`Current status: ${state.engagementStatus.replaceAll("_", " ")}.`} />
    <div className="co-engagement-grid">
      <article><span className="co-kicker">Delivery status</span><strong>{state.engagementStatus.replaceAll("_", " ")}</strong><p>{state.engagement?.proposal ?? TERMS.proposal} · {state.engagement?.duration ?? TERMS.timeline}</p><button className="co-primary" disabled={state.engagementStatus === "completed"} onClick={() => dispatch({ type: "advance-engagement" })}>Advance work state</button></article>
      <section><span className="co-kicker">Recent activity</span>{state.activity.slice(0, 4).map(item => <p key={item.id}><i /><span><b>{item.title}</b><small>{item.at}</small></span></p>)}</section>
      <aside><span className="co-kicker">Contact permission</span>{permission.revealed ? <Eye /> : <LockKeyhole />}<strong>{permission.revealed ? "kavya.menon@example.com" : permission.consentActive && !permission.revoked ? "k•••••@example.com" : "Private"}</strong><p>Contact details are shared only for this engagement.</p>{!permission.consentActive || permission.revoked ? <button onClick={() => dispatch({ type: "share-contact" })}>Record consent</button> : permission.revealed ? <button onClick={() => dispatch({ type: "revoke-contact" })}>Revoke display</button> : <button onClick={() => dispatch({ type: "reveal-contact" })}>Authorize reveal</button>}</aside>
    </div>
  </section>;
}

export function ConduitView(props: ConceptViewProps) {
  if (props.view === "home") return <Home {...props} />;
  if (props.view === "discover" || props.view === "review") return <Market {...props} />;
  if (props.view === "gig") return <Gig {...props} />;
  if (props.view === "proposal") return <Proposal {...props} />;
  if (props.view === "applications" || props.view === "candidate") return <Application {...props} />;
  if (props.view === "selection") return <Selection {...props} />;
  return <Engagement {...props} />;
}
