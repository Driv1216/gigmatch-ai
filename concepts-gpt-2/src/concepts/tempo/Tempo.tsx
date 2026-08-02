import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3, LockKeyhole, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PROJECT_WEEKS } from "../../domain/comparison";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import "./tempo.css";

export function Tempo() {
  const location = useLocation();
  const route = useConceptRoute("tempo");
  if (location.pathname === "/tempo" || location.pathname === "/tempo/") return <TempoLanding />;
  return <TempoPlanner {...route} />;
}

function TempoLanding() {
  return <main id="main-content" className="tp-public"><nav><Link to="/" className="tp-logo">T</Link><b>Tempo</b><span>GigMatch AI · Direction 06</span><Link to="/tempo/freelancer/home">Open your week <ArrowRight /></Link></nav><section><div><p>WORK THAT FITS THE CALENDAR AND THE TERMS.</p><h1>Plan the<br />commitment.<br /><em>Then commit.</em></h1><p>Tempo makes deadlines, availability, project phases, and exact capacity visible before either side says yes.</p><div><Link to="/tempo/freelancer/home">Specialist calendar</Link><Link to="/tempo/client/home">Hiring calendar</Link></div></div><aside><header><span>AUGUST / WEEK 2</span><b>28 HRS AVAILABLE</b></header>{PROJECT_WEEKS.map((phase,index)=><div key={phase.week}><span>{phase.week}</span><i style={{width:`${phase.hours/28*100}%`}}/><div><b>{phase.phase}</b><small>{phase.outcome}</small></div><em>{phase.hours}h</em>{index===0&&<strong>START</strong>}</div>)}</aside></section><footer><span>ONE ACTIVE SELECTION</span><b>Ternary Health · ₹5.8L · 14 weeks</b><span>31 HOURS TO RESPOND</span></footer></main>;
}

interface TempoProps { role:Role; view:ViewId; go:(view:ViewId)=>void; switchRole:(role:Role)=>void; state:ReturnType<typeof useConceptRoute>["state"]; dispatch:ReturnType<typeof useConceptRoute>["dispatch"] }

function TempoPlanner({role,view,go,switchRole,state,dispatch}:TempoProps) {
  const nav:{view:ViewId;f:string;c:string}[]=[{view:"home",f:"Plan",c:"Plan"},{view:role==="client"?"review":"discover",f:"Open work",c:"Applicants"},{view:role==="client"?"candidate":"applications",f:"Application",c:"Candidate"},{view:"selection",f:"Terms",c:"Selection"},{view:"engagement",f:"Engagement",c:"Engagement"}];
  return <div className="tp-app"><header className="tp-header"><Link to="/tempo" className="tp-logo">T</Link><b>TEMPO</b><p>10–16 AUG 2026</p><nav>{nav.map(item=><button key={item.view} className={view===item.view?"is-active":""} onClick={()=>go(item.view)}>{role==="client"?item.c:item.f}</button>)}</nav><div><button className={role==="freelancer"?"is-active":""} onClick={()=>switchRole("freelancer")}>FREELANCER</button><button className={role==="client"?"is-active":""} onClick={()=>switchRole("client")}>CLIENT</button></div></header><main id="main-content">
    {view==="home"&&<TempoHome role={role} go={go} state={state}/>}
    {view==="discover"&&<TempoDiscover go={go}/>}
    {view==="gig"&&<TempoGig go={go}/>}
    {view==="proposal"&&<TempoProposal go={go} state={state} dispatch={dispatch}/>}
    {view==="applications"&&<TempoApplication go={go} state={state} dispatch={dispatch}/>}
    {view==="review"&&<TempoReview go={go} state={state}/>}
    {view==="candidate"&&<TempoCandidate go={go} state={state} dispatch={dispatch}/>}
    {view==="selection"&&<TempoSelection role={role} go={go} state={state} dispatch={dispatch}/>}
    {view==="engagement"&&<TempoEngagement state={state} dispatch={dispatch}/>}
  </main><footer className="tp-footer"><Link to="/"><ArrowLeft/> Concepts</Link><span>Shared scenario · v{state.applicationVersion}</span><button onClick={()=>dispatch({type:"reset"})}><RotateCcw/> Reset</button></footer>{state.toast&&<div className="tp-toast" role="status"><Check/>{state.toast}</div>}</div>;
}

function TempoHome({role,go,state}:Pick<TempoProps,"role"|"go"|"state">) {
  const client=role==="client";
  return <section className="tp-home"><header><div><span>{client?"HIRING PLAN":"CAPACITY PLAN"}</span><h1>{client?"A decision before Tuesday.":"One decision. Thirty-one hours."}</h1><p>{client?"Kavya’s exact proposal fits the planned start and delivery window.":"Ternary’s selection reserves 28 hours each week from 10 August."}</p></div><button onClick={()=>go("selection")}>Review exact commitment <ArrowRight/></button></header><div className="tp-week"><aside><b>AUG</b><strong>10</strong><span>MONDAY</span></aside><article><div className="tp-time"><span>09:00</span><i/><p>Capacity reserved · 28 hrs/week</p></div><div className="tp-time is-action"><span>16:42</span><i/><p><b>Selection response due</b><small>Ternary Health · application v{state.applicationVersion}</small></p><button onClick={()=>go("selection")}>Open</button></div><div className="tp-time"><span>18:00</span><i/><p>Clinical project kickoff window</p></div></article></div><div className="tp-plan-strip">{PROJECT_WEEKS.map(phase=><div key={phase.week}><span>{phase.week}</span><b>{phase.phase}</b><small>{phase.hours}h/week · {phase.outcome}</small></div>)}</div></section>;
}

function TempoDiscover({go}:Pick<TempoProps,"go">) {
  const[active,setActive]=useState(0);
  return <section className="tp-discover"><header><span>OPEN WORK / DEADLINE VIEW</span><h1>What fits next?</h1><p>Opportunities are positioned by application deadline and likely capacity—not urgency theatre.</p></header><div className="tp-calendar"><aside>{["01–03 AUG","04–07 AUG","08–11 AUG"].map((item,index)=><button className={active===index?"is-active":""} key={item} onClick={()=>setActive(index)}><span>{item}</span><b>{GIGS[index].company}</b><small>{GIGS[index].deadline}</small></button>)}</aside><article><span>{GIGS[active].match} EVIDENCE FIT</span><h2>{GIGS[active].title}</h2><p>{GIGS[active].summary}</p><dl><div><dt>COMMITMENT</dt><dd>{GIGS[active].commitment}</dd></div><div><dt>DURATION</dt><dd>{GIGS[active].duration}</dd></div><div><dt>TERMS</dt><dd>{GIGS[active].budget}</dd></div></dl><div className="tp-capacity"><span>AVAILABLE CAPACITY</span><i><b style={{width:"72%"}}/></i><strong>28 / 32 hours</strong></div><button onClick={()=>go("gig")}>Open complete schedule <ArrowRight/></button></article></div></section>;
}

function TempoGig({go}:Pick<TempoProps,"go">) {
  const gig=GIGS[0];
  return <section className="tp-gig"><button onClick={()=>go("discover")}><ArrowLeft/> Deadline view</button><header><div><span>TERNARY HEALTH · TERMS v3</span><h1>{gig.title}</h1><p>{gig.summary}</p></div><aside><CalendarDays/><b>10 AUG → 13 NOV</b><span>{gig.commitment}</span><strong>{gig.budget}</strong><button onClick={()=>go("proposal")}>Plan a proposal</button></aside></header><div className="tp-phases">{PROJECT_WEEKS.map((phase,index)=><article key={phase.week}><span>0{index+1} / {phase.week}</span><h2>{phase.phase}</h2><p>{phase.outcome}</p><b>{phase.hours} hrs/week</b></article>)}</div><footer><div><strong>92</strong><p><b>STRONG EVIDENCE FIT</b>{gig.matchReason}</p></div><div><span>DISCLOSED GAP</span><p>{gig.missingSkills[0]}</p></div></footer></section>;
}

function TempoProposal({go,state,dispatch}:Pick<TempoProps,"go"|"state"|"dispatch">) {
  const[hours,setHours]=useState("28");const invalid=Number(hours)>32||Number(hours)<8;
  return <section className="tp-proposal"><header><span>PROPOSAL v{state.applicationVersion} / DELIVERY PLAN</span><h1>Reserve the work.</h1><p>Each phase becomes part of the official structured proposal.</p></header><form onSubmit={e=>{e.preventDefault();if(!invalid){dispatch({type:"submit-revision"});go("applications")}}}><section><label>FIXED PROPOSAL<input defaultValue="₹5,80,000"/></label><label>AVAILABLE FROM<input type="date" defaultValue="2026-08-10"/></label><label>WEEKLY CAPACITY<input value={hours} onChange={e=>setHours(e.target.value)} inputMode="numeric"/>{invalid&&<small role="alert">Choose between 8 and 32 hours.</small>}</label></section><div className="tp-plan-editor">{PROJECT_WEEKS.map(phase=><label key={phase.week}><span>{phase.week}</span><input defaultValue={phase.phase}/><input defaultValue={phase.outcome}/><b>{hours||0}h</b></label>)}</div><footer><p><LockKeyhole/> Recording creates application v{state.applicationVersion+1} and invalidates selection tied to v{state.applicationVersion}.</p><button disabled={invalid}>Record delivery plan <Send/></button></footer></form></section>;
}

function TempoApplication({go,state,dispatch}:Pick<TempoProps,"go"|"state"|"dispatch">) {
  return <section className="tp-record"><header><span>APPLICATION v{state.applicationVersion}</span><h1>Ternary Health</h1><strong>{state.applicationStage}</strong></header><div className="tp-record-grid"><section><h2>Committed plan</h2>{PROJECT_WEEKS.map(phase=><div className="tp-agenda-row" key={phase.week}><span>{phase.week}</span><i/><div><b>{phase.phase}</b><small>{phase.outcome}</small></div><strong>{phase.hours}h</strong></div>)}</section><aside><span>STRUCTURED Q&A</span><blockquote>{QA.question}</blockquote>{state.qaAnswered?<blockquote className="is-answer">{QA.answer}</blockquote>:<button onClick={()=>dispatch({type:"answer-qa"})}>Record answer</button>}<button onClick={()=>go("proposal")}>Create a new version</button></aside></div>{state.selectionStatus==="pending"&&<button className="tp-alert" onClick={()=>go("selection")}><Clock3/><div><b>Exact capacity commitment waiting</b><span>₹5.8L · 14 weeks · 28 hours/week · 31h remaining</span></div><ArrowRight/></button>}</section>;
}

function TempoReview({go,state}:Pick<TempoProps,"go"|"state">) {
  return <section className="tp-review"><header><span>CLIENT DELIVERY WINDOW / 10 AUG → 13 NOV</span><h1>Who can start—and sustain it?</h1></header><div className="tp-candidate-calendar"><aside><span>PROJECT NEED</span>{PROJECT_WEEKS.map(phase=><div key={phase.week}><b>{phase.week}</b><i style={{width:`${phase.hours/28*100}%`}}/><small>{phase.hours}h</small></div>)}</aside><section>{APPLICANTS.map(person=><button key={person.id} onClick={()=>go("candidate")}><div><strong>{person.match}</strong><span><b>{person.name}</b><small>{person.headline}</small></span></div><p>{person.availability}</p><i><b style={{width:`${Math.min(100,parseInt(person.availability.match(/(\d+)\s*hrs/)?.[1]??"20")/30*100)}%`}}/></i><footer><span>{person.proposal} · {person.timeline}</span><em>{person.id==="kavya"?state.applicationStage:person.stage}</em><ChevronRight/></footer></button>)}</section></div></section>;
}

function TempoCandidate({go,state,dispatch}:Pick<TempoProps,"go"|"state"|"dispatch">) {
  const person=APPLICANTS[0];
  return <section className="tp-candidate"><header><button onClick={()=>go("review")}><ArrowLeft/> Candidates</button><span>APPLICATION v{state.applicationVersion}</span><h1>{person.name}</h1><p>{person.headline} · {person.availability}</p></header><div><section><span>DELIVERY ALIGNMENT</span>{PROJECT_WEEKS.map(phase=><div className="tp-align-row" key={phase.week}><b>{phase.week}</b><i><em style={{width:`${phase.hours/28*100}%`}}/></i><p>{phase.outcome}</p></div>)}</section><aside><span>COMMERCIAL</span><strong>{person.proposal}</strong><p>{person.timeline} · 28 hours/week</p><hr/><span>EVIDENCE / 92</span><p>{person.note}</p><small>{person.gap}</small><button onClick={()=>dispatch({type:"request-revision"})}>Request schedule revision</button></aside></div><footer><button className={state.shortlisted?"is-active":""} onClick={()=>dispatch({type:"toggle-shortlist"})}>{state.shortlisted?"✓ Shortlisted":"+ Shortlist"}</button><button onClick={()=>dispatch({type:"toggle-advance"})}>{state.advanced?"Return to review":"Advance"}</button><button onClick={()=>go("selection")}>Confirm exact schedule <ArrowRight/></button></footer></section>;
}

function TempoSelection({role,go,state,dispatch}:Pick<TempoProps,"role"|"go"|"state"|"dispatch">) {
  const[deadline,setDeadline]=useState<"24"|"48"|"72">(state.selectionDeadline);const client=role==="client";
  return <section className="tp-selection"><header><span>EXACT COMMITMENT</span><h1>Fourteen weeks, fully visible.</h1><p>Application v{state.applicationVersion} · gig terms v3 · {TERMS.proposal}</p></header><div className="tp-selection-plan">{PROJECT_WEEKS.map(phase=><div key={phase.week}><span>{phase.week}</span><i/><b>{phase.phase}</b><p>{phase.outcome}</p><strong>{phase.hours}h/week</strong></div>)}</div><div className="tp-exact-terms"><div><span>START</span><b>10 AUG 2026</b></div><div><span>DELIVERY</span><b>14 WEEKS</b></div><div><span>PROPOSAL</span><b>{TERMS.proposal}</b></div><div><span>APPLICATION</span><b>v{state.applicationVersion}</b></div></div>{client&&state.selectionStatus!=="pending"&&<footer><label>Response window<select value={deadline} onChange={e=>setDeadline(e.target.value as "24"|"48"|"72")}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button onClick={()=>dispatch({type:"send-selection",deadline})}>Send commitment <Send/></button></footer>}{!client&&state.selectionStatus==="pending"&&<footer><p>31 hours remain. Acceptance reserves the schedule above.</p><button onClick={()=>{dispatch({type:"accept-selection"});go("engagement")}}>Accept schedule and terms <Check/></button></footer>}{state.selectionStatus==="accepted"&&<footer><p>Schedule and terms confirmed.</p><button onClick={()=>go("engagement")}>Open engagement <ArrowRight/></button></footer>}</section>;
}

function TempoEngagement({state,dispatch}:Pick<TempoProps,"state"|"dispatch">) {
  return <section className="tp-engagement"><header><span>CONFIRMED ENGAGEMENT</span><h1>Clinical Trial Operations</h1><div><b>{state.engagementStatus.replace("_"," ")}</b><button onClick={()=>dispatch({type:"advance-engagement"})} disabled={state.engagementStatus==="completed"}>Advance lifecycle <ArrowRight/></button></div></header><div className="tp-engagement-grid"><section><span>ACCEPTED SCHEDULE</span>{PROJECT_WEEKS.map(phase=><div className="tp-agenda-row" key={phase.week}><span>{phase.week}</span><i/><div><b>{phase.phase}</b><small>{phase.outcome}</small></div><strong>{phase.hours}h</strong></div>)}</section><aside><span>CONTACT / THIS ENGAGEMENT</span>{!state.contactShared||state.contactRevoked?<><LockKeyhole/><h2>{state.contactRevoked?"Sharing stopped":"No active share"}</h2><p>Contact remains private until participant consent.</p><button onClick={()=>dispatch({type:"share-contact"})}>Share verified email</button></>:<><ShieldCheck/><h2>{state.contactRevealed?"kavya.menon@example.com":"k•••••@example.com"}</h2><button onClick={()=>dispatch({type:state.contactRevealed?"revoke-contact":"reveal-contact"})}>{state.contactRevealed?"Stop future display":"Authorize reveal"}</button></>}</aside></div></section>;
}
