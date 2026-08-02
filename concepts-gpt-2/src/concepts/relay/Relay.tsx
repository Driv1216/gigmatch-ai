import {
  Activity, ArrowLeft, ArrowRight, Check, ChevronRight, CircleDot, Fingerprint,
  KeyRound, LockKeyhole, Radio, RotateCcw, Send, ShieldAlert, ShieldCheck, Terminal,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import "./relay.css";

export function Relay() {
  const location = useLocation();
  const route = useConceptRoute("relay");
  if (location.pathname === "/relay" || location.pathname === "/relay/") return <RelayLanding />;
  return <RelayProtocol {...route} />;
}

function RelayLanding() {
  return (
    <main id="main-content" className="rl-public">
      <nav><Link to="/" className="rl-node"><Radio size={19} /></Link><b>RELAY</b><span>Secure marketplace protocol</span><Link to="/relay/client/home">Open live record <ArrowRight size={15} /></Link></nav>
      <section className="rl-public-hero">
        <div><p>GIGMATCH AI · DIRECTION 04</p><h1>EVERY<br />DECISION<br /><em>CONNECTS.</em></h1><p>Relay shows the complete chain—from reviewed evidence to proposal revision, exact selection, engagement, and consent-based contact.</p></div>
        <aside>
          <header><span>LIVE PROTOCOL</span><i /><b>TH–042</b></header>
          <div className="rl-mini-event"><i>01</i><div><small>PROPOSAL.UPDATE</small><b>Application v2 recorded</b><p>Selection v1 invalidated automatically.</p></div><span>14:08</span></div>
          <div className="rl-mini-event"><i>02</i><div><small>SELECTION.ISSUE</small><b>Fresh exact terms sent</b><p>Bound to application v2 · gig v3.</p></div><span>16:42</span></div>
          <div className="rl-mini-event is-live"><i><CircleDot size={13} /></i><div><small>ACTION.REQUIRED</small><b>Freelancer response</b><p>31 hours remaining.</p></div><span>NOW</span></div>
          <footer><ShieldCheck size={16} /> Authority, version, and consequence stay visible.</footer>
        </aside>
      </section>
      <section className="rl-public-links"><Link to="/relay/freelancer/home"><span>FREELANCER CHANNEL</span><b>Read the opportunity. Control the proposal.</b><ArrowRight /></Link><Link to="/relay/client/home"><span>CLIENT CHANNEL</span><b>Review evidence. Issue exact terms.</b><ArrowRight /></Link></section>
    </main>
  );
}

interface ProtocolProps {
  role: Role;
  view: ViewId;
  go: (view: ViewId) => void;
  switchRole: (role: Role) => void;
  state: ReturnType<typeof useConceptRoute>["state"];
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
}

function RelayProtocol({ role, view, go, switchRole, state, dispatch }: ProtocolProps) {
  const routes: { id: ViewId; label: string; code: string }[] = role === "client"
    ? [{ id: "home", label: "Signal", code: "00" }, { id: "review", label: "Applicants", code: "10" }, { id: "candidate", label: "Record", code: "20" }, { id: "selection", label: "Selection", code: "30" }, { id: "engagement", label: "Engagement", code: "40" }]
    : [{ id: "home", label: "Signal", code: "00" }, { id: "discover", label: "Opportunity", code: "10" }, { id: "gig", label: "Brief", code: "12" }, { id: "proposal", label: "Proposal", code: "20" }, { id: "applications", label: "Record", code: "24" }, { id: "selection", label: "Selection", code: "30" }, { id: "engagement", label: "Engagement", code: "40" }];
  return (
    <div className="rl-app">
      <header className="rl-header">
        <Link to="/relay" className="rl-node"><Radio size={18} /></Link><b>RELAY</b><span className="rl-live"><i /> LIVE MOCK PROTOCOL</span>
        <div className="rl-role"><button className={role === "freelancer" ? "is-active" : ""} onClick={() => switchRole("freelancer")}>FREELANCER</button><button className={role === "client" ? "is-active" : ""} onClick={() => switchRole("client")}>CLIENT</button></div>
        <button onClick={() => dispatch({ type: "reset" })}><RotateCcw size={14} /> RESET</button><Link to="/"><ArrowLeft size={14} /> INDEX</Link>
      </header>
      <aside className="rl-resources">
        <p>RESOURCE PATH</p><nav>{routes.map((route) => <button key={route.id} className={view === route.id ? "is-active" : ""} onClick={() => go(route.id)}><span>{route.code}</span><b>{route.label}</b><ChevronRight size={13} /></button>)}</nav>
        <div className="rl-integrity"><Fingerprint size={18} /><span>RECORD INTEGRITY</span><b>APPLICATION v{state.applicationVersion}</b><small>GIG TERMS v3</small></div>
      </aside>
      <main id="main-content" className="rl-main">
        {view === "home" && <RelayHome role={role} go={go} state={state} />}
        {view === "discover" && <RelayDiscover go={go} />}
        {view === "gig" && <RelayGig go={go} />}
        {view === "proposal" && <RelayProposal go={go} state={state} dispatch={dispatch} />}
        {view === "applications" && <RelayApplication go={go} state={state} dispatch={dispatch} />}
        {view === "review" && <RelayReview go={go} state={state} />}
        {view === "candidate" && <RelayCandidate go={go} state={state} dispatch={dispatch} />}
        {view === "selection" && <RelaySelection role={role} go={go} state={state} dispatch={dispatch} />}
        {view === "engagement" && <RelayEngagement state={state} dispatch={dispatch} />}
      </main>
      <aside className="rl-state">
        <p>CURRENT AUTHORITY</p><span className="rl-authority">{role.toUpperCase()}</span>
        <dl><div><dt>APPLICATION</dt><dd>{state.applicationStage}</dd></div><div><dt>VERSION</dt><dd>{state.applicationVersion}</dd></div><div><dt>SELECTION</dt><dd>{state.selectionStatus}</dd></div><div><dt>ENGAGEMENT</dt><dd>{state.engagementStatus.replace("_"," ")}</dd></div></dl>
        <p>RECENT EVENTS</p><div className="rl-side-events">{state.activity.slice(0,4).map((item) => <div key={item.id}><i className={`is-${item.actor}`} /><span>{item.at}</span><b>{item.title}</b></div>)}</div>
      </aside>
      {state.toast && <div className="rl-toast" role="status"><Terminal size={14} /><span>{state.toast}</span><Check size={14} /></div>}
    </div>
  );
}

function ProtocolHead({ code, title, detail }: { code: string; title: string; detail: string }) {
  return <header className="rl-title"><span>{code}</span><div><p>TERNARY HEALTH / TH–042</p><h1>{title}</h1><small>{detail}</small></div></header>;
}

function RelayHome({ role, go, state }: Pick<ProtocolProps, "role" | "go" | "state">) {
  const client = role === "client";
  return (
    <>
      <ProtocolHead code="00" title="Signal queue" detail={client ? "One unresolved client authority action" : "One exact-term response requires your authority"} />
      <section className="rl-action">
        <header><span>ACTION.REQUIRED</span><i>31:18:44</i></header><div><ShieldAlert size={25} /><div><small>{client ? "SELECTION.ACTIVE" : "SELECTION.RESPONSE"}</small><h2>{client ? "Kavya Menon / application v2" : "Ternary Health / exact proposal v2"}</h2><p>{TERMS.proposal} · {TERMS.timeline} · gig terms v3</p></div><button onClick={() => go("selection")}>RESOLVE ACTION <ArrowRight size={16} /></button></div>
      </section>
      <section className="rl-flow">
        <header><span>CONNECTED RECORD</span><span>5 EVENTS SHOWN</span></header>
        {state.activity.slice(0,5).map((item, index) => <div className="rl-event" key={item.id}><span>{String(index + 1).padStart(2,"0")}</span><i className={`is-${item.actor}`} /><div><small>{item.actor.toUpperCase()}.EVENT · {item.at}</small><h3>{item.title}</h3><p>{item.detail}</p></div>{index === 0 && <em>LATEST</em>}</div>)}
      </section>
    </>
  );
}

function RelayDiscover({ go }: Pick<ProtocolProps, "go">) {
  return (
    <>
      <ProtocolHead code="10" title="Opportunity signal" detail="Open briefs evaluated against reviewed profile evidence" />
      <section className="rl-signal-list">{GIGS.map((gig, index) => <button key={gig.id} onClick={() => go("gig")}><span>OPEN.{String(index + 1).padStart(2,"0")}</span><div><small>{gig.company} / {gig.paymentType}</small><h2>{gig.title}</h2><p>{gig.summary}</p></div><strong>{gig.match}<small>EVIDENCE</small></strong><dl><dt>TERMS</dt><dd>{gig.budget}</dd><dt>DEADLINE</dt><dd>{gig.deadline}</dd></dl><ArrowRight /></button>)}</section>
    </>
  );
}

function RelayGig({ go }: Pick<ProtocolProps, "go">) {
  const gig = GIGS[0];
  return (
    <>
      <ProtocolHead code="12" title="Material brief v3" detail="Open authority: Ternary Health · applicant response required after material edits" />
      <section className="rl-packet">
        <header><span>BRIEF.PAYLOAD</span><b>{gig.title}</b><small>{gig.company} · {gig.workMode} · {gig.location}</small></header>
        <div className="rl-packet-grid"><article><h2>OUTCOME</h2><p>{gig.summary}</p><h2>DELIVERABLES</h2>{gig.deliverables.map((item,index) => <div className="rl-payload-row" key={item}><span>0{index+1}</span>{item}</div>)}<h2>REQUIRED CAPABILITIES</h2><div className="rl-token-row">{gig.requiredSkills.map((skill)=><span key={skill}>{skill}</span>)}</div></article><aside><strong>{gig.match}</strong><b>{gig.matchLabel}</b><p>{gig.matchReason}</p><hr /><small>DISCLOSED GAP</small><p>{gig.missingSkills[0]}</p><hr /><dl><dt>PROPOSAL MODEL</dt><dd>{gig.budget}</dd><dt>WINDOW</dt><dd>{gig.duration}</dd><dt>COMMITMENT</dt><dd>{gig.commitment}</dd></dl></aside></div>
        <footer><span><ShieldCheck /> Evidence and commercial terms remain separate channels.</span><button onClick={() => go("proposal")}>INITIALIZE PROPOSAL <ArrowRight /></button></footer>
      </section>
    </>
  );
}

function RelayProposal({ go, state, dispatch }: Pick<ProtocolProps, "go" | "state" | "dispatch">) {
  const [scope, setScope] = useState("Four product-team workshops");
  const invalid = scope.trim().length < 10;
  return (
    <>
      <ProtocolHead code="20" title="Proposal payload" detail={`Draft next immutable application version · current v${state.applicationVersion}`} />
      <form className="rl-builder" onSubmit={(event) => {event.preventDefault(); if(!invalid){dispatch({type:"submit-revision"});go("applications");}}}>
        <header><span>PROPOSAL.DRAFT</span><b>ANSWERS GIG v3</b><small>schema / marketplace.proposal.2</small></header>
        <section><label><span>payment.fixed.amount_inr</span><input defaultValue="580000" inputMode="numeric" /></label><label><span>timeline.weeks</span><input defaultValue="14" inputMode="numeric" /></label><label><span>availability.hours_per_week</span><input defaultValue="28" inputMode="numeric" /></label><label><span>availability.start</span><input type="date" defaultValue="2026-08-10" /></label></section>
        <section className="rl-long-fields"><label><span>scope.approach</span><textarea defaultValue="Inventory the component and workflow system, establish an accessibility baseline, then migrate the two highest-risk investigator workflows." /></label><label><span>scope.clarification</span><input value={scope} onChange={(event)=>setScope(event.target.value)} aria-invalid={invalid} /></label>{invalid && <p role="alert">Clarification must be explicit before this payload can be recorded.</p>}</section>
        <footer><div><LockKeyhole /><span>WRITE CONSEQUENCE</span><p>Creates application v{state.applicationVersion + 1}; pending selection becomes invalidated.</p></div><button disabled={invalid}>COMMIT IMMUTABLE VERSION <Send /></button></footer>
      </form>
    </>
  );
}

function RelayApplication({ go, state, dispatch }: Pick<ProtocolProps, "go" | "state" | "dispatch">) {
  return (
    <>
      <ProtocolHead code="24" title="Application protocol" detail={`Current projection: ${state.applicationStage} · immutable version ${state.applicationVersion}`} />
      <section className="rl-thread">
        <div className="rl-thread-state"><span>APPLICATION.STATE</span><strong>{state.applicationStage}</strong><dl><dt>PROPOSAL</dt><dd>{TERMS.proposal}</dd><dt>VERSION</dt><dd>{state.applicationVersion}</dd><dt>ANSWERED GIG</dt><dd>3</dd></dl>{state.selectionStatus === "pending" && <button onClick={()=>go("selection")}>OPEN SELECTION RESPONSE <ArrowRight /></button>}</div>
        <div className="rl-protocol-events">
          <article><header><i className="is-client"/><span>QA.QUESTION / CLIENT</span><small>26 JUL · 09:11</small></header><p>{QA.question}</p></article>
          {state.qaAnswered ? <article><header><i className="is-freelancer"/><span>QA.ANSWER / FREELANCER</span><small>IMMUTABLE</small></header><p>{QA.answer}</p></article> : <button onClick={()=>dispatch({type:"answer-qa"})}>AUTHORIZE STRUCTURED ANSWER</button>}
          <article><header><i className="is-system"/><span>PROPOSAL.VERSION / SYSTEM</span><small>27 JUL · 14:08</small></header><p>Application v{state.applicationVersion} is current. Previous version remains available for comparison.</p><div className="rl-diff"><del>{TERMS.previousProposal} · two workshops</del><ins>{TERMS.proposal} · four workshops</ins></div></article>
          <button onClick={()=>go("proposal")}>CREATE NEW PROPOSAL EVENT <ArrowRight /></button>
        </div>
      </section>
    </>
  );
}

function RelayReview({ go, state }: Pick<ProtocolProps, "go" | "state">) {
  return (
    <>
      <ProtocolHead code="10" title="Applicant packets" detail="Ordered by evidence fit · commercial proposal excluded from ranking" />
      <section className="rl-applicants"><header><span>PACKET</span><span>IDENTITY / EVIDENCE</span><span>COMMERCIAL CHANNEL</span><span>STATE</span><span>ACTION</span></header>{APPLICANTS.map((person,index)=><button key={person.id} onClick={()=>go("candidate")}><span>AP.{String(index+1).padStart(3,"0")}</span><div><strong>{person.match}</strong><span><b>{person.name}</b><small>{person.headline}<br/>{person.gap}</small></span></div><dl><dt>{person.proposal}</dt><dd>{person.timeline} · v{person.id==="kavya"?state.applicationVersion:person.version}</dd></dl><span className="rl-state-code">{person.id==="kavya"?state.applicationStage:person.stage}{person.id==="kavya"&&state.shortlisted&&<small>PRIVATE SHORTLIST</small>}</span><ChevronRight /></button>)}</section>
    </>
  );
}

function RelayCandidate({ go, state, dispatch }: Pick<ProtocolProps, "go" | "state" | "dispatch">) {
  const person=APPLICANTS[0];
  return (
    <>
      <ProtocolHead code="20" title="Applicant packet AP.001" detail={`Kavya Menon · application v${state.applicationVersion} · gig terms v3`} />
      <section className="rl-candidate-grid">
        <article><header><span>IDENTITY</span><strong>{person.initials}</strong><div><h2>{person.name}</h2><p>{person.headline}<br/>{person.location} · {person.experience}</p></div></header><section><span>EVIDENCE CHANNEL</span><div className="rl-big-score">{person.match}<small>STRONG FIT</small></div><p>{person.note}</p><div className="rl-token-row">{person.skills.map(skill=><span key={skill}><Check/>{skill}</span>)}</div><aside><ShieldAlert/><div><b>DISCLOSED GAP</b><p>{person.gap}</p></div></aside></section></article>
        <aside><span>COMMERCIAL CHANNEL</span><strong>{person.proposal}</strong><dl><dt>TIMELINE</dt><dd>{person.timeline}</dd><dt>AVAILABILITY</dt><dd>{person.availability}</dd><dt>RECORD</dt><dd>application v{state.applicationVersion}</dd></dl><button onClick={()=>dispatch({type:"request-revision"})}>REQUEST REVISION EVENT</button><hr/><span>PRIVATE REVIEW</span><button className={state.shortlisted?"is-active":""} onClick={()=>dispatch({type:"toggle-shortlist"})}>{state.shortlisted?"✓ SHORTLISTED":"+ SHORTLIST"}</button><button onClick={()=>dispatch({type:"toggle-advance"})}>{state.advanced?"RETURN TO REVIEW":"ADVANCE"}</button></aside>
      </section>
      <footer className="rl-next"><div><span>NEXT AUTHORITY</span><p>{state.selectionStatus==="invalidated"?"Fresh selection required after proposal update.":"Exact-version selection is available."}</p></div><button onClick={()=>go("selection")}>OPEN SELECTION PROTOCOL <ArrowRight/></button></footer>
    </>
  );
}

function RelaySelection({ role,go,state,dispatch}:Pick<ProtocolProps,"role"|"go"|"state"|"dispatch">){
  const[deadline,setDeadline]=useState<"24"|"48"|"72">(state.selectionDeadline);const client=role==="client";
  return <><ProtocolHead code="30" title="Selection protocol" detail="Single active request · exact version binding · atomic mock confirmation"/><section className="rl-selection">
    <header><div><span>SELECTION.REQUEST</span><b>TH–042 / AP.001</b></div><span className={`is-${state.selectionStatus}`}>{state.selectionStatus.toUpperCase()}</span></header>
    <div className="rl-binding"><Fingerprint/><div><small>BOUND APPLICATION</small><strong>VERSION {state.applicationVersion}</strong></div><div><small>BOUND GIG</small><strong>VERSION 3</strong></div><div><small>FROZEN TERMS</small><strong>{TERMS.proposal}</strong></div></div>
    <div className="rl-selection-body"><section><span>INCLUDED PAYLOAD</span>{TERMS.included.map(item=><p key={item}><Check/>{item}</p>)}</section><section><span>EXCLUDED PAYLOAD</span>{TERMS.excluded.map(item=><p key={item}>— {item}</p>)}</section></div>
    {client&&state.selectionStatus!=="pending"&&<footer><label>TTL<select value={deadline} onChange={e=>setDeadline(e.target.value as "24"|"48"|"72")}><option value="24">24 HOURS</option><option value="48">48 HOURS</option><option value="72">72 HOURS</option></select></label><button onClick={()=>dispatch({type:"send-selection",deadline})}>ISSUE REQUEST <Send/></button></footer>}
    {!client&&state.selectionStatus==="pending"&&<footer><p><KeyRound/> YOUR AUTHORITY REQUIRED · 31 HOURS</p><button onClick={()=>{dispatch({type:"accept-selection"});go("engagement")}}>ACCEPT EXACT PAYLOAD <Fingerprint/></button></footer>}
    {state.selectionStatus==="accepted"&&<footer><p><Check/> TRANSACTION CONFIRMED · GIG FILLED</p><button onClick={()=>go("engagement")}>OPEN ENGAGEMENT CHANNEL <ArrowRight/></button></footer>}
  </section></>;
}

function RelayEngagement({state,dispatch}:Pick<ProtocolProps,"state"|"dispatch">){
  return <><ProtocolHead code="40" title="Engagement channel" detail={`Accepted application v${state.applicationVersion} · immutable proposal snapshot`}/><section className="rl-engagement">
    <header><Activity/><div><span>ENGAGEMENT.STATE</span><h2>{state.engagementStatus.replace("_"," ")}</h2></div><button onClick={()=>dispatch({type:"advance-engagement"})} disabled={state.engagementStatus==="completed"}>WRITE NEXT STATE <ArrowRight/></button></header>
    <div className="rl-engagement-grid"><section><span>ACCEPTED.SNAPSHOT</span><strong>{TERMS.proposal}</strong><dl><dt>APPLICATION</dt><dd>v{state.applicationVersion}</dd><dt>GIG TERMS</dt><dd>v3</dd><dt>TIME</dt><dd>{TERMS.timeline}</dd><dt>CAPACITY</dt><dd>28 hours/week</dd></dl><div className="rl-token-row">{TERMS.included.map(item=><span key={item}><Check/>{item}</span>)}</div></section>
    <section><span>CONTACT.PERMISSION</span>{!state.contactShared||state.contactRevoked?<><LockKeyhole/><h2>{state.contactRevoked?"REVOKED":"NO ACTIVE SHARE"}</h2><p>Full values are not present in the ordinary record.</p><button onClick={()=>dispatch({type:"share-contact"})}>CREATE VERIFIED SHARE</button></>:<><ShieldCheck/><h2>{state.contactRevealed?"kavya.menon@example.com":"k•••••@example.com"}</h2><p>Authorization checks membership, consent, and current share status.</p><button onClick={()=>dispatch({type:state.contactRevealed?"revoke-contact":"reveal-contact"})}>{state.contactRevealed?"REVOKE FUTURE DISPLAY":"AUTHORIZE REVEAL"}</button></>}</section></div>
    <aside><ShieldAlert/><p>GigMatch does not process payments or provide escrow. Never transmit credentials, OTPs, access tokens, or banking secrets.</p></aside>
  </section></>;
}
