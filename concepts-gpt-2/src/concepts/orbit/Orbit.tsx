import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Eye,
  LockKeyhole,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import { immutableTerms, ORBIT_DEPTHS, orbitDepthForView } from "../../domain/final-collection";
import { useConceptRoute } from "../../domain/useConceptRoute";
import type { ViewId } from "../../domain/types";
import "./orbit.css";

const POSITIONS = [
  { x: 50, y: 7 },
  { x: 82, y: 23 },
  { x: 91, y: 59 },
  { x: 66, y: 88 },
  { x: 29, y: 87 },
  { x: 8, y: 58 },
  { x: 17, y: 23 },
] as const;

function viewForDepth(role: "client" | "freelancer", depth: number): ViewId {
  const freelancer: ViewId[] = ["discover", "gig", "applications", "selection", "engagement"];
  const client: ViewId[] = ["review", "candidate", "candidate", "selection", "engagement"];
  return (role === "client" ? client : freelancer)[Math.max(0, Math.min(4, depth))];
}

function OrbitLanding({ enter }: { enter: (role: "client" | "freelancer") => void }) {
  return (
    <main id="main-content" className="ob-landing">
      <div className="ob-rings" aria-hidden="true"><i /><i /><i /><i /></div>
      <span className="ob-landing-mark">24 / ORBIT</span>
      <section className="ob-landing-core">
        <small>LIVE AUTHORITY AT DEPTH 04</small>
        <h1>One market.<br />Five meaningful depths.</h1>
        <p>Move from opportunity to exact terms without losing the record that brought you there.</p>
        <div><button onClick={() => enter("freelancer")}>Enter Kavya’s orbit <ArrowRight /></button><button onClick={() => enter("client")}>Enter Ternary’s orbit <ArrowRight /></button></div>
      </section>
      <div className="ob-landing-nodes" aria-hidden="true"><span>Market</span><span>Brief</span><span>Evidence</span><span>Authority</span><span>Work</span></div>
      <Link to="/"><ArrowLeft /> Concept field</Link>
    </main>
  );
}

function OrbitDepthControls({
  active,
  move,
  enterDepth,
}: {
  active: number;
  move: (delta: number) => void;
  enterDepth: (depth: number) => void;
}) {
  return (
    <div className="ob-depth-control" role="toolbar" aria-label="Semantic depth controls">
      <button onClick={() => move(-1)} aria-label="Move one depth outward"><ArrowUp /></button>
      <div>
        {ORBIT_DEPTHS.map((depth, index) => <button key={depth.id} aria-pressed={active === index} onClick={() => enterDepth(index)}><i>{index + 1}</i><span>{depth.label}</span></button>)}
      </div>
      <button onClick={() => move(1)} aria-label="Move one depth inward"><ArrowDown /></button>
    </div>
  );
}

function MarketCore({
  role,
  activeNode,
  setActiveNode,
  go,
}: {
  role: "client" | "freelancer";
  activeNode: number;
  setActiveNode: (index: number) => void;
  go: (view: ViewId) => void;
}) {
  const records = role === "client" ? APPLICANTS : GIGS;
  const record = records[activeNode] ?? records[0];
  return (
    <section className="ob-core-content ob-market">
      <small>{role === "client" ? "APPLICANT FIELD" : "OPPORTUNITY FIELD"}</small>
      <h1>{"name" in record ? record.name : record.company}</h1>
      <p>{"headline" in record ? record.headline : record.title}</p>
      <strong>{"match" in record ? record.match : 0} evidence fit</strong>
      <button onClick={() => go(role === "client" ? "candidate" : "gig")}>Move this record inward <ArrowRight /></button>
      <div className="ob-market-pips" aria-label="Records in this depth">
        {records.map((item, index) => <button aria-label={`Focus ${"name" in item ? item.name : item.company}`} aria-pressed={activeNode === index} onClick={() => setActiveNode(index)} key={item.id}>{index + 1}</button>)}
      </div>
    </section>
  );
}

function BriefCore({ role, activeRequirement, setActiveRequirement, go }: { role: "client" | "freelancer"; activeRequirement: number; setActiveRequirement: (index: number) => void; go: (view: ViewId) => void }) {
  const requirements = ["React systems", "TypeScript migration", "WCAG 2.2", "Clinical-trial context"];
  const support = ["Two reviewed platform systems", "Large typed migration record", "AA validation matrix", "Adjacent regulated-health work only"];
  return (
    <section className="ob-core-content ob-brief">
      <small>BRIEF DEPTH · REQUIREMENT {activeRequirement + 1}/4</small>
      <h1>{requirements[activeRequirement]}</h1>
      <p>{support[activeRequirement]}</p>
      <strong className={activeRequirement === 3 ? "is-gap" : ""}>{activeRequirement === 3 ? "Disclosed gap—not inferred evidence" : "Reviewed support"}</strong>
      <div className="ob-requirement-ring">{requirements.map((item, index) => <button key={item} aria-pressed={activeRequirement === index} onClick={() => setActiveRequirement(index)}>{String(index + 1).padStart(2, "0")}</button>)}</div>
      <button onClick={() => go(role === "client" ? "candidate" : "applications")}>Inspect application depth <ArrowRight /></button>
    </section>
  );
}

function ApplicationCore({
  role,
  state,
  dispatch,
  go,
}: {
  role: "client" | "freelancer";
  state: ReturnType<typeof useConceptRoute>["state"];
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
  go: (view: ViewId) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <form className="ob-core-content ob-proposal" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "submit-revision" }); setEditing(false); }}>
        <small>NEW APPLICATION DEPTH</small>
        <h1>v{state.applicationVersion + 1}</h1>
        <label>Exact proposal<input defaultValue="₹5.8L fixed" /></label>
        <label>Workshop count<input type="number" min="1" defaultValue="4" /></label>
        <button type="submit">Record and recenter <ArrowRight /></button>
      </form>
    );
  }
  return (
    <section className="ob-core-content ob-application">
      <small>APPLICATION v{state.applicationVersion} · {state.applicationStage}</small>
      <h1>{TERMS.proposal}</h1>
      <p>{QA.question}</p>
      {state.qaAnswered ? <blockquote>{QA.answer}</blockquote> : <button onClick={() => dispatch({ type: "answer-qa" })}>Record structured answer</button>}
      <div><button onClick={() => setEditing(true)}>Create a new version</button><button onClick={() => go("selection")}>{role === "client" ? "Inspect authority" : "Review selection"} <ArrowRight /></button></div>
    </section>
  );
}

function AuthorityCore({
  role,
  state,
  dispatch,
  go,
}: {
  role: "client" | "freelancer";
  state: ReturnType<typeof useConceptRoute>["state"];
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
  go: (view: ViewId) => void;
}) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const status = state.selectionRequest?.status ?? "unissued";
  return (
    <section className={`ob-core-content ob-authority is-${status}`}>
      <ShieldCheck />
      <small>QUIET AUTHORITY DEPTH</small>
      <h1>v{state.applicationVersion} × v{state.gigVersion}</h1>
      <p>{TERMS.proposal} · 14 weeks · 28 hours/week</p>
      <strong>{status}</strong>
      {status === "invalidated" || status === "expired" ? <div role="alert"><X /><span>{status === "expired" ? "The response orbit closed without acceptance." : "Revision moved the application outside this authority."}</span></div> : null}
      {role === "client" && status !== "pending" && status !== "accepted" ? <footer><label>Response window<select value={deadline} onChange={(event) => setDeadline(event.target.value as typeof deadline)}><option value="24">24h</option><option value="48">48h</option><option value="72">72h</option></select></label><button onClick={() => dispatch({ type: "send-selection", deadline })}>Center exact authority <Send /></button></footer> : null}
      {role === "freelancer" && status === "pending" ? <button onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Accept at the core <Check /></button> : null}
      {status === "accepted" ? <button onClick={() => go("engagement")}>Enter stable work core <ArrowRight /></button> : null}
    </section>
  );
}

function EngagementCore({
  state,
  dispatch,
}: {
  state: ReturnType<typeof useConceptRoute>["state"];
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
}) {
  const exact = immutableTerms(state);
  return (
    <section className="ob-core-content ob-engagement">
      <ShieldCheck />
      <small>STABLE ENGAGEMENT CORE</small>
      <h1>{exact.proposal}</h1>
      <p>gig v{exact.gigVersion} × application v{exact.applicationVersion}<br />{exact.duration} · {exact.capacity}</p>
      <button onClick={() => dispatch({ type: "advance-engagement" })} disabled={state.engagementStatus === "completed"}>{state.engagementStatus.replaceAll("_", " ")} <ArrowRight /></button>
      <div className="ob-contact">
        {state.contactPermission.revealed ? <Eye /> : <LockKeyhole />}
        <span><small>CONTACT ORBIT</small><b>{state.contactPermission.revealed ? "kavya.menon@example.com" : state.contactPermission.consentActive ? "k•••••@example.com" : "Private"}</b></span>
        {!state.contactPermission.consentActive || state.contactPermission.revoked ? <button onClick={() => dispatch({ type: "share-contact" })}>Consent</button> : state.contactPermission.revealed ? <button onClick={() => dispatch({ type: "revoke-contact" })}>Revoke</button> : <button onClick={() => dispatch({ type: "reveal-contact" })}>Reveal</button>}
      </div>
    </section>
  );
}

export function Orbit() {
  const { role, view, go, switchRole, state, dispatch } = useConceptRoute("orbit");
  const params = useParams<{ role?: string }>();
  const publicEntry = !params.role;
  const reduced = useReducedMotion();
  const [depth, setDepth] = useState(orbitDepthForView(view));
  const [activeNode, setActiveNode] = useState(0);
  const [activeRequirement, setActiveRequirement] = useState(0);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => setDepth(orbitDepthForView(view)), [view]);

  const orbitalRecords = useMemo(() => {
    if (depth === 0) return (role === "client" ? APPLICANTS : GIGS).map((record) => "name" in record ? record.name : record.company);
    if (depth === 1) return ["React", "TypeScript", "WCAG", "Clinical gap"];
    if (depth === 2) return ["Evidence", `Application v${state.applicationVersion}`, "Q&A", "Terms"];
    if (depth === 3) return [`Gig v${state.gigVersion}`, `Application v${state.applicationVersion}`, state.selectionRequest?.status ?? "Unissued"];
    return ["Terms", state.engagementStatus, "Contact"];
  }, [depth, role, state.applicationVersion, state.engagementStatus, state.gigVersion, state.selectionRequest?.status]);

  if (publicEntry) return <div className="orbit-concept"><OrbitLanding enter={switchRole} /></div>;

  const enterDepth = (next: number) => {
    const safe = Math.max(0, Math.min(4, next));
    setDepth(safe);
    setActiveNode(0);
    go(viewForDepth(role, safe));
  };

  return (
    <div className="orbit-concept">
      <main
        id="main-content"
        className={`ob-field is-depth-${depth}`}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            event.preventDefault();
            const next = (activeNode - 1 + orbitalRecords.length) % orbitalRecords.length;
            setActiveNode(next);
            nodeRefs.current[next]?.focus();
          }
          if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            event.preventDefault();
            const next = (activeNode + 1) % orbitalRecords.length;
            setActiveNode(next);
            nodeRefs.current[next]?.focus();
          }
        }}
      >
        <div className="ob-utility">
          <Link to="/">GM / 24</Link>
          <span>{role} orbit</span>
          <button onClick={() => dispatch({ type: "reset" })}><RotateCcw /> Reset</button>
          <div><button aria-pressed={role === "freelancer"} onClick={() => switchRole("freelancer")}>K</button><button aria-pressed={role === "client"} onClick={() => switchRole("client")}>T</button></div>
        </div>
        <OrbitDepthControls active={depth} move={(delta) => enterDepth(depth + delta)} enterDepth={enterDepth} />

        <div className="ob-orbital-stage">
          <svg className="ob-orbit-lines" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="43" />
            <circle cx="50" cy="50" r="32" />
            <circle cx="50" cy="50" r="21" />
          </svg>
          <div className="ob-nodes" role="group" aria-label={`${ORBIT_DEPTHS[depth].label} records`}>
            {orbitalRecords.map((label, index) => {
              const position = POSITIONS[index % POSITIONS.length];
              return (
                <motion.button
                  layout
                  ref={(node) => { nodeRefs.current[index] = node; }}
                  key={`${depth}-${label}`}
                  className={activeNode === index ? "is-active" : ""}
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                  aria-pressed={activeNode === index}
                  tabIndex={activeNode === index ? 0 : -1}
                  onClick={() => setActiveNode(index)}
                  animate={reduced ? undefined : { scale: activeNode === index ? 1.12 : 1 }}
                  transition={{ type: "spring", bounce: .18, duration: .45 }}
                >
                  <i>{String(index + 1).padStart(2, "0")}</i><span>{label}</span>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              className="ob-core"
              key={`${depth}-${activeNode}-${state.applicationVersion}-${state.selectionRequest?.status}`}
              initial={reduced ? false : { opacity: 0, scale: .78, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.15, rotate: 2 }}
              transition={{ duration: reduced ? 0 : .36, ease: [0.2, .8, .2, 1] }}
            >
              {depth === 0 ? <MarketCore role={role} activeNode={activeNode} setActiveNode={setActiveNode} go={go} /> : null}
              {depth === 1 ? <BriefCore role={role} activeRequirement={activeRequirement} setActiveRequirement={setActiveRequirement} go={go} /> : null}
              {depth === 2 ? <ApplicationCore role={role} state={state} dispatch={dispatch} go={go} /> : null}
              {depth === 3 ? <AuthorityCore role={role} state={state} dispatch={dispatch} go={go} /> : null}
              {depth === 4 ? <EngagementCore state={state} dispatch={dispatch} /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      {state.toast ? <div className="ob-toast" role="status">{state.toast}</div> : null}
    </div>
  );
}
