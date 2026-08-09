import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Eye, LockKeyhole, Send, X } from "lucide-react";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { ConceptViewProps } from "../command-current/Shared";

interface TimelineEvent {
  id: string;
  label: string;
  title: string;
  detail: string;
  meta: string;
  state: "complete" | "current" | "pending" | "revision" | "work";
  branch?: boolean;
  panel?: ReactNode;
}

function Metrics({ children }: { children: ReactNode }) { return <div className="de-event-metrics">{children}</div>; }
function Metric({ label,value }: { label:string;value:string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

function OpportunityPanel({ role,selectedRecord,setSelectedRecord,go }: ConceptViewProps) {
  const reduced=useReducedMotion();
  const records=role==="client"?APPLICANTS:GIGS; const active=records[selectedRecord]??records[0]; const applicant="name" in active;
  return <div className="de-event-work"><div className="de-record-tabs" aria-label={applicant?"Applicant records":"Market records"}>{records.map((record,index)=><button key={record.id} aria-pressed={selectedRecord===index} onClick={()=>setSelectedRecord(index)}><i>{index+1}</i><span>{"name" in record?record.name:record.company}</span><b>{record.match}%</b></button>)}</div><AnimatePresence mode="wait"><motion.div key={active.id} initial={reduced?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={reduced?undefined:{opacity:0,y:-8}} transition={{duration:reduced?0:.28}}><h3>{applicant?active.name:active.title}</h3><p>{applicant?active.headline:active.summary}</p><Metrics><Metric label="Evidence fit" value={`${active.match}%`}/><Metric label={applicant?"Proposal":"Budget"} value={applicant?active.proposal:active.budget}/><Metric label={applicant?"Availability":"Deadline"} value={applicant?active.availability:active.deadline}/></Metrics><button className="de-primary" onClick={()=>go(applicant?"candidate":"gig")}>Open complete record<ArrowRight/></button></motion.div></AnimatePresence></div>;
}

function ApplicationPanel({ role,state,dispatch,go }: ConceptViewProps) {
  return <div className="de-event-work"><h3>Kavya Menon → Ternary Health</h3><p>Proposal, clarification, evidence, and authority are carried by Application v{state.applicationVersion}.</p><Metrics><Metric label="Stage" value={state.applicationStage}/><Metric label="Proposal" value={TERMS.proposal}/><Metric label="Selection" value={state.selectionStatus}/></Metrics><blockquote>{QA.question}</blockquote>{state.qaAnswered?<p>{QA.answer}</p>:role==="freelancer"?<button className="de-primary" onClick={()=>dispatch({type:"answer-qa"})}>Record answer</button>:<p>Waiting for Kavya’s answer.</p>}<div className="de-event-actions">{role==="freelancer"?<button onClick={()=>go("proposal")}>Revise proposal</button>:<button onClick={()=>dispatch({type:"toggle-shortlist"})}>{state.shortlisted?"Remove shortlist":"Add shortlist"}</button>}<button className="de-primary" onClick={()=>go("selection")}>Review selection<ArrowRight/></button></div></div>;
}

function ProposalPanel({ state,dispatch,go }: ConceptViewProps) {
  const [reason,setReason]=useState(""); const invalid=reason.trim().length<18;
  return <form className="de-event-work de-revision-form" onSubmit={event=>{event.preventDefault();if(!invalid){dispatch({type:"submit-revision"});go("applications");}}}><h3>Release Application v{state.applicationVersion+1}</h3><p>The existing version remains in history. Pending authority stays attached to the version it addressed.</p><div className="de-field-grid"><label>Fixed proposal<input defaultValue="₹5.8L"/></label><label>Weekly capacity<input type="number" defaultValue="28" min="26" max="30"/></label><label>Workshops<input type="number" defaultValue="4" min="1"/></label></div><label>Why the record changed<textarea value={reason} onChange={event=>setReason(event.target.value)} placeholder="Describe the changed delivery commitment."/>{invalid?<small role="alert">Add at least 18 characters.</small>:null}</label><p className="de-branch-warning"><X/>Selection for Application v{state.applicationVersion} will remain visible as invalidated.</p><button className="de-primary" disabled={invalid}>Release immutable revision<Send/></button></form>;
}

function SelectionPanel({ role,state,dispatch,go }: ConceptViewProps) {
  const [deadline,setDeadline]=useState<"24"|"48"|"72">(state.selectionDeadline); const status=state.selectionRequest?.status??state.selectionStatus;
  return <div className="de-event-work"><h3>{status==="accepted"?"Exact versions accepted":"Exact-version authority"}</h3><p>Only the listed gig and application versions can create the engagement.</p><Metrics><Metric label="Gig source" value={`TH–042 / v${state.gigVersion}`}/><Metric label="Application" value={`AP.001 / v${state.applicationVersion}`}/><Metric label="Commercial" value={TERMS.proposal}/></Metrics>{status==="invalidated"||status==="expired"?<p className="de-branch-warning" role="alert"><X/>{status==="expired"?"This response window closed.":"This request remains attached to the previous application branch."}</p>:null}<div className="de-event-actions">{role==="client"&&status!=="pending"&&status!=="accepted"?<><label>Response window<select value={deadline} onChange={event=>setDeadline(event.target.value as typeof deadline)}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button className="de-primary" onClick={()=>dispatch({type:"send-selection",deadline})}>Send fresh selection<Send/></button></>:null}{role==="freelancer"&&status==="pending"?<button className="de-primary" onClick={()=>{dispatch({type:"accept-selection"});go("engagement");}}>Accept and create engagement<Check/></button>:null}{status==="accepted"?<button className="de-primary" onClick={()=>go("engagement")}>Open engagement<ArrowRight/></button>:null}</div></div>;
}

function EngagementPanel({ state,dispatch }: ConceptViewProps) {
  const permission=state.contactPermission;
  return <div className="de-event-work"><h3>Engagement EN.001</h3><p>The accepted source record continues through work and permission changes.</p><Metrics><Metric label="Status" value={state.engagementStatus.replaceAll("_"," ")}/><Metric label="Proposal" value={state.engagement?.proposal??TERMS.proposal}/><Metric label="Duration" value={state.engagement?.duration??TERMS.timeline}/></Metrics><div className="de-engagement-actions"><button className="de-primary" disabled={state.engagementStatus==="completed"} onClick={()=>dispatch({type:"advance-engagement"})}>Advance work state</button><div>{permission.revealed?<Eye/>:<LockKeyhole/>}<span><small>Contact permission</small><b>{permission.revealed?"kavya.menon@example.com":permission.consentActive&&!permission.revoked?"k•••••@example.com":"Private"}</b></span>{!permission.consentActive||permission.revoked?<button onClick={()=>dispatch({type:"share-contact"})}>Record consent</button>:permission.revealed?<button onClick={()=>dispatch({type:"revoke-contact"})}>Revoke display</button>:<button onClick={()=>dispatch({type:"reveal-contact"})}>Authorize reveal</button>}</div></div></div>;
}

function eventForView(view: ConceptViewProps["view"]) {
  if(view==="discover"||view==="review"||view==="gig")return "opportunity";
  if(view==="proposal")return "revision";
  if(view==="applications"||view==="candidate"||view==="home")return "application";
  if(view==="selection")return "selection";
  return "engagement";
}

export function DeltaView(props: ConceptViewProps) {
  const { state,view }=props; const reduced=useReducedMotion(); const activeDefault=eventForView(view); const [selectedEvent,setSelectedEvent]=useState(activeDefault);
  const selectionStatus=state.selectionRequest?.status??state.selectionStatus;
  const events:TimelineEvent[]=[
    {id:"opportunity",label:"MARKET",title:props.role==="client"?"Applicant evidence entered":"Ternary Health discovered",detail:props.role==="client"?"Four normalized records are available for review.":"92% evidence fit · Senior frontend systems engineer",meta:"Source record",state:"complete",panel:<OpportunityPanel {...props}/>},
    {id:"application",label:"APPLICATION",title:`Application v${state.applicationVersion} is current`,detail:`${state.applicationStage} · clarification ${state.qaAnswered?"answered":"waiting"}`,meta:"AP.001",state:view==="applications"||view==="candidate"||view==="home"?"current":"complete",panel:<ApplicationPanel {...props}/>},
    ...(state.applicationVersion>2?[{id:"old-selection",label:"INVALIDATED AUTHORITY",title:"Selection remains on Application v2",detail:"The revision did not rewrite history; the old request is visibly detached.",meta:"Selection v2",state:"revision" as const,branch:true}]:[]),
    {id:"revision",label:"PROPOSAL VERSION",title:state.applicationVersion>2?`Application v${state.applicationVersion} branched from v2`:`Prepare Application v${state.applicationVersion+1}`,detail:state.applicationVersion>2?"Immutable revision recorded":"A release creates a new immutable proposal version",meta:`Proposal ${TERMS.proposal}`,state:view==="proposal"?"revision":state.applicationVersion>2?"complete":"pending",branch:true,panel:<ProposalPanel {...props}/>},
    {id:"selection",label:"SELECTION",title:selectionStatus==="accepted"?"Exact versions accepted":selectionStatus==="invalidated"?"Fresh authority required":"Exact versions awaiting authority",detail:`Gig terms v${state.gigVersion} · Application v${state.applicationVersion}`,meta:selectionStatus,state:view==="selection"?"current":selectionStatus==="accepted"?"complete":selectionStatus==="invalidated"?"revision":"pending",panel:<SelectionPanel {...props}/>},
    {id:"engagement",label:"ENGAGEMENT",title:state.engagement?"Engagement EN.001 created":"Engagement will begin here",detail:state.engagement?`${state.engagementStatus.replaceAll("_"," ")} · ${state.engagement.proposal}`:"Waiting for exact acceptance",meta:state.engagement?"Connected":"Pending",state:state.engagement?"work":"pending",panel:<EngagementPanel {...props}/>},
    ...state.activity.slice(0,2).map((item,index)=>({id:`activity-${item.id}`,label:"RECENT ACTIVITY",title:item.title,detail:item.detail,meta:item.at,state:(index===0?"current":"complete") as TimelineEvent["state"]})),
  ];
  return <section className="de-timeline-view"><header className="de-view-head"><span>RECORD TIMELINE / {state.applicationVersion>2?"BRANCHED":"CURRENT"}</span><h1>{view==="engagement"?"Work keeps its accepted source.":view==="selection"?"Authority has a visible history.":view==="proposal"?"A revision creates a real branch.":"One record, from discovery to delivery."}</h1><p>Select any event to inspect the task, versions, and consequence attached to that moment.</p></header><div className="de-timeline" data-active={selectedEvent}><motion.div className="de-timeline-current" initial={reduced?false:{scaleY:0}} animate={{scaleY:1}} transition={{duration:reduced?0:.58,ease:[.22,1,.36,1]}}/>{events.map((event,index)=>{const selected=selectedEvent===event.id;return <motion.article layout={!reduced} key={event.id} className={`de-event is-${event.state} ${event.branch?"is-branch":""} ${selected?"is-selected":""}`}><button className="de-event-trigger" aria-expanded={selected} onClick={()=>setSelectedEvent(selected?"":event.id)}><i>{String(index+1).padStart(2,"0")}</i><span><small>{event.label}</small><b>{event.title}</b><em>{event.detail}</em></span><strong>{event.meta}</strong><ArrowRight/></button><AnimatePresence initial={false}>{selected&&event.panel?<motion.div className="de-event-panel" initial={reduced?false:{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:reduced?0:.34,ease:[.22,1,.36,1]}}>{event.panel}</motion.div>:null}</AnimatePresence></motion.article>})}</div></section>;
}
