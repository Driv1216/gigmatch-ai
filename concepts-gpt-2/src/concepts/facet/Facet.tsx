import { ArrowLeft, ArrowRight, Check, ChevronsUpDown, Columns3, LockKeyhole, RotateCcw, Send, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { applicantFacet, EVIDENCE_AXES, opportunityFacet } from "../../domain/comparison";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import type { Role, ViewId } from "../../domain/types";
import { useConceptRoute } from "../../domain/useConceptRoute";
import "./facet.css";

export function Facet() {
  const location=useLocation(); const route=useConceptRoute("facet");
  if(location.pathname==="/facet"||location.pathname==="/facet/") return <FacetLanding/>;
  return <FacetApp {...route}/>;
}

function FacetLanding() {
  return <main id="main-content" className="fc-public">
    <header><Link to="/">GIGMATCH / 09</Link><b>FACET</b><span>EVIDENCE BEFORE IMPRESSION</span></header>
    <section><div><span>COMPARE WHAT MATTERS</span><h1>Every choice<br/>has more than<br/><em>one side.</em></h1><p>A marketplace shaped as an accountable comparison—not a feed, a leaderboard, or a popularity contest.</p><nav><Link to="/facet/freelancer/home">Compare opportunities <ArrowRight/></Link><Link to="/facet/client/home">Compare applicants <ArrowRight/></Link></nav></div><aside>
      <header><b>AXIS</b><b>TERNARY</b><b>KAVYA</b></header>
      {EVIDENCE_AXES.map((axis,index)=><div key={axis.id}><span>0{index+1} / {axis.label}</span><b>{opportunityFacet("ternary-clinical",axis.id).split(" · ")[0]}</b><b>{applicantFacet("kavya",axis.id).split(" · ")[0]}</b></div>)}
    </aside></section>
    <footer><b>92 / REQUIRED EVIDENCE</b><span>₹5.8L / COMMERCIAL</span><span>10 AUG / AVAILABILITY</span><span>v2 × v3 / RECORD</span></footer>
  </main>;
}

interface FacetProps {role:Role;view:ViewId;go:(view:ViewId)=>void;switchRole:(role:Role)=>void;state:ReturnType<typeof useConceptRoute>["state"];dispatch:ReturnType<typeof useConceptRoute>["dispatch"]}

function FacetApp({role,view,go,switchRole,state,dispatch}:FacetProps) {
  const nav:{v:ViewId;f:string;c:string}[]=[
    {v:"home",f:"Overview",c:"Overview"},{v:role==="client"?"review":"discover",f:"Opportunity lattice",c:"Applicant lattice"},
    {v:role==="client"?"candidate":"applications",f:"My facets",c:"Dossier"},{v:"selection",f:"Exact comparison",c:"Select"},{v:"engagement",f:"Engagement",c:"Engagement"},
  ];
  return <div className="fc-app"><header className="fc-header"><Link to="/facet"><Columns3/>FACET <small>09</small></Link><nav>{nav.map(item=><button className={view===item.v?"is-active":""} key={item.v} onClick={()=>go(item.v)}>{role==="client"?item.c:item.f}</button>)}</nav><div><button className={role==="freelancer"?"is-active":""} onClick={()=>switchRole("freelancer")}>SPECIALIST</button><button className={role==="client"?"is-active":""} onClick={()=>switchRole("client")}>CLIENT</button></div></header><main id="main-content">
    {view==="home"&&<FacetHome role={role} go={go} state={state}/>}
    {view==="discover"&&<FacetDiscover go={go}/>}
    {view==="gig"&&<FacetGig go={go}/>}
    {view==="proposal"&&<FacetProposal go={go} state={state} dispatch={dispatch}/>}
    {view==="applications"&&<FacetApplication go={go} state={state} dispatch={dispatch}/>}
    {view==="review"&&<FacetReview go={go} state={state}/>}
    {view==="candidate"&&<FacetCandidate go={go} state={state} dispatch={dispatch}/>}
    {view==="selection"&&<FacetSelection role={role} go={go} state={state} dispatch={dispatch}/>}
    {view==="engagement"&&<FacetEngagement state={state} dispatch={dispatch}/>}
  </main><footer className="fc-footer"><Link to="/"><ArrowLeft/> Ten concepts</Link><span>ONE SCENARIO / NORMALIZED AXES / APPLICATION v{state.applicationVersion}</span><button onClick={()=>dispatch({type:"reset"})}><RotateCcw/> Reset scenario</button></footer>{state.toast&&<div className="fc-toast" role="status">{state.toast}<Check/></div>}</div>;
}

function FacetHome({role,go,state}:Pick<FacetProps,"role"|"go"|"state">) {
  const client=role==="client";
  return <section className="fc-home"><header><span>TH–042 / DECISION OVERVIEW</span><h1>{client?"One requirement set. Four accountable comparisons.":"One application. Six visible facets."}</h1><p>{client?"Suitability remains separate from price, stage, and private review state.":"Your evidence, gap, terms, availability, version, and stage remain legible as separate facts."}</p></header><div className="fc-overview-grid"><aside><span>UNRESOLVED ACTION</span><strong>31H</strong><b>Exact-version selection</b><button onClick={()=>go("selection")}>Resolve <ArrowRight/></button></aside><section><header><b>FACET</b><b>VALUE</b><b>STATUS</b></header>{EVIDENCE_AXES.map((axis,index)=><button key={axis.id} onClick={()=>go(client?"candidate":"applications")}><span>0{index+1} / {axis.label}</span><b>{applicantFacet("kavya",axis.id).split(" · ")[0]}</b><em className={index===1?"is-open":"is-clear"}>{index===1?"DISCLOSED":"CLEAR"}</em></button>)}</section></div><footer><button onClick={()=>go(client?"review":"discover")}><SlidersHorizontal/> Open full comparison lattice</button><span>Application v{state.applicationVersion} · Gig terms v3</span></footer></section>;
}

function FacetDiscover({go}:Pick<FacetProps,"go">) {
  const [axis,setAxis]=useState("required"); const [sort,setSort]=useState<"match"|"deadline">("match");
  const gigs=useMemo(()=>[...GIGS].sort((a,b)=>sort==="match"?b.match-a.match:a.deadline.localeCompare(b.deadline)),[sort]);
  return <section className="fc-lattice-page"><header><span>OPPORTUNITY LATTICE</span><h1>Three briefs, normalized.</h1><div><label>PRIMARY AXIS<select value={axis} onChange={event=>setAxis(event.target.value)}>{EVIDENCE_AXES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><button onClick={()=>setSort(sort==="match"?"deadline":"match")}><ChevronsUpDown/> Sort: {sort}</button></div></header>
    <div className="fc-lattice fc-opportunities"><div className="fc-lattice-head"><b>AXIS</b>{gigs.map(gig=><button key={gig.id} onClick={()=>go("gig")}><span>{gig.match}</span>{gig.company}</button>)}</div>{EVIDENCE_AXES.map((item,index)=><div className={axis===item.id?"is-highlighted":""} key={item.id}><strong>0{index+1}<span>{item.label}</span></strong>{gigs.map(gig=><button key={gig.id} onClick={()=>go("gig")}>{opportunityFacet(gig.id,item.id)}</button>)}</div>)}</div>
    <p className="fc-note">Evidence fit is calculated independently. Commercial values appear as their own facet and never reorder suitability unless you choose them.</p>
  </section>;
}

function FacetGig({go}:Pick<FacetProps,"go">) {
  const gig=GIGS[0];
  return <section className="fc-detail"><header><button onClick={()=>go("discover")}><ArrowLeft/> Opportunity lattice</button><span>ROW FOCUS / TH–042</span><h1>{gig.title}</h1><p>{gig.summary}</p></header><div className="fc-focus-row"><strong>92<small>{gig.matchLabel}</small></strong>{EVIDENCE_AXES.map((axis,index)=><div key={axis.id}><span>0{index+1} / {axis.label}</span><b>{opportunityFacet(gig.id,axis.id)}</b></div>)}</div><section className="fc-split-evidence"><div><h2>Required and reviewed</h2>{gig.requiredSkills.map(skill=><p key={skill}><Check/>{skill}</p>)}</div><div><h2>Material outcomes</h2>{gig.deliverables.map((item,index)=><p key={item}><span>0{index+1}</span>{item}</p>)}</div><aside><span>DISCLOSED GAP</span><p>{gig.missingSkills[0]}</p></aside></section><button className="fc-primary" onClick={()=>go("proposal")}>Build proposal by facet <ArrowRight/></button></section>;
}

function FacetProposal({go,state,dispatch}:Pick<FacetProps,"go"|"state"|"dispatch">) {
  const [gap,setGap]=useState(""); const invalid=gap.trim().length<20;
  return <section className="fc-proposal"><header><span>PROPOSAL FACETS / NEW VERSION</span><h1>Change one facet without obscuring the rest.</h1><p>A new immutable version will invalidate any selection tied to v{state.applicationVersion}.</p></header><form onSubmit={event=>{event.preventDefault();if(!invalid){dispatch({type:"submit-revision"});go("applications")}}}><header><b>FACET</b><b>GIG GUIDANCE</b><b>YOUR ANSWER</b><b>CHANGE</b></header><label><span>01 / COMMERCIAL</span><b>₹5.2L–₹6.4L</b><input defaultValue="₹5,80,000"/><em>UNCHANGED</em></label><label><span>02 / DELIVERY</span><b>12–16 weeks</b><input defaultValue="14 weeks"/><em>UNCHANGED</em></label><label><span>03 / CAPACITY</span><b>26–30 hrs/week</b><input defaultValue="28 hrs/week"/><em>UNCHANGED</em></label><label className="is-changed"><span>04 / GAP RESPONSE</span><b>Direct clinical trial work</b><textarea value={gap} onChange={event=>setGap(event.target.value)} placeholder="Explain how adjacent regulated-product evidence transfers."/>{invalid?<small role="alert">Add at least 20 characters.</small>:<em>REVISED</em>}</label><footer><button type="button" onClick={()=>go("gig")}>Cancel</button><button disabled={invalid}>Record v{state.applicationVersion+1} <Send/></button></footer></form></section>;
}

function FacetApplication({go,state,dispatch}:Pick<FacetProps,"go"|"state"|"dispatch">) {
  return <section className="fc-application"><header><span>MY APPLICATION / v{state.applicationVersion}</span><h1>The complete record, without the card.</h1></header><div className="fc-version-strip"><div><span>v1</span><del>{TERMS.previousProposal}</del><small>2 workshops</small></div><ArrowRight/><div className="is-current"><span>v{state.applicationVersion}</span><ins>{TERMS.proposal}</ins><small>4 workshops</small></div><aside><b>{state.selectionStatus.toUpperCase()}</b><span>Selection facet</span></aside></div><div className="fc-application-facets">{EVIDENCE_AXES.map((axis,index)=><article key={axis.id}><span>0{index+1} / {axis.label}</span><b>{applicantFacet("kavya",axis.id)}</b></article>)}</div><section className="fc-qa"><div><span>STRUCTURED QUESTION</span><p>{QA.question}</p></div><div><span>RECORDED ANSWER</span>{state.qaAnswered?<p>{QA.answer}</p>:<button onClick={()=>dispatch({type:"answer-qa"})}>Answer</button>}</div></section><footer><button onClick={()=>go("proposal")}>Revise a facet</button>{state.selectionStatus==="pending"&&<button onClick={()=>go("selection")}>Review exact comparison <ArrowRight/></button>}</footer></section>;
}

function FacetReview({go,state}:Pick<FacetProps,"go"|"state">) {
  const [axis,setAxis]=useState("required"); const [selected,setSelected]=useState("kavya");
  return <section className="fc-lattice-page"><header><span>APPLICANT LATTICE / GIG TH–042</span><h1>Compare evidence. Then compare terms.</h1><div><label>PINNED FACET<select value={axis} onChange={e=>setAxis(e.target.value)}>{EVIDENCE_AXES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><button onClick={()=>go("candidate")}>Open {APPLICANTS.find(item=>item.id===selected)?.name} <ArrowRight/></button></div></header><div className="fc-lattice fc-applicants"><div className="fc-lattice-head"><b>AXIS</b>{APPLICANTS.map(person=><button className={selected===person.id?"is-selected":""} key={person.id} onClick={()=>setSelected(person.id)}><span>{person.match}</span>{person.name}<small>{person.id==="kavya"?state.applicationStage:person.stage}</small></button>)}</div>{EVIDENCE_AXES.map((item,index)=><div className={axis===item.id?"is-highlighted":""} key={item.id}><strong>0{index+1}<span>{item.label}</span></strong>{APPLICANTS.map(person=><button className={selected===person.id?"is-selected":""} key={person.id} onClick={()=>setSelected(person.id)}>{person.id==="kavya"&&item.id==="version"?`Application v${state.applicationVersion}`:applicantFacet(person.id,item.id)}</button>)}</div>)}</div><p className="fc-note">Private shortlist is intentionally absent from the applicant-facing record and does not affect evidence fit.</p></section>;
}

function FacetCandidate({go,state,dispatch}:Pick<FacetProps,"go"|"state"|"dispatch">) {
  const person=APPLICANTS[0];
  return <section className="fc-candidate"><header><button onClick={()=>go("review")}><ArrowLeft/> Applicant lattice</button><span>DOSSIER / AP.001 / v{state.applicationVersion}</span><h1>{person.name}</h1><p>{person.headline}</p></header><div className="fc-dossier-grid">{EVIDENCE_AXES.map((axis,index)=><article className={axis.id==="gap"?"is-gap":""} key={axis.id}><span>0{index+1} / {axis.label}</span><b>{axis.id==="version"?`Application v${state.applicationVersion}`:applicantFacet(person.id,axis.id)}</b>{axis.id==="required"&&<small>Price excluded from evidence fit.</small>}</article>)}</div><blockquote>{person.note}</blockquote><footer><button className={state.shortlisted?"is-active":""} onClick={()=>dispatch({type:"toggle-shortlist"})}>{state.shortlisted?"✓ Private shortlist":"+ Private shortlist"}</button><button onClick={()=>dispatch({type:"toggle-advance"})}>{state.advanced?"Return to review":"Advance"}</button><button onClick={()=>dispatch({type:"request-revision"})}>Request revision</button><button onClick={()=>go("selection")}>Compare exact versions <ArrowRight/></button></footer></section>;
}

function FacetSelection({role,go,state,dispatch}:Pick<FacetProps,"role"|"go"|"state"|"dispatch">) {
  const [deadline,setDeadline]=useState<"24"|"48"|"72">(state.selectionDeadline); const client=role==="client";
  return <section className="fc-selection"><header><span>EXACT-VERSION COMPARISON</span><h1>What is being selected—and what changed.</h1></header><div className="fc-selection-grid"><header><b>FACET</b><b>APPLICATION v1</b><b>APPLICATION v{state.applicationVersion}</b><b>GIG TERMS v3</b></header>{[
    ["Proposal",TERMS.previousProposal,TERMS.proposal,"₹5.2L–₹6.4L"],
    ["Timeline","16 weeks",TERMS.timeline,"12–16 weeks"],
    ["Workshops","2 included","4 included","Adoption support"],
    ["Capacity","24 hrs/week","28 hrs/week","26–30 hrs/week"],
  ].map((row,index)=><div className={index===0||index===2?"is-changed":""} key={row[0]}><span>0{index+1} / {row[0]}</span><del>{row[1]}</del><ins>{row[2]}</ins><b>{row[3]}</b></div>)}</div><div className="fc-selection-status"><ShieldCheck/><div><span>EFFECTIVE RECORD</span><b>Application v{state.applicationVersion} × Gig terms v3</b><p>A proposal edit invalidates this request atomically.</p></div><strong>{state.selectionStatus.toUpperCase()}</strong></div>
    {client&&state.selectionStatus!=="pending"&&<footer><label>RESPONSE WINDOW<select value={deadline} onChange={e=>setDeadline(e.target.value as "24"|"48"|"72")}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button onClick={()=>dispatch({type:"send-selection",deadline})}>Send exact selection <Send/></button></footer>}
    {!client&&state.selectionStatus==="pending"&&<footer><p>31 hours remain. Only the highlighted current facet column is accepted.</p><button onClick={()=>{dispatch({type:"accept-selection"});go("engagement")}}>Accept current facets <Check/></button></footer>}
    {state.selectionStatus==="accepted"&&<footer><p>Comparison confirmed and locked.</p><button onClick={()=>go("engagement")}>Open engagement <ArrowRight/></button></footer>}
  </section>;
}

function FacetEngagement({state,dispatch}:Pick<FacetProps,"state"|"dispatch">) {
  const contact=!state.contactShared||state.contactRevoked?"MASKED":state.contactRevealed?"kavya.menon@example.com":"k•••••@example.com";
  return <section className="fc-engagement"><header><span>CONFIRMED FACETS / IMMUTABLE</span><h1>Ternary Health × Kavya Menon</h1><p>Application v{state.applicationVersion} accepted against gig terms v3.</p></header><div className="fc-engagement-grid"><section>{[["Commercial",TERMS.proposal],["Delivery",TERMS.timeline],["Capacity","28 hours/week"],["Status",state.engagementStatus.replaceAll("_"," ")]].map((item,index)=><div key={item[0]}><span>0{index+1} / {item[0]}</span><b>{item[1]}</b></div>)}<button onClick={()=>dispatch({type:"advance-engagement"})} disabled={state.engagementStatus==="completed"}>Advance lifecycle <ArrowRight/></button></section><aside><span>CONTACT PERMISSION</span>{contact==="MASKED"?<LockKeyhole/>:<ShieldCheck/>}<strong>{contact}</strong><p>{state.contactRevoked?"Future display has been stopped.":"Consent is scoped to this engagement."}</p>{!state.contactShared||state.contactRevoked?<button onClick={()=>dispatch({type:"share-contact"})}>Share verified email</button>:<button onClick={()=>dispatch({type:state.contactRevealed?"revoke-contact":"reveal-contact"})}>{state.contactRevealed?"Stop future display":"Authorize reveal"}</button>}</aside></div><div className="fc-history">{state.activity.slice(0,5).map(item=><p key={item.id}><span>{item.at}</span><b>{item.title}</b><small>{item.detail}</small></p>)}</div></section>;
}
