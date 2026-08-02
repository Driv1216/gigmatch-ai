import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  LockKeyhole,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { APPLICANTS, QA, TERMS } from "../../domain/fixtures";
import { measurePlan, PLAN_SEGMENTS } from "../../domain/final-collection";
import { useConceptRoute } from "../../domain/useConceptRoute";
import type { ViewId } from "../../domain/types";
import "./measure.css";

const WEEK_LABELS = Array.from({ length: 14 }, (_, index) => index + 1);
const VIEW_FOCUS: Record<ViewId, string> = {
  home: "Capacity today",
  discover: "Opportunity impact",
  gig: "Delivery plan",
  proposal: "Compose proposal",
  applications: "Version record",
  review: "Candidate capacity",
  candidate: "Candidate plan",
  selection: "Exact commitment",
  engagement: "Live engagement",
};

function MeasureLanding({ enter }: { enter: (role: "client" | "freelancer") => void }) {
  return (
    <main id="main-content" className="ms-landing">
      <div className="ms-landing-mark"><b>22 / MEASURE</b><span>One plan. Every consequence.</span></div>
      <div className="ms-landing-scale" aria-label="Fourteen week sample delivery plan">
        <div className="ms-scale-top">{WEEK_LABELS.map((week) => <span key={week}>W{week}</span>)}</div>
        {PLAN_SEGMENTS.map((segment) => (
          <div className={`ms-preview-segment is-${segment.id}`} key={segment.id} style={{ gridColumn: `${segment.start} / span ${segment.weeks}` }}>
            <b>{segment.label}</b><small>₹{segment.amount}L · {segment.hours}h/w</small>
          </div>
        ))}
        <div className="ms-landing-total"><span>Exact proposal</span><strong>₹5.8L</strong><small>14 weeks · 28 hours/week</small></div>
      </div>
      <div className="ms-landing-entry">
        <button onClick={() => enter("freelancer")}>Plan as Kavya <ArrowRight /></button>
        <button onClick={() => enter("client")}>Review as Ternary <ArrowRight /></button>
      </div>
      <Link to="/"><ArrowLeft /> Concept collection</Link>
    </main>
  );
}

function MeasureToolbar({
  role,
  view,
  switchRole,
  reset,
  go,
}: {
  role: "client" | "freelancer";
  view: ViewId;
  switchRole: (role: "client" | "freelancer") => void;
  reset: () => void;
  go: (view: ViewId) => void;
}) {
  const flow: ViewId[] = role === "client" ? ["home", "review", "candidate", "selection", "engagement"] : ["home", "discover", "gig", "proposal", "applications", "selection", "engagement"];
  const at = Math.max(0, flow.indexOf(view));
  return (
    <div className="ms-tool-notch">
      <Link to="/">GM / 22</Link>
      <button onClick={() => go(flow[Math.max(0, at - 1)])} aria-label="Previous measure"><ChevronLeft /></button>
      <div><span>{role}</span><b>{VIEW_FOCUS[view]}</b></div>
      <button onClick={() => go(flow[Math.min(flow.length - 1, at + 1)])} aria-label="Next measure"><ChevronRight /></button>
      <div className="ms-role"><button aria-pressed={role === "freelancer"} onClick={() => switchRole("freelancer")}>K</button><button aria-pressed={role === "client"} onClick={() => switchRole("client")}>T</button></div>
      <button onClick={reset} aria-label="Reset scenario"><RotateCcw /></button>
    </div>
  );
}

function PlanSurface({
  capacity,
  selected,
  onSelect,
  compare,
}: {
  capacity: number;
  selected: string;
  onSelect: (id: string) => void;
  compare?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="ms-plan-surface">
      <div className="ms-week-rule">{WEEK_LABELS.map((week) => <span key={week}><b>{week}</b><i /></span>)}</div>
      <div className="ms-capacity-rule">
        <span>32h</span><span>28h</span><span>24h</span><b style={{ top: `${100 - ((capacity - 20) / 14) * 100}%` }}>{capacity}h available</b>
      </div>
      <div className="ms-segments">
        {PLAN_SEGMENTS.map((segment) => (
          <motion.button
            layout
            transition={{ duration: reduced ? 0 : 0.3, type: "spring", bounce: 0.12 }}
            className={`ms-segment is-${segment.id} ${selected === segment.id ? "is-selected" : ""}`}
            key={segment.id}
            style={{ gridColumn: `${segment.start} / span ${segment.weeks}`, height: `${44 + segment.hours * 1.5}px` }}
            onClick={() => onSelect(segment.id)}
            aria-pressed={selected === segment.id}
          >
            <span>{segment.label}</span><b>W{segment.start}–{segment.start + segment.weeks - 1}</b><small>₹{segment.amount}L · {segment.hours}h/week</small>
          </motion.button>
        ))}
        {compare ? <div className="ms-candidate-overlay"><span>{compare}</span><i /></div> : null}
      </div>
    </div>
  );
}

function ProposalControls({
  capacity,
  setCapacity,
  selected,
  submit,
}: {
  capacity: number;
  setCapacity: (capacity: number) => void;
  selected: string;
  submit: () => void;
}) {
  const plan = measurePlan(capacity);
  const segment = PLAN_SEGMENTS.find((item) => item.id === selected) ?? PLAN_SEGMENTS[0];
  return (
    <section className="ms-control-drawer" aria-label="Proposal composition controls">
      <div><span>Selected phase</span><h2>{segment.label}</h2><p>Weeks {segment.start}–{segment.start + segment.weeks - 1} · ₹{segment.amount}L allocated</p></div>
      <label>
        Weekly capacity
        <span className="ms-stepper">
          <button type="button" onClick={() => setCapacity(Math.max(20, capacity - 1))} aria-label="Decrease weekly capacity">−</button>
          <input aria-label="Weekly capacity in hours" type="number" min="20" max="34" value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} />
          <button type="button" onClick={() => setCapacity(Math.min(34, capacity + 1))} aria-label="Increase weekly capacity">+</button>
        </span>
      </label>
      <div className={plan.conflict ? "ms-consequence is-conflict" : "ms-consequence"} role="status">
        {plan.conflict ? <CircleAlert /> : <Check />}
        <span><b>{plan.conflictMessage}</b><small>₹{plan.amount.toFixed(1)}L · {plan.totalWeeks} weeks</small></span>
      </div>
      <button className="ms-submit" onClick={submit} disabled={plan.conflict}>Record application v3 <ArrowRight /></button>
    </section>
  );
}

function MeasureReview({ selected, setSelected }: { selected: number; setSelected: (index: number) => void }) {
  return (
    <div className="ms-review-points" aria-label="Candidate availability comparison">
      {APPLICANTS.map((applicant, index) => (
        <button key={applicant.id} aria-pressed={selected === index} onClick={() => setSelected(index)}>
          <i style={{ left: `${Math.min(92, 12 + index * 21)}%` }} />
          <b>{applicant.name}</b><span>{applicant.availability}</span><small>{applicant.match} evidence fit · {applicant.proposal}</small>
        </button>
      ))}
    </div>
  );
}

function MeasureSelection({
  role,
  state,
  send,
  accept,
}: {
  role: "client" | "freelancer";
  state: ReturnType<typeof useConceptRoute>["state"];
  send: (deadline: "24" | "48" | "72") => void;
  accept: () => void;
}) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const status = state.selectionRequest?.status ?? "unissued";
  return (
    <section className={`ms-authority is-${status}`}>
      <div className="ms-authority-line">
        <span>W1</span><i /><b>Exact commitment · application v{state.applicationVersion} × brief v{state.gigVersion}</b><i /><span>W14</span>
      </div>
      <div className="ms-authority-terms"><strong>₹5.8L</strong><span>14 weeks</span><span>28 hours/week</span><span>Four workshops</span></div>
      {status === "invalidated" || status === "expired" ? <p role="alert"><CircleAlert /><b>{status === "expired" ? "Window expired." : "Commitment changed."}</b> Issue a fresh request against the current plan.</p> : null}
      {role === "client" && status !== "pending" && status !== "accepted" ? <div><label>Response window<select value={deadline} onChange={(event) => setDeadline(event.target.value as typeof deadline)}><option value="24">24h</option><option value="48">48h</option><option value="72">72h</option></select></label><button onClick={() => send(deadline)}>Bind current plan <Send /></button></div> : null}
      {role === "freelancer" && status === "pending" ? <button className="ms-commit" onClick={accept}>Confirm capacity and exact terms <Check /></button> : null}
      {status === "accepted" ? <div className="ms-sealed"><ShieldCheck /><span><b>Commitment confirmed</b><small>The engagement inherits this exact scale.</small></span></div> : null}
    </section>
  );
}

function MeasureEngagement({
  state,
  advance,
  permission,
}: {
  state: ReturnType<typeof useConceptRoute>["state"];
  advance: () => void;
  permission: (action: "share-contact" | "reveal-contact" | "revoke-contact") => void;
}) {
  const lifecycle = ["confirmed", "kickoff_pending", "in_progress", "completion_pending", "completed"] as const;
  const active = lifecycle.indexOf(state.engagementStatus);
  return (
    <section className="ms-work-scale">
      <div className="ms-lifecycle">
        {lifecycle.map((step, index) => <span key={step} className={index <= active ? "is-active" : ""}><i>{index < active ? <Check /> : index + 1}</i><b>{step.replaceAll("_", " ")}</b></span>)}
      </div>
      <button onClick={advance} disabled={state.engagementStatus === "completed"}>Advance participant-reported status <ArrowRight /></button>
      <div className="ms-contact">
        {state.contactPermission.revealed ? <Eye /> : <LockKeyhole />}
        <span><small>Engagement-scoped contact</small><b>{state.contactPermission.revealed ? "kavya.menon@example.com" : state.contactPermission.consentActive ? "k•••••@example.com" : "Private"}</b></span>
        {!state.contactPermission.consentActive || state.contactPermission.revoked ? <button onClick={() => permission("share-contact")}>Record consent</button> : state.contactPermission.revealed ? <button onClick={() => permission("revoke-contact")}>Revoke display</button> : <button onClick={() => permission("reveal-contact")}>Authorize reveal</button>}
      </div>
    </section>
  );
}

export function Measure() {
  const { role, view, go, switchRole, state, dispatch } = useConceptRoute("measure");
  const params = useParams<{ role?: string }>();
  const [capacity, setCapacity] = useState(28);
  const [segment, setSegment] = useState("foundation");
  const [candidate, setCandidate] = useState(0);
  const publicEntry = !params.role;
  const client = role === "client";
  const compare = client && ["home", "review", "candidate"].includes(view) ? APPLICANTS[candidate].name : undefined;
  const drawer = view === "proposal";
  const selection = view === "selection";
  const engagement = view === "engagement";
  const application = view === "applications";

  if (publicEntry) return <div className="measure"><MeasureLanding enter={switchRole} /></div>;

  return (
    <div className="measure">
      <main id="main-content" className={`ms-instrument is-${view}`}>
        <MeasureToolbar role={role} view={view} switchRole={switchRole} reset={() => dispatch({ type: "reset" })} go={go} />
        <div className="ms-instrument-caption">
          <span>{client ? "Ternary Health" : "Kavya Menon"}</span>
          <h1>{client ? "The delivery plan must fit the evidence." : "The promise must fit the week."}</h1>
          <p>{state.selectionRequest?.status === "expired" ? "The previous window expired without acceptance." : `${TERMS.proposal} · application v${state.applicationVersion} · ${state.applicationStage}`}</p>
        </div>
        <PlanSurface capacity={capacity} selected={segment} onSelect={setSegment} compare={compare} />
        {client && ["home", "review", "candidate"].includes(view) ? <MeasureReview selected={candidate} setSelected={setCandidate} /> : null}
        <AnimatePresence>
          {drawer ? <motion.div className="ms-drawer-wrap" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", bounce: .08, duration: .45 }}><ProposalControls capacity={capacity} setCapacity={setCapacity} selected={segment} submit={() => { dispatch({ type: "submit-revision" }); go("applications"); }} /></motion.div> : null}
          {application ? <motion.section className="ms-record-drawer" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}><span>Structured Q&A · application v{state.applicationVersion}</span><blockquote>{QA.question}</blockquote>{state.qaAnswered ? <p>{QA.answer}</p> : <button onClick={() => dispatch({ type: "answer-qa" })}>Record answer</button>}<button onClick={() => go("proposal")}>Open revision controls</button></motion.section> : null}
          {selection ? <motion.div className="ms-authority-wrap" initial={{ opacity: 0, scaleY: .92 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0 }}><MeasureSelection role={role} state={state} send={(deadline) => dispatch({ type: "send-selection", deadline })} accept={() => { dispatch({ type: "accept-selection" }); go("engagement"); }} /></motion.div> : null}
          {engagement ? <motion.div className="ms-work-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><MeasureEngagement state={state} advance={() => dispatch({ type: "advance-engagement" })} permission={(type) => dispatch({ type })} /></motion.div> : null}
        </AnimatePresence>
      </main>
      {state.toast ? <div className="ms-toast" role="status">{state.toast}</div> : null}
    </div>
  );
}
