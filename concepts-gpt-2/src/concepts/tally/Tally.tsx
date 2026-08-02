import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleDollarSign, FileCheck2, LockKeyhole, Minus, Plus, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { QUOTE_LINES, quoteTotal } from "../../domain/expansion";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import "./tally.css";

export function Tally(){
  const location=useLocation();const route=useConceptRoute("tally");
  if(location.pathname==="/tally"||location.pathname==="/tally/")return <TallyLanding/>;
  return <TallyApp {...route}/>;
}

function TallyLanding(){
  return <main id="main-content" className="tl-public"><header><Link to="/">11 / INDEX</Link><b>TALLY</b><span>GIGMATCH AI · COMMERCIAL SCOPE REGISTER</span></header><section><div><span>SCOPE BEFORE SPEND</span><h1>Know what<br/>the number<br/><em>contains.</em></h1><p>A serious marketplace for reviewing evidence, shaping exact scope, and confirming a quote without confusing price with suitability.</p><nav><Link to="/tally/freelancer/home">Build a specialist quote <ArrowRight/></Link><Link to="/tally/client/home">Review commercial scope <ArrowRight/></Link></nav></div><aside><header><span>QUOTE TH–042 / v2</span><b>₹5,80,000</b></header>{QUOTE_LINES.map((line,index)=><div key={line.id}><span>0{index+1}</span><p><b>{line.label}</b><small>{line.outcome}</small></p><em>₹{line.amount/1000}K</em></div>)}<footer><span>14 WEEKS · 28 HRS/WEEK</span><b>READY FOR EXACT CONFIRMATION</b></footer></aside></section></main>;
}

interface Props{role:Role;view:ViewId;go:(view:ViewId)=>void;switchRole:(role:Role)=>void;state:ReturnType<typeof useConceptRoute>["state"];dispatch:ReturnType<typeof useConceptRoute>["dispatch"]}

function TallyApp({role,view,go,switchRole,state,dispatch}:Props){
  const nav:{v:ViewId;f:string;c:string}[]=[{v:"home",f:"Register",c:"Register"},{v:role==="client"?"review":"discover",f:"Open scope",c:"Quotes"},{v:role==="client"?"candidate":"applications",f:"My quote",c:"Dossier"},{v:"selection",f:"Confirmation",c:"Confirmation"},{v:"engagement",f:"Engagement",c:"Engagement"}];
  return <div className="tl-app"><header className="tl-header"><Link to="/tally"><CircleDollarSign/>TALLY <small>11</small></Link><nav>{nav.map(item=><button key={item.v} className={view===item.v?"is-active":""} onClick={()=>go(item.v)}>{role==="client"?item.c:item.f}</button>)}</nav><div><button className={role==="freelancer"?"is-active":""} onClick={()=>switchRole("freelancer")}>SPECIALIST</button><button className={role==="client"?"is-active":""} onClick={()=>switchRole("client")}>CLIENT</button></div></header><main id="main-content">
    {view==="home"&&<Home role={role} go={go} state={state}/>}
    {view==="discover"&&<Discover go={go}/>}
    {view==="gig"&&<Gig go={go}/>}
    {view==="proposal"&&<Proposal go={go} state={state} dispatch={dispatch}/>}
    {view==="applications"&&<Application go={go} state={state} dispatch={dispatch}/>}
    {view==="review"&&<Review go={go} state={state}/>}
    {view==="candidate"&&<Candidate go={go} state={state} dispatch={dispatch}/>}
    {view==="selection"&&<Selection role={role} go={go} state={state} dispatch={dispatch}/>}
    {view==="engagement"&&<Engagement state={state} dispatch={dispatch}/>}
  </main><footer className="tl-footer"><Link to="/"><ArrowLeft/> Fifteen concepts</Link><span>TH–042 · APPLICATION v{state.applicationVersion} · GIG v3</span><button onClick={()=>dispatch({type:"reset"})}><RotateCcw/> Reset</button></footer>{state.toast&&<div className="tl-toast" role="status"><Check/>{state.toast}</div>}</div>;
}

function Home({role,go,state}:Pick<Props,"role"|"go"|"state">){
  const client=role==="client";return <section className="tl-home"><header><span>ACTIVE COMMERCIAL REGISTER</span><h1>{client?"Four quotes. One fixed brief.":"Your scope is ready to be confirmed."}</h1><p>{client?"Review evidence and delivery coverage before opening commercial terms.":"Ternary’s request references application v"+state.applicationVersion+" and all four quoted work packages."}</p></header><div className="tl-register"><aside><span>OPEN DECISION</span><strong>31H</strong><b>Selection response remaining</b><button onClick={()=>go("selection")}>Review exact quote <ArrowRight/></button></aside><section><header><b>WORK PACKAGE</b><b>WEEKS</b><b>AMOUNT</b><b>STATUS</b></header>{QUOTE_LINES.map((line,index)=><button key={line.id} onClick={()=>go(client?"candidate":"applications")}><span>0{index+1} / {line.label}<small>{line.outcome}</small></span><b>{line.weeks}</b><b>₹{line.amount/1000}K</b><em>INCLUDED</em></button>)}<footer><span>TOTAL FIXED QUOTE</span><strong>₹{quoteTotal()/100000}L</strong></footer></section></div></section>;
}

function Discover({go}:Pick<Props,"go">){
  const[active,setActive]=useState(0);const gig=GIGS[active];
  return <section className="tl-discover"><header><span>OPEN SCOPE REGISTER</span><h1>Compare the work before the price.</h1><p>Evidence coverage and disclosed gaps remain separate from each commercial model.</p></header><div className="tl-opportunities"><nav>{GIGS.map((item,index)=><button className={active===index?"is-active":""} key={item.id} onClick={()=>setActive(index)}><strong>{item.match}</strong><span><b>{item.company}</b><small>{item.title}</small></span><em>{item.paymentType.toUpperCase()}</em></button>)}</nav><article><span>SCOPE / {gig.company}</span><h2>{gig.title}</h2><p>{gig.summary}</p><dl><div><dt>TERM</dt><dd>{gig.duration}</dd></div><div><dt>CAPACITY</dt><dd>{gig.commitment}</dd></div><div><dt>GUIDANCE</dt><dd>{gig.budget}</dd></div></dl><div className="tl-evidence">{gig.matchingSkills.slice(0,4).map(item=><b key={item}><Check/>{item}</b>)}<b className="is-gap">{gig.missingSkills[0]}</b></div><button onClick={()=>go("gig")}>Inspect complete scope <ArrowRight/></button></article></div></section>;
}

function Gig({go}:Pick<Props,"go">){
  const gig=GIGS[0];return <section className="tl-gig"><header><button onClick={()=>go("discover")}><ArrowLeft/> Scope register</button><span>TERNARY HEALTH / GIG TERMS v3</span><h1>{gig.title}</h1><p>{gig.summary}</p></header><div className="tl-gig-grid"><section><h2>Required work packages</h2>{gig.deliverables.map((item,index)=><div key={item}><span>0{index+1}</span><p>{item}</p><b>{QUOTE_LINES[index].weeks}</b></div>)}</section><aside><span>MATERIAL GUIDANCE</span><strong>{gig.budget}</strong><b>{gig.duration}</b><b>{gig.commitment}</b><hr/><span>EVIDENCE FIT / PRICE EXCLUDED</span><strong>92</strong><p>{gig.matchReason}</p></aside></div><button className="tl-primary" onClick={()=>go("proposal")}>Compose structured quote <ArrowRight/></button></section>;
}

function Proposal({go,state,dispatch}:Pick<Props,"go"|"state"|"dispatch">){
  const[amounts,setAmounts]=useState<number[]>(()=>QUOTE_LINES.map(item=>item.amount));const total=amounts.reduce((sum,item)=>sum+item,0);const invalid=total!==580000;
  function change(index:number,value:string){setAmounts(current=>current.map((item,i)=>i===index?Number(value):item))}
  return <section className="tl-proposal"><header><span>QUOTE BUILDER / APPLICATION v{state.applicationVersion+1}</span><h1>Allocate the promise precisely.</h1><p>The fixed total must remain ₹5.8L. Every amount maps to a real delivery package.</p></header><form onSubmit={event=>{event.preventDefault();if(!invalid){dispatch({type:"submit-revision"});go("applications")}}}><header><b>PACKAGE</b><b>DELIVERY</b><b>WEEKS</b><b>AMOUNT</b></header>{QUOTE_LINES.map((line,index)=><label key={line.id}><span>0{index+1} / {line.label}</span><input aria-label={`${line.label} outcome`} defaultValue={line.outcome}/><b>{line.weeks}</b><span className="tl-money">₹<input aria-label={`${line.label} amount`} inputMode="numeric" value={amounts[index]} onChange={event=>change(index,event.target.value)}/></span></label>)}<footer><div><span>FIXED QUOTE TOTAL</span><strong>₹{(total/100000).toFixed(2)}L</strong>{invalid&&<small role="alert">Allocate exactly ₹5,80,000 before recording.</small>}</div><button disabled={invalid}>Record quote v{state.applicationVersion+1} <Send/></button></footer></form><p className="tl-warning"><LockKeyhole/> Recording a new version invalidates any active selection tied to v{state.applicationVersion}.</p></section>;
}

function Application({go,state,dispatch}:Pick<Props,"go"|"state"|"dispatch">){
  return <section className="tl-application"><header><span>MY COMMERCIAL RECORD / v{state.applicationVersion}</span><h1>Everything included. Nothing implied.</h1><b>{state.applicationStage}</b></header><div className="tl-quote-sheet">{QUOTE_LINES.map((line,index)=><div key={line.id}><span>0{index+1}</span><p><b>{line.label}</b><small>{line.outcome}</small></p><em>₹{line.amount/1000}K</em></div>)}<footer><span>TOTAL</span><strong>{TERMS.proposal}</strong></footer></div><section className="tl-qa"><span>STRUCTURED Q&A</span><blockquote>{QA.question}</blockquote>{state.qaAnswered?<p>{QA.answer}</p>:<button onClick={()=>dispatch({type:"answer-qa"})}>Record answer</button>}</section><footer><button onClick={()=>go("proposal")}>Create revised quote</button>{state.selectionStatus==="pending"&&<button onClick={()=>go("selection")}>Review confirmation receipt <ArrowRight/></button>}</footer></section>;
}

function Review({go,state}:Pick<Props,"go"|"state">){
  return <section className="tl-review"><header><span>CLIENT QUOTE REGISTER / TH–042</span><h1>Coverage first. Commercials second.</h1></header><div className="tl-review-register"><header><b>APPLICANT</b><b>SCOPE</b><b>AVAILABILITY</b><b>VERSION</b><b>QUOTE</b></header>{APPLICANTS.map(person=><button key={person.id} onClick={()=>go("candidate")}><span><strong>{person.match}</strong><b>{person.name}</b><small>{person.headline}</small></span><em>{person.skills.length}/4 packages</em><em>{person.availability}</em><em>v{person.id==="kavya"?state.applicationVersion:person.version}</em><b>{person.proposal}</b><ChevronRight/></button>)}</div><p className="tl-note">The private shortlist and commercial proposal do not influence evidence fit.</p></section>;
}

function Candidate({go,state,dispatch}:Pick<Props,"go"|"state"|"dispatch">){
  const person=APPLICANTS[0];return <section className="tl-candidate"><header><button onClick={()=>go("review")}><ArrowLeft/> Quote register</button><span>AP.001 / APPLICATION v{state.applicationVersion}</span><h1>{person.name}</h1><p>{person.headline}</p></header><div className="tl-candidate-grid"><section><span>DELIVERY COVERAGE</span>{QUOTE_LINES.map((line,index)=><div key={line.id}><b>0{index+1}</b><p>{line.outcome}</p><Check/></div>)}</section><aside><span>COMMERCIAL QUOTE</span><strong>{person.proposal}</strong><b>{person.timeline}</b><b>{person.availability}</b><hr/><span>DISCLOSED GAP</span><p>{person.gap}</p><button onClick={()=>dispatch({type:"request-revision"})}>Request quote revision</button></aside></div><footer><button className={state.shortlisted?"is-active":""} onClick={()=>dispatch({type:"toggle-shortlist"})}>{state.shortlisted?"✓ Private shortlist":"+ Private shortlist"}</button><button onClick={()=>dispatch({type:"toggle-advance"})}>{state.advanced?"Return to review":"Advance"}</button><button onClick={()=>go("selection")}>Prepare confirmation receipt <ArrowRight/></button></footer></section>;
}

function Selection({role,go,state,dispatch}:Pick<Props,"role"|"go"|"state"|"dispatch">){
  const[deadline,setDeadline]=useState<"24"|"48"|"72">(state.selectionDeadline);const client=role==="client";
  return <section className="tl-selection"><header><FileCheck2/><span>EXACT-VERSION CONFIRMATION RECEIPT</span><h1>Quote TH–042 / AP.001</h1><p>This confirms marketplace terms and creates an engagement. It is not a legal contract or payment instruction.</p></header><div className="tl-receipt">{QUOTE_LINES.map((line,index)=><div key={line.id}><span>0{index+1} / {line.label}</span><b>{line.weeks}</b><em>₹{line.amount/1000}K</em></div>)}<footer><div><span>APPLICATION</span><b>v{state.applicationVersion}</b></div><div><span>GIG TERMS</span><b>v3</b></div><div><span>FIXED TOTAL</span><strong>{TERMS.proposal}</strong></div></footer></div>
    {state.selectionStatus==="invalidated"&&<aside className="tl-invalid"><Minus/><div><b>RECEIPT INVALIDATED</b><p>The quote changed. Issue a fresh exact-version confirmation.</p></div></aside>}
    {state.selectionStatus==="none"&&<aside className="tl-expired"><FileCheck2/><div><b>NO ACTIVE RECEIPT</b><p>The previous response window expired or was withdrawn. A fresh request is required.</p></div></aside>}
    {client&&state.selectionStatus!=="pending"&&<footer><label>RESPONSE WINDOW<select value={deadline} onChange={event=>setDeadline(event.target.value as "24"|"48"|"72")}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button onClick={()=>dispatch({type:"send-selection",deadline})}>Send exact receipt <Send/></button></footer>}
    {!client&&state.selectionStatus==="pending"&&<footer><p>31 hours remain. All included packages are shown above.</p><button onClick={()=>{dispatch({type:"accept-selection"});go("engagement")}}>Accept quote and terms <Check/></button></footer>}
    {state.selectionStatus==="accepted"&&<footer><p>Exact quote confirmed.</p><button onClick={()=>go("engagement")}>Open engagement <ArrowRight/></button></footer>}
  </section>;
}

function Engagement({state,dispatch}:Pick<Props,"state"|"dispatch">){
  return <section className="tl-engagement"><header><span>CONFIRMED COMMERCIAL REGISTER</span><h1>Ternary Health × Kavya Menon</h1><p>{state.engagementStatus.replaceAll("_"," ")} · application v{state.applicationVersion} · gig v3</p></header><div className="tl-engagement-grid"><section>{QUOTE_LINES.map((line,index)=><div key={line.id}><span>0{index+1}</span><p><b>{line.label}</b><small>{line.outcome}</small></p><em>₹{line.amount/1000}K</em></div>)}<button onClick={()=>dispatch({type:"advance-engagement"})} disabled={state.engagementStatus==="completed"}>Advance lifecycle <ArrowRight/></button></section><aside><span>CONTACT / ENGAGEMENT-SCOPED</span>{!state.contactShared||state.contactRevoked?<><LockKeyhole/><strong>{state.contactRevoked?"DISPLAY STOPPED":"MASKED"}</strong><p>Verified contact remains private until active consent.</p><button onClick={()=>dispatch({type:"share-contact"})}><Plus/> Share verified email</button></>:<><ShieldCheck/><strong>{state.contactRevealed?"kavya.menon@example.com":"k•••••@example.com"}</strong><button onClick={()=>dispatch({type:state.contactRevealed?"revoke-contact":"reveal-contact"})}>{state.contactRevealed?"Stop future display":"Authorize reveal"}</button></>}</aside></div></section>;
}
