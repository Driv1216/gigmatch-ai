import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Eye, LockKeyhole, Send, ShieldCheck, X } from "lucide-react";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { ConceptViewProps } from "../command-current/Shared";

interface LaneDefinition {
  id: string;
  command: string;
  summary: string;
  status: string;
  tone?: "bone" | "glass" | "coral" | "ocean";
  content: ReactNode;
}

function LaneField({ eyebrow, title, copy, lanes, initialOpen = null }: { eyebrow: string; title: string; copy: string; lanes: LaneDefinition[]; initialOpen?: string | null }) {
  const [openLane, setOpenLane] = useState<string | null>(initialOpen);
  const reduced = useReducedMotion();
  return <section className="sw-lane-view">
    <header className="sw-view-head"><span>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></header>
    <div className="sw-lanes" data-open={openLane ?? "none"}>
      {lanes.map((lane, index) => {
        const open = openLane === lane.id;
        return <motion.article layout={!reduced} key={lane.id} className={`sw-lane is-${lane.tone ?? "bone"} ${open ? "is-open" : ""}`} transition={{duration:reduced?0:.34,ease:[.22,1,.36,1]}}>
          <button className="sw-lane-trigger" aria-expanded={open} aria-controls={`sw-lane-${lane.id}`} onClick={() => setOpenLane(open ? null : lane.id)}>
            <span>{String(index + 1).padStart(2,"0")}</span><div><b>{lane.command}</b><small>{lane.summary}</small></div><em>{lane.status}</em><ArrowRight/>
          </button>
          <AnimatePresence initial={false}>{open ? <motion.div id={`sw-lane-${lane.id}`} className="sw-lane-body" initial={reduced?false:{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:reduced?0:.32,ease:[.22,1,.36,1]}}>{lane.content}</motion.div> : null}</AnimatePresence>
        </motion.article>;
      })}
    </div>
  </section>;
}

function MetricRow({ children }: { children: ReactNode }) { return <div className="sw-lane-metrics">{children}</div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

function Home(props: ConceptViewProps) {
  const { role, state, go } = props;
  const client = role === "client";
  const status = state.selectionRequest?.status ?? state.selectionStatus;
  const lanes: LaneDefinition[] = [
    { id:"market", command:client?"compare applicants":"open market", summary:client?"Four normalized evidence records":"Three evidence-matched opportunities", status:client?"4 records":"3 records", tone:"bone", content:<div className="sw-inline-work"><MetricRow><Metric label="Top evidence fit" value="92%"/><Metric label={client?"Candidates":"Open briefs"} value={client?"4":"3"}/><Metric label="Updated" value="Today"/></MetricRow><button className="sw-primary" onClick={()=>go(client?"review":"discover")}>Open {client?"applicants":"market"}<ArrowRight/></button></div> },
    { id:"application", command:client?"open kavya":"open application", summary:`Application v${state.applicationVersion} · ${state.applicationStage}`, status:"current", tone:"glass", content:<div className="sw-inline-work"><h2>Kavya Menon → Ternary Health</h2><p>The proposal, evidence, and clarification stay attached to one immutable record.</p><button className="sw-primary" onClick={()=>go(client?"candidate":"applications")}>Open complete record<ArrowRight/></button></div> },
    { id:"selection", command:"review selection", summary:`${TERMS.proposal} · 31 hours remain`, status:status === "pending"?"response requested":status, tone:"coral", content:<div className="sw-inline-work"><MetricRow><Metric label="Gig terms" value={`v${state.gigVersion}`}/><Metric label="Application" value={`v${state.applicationVersion}`}/><Metric label="Authority" value={status}/></MetricRow><button className="sw-primary" onClick={()=>go("selection")}>Review exact selection<ArrowRight/></button></div> },
  ];
  return <LaneField eyebrow="HOME / ACTIVE COMMANDS" title={client?"Four applicants. One decision.":"Your next moves, already in context."} copy="Hover to inspect. Open a lane to work without losing the surrounding record." lanes={lanes} initialOpen="selection"/>;
}

function Market(props: ConceptViewProps) {
  const { role, selectedRecord, setSelectedRecord, go } = props;
  const records = role === "client" ? APPLICANTS : GIGS;
  const applicant = role === "client";
  const lanes: LaneDefinition[] = records.map((record,index) => ({
    id:record.id, command:applicant?`open ${"name" in record?record.name.toLowerCase():"record"}`:`open ${"company" in record?record.company.toLowerCase():"brief"}`,
    summary:"headline" in record?record.headline:record.title, status:`${record.match}% fit`, tone:index===0?"glass":"bone",
    content:<div className="sw-inline-work"><MetricRow><Metric label="Evidence fit" value={`${record.match}%`}/><Metric label={applicant?"Proposal":"Budget"} value={"proposal" in record?record.proposal:record.budget}/><Metric label={applicant?"Availability":"Deadline"} value={"availability" in record?record.availability:record.deadline}/></MetricRow><div className="sw-inline-copy"><div><span>Why it matches</span><p>{"note" in record?record.note:record.matchReason}</p></div><div><span>Disclosed gap</span><p>{"gap" in record?record.gap:record.missingSkills[0]}</p></div></div><button className="sw-primary" onClick={()=>{setSelectedRecord(index);go(applicant?"candidate":"gig");}}>Open complete record<ArrowRight/></button></div>
  }));
  return <LaneField eyebrow={applicant?"APPLICANTS / EVIDENCE DESC":"MARKET / EVIDENCE DESC"} title={applicant?"Compare records without leaving the field.":"Three briefs worth opening."} copy="Each lane holds its evidence, commercial terms, timing, and disclosed gap." lanes={lanes} initialOpen={records[selectedRecord]?.id ?? records[0].id}/>;
}

function Gig({ go }: ConceptViewProps) {
  const gig=GIGS[0];
  return <LaneField eyebrow="MARKET / TH–042" title="Senior frontend systems engineer" copy={gig.summary} initialOpen="terms" lanes={[
    {id:"outcome",command:"inspect outcome",summary:gig.deliverables[0],status:"required",tone:"bone",content:<div className="sw-inline-list">{gig.deliverables.map((item,index)=><p key={item}><b>0{index+1}</b>{item}</p>)}</div>},
    {id:"evidence",command:"review required evidence",summary:gig.requiredSkills.join(" · "),status:`${gig.requiredSkills.length} signals`,tone:"glass",content:<div className="sw-inline-list">{gig.requiredSkills.map(item=><p key={item}><Check/>{item}</p>)}</div>},
    {id:"terms",command:"open material terms",summary:`${gig.budget} · ${gig.duration}`,status:gig.deadline,tone:"coral",content:<div className="sw-inline-work"><MetricRow><Metric label="Commercial" value={gig.budget}/><Metric label="Duration" value={gig.duration}/><Metric label="Capacity" value={gig.commitment}/></MetricRow><button className="sw-primary" onClick={()=>go("proposal")}>Build proposal<ArrowRight/></button></div>},
  ]}/>;
}

function Proposal({ state, dispatch, go }: ConceptViewProps) {
  const [reason,setReason]=useState(""); const invalid=reason.trim().length<18;
  return <LaneField eyebrow={`APPLICATION / PROPOSAL V${state.applicationVersion}`} title="Revise the promise with consequence visible." copy="A new immutable version stays attached to the authority it replaces." initialOpen="reason" lanes={[
    {id:"commercial",command:"edit commercial terms",summary:`${TERMS.proposal} · 14 weeks`,status:"editable",tone:"bone",content:<div className="sw-inline-form"><label>Fixed proposal<input defaultValue="₹5.8L"/></label><label>Weekly capacity<input type="number" defaultValue="28" min="26" max="30"/></label><label>Workshops<input type="number" defaultValue="4" min="1"/></label></div>},
    {id:"reason",command:"describe the revision",summary:"Explain the changed delivery commitment",status:invalid?"required":"ready",tone:"glass",content:<div className="sw-inline-work"><label className="sw-wide-field">Revision reason<textarea value={reason} onChange={event=>setReason(event.target.value)} placeholder="What changed and why?"/>{invalid?<small role="alert">Add at least 18 characters.</small>:null}</label></div>},
    {id:"consequence",command:"release application v"+(state.applicationVersion+1),summary:"Pending authority detaches from the previous version",status:invalid?"blocked":"ready",tone:"coral",content:<div className="sw-inline-work"><p className="sw-consequence"><X/>Application v{state.applicationVersion} remains in history; its pending selection becomes invalidated.</p><button className="sw-primary" disabled={invalid} onClick={()=>{dispatch({type:"submit-revision"});go("applications");}}>Release new version<Send/></button></div>},
  ]}/>;
}

function Application({ role,state,dispatch,go }: ConceptViewProps) {
  return <LaneField eyebrow={`APPLICATION / AP.001 / V${state.applicationVersion}`} title="Kavya Menon → Ternary Health" copy="Proposal, clarification, evidence, and authority remain one inspectable record." initialOpen="proposal" lanes={[
    {id:"proposal",command:"open proposal",summary:`${TERMS.proposal} · ${TERMS.timeline} · ${TERMS.availability}`,status:`v${state.applicationVersion}`,tone:"glass",content:<div className="sw-inline-work"><MetricRow><Metric label="Commercial" value={TERMS.proposal}/><Metric label="Delivery" value={TERMS.timeline}/><Metric label="Capacity" value="28 hrs/week"/></MetricRow>{role==="freelancer"?<button className="sw-primary" onClick={()=>go("proposal")}>Revise proposal<ArrowRight/></button>:null}</div>},
    {id:"qa",command:"inspect clarification",summary:QA.question,status:state.qaAnswered?"answered":"waiting",tone:"bone",content:<div className="sw-inline-work"><blockquote>{QA.question}</blockquote>{state.qaAnswered?<p>{QA.answer}</p>:role==="freelancer"?<button className="sw-primary" onClick={()=>dispatch({type:"answer-qa"})}>Record answer</button>:<p>Waiting for Kavya’s response.</p>}</div>},
    {id:"review",command:"review application state",summary:`${state.applicationStage} · selection ${state.selectionStatus}`,status:state.shortlisted?"shortlisted":"active",tone:"coral",content:<div className="sw-inline-work"><MetricRow><Metric label="Stage" value={state.applicationStage}/><Metric label="Selection" value={state.selectionStatus}/><Metric label="Version" value={`v${state.applicationVersion}`}/></MetricRow>{role==="client"?<button className="sw-primary" onClick={()=>dispatch({type:"toggle-shortlist"})}>{state.shortlisted?"Remove shortlist":"Add shortlist"}</button>:<button className="sw-primary" onClick={()=>go("selection")}>Review selection<ArrowRight/></button>}</div>},
  ]}/>;
}

function Selection({ role,state,dispatch,go }: ConceptViewProps) {
  const [deadline,setDeadline]=useState<"24"|"48"|"72">(state.selectionDeadline); const status=state.selectionRequest?.status??state.selectionStatus;
  return <LaneField eyebrow="SELECTION / EXACT AUTHORITY" title="Only matching versions can become work." copy="The source record, consequence, and available authority remain visible in one field." initialOpen="authority" lanes={[
    {id:"sources",command:"inspect exact versions",summary:`Gig terms v${state.gigVersion} · Application v${state.applicationVersion}`,status:"matched",tone:"glass",content:<div className="sw-inline-work"><MetricRow><Metric label="Gig" value={`TH–042 / v${state.gigVersion}`}/><Metric label="Application" value={`AP.001 / v${state.applicationVersion}`}/><Metric label="Proposal" value={TERMS.proposal}/></MetricRow></div>},
    {id:"consequence",command:"review binding consequence",summary:`${TERMS.timeline} · 28 hours/week`,status:status,tone:status==="invalidated"?"coral":"bone",content:<div className="sw-inline-work"><p><ShieldCheck/>Acceptance creates an engagement bound to these exact versions. Any later revision requires fresh authority.</p>{status==="invalidated"||status==="expired"?<p className="sw-consequence" role="alert"><X/>{status==="expired"?"The response window closed.":"The previous request remains attached to the old application version."}</p>:null}</div>},
    {id:"authority",command:status==="accepted"?"open engagement":role==="client"?"send exact selection":"accept exact selection",summary:status==="pending"?`${state.selectionDeadline} hour response window`:`Selection is ${status}`,status,tone:"ocean",content:<div className="sw-inline-work sw-authority-work">{role==="client"&&status!=="pending"&&status!=="accepted"?<><label>Response window<select value={deadline} onChange={event=>setDeadline(event.target.value as typeof deadline)}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button className="sw-primary" onClick={()=>dispatch({type:"send-selection",deadline})}>Send fresh selection<Send/></button></>:null}{role==="freelancer"&&status==="pending"?<button className="sw-primary" onClick={()=>{dispatch({type:"accept-selection"});go("engagement");}}>Accept terms and create engagement<Check/></button>:null}{status==="accepted"?<button className="sw-primary" onClick={()=>go("engagement")}>Open engagement<ArrowRight/></button>:null}</div>},
  ]}/>;
}

function Engagement({ state,dispatch }: ConceptViewProps) {
  const permission=state.contactPermission;
  return <LaneField eyebrow="ENGAGEMENT / EN.001" title="Accepted terms continue into delivery." copy="Status, activity, immutable terms, and contact authority remain independent operational lanes." initialOpen="status" lanes={[
    {id:"status",command:"advance engagement",summary:`Current state · ${state.engagementStatus.replaceAll("_"," ")}`,status:state.engagementStatus,tone:"ocean",content:<div className="sw-inline-work"><MetricRow><Metric label="Proposal" value={state.engagement?.proposal??TERMS.proposal}/><Metric label="Duration" value={state.engagement?.duration??TERMS.timeline}/><Metric label="Capacity" value={state.engagement?.capacity??"28 hours/week"}/></MetricRow><button className="sw-primary" disabled={state.engagementStatus==="completed"} onClick={()=>dispatch({type:"advance-engagement"})}>Advance work state</button></div>},
    {id:"activity",command:"inspect recent activity",summary:state.activity[0]?.title??"No recent activity",status:`${state.activity.length} events`,tone:"bone",content:<div className="sw-inline-list">{state.activity.slice(0,4).map(item=><p key={item.id}><b>{item.at}</b><span>{item.title}<small>{item.detail}</small></span></p>)}</div>},
    {id:"contact",command:"manage contact permission",summary:permission.revealed?"Contact visible":permission.consentActive&&!permission.revoked?"Consent active":"Contact private",status:permission.revoked?"revoked":permission.revealed?"revealed":"private",tone:"glass",content:<div className="sw-inline-work sw-contact-work">{permission.revealed?<Eye/>:<LockKeyhole/>}<strong>{permission.revealed?"kavya.menon@example.com":permission.consentActive&&!permission.revoked?"k•••••@example.com":"Private"}</strong>{!permission.consentActive||permission.revoked?<button className="sw-primary" onClick={()=>dispatch({type:"share-contact"})}>Record consent</button>:permission.revealed?<button className="sw-primary" onClick={()=>dispatch({type:"revoke-contact"})}>Revoke display</button>:<button className="sw-primary" onClick={()=>dispatch({type:"reveal-contact"})}>Authorize reveal</button>}</div>},
  ]}/>;
}

export function SwitchboardView(props: ConceptViewProps) {
  if(props.view==="home")return <Home {...props}/>;
  if(props.view==="discover"||props.view==="review")return <Market {...props}/>;
  if(props.view==="gig")return <Gig {...props}/>;
  if(props.view==="proposal")return <Proposal {...props}/>;
  if(props.view==="applications"||props.view==="candidate")return <Application {...props}/>;
  if(props.view==="selection")return <Selection {...props}/>;
  return <Engagement {...props}/>;
}
