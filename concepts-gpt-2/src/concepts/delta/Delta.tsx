import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, CornerDownLeft, RotateCcw, Search, Terminal } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useConceptRoute } from "../../domain/useConceptRoute";
import { navViewIsCurrent, primaryNavItems, useHybridCommand, type HybridCommand } from "../command-current/Shared";
import { DeltaView } from "./DeltaViews";
import "./delta.css";

function DeltaCommand({command}:{command:HybridCommand}){
  return <div className="de-command-shell"><form onSubmit={event=>{event.preventDefault();command.run();}}><Search/><input ref={command.inputRef} value={command.input} onFocus={command.focus} onChange={event=>command.setInput(event.target.value)} aria-label="Delta command input" placeholder="Navigate the record — open selection, open engagement…"/><kbd>/</kbd><kbd>⌘K</kbd><button aria-label="Run command"><CornerDownLeft/></button></form>{command.suggestionsVisible?<div className="de-command-results" aria-label="Suggested commands">{command.invalid?<p role="alert">{command.notice}</p>:<span>Timeline commands</span>}{command.suggestions.map(item=><button key={item.input} onMouseDown={event=>event.preventDefault()} onClick={()=>command.run(item.input)}><Terminal/>{item.input}<ArrowRight/></button>)}</div>:null}</div>;
}

function DeltaLanding(){
  const navigate=useNavigate(); const reduced=useReducedMotion();
  const events=[{label:"Application v2",state:"complete"},{label:"Selection requested",state:"invalid"},{label:"Application v3",state:"branch"},{label:"Fresh selection",state:"current"},{label:"Engagement",state:"pending"}];
  return <main id="main-content" className="de-landing"><header><Link to="/"><b>30</b><span>DELTA</span></Link><small>COMMAND × CURRENT / OPERATIONAL TIMELINE</small></header><section><div className="de-land-copy"><span>HISTORY THAT EXPLAINS THE PRESENT.</span><h1>Every branch<br/>has a reason.</h1><p>A production timeline where revisions, authority, and work remain attached to the exact records that created them.</p><div><button onClick={()=>navigate("/delta/freelancer/home")}>Follow Kavya’s record<ArrowRight/></button><button onClick={()=>navigate("/delta/client/home")}>Open client timeline</button></div></div><div className="de-land-timeline"><motion.i initial={reduced?false:{scaleY:0}} animate={{scaleY:1}} transition={{duration:reduced?0:.7,ease:[.22,1,.36,1]}}/>{events.map((event,index)=><article key={event.label} className={`is-${event.state}`}><span>0{index+1}</span><div><small>{event.state==="invalid"?"INVALIDATED":event.state==="branch"?"REVISION":"RECORD EVENT"}</small><b>{event.label}</b></div><strong>{index===0?"v2":index===2?"v3":event.state}</strong></article>)}</div></section></main>;
}

export function Delta(){
  const location=useLocation(); const route=useConceptRoute("delta"); const command=useHybridCommand("delta",route); const [selectedRecord,setSelectedRecord]=useState(0);
  if(location.pathname==="/delta"||location.pathname==="/delta/")return <div className="delta-concept"><DeltaLanding/></div>;
  return <div className="delta-concept de-app"><header className="de-topbar"><Link to="/delta"><b>30</b><span>DELTA</span></Link><nav aria-label="Delta primary">{primaryNavItems(route.role).map(item=><button key={item.view} aria-current={navViewIsCurrent(route.view,item.view)?"page":undefined} onClick={()=>route.go(item.view)}>{item.label}</button>)}</nav><div className="de-role"><button aria-pressed={route.role==="freelancer"} onClick={()=>route.switchRole("freelancer")}>Kavya</button><button aria-pressed={route.role==="client"} onClick={()=>route.switchRole("client")}>Ternary</button></div></header><div className="de-command-row"><DeltaCommand command={command}/><div><span>ACTIVE HISTORY</span><b>TH–042 · AP.001 · v{route.state.applicationVersion}</b></div><button onClick={()=>route.dispatch({type:"reset"})}><RotateCcw/>Reset</button><Link to="/"><ArrowLeft/>Collection</Link></div><main id="main-content" className="de-main"><DeltaView key={`${route.view}-${route.role}-${selectedRecord}`} {...route} selectedRecord={selectedRecord} setSelectedRecord={setSelectedRecord}/></main>{route.state.toast?<div className="de-toast" role="status">{route.state.toast}</div>:null}</div>;
}
