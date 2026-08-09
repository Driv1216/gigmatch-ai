import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, CornerDownLeft, RotateCcw, Search, Terminal } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useConceptRoute } from "../../domain/useConceptRoute";
import { navViewIsCurrent, primaryNavItems, useHybridCommand, type HybridCommand } from "../command-current/Shared";
import { SwitchboardView } from "./SwitchboardViews";
import "./switchboard.css";

function SwitchboardCommand({ command }: { command: HybridCommand }) {
  return <div className="sw-command-shell"><form onSubmit={event=>{event.preventDefault();command.run();}}><Search/><span>command</span><input ref={command.inputRef} value={command.input} onFocus={command.focus} onChange={event=>command.setInput(event.target.value)} aria-label="Switchboard command input" placeholder="open application or compare applicants"/><kbd>/</kbd><kbd>⌘K</kbd><button aria-label="Run command"><CornerDownLeft/></button></form>{command.suggestionsVisible?<div className="sw-command-results" aria-label="Suggested commands">{command.invalid?<p role="alert">{command.notice}</p>:<span>Route a command</span>}{command.suggestions.map(item=><button key={item.input} onMouseDown={event=>event.preventDefault()} onClick={()=>command.run(item.input)}><Terminal/>{item.input}<ArrowRight/></button>)}</div>:null}</div>;
}

function SwitchboardLanding() {
  const navigate=useNavigate(); const [open,setOpen]=useState(1); const reduced=useReducedMotion();
  const lanes=[{title:"open market",copy:"3 evidence-matched opportunities",tone:"bone"},{title:"open application",copy:"Application v2 · selection pending",tone:"glass"},{title:"review selection",copy:"₹5.8L fixed · 31 hours remain",tone:"coral"}];
  return <main id="main-content" className="sw-landing"><header><Link to="/"><b>29</b><span>SWITCHBOARD</span></Link><small>COMMAND × CURRENT / EXPANDING LANES</small></header><section><div className="sw-land-copy"><span>ONE FIELD. EVERY ROUTE.</span><h1>Open the lane.<br/>Keep the board.</h1><p>Compare, inspect, and act without disappearing into another admin screen.</p><div><button onClick={()=>navigate("/switchboard/freelancer/home")}>Open specialist board<ArrowRight/></button><button onClick={()=>navigate("/switchboard/client/home")}>Open client board</button></div></div><div className="sw-land-lanes">{lanes.map((lane,index)=><motion.article layout={!reduced} key={lane.title} className={`is-${lane.tone} ${open===index?"is-open":""}`}><button onClick={()=>setOpen(index)}><span>0{index+1}</span><div><b>{lane.title}</b><small>{lane.copy}</small></div><ArrowRight/></button><AnimatePresence>{open===index?<motion.div initial={reduced?false:{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={reduced?undefined:{height:0,opacity:0}} transition={{duration:reduced?0:.32,ease:[.22,1,.36,1]}}><strong>{index===0?"92% evidence fit":index===1?"One connected record":"Exact versions ready"}</strong><p>{index===0?"Ternary Health leads the current market.":index===1?"Proposal, clarification, and authority remain attached.":"Acceptance will create the engagement record."}</p></motion.div>:null}</AnimatePresence></motion.article>)}</div></section></main>;
}

export function Switchboard(){
  const location=useLocation(); const route=useConceptRoute("switchboard"); const command=useHybridCommand("switchboard",route); const [selectedRecord,setSelectedRecord]=useState(0);
  if(location.pathname==="/switchboard"||location.pathname==="/switchboard/")return <div className="switchboard-concept"><SwitchboardLanding/></div>;
  return <div className="switchboard-concept sw-app">
    <header className="sw-topbar"><Link to="/switchboard"><b>29</b><span>SWITCHBOARD</span></Link><nav aria-label="Switchboard primary">{primaryNavItems(route.role).map(item=><button key={item.view} aria-current={navViewIsCurrent(route.view,item.view)?"page":undefined} onClick={()=>route.go(item.view)}>{item.label}</button>)}</nav><div className="sw-role"><button aria-pressed={route.role==="freelancer"} onClick={()=>route.switchRole("freelancer")}>Kavya</button><button aria-pressed={route.role==="client"} onClick={()=>route.switchRole("client")}>Ternary</button></div></header>
    <div className="sw-command-row"><SwitchboardCommand command={command}/><div><span>ACTIVE RECORD</span><b>TH–042 · Application v{route.state.applicationVersion}</b></div><button onClick={()=>route.dispatch({type:"reset"})}><RotateCcw/>Reset</button><Link to="/"><ArrowLeft/>Collection</Link></div>
    <main id="main-content" className="sw-main"><SwitchboardView key={`${route.view}-${route.role}`} {...route} selectedRecord={selectedRecord} setSelectedRecord={setSelectedRecord}/></main>
    {route.state.toast?<div className="sw-toast" role="status">{route.state.toast}</div>:null}
  </div>;
}
