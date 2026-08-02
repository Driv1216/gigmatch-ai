import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Circle, LockKeyhole,
  Menu, RotateCcw, Send, ShieldCheck, X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import "./monument.css";

export function Monument() {
  const location = useLocation();
  const route = useConceptRoute("monument");
  if (location.pathname === "/monument" || location.pathname === "/monument/") return <MonumentLanding />;
  return <MonumentMarket {...route} />;
}

function MonumentLanding() {
  return (
    <main id="main-content" className="mn-public">
      <header><Link to="/">← 05 / 05</Link><b>GIGMATCH AI</b><span>MONUMENT</span><Link to="/monument/freelancer/home">ENTER MARKET ↗</Link></header>
      <section className="mn-public-hero">
        <p>INDEPENDENT WORK, WITHOUT THE FUZZY EDGES.</p>
        <h1>THE<br />RIGHT<br /><em>TERMS.</em></h1>
        <div><p>A serious marketplace for specialists and teams who want to understand the work, compare real evidence, revise deliberately, and confirm exactly what was agreed.</p><span>SCROLL TO OPEN MARKET <ArrowRight /></span></div>
      </section>
      <section className="mn-ticker"><span>OPEN NOW</span><p>Senior Frontend Systems Engineer</p><b>₹5.2L–₹6.4L</b><i>TERNARY HEALTH</i><span>92 EVIDENCE FIT</span></section>
      <section className="mn-public-sides"><Link to="/monument/freelancer/home"><span>01 / SPECIALISTS</span><h2>YOUR WORK<br />SPEAKS FIRST.</h2><p>See the match, see the gap, set the terms.</p><ArrowRight /></Link><Link to="/monument/client/home"><span>02 / CLIENTS</span><h2>ONE CLEAR<br />DECISION.</h2><p>Compare evidence, preserve revisions, select exactly.</p><ArrowRight /></Link></section>
    </main>
  );
}

interface MarketProps {
  role: Role;
  view: ViewId;
  go: (view: ViewId) => void;
  switchRole: (role: Role) => void;
  state: ReturnType<typeof useConceptRoute>["state"];
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
}

function MonumentMarket({ role, view, go, switchRole, state, dispatch }: MarketProps) {
  const [menu, setMenu] = useState(false);
  const nav: { view: ViewId; number: string; freelancer: string; client: string }[] = [
    {view:"home",number:"00",freelancer:"Start",client:"Start"},
    {view:role==="client"?"review":"discover",number:"01",freelancer:"Market",client:"Applicants"},
    {view:role==="client"?"candidate":"applications",number:"02",freelancer:"Record",client:"Dossier"},
    {view:"selection",number:"03",freelancer:"Terms",client:"Select"},
    {view:"engagement",number:"04",freelancer:"Work",client:"Work"},
  ];
  return (
    <div className="mn-app">
      <header className="mn-header"><Link to="/monument" className="mn-wordmark">MONUMENT</Link><span>GIGMATCH AI / CONCEPT 05</span><button className="mn-menu-button" onClick={()=>setMenu(!menu)} aria-expanded={menu} aria-label="Open Monument navigation"><Menu/> MENU</button><nav>{nav.map(item=><button className={view===item.view?"is-active":""} onClick={()=>go(item.view)} key={item.number}><span>{item.number}</span>{role==="client"?item.client:item.freelancer}</button>)}</nav><div className="mn-role"><button className={role==="freelancer"?"is-active":""} onClick={()=>switchRole("freelancer")}>F</button><button className={role==="client"?"is-active":""} onClick={()=>switchRole("client")}>C</button></div></header>
      {menu&&<div className="mn-mobile-menu" role="dialog" aria-modal="true" aria-label="Monument navigation"><button onClick={()=>setMenu(false)} aria-label="Close navigation"><X/></button>{nav.map(item=><button onClick={()=>{go(item.view);setMenu(false)}} key={item.number}><span>{item.number}</span>{role==="client"?item.client:item.freelancer}</button>)}<Link to="/">ALL CONCEPTS</Link></div>}
      <main id="main-content">
        {view==="home"&&<MonumentHome role={role} go={go} state={state}/>}
        {view==="discover"&&<MonumentDiscover go={go}/>}
        {view==="gig"&&<MonumentGig go={go}/>}
        {view==="proposal"&&<MonumentProposal go={go} state={state} dispatch={dispatch}/>}
        {view==="applications"&&<MonumentApplication go={go} state={state} dispatch={dispatch}/>}
        {view==="review"&&<MonumentReview go={go} state={state}/>}
        {view==="candidate"&&<MonumentCandidate go={go} state={state} dispatch={dispatch}/>}
        {view==="selection"&&<MonumentSelection role={role} go={go} state={state} dispatch={dispatch}/>}
        {view==="engagement"&&<MonumentEngagement state={state} dispatch={dispatch}/>}
      </main>
      <footer className="mn-footer"><Link to="/"><ArrowLeft/> CONCEPT INDEX</Link><span>SHARED STATE · APPLICATION v{state.applicationVersion}</span><button onClick={()=>dispatch({type:"reset"})}><RotateCcw/> RESET SCENARIO</button></footer>
      {state.toast&&<div className="mn-toast" role="status">{state.toast}<Check/></div>}
    </div>
  );
}

function MonumentHome({role,go,state}:Pick<MarketProps,"role"|"go"|"state">){
  const client=role==="client";
  return <section className="mn-home">
    <header><span>{client?"CLIENT EDITION":"SPECIALIST EDITION"} / 28 JUL 2026</span><span>INDIA · REMOTE MARKET</span></header>
    <div className="mn-home-title"><h1>{client?<>DECIDE<br/><em>WITH EVIDENCE.</em></>:<>WORK<br/><em>WITH CLARITY.</em></>}</h1><p>{client?"Kavya Menon has answered, revised, and received one exact-version selection request.":"Ternary Health has issued exact terms for your current proposal. One response is due."}</p></div>
    <button className="mn-feature" onClick={()=>go("selection")}><span>TIME SENSITIVE / 31H</span><div><b>{client?"KAVYA MENON":"TERNARY HEALTH"}</b><h2>Senior Frontend Systems Engineer for Clinical Trial Operations</h2></div><dl><dt>PROPOSAL</dt><dd>{TERMS.proposal}</dd><dt>RECORD</dt><dd>v{state.applicationVersion}</dd><dt>STATE</dt><dd>{state.applicationStage}</dd></dl><ArrowRight/></button>
    <div className="mn-home-strip"><div><span>MARKET PRINCIPLE 01</span><b>Evidence before price.</b></div><div><span>MARKET PRINCIPLE 02</span><b>Revisions do not disappear.</b></div><div><span>MARKET PRINCIPLE 03</span><b>Contact requires consent.</b></div></div>
  </section>;
}

function MonumentDiscover({go}:Pick<MarketProps,"go">){
  const[open,setOpen]=useState(0);
  return <section className="mn-market"><header><span>01 / OPEN MARKET</span><h1>THREE BRIEFS.<br/>THREE REAL CHOICES.</h1><p>Ordered by reviewed capability evidence. Price is never part of the match.</p></header><div className="mn-market-list">{GIGS.map((gig,index)=><article className={open===index?"is-open":""} key={gig.id}><button onClick={()=>setOpen(open===index?-1:index)}><span>0{index+1}</span><div><small>{gig.company} / {gig.category}</small><h2>{gig.title}</h2></div><strong>{gig.match}<small>FIT</small></strong><b>{gig.budget}</b><ChevronDown/></button>{open===index&&<div className="mn-market-detail"><p>{gig.summary}</p><dl><div><dt>DELIVERY</dt><dd>{gig.duration}</dd></div><div><dt>COMMITMENT</dt><dd>{gig.commitment}</dd></div><div><dt>CLOSES</dt><dd>{gig.deadline}</dd></div></dl><div>{gig.matchingSkills.map(skill=><span key={skill}><Check/>{skill}</span>)}</div><button onClick={()=>go("gig")}>READ FULL BRIEF <ArrowRight/></button></div>}</article>)}</div></section>;
}

function MonumentGig({go}:Pick<MarketProps,"go">){
  const gig=GIGS[0];
  return <section className="mn-gig"><button className="mn-back" onClick={()=>go("discover")}><ArrowLeft/> OPEN MARKET</button><header><span>TERNARY HEALTH / MATERIAL TERMS v3</span><h1>{gig.title}</h1><div><b>{gig.budget}</b><b>{gig.duration}</b><b>{gig.commitment}</b></div></header><div className="mn-gig-body"><aside><strong>92</strong><span>STRONG EVIDENCE FIT</span><p>{gig.matchReason}</p></aside><article><h2>THE BRIEF</h2><p>{gig.summary}</p><h2>WHAT SHIPS</h2>{gig.deliverables.map((item,index)=><div key={item}><span>0{index+1}</span><p>{item}</p></div>)}<h2>WHAT COUNTS</h2><div className="mn-skill-band">{gig.requiredSkills.map(skill=><span key={skill}>{skill}</span>)}</div><blockquote><b>DISCLOSED GAP</b>{gig.missingSkills[0]}</blockquote></article></div><footer><span>APPLICATIONS CLOSE {gig.deadline}</span><button onClick={()=>go("proposal")}>WRITE YOUR TERMS <ArrowRight/></button></footer></section>;
}

function MonumentProposal({go,state,dispatch}:Pick<MarketProps,"go"|"state"|"dispatch">){
  const[scope,setScope]=useState("Four product-team workshops included");const invalid=scope.trim().length<12;
  return <section className="mn-proposal"><header><span>02 / PROPOSAL RECORD</span><h1>PUT IT<br/>IN WRITING.</h1><p>Submission creates a new immutable version. Nothing important is hidden in a message thread.</p></header><form onSubmit={e=>{e.preventDefault();if(!invalid){dispatch({type:"submit-revision"});go("applications")}}}><section className="mn-price"><label>FIXED PROPOSAL<input defaultValue="₹5,80,000"/></label><label>DELIVERY<input defaultValue="14 WEEKS"/></label></section><section className="mn-form-lines"><label>AVAILABLE FROM<input type="date" defaultValue="2026-08-10"/></label><label>CAPACITY<input defaultValue="28 HOURS / WEEK"/></label><label>CLARIFIED SCOPE<input value={scope} onChange={e=>setScope(e.target.value)} aria-invalid={invalid}/>{invalid&&<small role="alert">State the clarified scope explicitly.</small>}</label><label>APPROACH<textarea defaultValue="Inventory the component and workflow system, establish an accessibility baseline, then migrate the two highest-risk investigator workflows."/></label></section><footer><div><LockKeyhole/><p>RECORDING v{state.applicationVersion+1} WILL INVALIDATE ANY REQUEST BOUND TO v{state.applicationVersion}.</p></div><button disabled={invalid}>RECORD VERSION <Send/></button></footer></form></section>;
}

function MonumentApplication({go,state,dispatch}:Pick<MarketProps,"go"|"state"|"dispatch">){
  return <section className="mn-record"><header><span>02 / YOUR APPLICATION</span><h1>TERNARY<br/>HEALTH.</h1><strong>{state.applicationStage}</strong></header><div className="mn-record-banner"><span>APPLICATION v{state.applicationVersion}</span><b>{TERMS.proposal}</b><b>{TERMS.timeline}</b><button onClick={()=>go("proposal")}>NEW VERSION ↗</button></div><section className="mn-qa"><span>STRUCTURED Q&A / NOT CHAT</span><blockquote><small>TERNARY HEALTH</small>{QA.question}</blockquote>{state.qaAnswered?<blockquote className="is-answer"><small>KAVYA MENON / IMMUTABLE</small>{QA.answer}</blockquote>:<button onClick={()=>dispatch({type:"answer-qa"})}>RECORD ANSWER</button>}</section><section className="mn-version-stack"><header><span>VERSION HISTORY</span><span>2 RECORDS</span></header><div><span>v1 / SUPERSEDED</span><del>{TERMS.previousProposal} · 2 workshops</del></div><div><span>v{state.applicationVersion} / CURRENT</span><ins>{TERMS.proposal} · 4 workshops</ins></div></section>{state.selectionStatus==="pending"&&<button className="mn-selection-ribbon" onClick={()=>go("selection")}><span>EXACT SELECTION WAITING / 31H</span><b>READ WHAT YOU ARE ACCEPTING.</b><ArrowRight/></button>}</section>;
}

function MonumentReview({go,state}:Pick<MarketProps,"go"|"state">){
  const[filter,setFilter]=useState("BEST EVIDENCE");
  return <section className="mn-review"><header><span>01 / APPLICANT MARKET</span><h1>WHO CAN<br/>DO THE WORK?</h1><div>{["BEST EVIDENCE","NEWEST","SHORTLIST","ADVANCED"].map(item=><button className={filter===item?"is-active":""} onClick={()=>setFilter(item)} key={item}>{item}</button>)}</div></header><div className="mn-candidate-list">{APPLICANTS.map((person,index)=><button key={person.id} onClick={()=>go("candidate")}><span>0{index+1}</span><strong>{person.match}</strong><div><h2>{person.name}</h2><p>{person.headline}</p></div><dl><dt>PROPOSAL</dt><dd>{person.proposal}</dd><dt>TIME</dt><dd>{person.timeline}</dd></dl><div><b>{person.id==="kavya"?state.applicationStage:person.stage}</b><small>{person.id==="kavya"&&state.shortlisted?"PRIVATE SHORTLIST":person.gap}</small></div><ArrowRight/></button>)}</div></section>;
}

function MonumentCandidate({go,state,dispatch}:Pick<MarketProps,"go"|"state"|"dispatch">){
  const person=APPLICANTS[0];
  return <section className="mn-dossier"><button className="mn-back" onClick={()=>go("review")}><ArrowLeft/> APPLICANT MARKET</button><header><span>02 / DOSSIER 001</span><div><h1>KAVYA<br/>MENON.</h1><strong>92<small>EVIDENCE</small></strong></div><p>{person.headline} · {person.location} · {person.experience}</p></header><div className="mn-dossier-grid"><section><span>WHY KAVYA</span><p>{person.note}</p><div className="mn-skill-band">{person.skills.map(skill=><span key={skill}>{skill}</span>)}</div><blockquote><b>DISCLOSED GAP</b>{person.gap}</blockquote></section><section><span>COMMERCIAL PROPOSAL / v{state.applicationVersion}</span><h2>{person.proposal}</h2><dl><div><dt>DELIVERY</dt><dd>{person.timeline}</dd></div><div><dt>AVAILABLE</dt><dd>{person.availability}</dd></div><div><dt>WORKSHOPS</dt><dd>FOUR</dd></div></dl><button onClick={()=>dispatch({type:"request-revision"})}>REQUEST REVISION</button></section></div><footer><div><button className={state.shortlisted?"is-active":""} onClick={()=>dispatch({type:"toggle-shortlist"})}>{state.shortlisted?"✓ PRIVATE SHORTLIST":"+ PRIVATE SHORTLIST"}</button><button onClick={()=>dispatch({type:"toggle-advance"})}>{state.advanced?"RETURN TO REVIEW":"ADVANCE"}</button></div><button onClick={()=>go("selection")}>PREPARE EXACT SELECTION <ArrowRight/></button></footer></section>;
}

function MonumentSelection({role,go,state,dispatch}:Pick<MarketProps,"role"|"go"|"state"|"dispatch">){
  const[deadline,setDeadline]=useState<"24"|"48"|"72">(state.selectionDeadline);const client=role==="client";
  return <section className="mn-selection"><header><span>03 / EXACT SELECTION</span><h1>THIS.<br/>NOT<br/>“ABOUT THIS.”</h1><p>Selection points to one exact proposal, one exact gig version, and one response window.</p></header><div className="mn-exact"><div className="mn-exact-head"><span>TERNARY HEALTH × KAVYA MENON</span><b>{state.selectionStatus.toUpperCase()}</b></div><dl><div><dt>FIXED PROPOSAL</dt><dd>{TERMS.proposal}</dd></div><div><dt>APPLICATION</dt><dd>VERSION {state.applicationVersion}</dd></div><div><dt>DELIVERY</dt><dd>{TERMS.timeline}</dd></div><div><dt>GIG TERMS</dt><dd>VERSION 3</dd></div></dl><section><div><span>INCLUDED</span>{TERMS.included.map(item=><p key={item}><Check/>{item}</p>)}</div><div><span>EXCLUDED</span>{TERMS.excluded.map(item=><p key={item}><Circle/>{item}</p>)}</div></section>{client&&state.selectionStatus!=="pending"&&<footer><label>RESPONSE WINDOW<select value={deadline} onChange={e=>setDeadline(e.target.value as "24"|"48"|"72")}><option value="24">24 HOURS</option><option value="48">48 HOURS</option><option value="72">72 HOURS</option></select></label><button onClick={()=>dispatch({type:"send-selection",deadline})}>SEND THIS RECORD <Send/></button></footer>}{!client&&state.selectionStatus==="pending"&&<footer><p>31 HOURS LEFT. EDITING REQUIRES A FRESH REQUEST.</p><button onClick={()=>{dispatch({type:"accept-selection"});go("engagement")}}>ACCEPT THIS RECORD <Check/></button></footer>}{state.selectionStatus==="accepted"&&<footer><p>ACCEPTED. THE GIG IS FILLED.</p><button onClick={()=>go("engagement")}>OPEN THE ENGAGEMENT <ArrowRight/></button></footer>}</div></section>;
}

function MonumentEngagement({state,dispatch}:Pick<MarketProps,"state"|"dispatch">){
  return <section className="mn-engagement"><header><span>04 / CONFIRMED ENGAGEMENT</span><h1>THE WORK<br/>STARTS HERE.</h1><div><b>{state.engagementStatus.replace("_"," ")}</b><button onClick={()=>dispatch({type:"advance-engagement"})} disabled={state.engagementStatus==="completed"}>NEXT STATE <ArrowRight/></button></div></header><div className="mn-engagement-terms"><section><span>IMMUTABLE ACCEPTED RECORD</span><h2>{TERMS.proposal}</h2><p>{TERMS.timeline} · STARTS 10 AUG · 28 HOURS/WEEK</p><dl><dt>APPLICATION</dt><dd>v{state.applicationVersion}</dd><dt>GIG TERMS</dt><dd>v3</dd><dt>INCLUDED</dt><dd>4 WORKSHOPS</dd></dl></section><section><span>CONTACT / THIS ENGAGEMENT ONLY</span>{!state.contactShared||state.contactRevoked?<><LockKeyhole/><h2>{state.contactRevoked?"DISPLAY STOPPED":"NOT SHARED"}</h2><p>Private details require active participant consent.</p><button onClick={()=>dispatch({type:"share-contact"})}>SHARE VERIFIED EMAIL</button></>:<><ShieldCheck/><h2>{state.contactRevealed?"kavya.menon@example.com":"k•••••@example.com"}</h2><p>Reveal is authorized and recorded.</p><button onClick={()=>dispatch({type:state.contactRevealed?"revoke-contact":"reveal-contact"})}>{state.contactRevealed?"STOP FUTURE DISPLAY":"REVEAL ONCE"}</button></>}</section></div><aside>NO ESCROW. NO PAYMENT PROCESSING. NEVER SHARE PASSWORDS, OTPS, TOKENS, OR BANKING CREDENTIALS.</aside><section className="mn-activity"><header><span>ACTIVITY / APPEND ONLY</span><span>{state.activity.length} EVENTS</span></header>{state.activity.slice(0,6).map((item,index)=><div key={item.id}><span>0{index+1}</span><b>{item.title}</b><p>{item.detail}</p><small>{item.at}</small></div>)}</section></section>;
}
