import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Focus, LockKeyhole, Maximize2, RotateCcw, Send, ShieldCheck, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { semanticDepth } from "../../domain/comparison";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import "./aperture.css";

const LEVELS = ["Market", "Brief", "Application", "Exact terms", "Engagement"];

export function Aperture() {
  const location = useLocation();
  const route = useConceptRoute("aperture");
  if (location.pathname === "/aperture" || location.pathname === "/aperture/") return <ApertureLanding />;
  return <ApertureApp {...route} />;
}

function ApertureLanding() {
  return <main id="main-content" className="ap-public">
    <header><Link to="/">08 / INDEX</Link><b>APERTURE</b><span>SEMANTIC-ZOOM MARKETPLACE</span></header>
    <section>
      <div className="ap-rings" aria-hidden="true"><i/><i/><i/><i/><strong>TH</strong></div>
      <div className="ap-public-copy"><span>FROM MARKET TO MUTUAL COMMITMENT</span><h1>Context stays.<br/><em>Focus deepens.</em></h1><p>Move from an open market to one exact decision without losing where the record came from.</p><nav><Link to="/aperture/freelancer/home">Explore as specialist <ZoomIn/></Link><Link to="/aperture/client/home">Focus as client <ZoomIn/></Link></nav></div>
    </section>
    <footer>{LEVELS.map((level, index)=><span key={level}><b>0{index+1}</b>{level}</span>)}</footer>
  </main>;
}

interface ApertureProps {
  role: Role; view: ViewId; go: (view: ViewId) => void; switchRole: (role: Role) => void;
  state: ReturnType<typeof useConceptRoute>["state"]; dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
}

function ApertureApp({ role, view, go, switchRole, state, dispatch }: ApertureProps) {
  const depth = semanticDepth(view);
  const destinations: { view: ViewId; f: string; c: string }[] = [
    { view: "home", f: "Market", c: "Market" },
    { view: role === "client" ? "review" : "discover", f: "Briefs", c: "Applicants" },
    { view: role === "client" ? "candidate" : "applications", f: "Application", c: "Dossier" },
    { view: "selection", f: "Exact terms", c: "Exact terms" },
    { view: "engagement", f: "Engagement", c: "Engagement" },
  ];
  return <div className={`ap-app ap-depth-${depth}`}>
    <header className="ap-header"><Link to="/aperture"><Focus/>APERTURE</Link><div className="ap-depth-track">{destinations.map((item, index)=><button key={item.view} className={index === depth || item.view === view ? "is-current" : index < depth ? "is-past" : ""} onClick={()=>go(item.view)}><span>0{index+1}</span><b>{role === "client" ? item.c : item.f}</b></button>)}</div><div className="ap-role"><button className={role==="freelancer"?"is-active":""} onClick={()=>switchRole("freelancer")}>F</button><button className={role==="client"?"is-active":""} onClick={()=>switchRole("client")}>C</button></div></header>
    <div className="ap-context-edge"><span>DEPTH {depth}</span><b>{LEVELS[Math.min(depth, 4)]}</b><em>{depth === 0 ? "Open field" : "Parent context remains at the edge"}</em></div>
    <main id="main-content" className="ap-focus">
      {view==="home"&&<ApertureHome role={role} go={go} state={state}/>}
      {view==="discover"&&<ApertureDiscover go={go}/>}
      {view==="gig"&&<ApertureGig go={go}/>}
      {view==="proposal"&&<ApertureProposal go={go} state={state} dispatch={dispatch}/>}
      {view==="applications"&&<ApertureApplication go={go} state={state} dispatch={dispatch}/>}
      {view==="review"&&<ApertureReview go={go} state={state}/>}
      {view==="candidate"&&<ApertureCandidate go={go} state={state} dispatch={dispatch}/>}
      {view==="selection"&&<ApertureSelection role={role} go={go} state={state} dispatch={dispatch}/>}
      {view==="engagement"&&<ApertureEngagement state={state} dispatch={dispatch}/>}
    </main>
    <footer className="ap-footer"><Link to="/"><ArrowLeft/> Concept index</Link><span>SCENARIO / TH–042 / v{state.applicationVersion}</span><button onClick={()=>dispatch({type:"reset"})}><RotateCcw/> Reset</button></footer>
    {state.toast&&<div className="ap-toast" role="status"><i/><span>{state.toast}</span></div>}
  </div>;
}

function ApertureHome({role,go,state}:Pick<ApertureProps,"role"|"go"|"state">) {
  return <section className="ap-home">
    <div className="ap-field-label"><span>DEPTH 00</span><b>{role==="client"?"HIRING FIELD":"OPPORTUNITY FIELD"}</b></div>
    <header><h1>{role==="client"?"Four records orbit one consequential choice.":"Three opportunities. One already in motion."}</h1><p>Open a record to let evidence, terms, and authority fill the frame.</p></header>
    <div className="ap-orbit">
      <button onClick={()=>go(role==="client"?"review":"discover")}><span>PRIMARY FOCUS</span><strong>92</strong><h2>{role==="client"?"Kavya Menon":"Ternary Health"}</h2><p>{role==="client"?"Application v"+state.applicationVersion:"Senior Frontend Systems Engineer"}</p><i>OPEN <ZoomIn/></i></button>
      <button onClick={()=>go(role==="client"?"review":"discover")}><strong>87</strong><b>{role==="client"?"Dev Malhotra":"Meridian Ledger"}</b></button>
      <button onClick={()=>go(role==="client"?"review":"discover")}><strong>84</strong><b>{role==="client"?"Sana Iqbal":"Common Ground"}</b></button>
      <button className="is-decision" onClick={()=>go("selection")}><span>UNRESOLVED</span><b>Exact terms</b><em>31 hours</em></button>
    </div>
  </section>;
}

function ApertureDiscover({go}:Pick<ApertureProps,"go">) {
  const [active,setActive]=useState(0); const gig=GIGS[active];
  return <section className="ap-discover">
    <header><button onClick={()=>go("home")}><ZoomOut/> Market</button><span>DEPTH 01 / BRIEF FIELD</span><h1>Move the field. Hold the context.</h1></header>
    <div className="ap-opportunity-field">
      {GIGS.map((item,index)=><button key={item.id} className={active===index?"is-focused":""} onClick={()=>setActive(index)}><span>{item.company}</span><strong>{item.match}</strong><h2>{item.title}</h2><p>{item.budget} · {item.duration}</p></button>)}
    </div>
    <article className="ap-lens"><span>IN FOCUS / {gig.matchLabel}</span><h2>{gig.company}</h2><p>{gig.matchReason}</p><div>{gig.matchingSkills.slice(0,4).map(skill=><b key={skill}><Check/>{skill}</b>)}<b className="is-gap">GAP / {gig.missingSkills[0]}</b></div><button onClick={()=>go("gig")}>Enter this brief <ZoomIn/></button></article>
  </section>;
}

function ApertureGig({go}:Pick<ApertureProps,"go">) {
  const gig=GIGS[0];
  return <section className="ap-gig">
    <header><button onClick={()=>go("discover")}><ZoomOut/> Opportunity field</button><span>DEPTH 02 / BRIEF TH–042</span><h1>{gig.title}</h1><p>{gig.summary}</p></header>
    <div className="ap-brief-focus"><aside><strong>92</strong><span>EVIDENCE FIT</span><small>Price excluded</small></aside><section><div><span>MATERIAL TERMS</span><b>{gig.budget}</b><b>{gig.duration}</b><b>{gig.commitment}</b><b>Closes {gig.deadline}</b></div><div><span>REQUIRED EVIDENCE</span>{gig.requiredSkills.map(skill=><p key={skill}><Check/>{skill}</p>)}<p className="is-gap">Disclosed: {gig.missingSkills[0]}</p></div></section></div>
    <div className="ap-outcomes">{gig.deliverables.map((item,index)=><div key={item}><span>0{index+1}</span><p>{item}</p></div>)}</div>
    <button className="ap-deeper" onClick={()=>go("proposal")}>Focus on my answer <Maximize2/></button>
  </section>;
}

function ApertureProposal({go,state,dispatch}:Pick<ApertureProps,"go"|"state"|"dispatch">) {
  const [scope,setScope]=useState(""); const invalid=scope.trim().length<30;
  return <section className="ap-proposal">
    <header><button onClick={()=>go("gig")}><ZoomOut/> Brief TH–042</button><span>DEPTH 03 / APPLICATION v{state.applicationVersion}</span><h1>Only the answer is editable here.</h1></header>
    <form onSubmit={event=>{event.preventDefault();if(!invalid){dispatch({type:"submit-revision"});go("applications")}}}>
      <aside><span>BRIEF CONTEXT</span><b>₹5.2L–₹6.4L</b><b>12–16 weeks</b><b>26–30 hours/week</b><small>Gig terms v3</small></aside>
      <section><label>FIXED PROPOSAL<input defaultValue="₹5,80,000"/></label><label>DELIVERY<input defaultValue="14 weeks"/></label><label>WEEKLY CAPACITY<input defaultValue="28 hours"/></label><label className="is-wide">DELIVERY APPROACH<textarea value={scope} onChange={event=>setScope(event.target.value)} placeholder="Describe the first migration, validation approach, and four workshops."/>{invalid&&<small role="alert">Use at least 30 characters so the approach is reviewable.</small>}</label><button disabled={invalid}>Record application v{state.applicationVersion+1} <Send/></button></section>
    </form>
  </section>;
}

function ApertureApplication({go,state,dispatch}:Pick<ApertureProps,"go"|"state"|"dispatch">) {
  return <section className="ap-application">
    <header><button onClick={()=>go("home")}><ZoomOut/> Market</button><span>DEPTH 03 / ACTIVE RECORD</span><h1>Application v{state.applicationVersion}</h1><b>{state.applicationStage}</b></header>
    <div className="ap-record-core"><section><span>CURRENT PROPOSAL</span><strong>{TERMS.proposal}</strong><p>{TERMS.timeline} · {TERMS.availability}</p><button onClick={()=>go("proposal")}>Open editable layer <ZoomIn/></button></section><section><span>STRUCTURED Q&A</span><blockquote>{QA.question}</blockquote>{state.qaAnswered?<p>{QA.answer}</p>:<button onClick={()=>dispatch({type:"answer-qa"})}>Record answer</button>}</section><section><span>SELECTION</span><strong>{state.selectionStatus.toUpperCase()}</strong><p>Application v{state.applicationVersion} · Gig v3</p>{state.selectionStatus==="pending"&&<button onClick={()=>go("selection")}>Enter exact terms <ZoomIn/></button>}</section></div>
  </section>;
}

function ApertureReview({go,state}:Pick<ApertureProps,"go"|"state">) {
  const [active,setActive]=useState(0); const person=APPLICANTS[active];
  const move=(by:number)=>setActive((active+by+APPLICANTS.length)%APPLICANTS.length);
  return <section className="ap-review">
    <header><button onClick={()=>go("home")}><ZoomOut/> Hiring field</button><span>DEPTH 01 / APPLICANT FIELD</span><h1>One dossier fills the lens. Neighbours stay reachable.</h1></header>
    <div className="ap-carousel">
      <button aria-label="Previous applicant" onClick={()=>move(-1)}><ChevronLeft/></button>
      <article className="is-neighbour"><strong>{APPLICANTS[(active+APPLICANTS.length-1)%APPLICANTS.length].match}</strong><span>{APPLICANTS[(active+APPLICANTS.length-1)%APPLICANTS.length].name}</span></article>
      <article className="is-focused"><span>APPLICATION {person.id==="kavya"?"v"+state.applicationVersion:"v"+person.version}</span><strong>{person.match}</strong><h2>{person.name}</h2><p>{person.headline}</p><dl><div><dt>PROPOSAL</dt><dd>{person.proposal}</dd></div><div><dt>AVAILABILITY</dt><dd>{person.availability}</dd></div><div><dt>STAGE</dt><dd>{person.id==="kavya"?state.applicationStage:person.stage}</dd></div></dl><button onClick={()=>go("candidate")}>Deep focus <ZoomIn/></button></article>
      <article className="is-neighbour"><strong>{APPLICANTS[(active+1)%APPLICANTS.length].match}</strong><span>{APPLICANTS[(active+1)%APPLICANTS.length].name}</span></article>
      <button aria-label="Next applicant" onClick={()=>move(1)}><ChevronRight/></button>
    </div>
  </section>;
}

function ApertureCandidate({go,state,dispatch}:Pick<ApertureProps,"go"|"state"|"dispatch">) {
  const person=APPLICANTS[0];
  return <section className="ap-candidate">
    <header><button onClick={()=>go("review")}><ZoomOut/> Applicant field</button><span>DEPTH 02 / AP.001</span><h1>{person.name}</h1><p>{person.headline}</p></header>
    <div className="ap-dossier"><aside><strong>{person.match}</strong><span>EVIDENCE FIT</span><small>Commercial terms do not affect this number.</small></aside><section><h2>Reviewed evidence</h2>{person.skills.map(item=><p key={item}><Check/>{item}</p>)}<blockquote><b>DISCLOSED GAP</b>{person.gap}</blockquote></section><section><h2>Exact proposal</h2><strong>{person.proposal}</strong><p>{person.timeline}<br/>{person.availability}</p><small>Application v{state.applicationVersion}</small></section></div>
    <footer><button className={state.shortlisted?"is-active":""} onClick={()=>dispatch({type:"toggle-shortlist"})}>{state.shortlisted?"Shortlisted":"Private shortlist"}</button><button onClick={()=>dispatch({type:"toggle-advance"})}>{state.advanced?"Return to review":"Advance"}</button><button onClick={()=>go("selection")}>Isolate exact decision <ZoomIn/></button></footer>
  </section>;
}

function ApertureSelection({role,go,state,dispatch}:Pick<ApertureProps,"role"|"go"|"state"|"dispatch">) {
  const [deadline,setDeadline]=useState<"24"|"48"|"72">(state.selectionDeadline); const client=role==="client";
  return <section className="ap-selection">
    <header><span>DEPTH 04 / NO DISTRACTIONS</span><ShieldCheck/><h1>Application v{state.applicationVersion}<br/>against gig terms v3.</h1><p>Confirm this exact record. A later proposal edit invalidates it.</p></header>
    <div className="ap-exact"><div><span>PROPOSAL</span><strong>{TERMS.proposal}</strong></div><div><span>DELIVERY</span><strong>{TERMS.timeline}</strong></div><div><span>CAPACITY</span><strong>28 hrs/week</strong></div><div><span>START</span><strong>10 Aug 2026</strong></div></div>
    {client&&state.selectionStatus!=="pending"&&<footer><label>OPEN FOR <select value={deadline} onChange={e=>setDeadline(e.target.value as "24"|"48"|"72")}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button onClick={()=>dispatch({type:"send-selection",deadline})}>Send exact request <Send/></button></footer>}
    {!client&&state.selectionStatus==="pending"&&<footer><p>31 hours remain. You are accepting only what is shown above.</p><button onClick={()=>{dispatch({type:"accept-selection"});go("engagement")}}>Accept and create engagement <Check/></button></footer>}
    {state.selectionStatus==="accepted"&&<footer><p>Exact record confirmed.</p><button onClick={()=>go("engagement")}>Enter engagement <ZoomIn/></button></footer>}
    {state.selectionStatus==="invalidated"&&<div className="ap-invalid"><b>INVALIDATED</b><p>The proposal changed. A client must issue a fresh exact-version request.</p></div>}
  </section>;
}

function ApertureEngagement({state,dispatch}:Pick<ApertureProps,"state"|"dispatch">) {
  return <section className="ap-engagement">
    <header><span>DEPTH 05 / SHARED RECORD</span><h1>The market falls away.<br/>The agreement remains.</h1><p>Ternary Health × Kavya Menon · {state.engagementStatus.replaceAll("_"," ")}</p></header>
    <div className="ap-engagement-core"><section><span>IMMUTABLE TERMS</span><strong>{TERMS.proposal}</strong><b>{TERMS.timeline}</b><b>Application v{state.applicationVersion} × Gig v3</b><button onClick={()=>dispatch({type:"advance-engagement"})} disabled={state.engagementStatus==="completed"}>Advance lifecycle <ArrowRight/></button></section><section><span>CONSENTED CONTACT</span>{!state.contactShared||state.contactRevoked?<><LockKeyhole/><strong>{state.contactRevoked?"SHARING STOPPED":"MASKED"}</strong><p>Contact is private until a participant shares it for this engagement.</p><button onClick={()=>dispatch({type:"share-contact"})}>Share verified email</button></>:<><ShieldCheck/><strong>{state.contactRevealed?"kavya.menon@example.com":"k•••••@example.com"}</strong><button onClick={()=>dispatch({type:state.contactRevealed?"revoke-contact":"reveal-contact"})}>{state.contactRevealed?"Revoke future display":"Authorize reveal"}</button></>}</section></div>
    <details><summary>Activity at this depth <ChevronDown/></summary>{state.activity.slice(0,5).map(item=><p key={item.id}><b>{item.title}</b><span>{item.at} · {item.detail}</span></p>)}</details>
  </section>;
}
