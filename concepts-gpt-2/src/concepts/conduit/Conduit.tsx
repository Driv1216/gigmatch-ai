import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, CornerDownLeft, Menu, RotateCcw, Search, Terminal, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { currentChannel } from "../../domain/final-collection";
import { useConceptRoute } from "../../domain/useConceptRoute";
import {
  navViewIsCurrent,
  primaryNavItems,
  roleLabel,
  useHybridCommand,
  viewLabel,
  workflowPosition,
  type HybridCommand,
  type HybridRoute,
} from "../command-current/Shared";
import { ConduitView } from "./ConduitViews";
import "./conduit.css";

function CommandField({ command }: { command: HybridCommand }) {
  return <div className="co-command-shell">
    <form className="co-command-bar" onSubmit={event => { event.preventDefault(); command.run(); }}>
      <Search aria-hidden="true" />
      <input ref={command.inputRef} value={command.input} onFocus={command.focus} onChange={event => command.setInput(event.target.value)} aria-label="Conduit command input" placeholder="Type a command — open market, review selection…" />
      <kbd>/</kbd><kbd>⌘K</kbd>
      <button aria-label="Run command"><CornerDownLeft /></button>
    </form>
    {command.suggestionsVisible ? <div className="co-command-results" aria-label="Suggested commands">
      {command.invalid ? <p role="alert">{command.notice}</p> : <span>Suggested commands</span>}
      {command.suggestions.map(item => <button key={item.input} onMouseDown={event => event.preventDefault()} onClick={() => command.run(item.input)}><Terminal />{item.input}<ArrowRight /></button>)}
    </div> : null}
  </div>;
}

function ConduitLanding() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [demo, setDemo] = useState("open application");
  const openDemo = () => navigate(`/conduit/freelancer/${demo.toLowerCase().includes("selection") ? "selection" : demo.toLowerCase().includes("market") ? "discover" : "applications"}`);
  return <main id="main-content" className="co-landing">
    <header><Link to="/"><b>28</b><span>CONDUIT</span></Link><small>COMMAND × CURRENT / OPERATIONS</small></header>
    <section className="co-land-hero">
      <div className="co-land-copy"><span>TYPE THE INTENT. FOLLOW THE RECORD.</span><h1>Command,<br/><em>with current.</em></h1><p>A production workspace where every command keeps its source, consequence, and next action attached.</p><div><button onClick={() => navigate("/conduit/freelancer/home")}>Open specialist workspace <ArrowRight /></button><button onClick={() => navigate("/conduit/client/home")}>Open client workspace</button></div></div>
      <div className="co-land-product">
        <form onSubmit={event => { event.preventDefault(); openDemo(); }}><Search/><input aria-label="Conduit landing command" value={demo} onChange={event => setDemo(event.target.value)}/><kbd>↵</kbd></form>
        <div className="co-land-current"><i/><motion.i animate={{width: demo.includes("selection") ? "88%" : demo.includes("market") ? "38%" : "62%"}} transition={{duration:reduced?0:.5,ease:[.22,1,.36,1]}}/></div>
        <button onClick={() => setDemo("open market")}><span>01</span><div><b>open market</b><small>Three evidence-matched opportunities</small></div><ArrowRight/></button>
        <button className="is-glass" onClick={() => setDemo("open application")}><span>02</span><div><b>open application</b><small>Application v2 · selection pending</small></div><ArrowRight/></button>
        <button className="is-coral" onClick={() => setDemo("review selection")}><span>03</span><div><b>review selection</b><small>₹5.8L fixed · 31 hours remain</small></div><ArrowRight/></button>
      </div>
    </section>
  </main>;
}

function ConduitNavigation({ route, close }: { route: HybridRoute; close?: () => void }) {
  return <nav className="co-primary-nav" aria-label="Conduit primary">
    {primaryNavItems(route.role).map((item, index) => <button key={item.view} aria-current={navViewIsCurrent(route.view, item.view) ? "page" : undefined} onClick={() => { route.go(item.view); close?.(); }}><i>{String(index + 1).padStart(2,"0")}</i><span>{item.label}</span><ArrowRight/></button>)}
  </nav>;
}

export function Conduit() {
  const location = useLocation();
  const route = useConceptRoute("conduit");
  const command = useHybridCommand("conduit", route);
  const reduced = useReducedMotion();
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(0);
  const channel = currentChannel(route.state);
  const position = workflowPosition(route.view);

  if (location.pathname === "/conduit" || location.pathname === "/conduit/") return <div className="conduit-concept"><ConduitLanding /></div>;

  return <div className={`conduit-concept co-app is-${channel}`}>
    <header className="co-topbar">
      <button className="co-mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open primary navigation"><Menu/></button>
      <Link to="/conduit"><b>28</b><span>CONDUIT</span></Link>
      <CommandField command={command}/>
      <div className="co-role"><button aria-pressed={route.role === "freelancer"} onClick={() => route.switchRole("freelancer")}>Kavya</button><button aria-pressed={route.role === "client"} onClick={() => route.switchRole("client")}>Ternary</button></div>
    </header>

    <aside className="co-rail">
      <div className="co-entity"><span>ACTIVE RECORD</span><b>TH–042</b><small>Ternary Health</small></div>
      <ConduitNavigation route={route}/>
      <div className={`co-authority is-${channel}`}><span>AUTHORITY</span><b>{route.role === "client" ? "Issue selection" : "Accept exact terms"}</b><small>{route.state.selectionRequest?.status ?? route.state.selectionStatus}</small></div>
      <button onClick={() => route.dispatch({ type:"reset" })}><RotateCcw/>Reset scenario</button><Link to="/"><ArrowLeft/>Concepts</Link>
    </aside>

    {mobileNav ? <div className="co-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setMobileNav(false); }}><aside className="co-drawer" aria-label="Primary navigation drawer"><header><div><small>{roleLabel(route.role)}</small><b>{viewLabel(route.view)}</b></div><button onClick={() => setMobileNav(false)} aria-label="Close primary navigation"><X/></button></header><ConduitNavigation route={route} close={() => setMobileNav(false)}/></aside></div> : null}

    <main id="main-content" className="co-main">
      <header className="co-record-current"><div><span>{viewLabel(route.view)}</span><b>Application v{route.state.applicationVersion}</b></div><div className="co-current-track" aria-label={`Record progress ${position + 1} of 5`}><i/><motion.i initial={reduced ? false : {width:0}} animate={{width:`${(position + 1) * 20}%`}} transition={{duration:reduced?0:.55,ease:[.22,1,.36,1]}}/></div><strong>{channel === "revision" ? "Revision broke the pending selection" : channel === "work" ? "Accepted record connected to engagement" : "Record current"}</strong></header>
      <ConduitView {...route} selectedRecord={selectedRecord} setSelectedRecord={setSelectedRecord}/>
    </main>
    {route.state.toast ? <div className="co-toast" role="status">{route.state.toast}</div> : null}
  </div>;
}
