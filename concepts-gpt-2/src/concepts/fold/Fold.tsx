import { ArrowLeft, ArrowRight, Check, ChevronDown, LockKeyhole, RotateCcw, Send, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PROJECT_WEEKS, workflowBand } from "../../domain/comparison";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import "./fold.css";

type FoldId="find"|"propose"|"review"|"confirm"|"work";
const FOLDS:{id:FoldId;number:string;label:string;f:ViewId;c:ViewId}[]=[
  {id:"find",number:"01",label:"Find",f:"discover",c:"home"},
  {id:"propose",number:"02",label:"Propose",f:"proposal",c:"review"},
  {id:"review",number:"03",label:"Review",f:"applications",c:"candidate"},
  {id:"confirm",number:"04",label:"Confirm",f:"selection",c:"selection"},
  {id:"work",number:"05",label:"Work",f:"engagement",c:"engagement"},
];

export function Fold(){
  const location=useLocation();const route=useConceptRoute("fold");
  if(location.pathname==="/fold"||location.pathname==="/fold/")return <FoldLanding/>;
  return <FoldApp {...route}/>;
}

function FoldLanding(){
  return <main id="main-content" className="fd-public"><header><Link to="/">10 / CONCEPT INDEX</Link><b>FOLD</b><span>ONE JOURNEY · FIVE WORKSPACES</span></header><section>
    <article className="is-find"><span>01</span><b>FIND</b><div><small>THE MARKET</small><h1>Open work,<br/>held in context.</h1><Link to="/fold/freelancer/home">Enter as specialist <ArrowRight/></Link></div></article>
    <article className="is-propose"><span>02</span><b>PROPOSE</b><div><small>THE ANSWER</small><h2>Exact scope,<br/>versioned.</h2></div></article>
    <article className="is-review"><span>03</span><b>REVIEW</b><div><small>THE EVIDENCE</small><h2>People,<br/>not profiles.</h2><Link to="/fold/client/home">Enter as client <ArrowRight/></Link></div></article>
    <article className="is-confirm"><span>04</span><b>CONFIRM</b><div><small>THE AUTHORITY</small><h2>One exact<br/>decision.</h2></div></article>
    <article className="is-work"><span>05</span><b>WORK</b><div><small>THE RECORD</small><h2>Terms become<br/>shared.</h2></div></article>
  </section></main>;
}

interface FoldProps{role:Role;view:ViewId;go:(view:ViewId)=>void;switchRole:(role:Role)=>void;state:ReturnType<typeof useConceptRoute>["state"];dispatch:ReturnType<typeof useConceptRoute>["dispatch"]}

function FoldApp({role,view,go,switchRole,state,dispatch}:FoldProps){
  const active=workflowBand(view);
  return <div className={`fd-app is-${active}`}><header className="fd-header"><Link to="/fold">FOLD <small>10</small></Link><div><button className={role==="freelancer"?"is-active":""} onClick={()=>switchRole("freelancer")}>KAVYA / SPECIALIST</button><button className={role==="client"?"is-active":""} onClick={()=>switchRole("client")}>TERNARY / CLIENT</button></div><span>APPLICATION v{state.applicationVersion} · {state.applicationStage}</span><button onClick={()=>dispatch({type:"reset"})}><RotateCcw/> RESET</button></header>
    <main id="main-content" className="fd-bands">{FOLDS.map(fold=><section key={fold.id} className={`fd-band fd-${fold.id} ${active===fold.id?"is-open":""}`}><button className="fd-band-label" aria-expanded={active===fold.id} onClick={()=>go(role==="client"?fold.c:fold.f)}><span>{fold.number}</span><b>{fold.label}</b><small>{bandStatus(fold.id,state)}</small><ChevronDown/></button>{active===fold.id&&<div className="fd-band-content">
      {view==="home"&&<FoldHome role={role} go={go} state={state}/>}
      {view==="discover"&&<FoldDiscover go={go}/>}
      {view==="gig"&&<FoldGig go={go}/>}
      {view==="proposal"&&<FoldProposal go={go} state={state} dispatch={dispatch}/>}
      {view==="applications"&&<FoldApplication go={go} state={state} dispatch={dispatch}/>}
      {view==="review"&&<FoldReview go={go} state={state}/>}
      {view==="candidate"&&<FoldCandidate go={go} state={state} dispatch={dispatch}/>}
      {view==="selection"&&<FoldSelection role={role} go={go} state={state} dispatch={dispatch}/>}
      {view==="engagement"&&<FoldEngagement state={state} dispatch={dispatch}/>}
    </div>}</section>)}</main>
    <footer className="fd-footer"><Link to="/"><ArrowLeft/> Ten concepts</Link><span>TH–042 / TERNARY HEALTH × KAVYA MENON</span><span>LOCAL SCENARIO</span></footer>{state.toast&&<div className="fd-toast" role="status"><Check/>{state.toast}</div>}
  </div>;
}

function bandStatus(id:FoldId,state:FoldProps["state"]){
  if(id==="find")return "3 opportunities";
  if(id==="propose")return `v${state.applicationVersion}`;
  if(id==="review")return state.applicationStage;
  if(id==="confirm")return state.selectionStatus;
  return state.engagementStatus.replaceAll("_"," ");
}

function FoldHome({role,go,state}:Pick<FoldProps,"role"|"go"|"state">){
  return <div className="fd-home"><header><span>01 / THE MARKET IN MOTION</span><h1>{role==="client"?"One open gig. Four serious answers.":"Find the work. Keep the whole journey visible."}</h1><p>{role==="client"?"Ternary Health · Clinical Trial Operations · 14 applications":"A selection request is already waiting inside Fold 04. The open market stays available here."}</p></header><div className="fd-home-record"><strong>{role==="client"?"14":"92"}</strong><div><span>{role==="client"?"APPLICANTS":"EVIDENCE FIT"}</span><h2>{role==="client"?"Senior Frontend Systems Engineer":"Ternary Health"}</h2><p>{role==="client"?"₹5.2L–₹6.4L · 14 weeks":"₹5.8L · 14 weeks · 28 hours/week"}</p></div><button onClick={()=>go(role==="client"?"review":"discover")}>Open {role==="client"?"applicant field":"market"} <ArrowRight/></button></div><button className="fd-jump" onClick={()=>go("selection")}>Fold 04 requires authority · {state.selectionStatus} <ArrowRight/></button></div>;
}

function FoldDiscover({go}:Pick<FoldProps,"go">){
  const [active,setActive]=useState(0);const gig=GIGS[active];
  return <div className="fd-discover"><header><span>01 / FIND / OPPORTUNITY INDEX</span><h1>Open one brief without closing the journey.</h1></header><div className="fd-market-rows">{GIGS.map((item,index)=><button className={active===index?"is-active":""} onClick={()=>setActive(index)} key={item.id}><span>0{index+1}</span><strong>{item.match}</strong><div><b>{item.company}</b><p>{item.title}</p></div><em>{item.budget}</em><small>{item.deadline}</small></button>)}</div><article className="fd-market-detail"><span>IN FOCUS / {gig.matchLabel}</span><p>{gig.matchReason}</p><div>{gig.matchingSkills.slice(0,4).map(item=><b key={item}><Check/>{item}</b>)}<b className="is-gap">{gig.missingSkills[0]}</b></div><button onClick={()=>go("gig")}>Unfold brief <ArrowRight/></button></article></div>;
}

function FoldGig({go}:Pick<FoldProps,"go">){
  const gig=GIGS[0];return <div className="fd-gig"><header><button onClick={()=>go("discover")}><ArrowLeft/> Opportunity index</button><span>01 / FIND / COMPLETE BRIEF</span><h1>{gig.title}</h1><p>{gig.summary}</p></header><div className="fd-brief-bands"><section><span>TERMS</span><strong>{gig.budget}</strong><b>{gig.duration}</b><b>{gig.commitment}</b></section><section><span>EVIDENCE</span>{gig.requiredSkills.map(item=><p key={item}><Check/>{item}</p>)}<p className="is-gap">{gig.missingSkills[0]}</p></section><section><span>OUTCOMES</span>{gig.deliverables.map((item,index)=><p key={item}><b>0{index+1}</b>{item}</p>)}</section></div><button className="fd-next-fold" onClick={()=>go("proposal")}><span>OPEN FOLD 02</span>Build the proposal <ArrowRight/></button></div>;
}

function FoldProposal({go,state,dispatch}:Pick<FoldProps,"go"|"state"|"dispatch">){
  const [approach,setApproach]=useState("");const invalid=approach.trim().length<24;
  return <div className="fd-proposal"><header><span>02 / PROPOSE / NEW LAYER</span><h1>A revision enters above the old record.</h1><p>Recording v{state.applicationVersion+1} will mark any selection for v{state.applicationVersion} invalid.</p></header><form onSubmit={event=>{event.preventDefault();if(!invalid){dispatch({type:"submit-revision"});go("applications")}}}><div className="fd-old-layer"><span>BELOW / v{state.applicationVersion}</span><b>{TERMS.proposal}</b><p>14 weeks · 28 hours/week · four workshops</p></div><div className="fd-new-layer"><span>NEW / v{state.applicationVersion+1}</span><label>PROPOSAL<input defaultValue="₹5,80,000"/></label><label>DELIVERY<input defaultValue="14 weeks"/></label><label>CAPACITY<input defaultValue="28 hours/week"/></label><label className="is-wide">APPROACH<textarea value={approach} onChange={event=>setApproach(event.target.value)} placeholder="Describe the migration and validation approach."/>{invalid&&<small role="alert">Add at least 24 characters.</small>}</label><button disabled={invalid}>Insert version layer <Send/></button></div></form></div>;
}

function FoldApplication({go,state,dispatch}:Pick<FoldProps,"go"|"state"|"dispatch">){
  return <div className="fd-application"><header><span>03 / REVIEW / MY RECORD</span><h1>Every layer remains inspectable.</h1></header><div className="fd-stack"><article><span>APPLICATION v{state.applicationVersion}</span><strong>{TERMS.proposal}</strong><p>{TERMS.timeline} · {TERMS.availability}</p><b>{state.applicationStage}</b></article><article><span>STRUCTURED Q&A</span><blockquote>{QA.question}</blockquote>{state.qaAnswered?<p>{QA.answer}</p>:<button onClick={()=>dispatch({type:"answer-qa"})}>Record answer</button>}</article><article className={state.selectionStatus==="invalidated"?"is-invalid":""}><span>SELECTION LAYER</span><strong>{state.selectionStatus.toUpperCase()}</strong><p>{state.selectionStatus==="invalidated"?"The proposal changed. A fresh request is required.":"Exact terms reference application v"+state.applicationVersion+"."}</p></article></div><footer><button onClick={()=>go("proposal")}>Insert another proposal layer</button>{state.selectionStatus==="pending"&&<button onClick={()=>go("selection")}>Open confirmation fold <ArrowRight/></button>}</footer></div>;
}

function FoldReview({go,state}:Pick<FoldProps,"go"|"state">){
  const [selected,setSelected]=useState(0);
  return <div className="fd-review"><header><span>02 / PROPOSE / CLIENT INBOX</span><h1>Four proposals, held under the same brief.</h1></header><div className="fd-applicant-strips">{APPLICANTS.map((person,index)=><button className={selected===index?"is-active":""} key={person.id} onClick={()=>setSelected(index)}><span>0{index+1}</span><strong>{person.match}</strong><div><b>{person.name}</b><p>{person.headline}</p></div><em>{person.proposal}<small>{person.timeline}</small></em><i>{person.id==="kavya"?state.applicationStage:person.stage}</i></button>)}</div><aside><span>ACTIVE STRIP / {APPLICANTS[selected].name}</span><p>{APPLICANTS[selected].note}</p><b>GAP / {APPLICANTS[selected].gap}</b><button onClick={()=>go("candidate")}>Unfold dossier <ArrowRight/></button></aside></div>;
}

function FoldCandidate({go,state,dispatch}:Pick<FoldProps,"go"|"state"|"dispatch">){
  const person=APPLICANTS[0];return <div className="fd-candidate"><header><button onClick={()=>go("review")}><ArrowLeft/> Proposal inbox</button><span>03 / REVIEW / AP.001</span><h1>{person.name}</h1><p>{person.headline}</p></header><div className="fd-candidate-bands"><section><span>92 / EVIDENCE</span>{person.skills.map(item=><p key={item}><Check/>{item}</p>)}<small>Price is not part of evidence fit.</small></section><section><span>v{state.applicationVersion} / COMMERCIAL</span><strong>{person.proposal}</strong><b>{person.timeline}</b><b>{person.availability}</b></section><section><span>DISCLOSED GAP</span><p>{person.gap}</p><span>PROPOSAL NOTE</span><p>{person.note}</p></section></div><footer><button className={state.shortlisted?"is-active":""} onClick={()=>dispatch({type:"toggle-shortlist"})}>{state.shortlisted?"✓ Private shortlist":"+ Private shortlist"}</button><button onClick={()=>dispatch({type:"toggle-advance"})}>{state.advanced?"Return to review":"Advance"}</button><button onClick={()=>dispatch({type:"request-revision"})}>Request revision</button><button onClick={()=>go("selection")}>Open Fold 04 <ArrowRight/></button></footer></div>;
}

function FoldSelection({role,go,state,dispatch}:Pick<FoldProps,"role"|"go"|"state"|"dispatch">){
  const [deadline,setDeadline]=useState<"24"|"48"|"72">(state.selectionDeadline);const client=role==="client";
  return <div className="fd-selection"><header><span>04 / CONFIRM / EXACT AUTHORITY</span><h1>{state.selectionStatus==="invalidated"?"This fold no longer closes.":"Close only what both sides can see."}</h1><p>Application v{state.applicationVersion} × Gig terms v3</p></header><div className={`fd-confirm-sheet ${state.selectionStatus==="invalidated"?"is-invalid":""}`}><header><ShieldCheck/><div><span>EXACT RECORD</span><b>TH–042 / AP.001</b></div><strong>{state.selectionStatus.toUpperCase()}</strong></header><section><div><span>PROPOSAL</span><strong>{TERMS.proposal}</strong></div><div><span>DELIVERY</span><strong>{TERMS.timeline}</strong></div><div><span>CAPACITY</span><strong>28 hours/week</strong></div><div><span>VERSION</span><strong>v{state.applicationVersion} × v3</strong></div></section>{state.selectionStatus==="invalidated"&&<aside><X/><p>Proposal revision inserted a new layer. The old selection cannot be accepted.</p></aside>}</div>
    {client&&state.selectionStatus!=="pending"&&<footer><label>OPEN FOR<select value={deadline} onChange={e=>setDeadline(e.target.value as "24"|"48"|"72")}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button onClick={()=>dispatch({type:"send-selection",deadline})}>Issue fresh confirmation <Send/></button></footer>}
    {!client&&state.selectionStatus==="pending"&&<footer><p>31 hours remain. Acceptance closes this fold and opens Work.</p><button onClick={()=>{dispatch({type:"accept-selection"});go("engagement")}}>Accept and open Fold 05 <Check/></button></footer>}
    {state.selectionStatus==="accepted"&&<footer><p>This fold is closed with an exact record.</p><button onClick={()=>go("engagement")}>Open Fold 05 <ArrowRight/></button></footer>}
  </div>;
}

function FoldEngagement({state,dispatch}:Pick<FoldProps,"state"|"dispatch">){
  return <div className="fd-engagement"><header><span>05 / WORK / SHARED RECORD</span><h1>The accepted terms become the first layer of work.</h1><p>Ternary Health × Kavya Menon · {state.engagementStatus.replaceAll("_"," ")}</p></header><div className="fd-work-layout"><section><span>DELIVERY PHASES</span>{PROJECT_WEEKS.map(item=><div key={item.week}><b>{item.week}</b><strong>{item.phase}</strong><p>{item.outcome}</p><em>{item.hours}h/week</em></div>)}<button onClick={()=>dispatch({type:"advance-engagement"})} disabled={state.engagementStatus==="completed"}>Advance lifecycle <ArrowRight/></button></section><aside><span>CONTACT / CONSENT LAYER</span>{!state.contactShared||state.contactRevoked?<><LockKeyhole/><strong>{state.contactRevoked?"SHARING STOPPED":"PRIVATE"}</strong><p>Verified contact stays masked until consent exists for this engagement.</p><button onClick={()=>dispatch({type:"share-contact"})}>Share verified email</button></>:<><ShieldCheck/><strong>{state.contactRevealed?"kavya.menon@example.com":"k•••••@example.com"}</strong><p>Reveal is audited and scoped to this engagement.</p><button onClick={()=>dispatch({type:state.contactRevealed?"revoke-contact":"reveal-contact"})}>{state.contactRevealed?"Stop future display":"Authorize reveal"}</button></>}</aside></div><details><summary>Unfold activity history <ChevronDown/></summary>{state.activity.slice(0,6).map(item=><p key={item.id}><span>{item.at}</span><b>{item.title}</b><small>{item.detail}</small></p>)}</details></div>;
}
