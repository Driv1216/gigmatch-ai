import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
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
import { currentChannel, immutableTerms } from "../../domain/final-collection";
import { useConceptRoute } from "../../domain/useConceptRoute";
import type { ViewId } from "../../domain/types";
import "./current.css";

const STAGES = ["Find", "Propose", "Review", "Confirm", "Work"] as const;
const STAGE_POSITIONS = [
  { x: 13, y: 27 },
  { x: 32, y: 68 },
  { x: 52, y: 41 },
  { x: 73, y: 70 },
  { x: 89, y: 29 },
] as const;

function stageForView(view: ViewId) {
  if (view === "home" || view === "discover" || view === "review") return 0;
  if (view === "gig" || view === "proposal") return 1;
  if (view === "applications" || view === "candidate") return 2;
  if (view === "selection") return 3;
  return 4;
}

function viewForStage(role: "client" | "freelancer", stage: number): ViewId {
  const freelancer: ViewId[] = ["discover", "proposal", "applications", "selection", "engagement"];
  const client: ViewId[] = ["review", "candidate", "candidate", "selection", "engagement"];
  return (role === "client" ? client : freelancer)[stage];
}

function CurrentLanding({ enter }: { enter: (role: "client" | "freelancer") => void }) {
  return (
    <main id="main-content" className="cu-landing">
      <svg viewBox="0 0 1200 760" preserveAspectRatio="none" aria-hidden="true">
        <path className="cu-land-current cu-land-current--one" d="M-80 180 C180 20 310 660 570 390 S950 100 1280 300" />
        <path className="cu-land-current cu-land-current--two" d="M-80 380 C220 210 360 780 640 510 S930 210 1280 480" />
        <path className="cu-land-current cu-land-current--three" d="M-80 560 C180 370 410 810 690 620 S1000 390 1280 650" />
      </svg>
      <span className="cu-land-mark">26 / CURRENT</span>
      <section>
        <small>LIVE RECORD · SELECTION PENDING</small>
        <h1>Work moves.<br />Context stays.</h1>
        <p>Revision diverts the record. Exact acceptance carries it into engagement. No stage is a dead page.</p>
        <div><button onClick={() => enter("freelancer")}>Flow as Kavya <ArrowRight /></button><button onClick={() => enter("client")}>Flow as Ternary <ArrowRight /></button></div>
      </section>
      <Link to="/"><ArrowLeft /> Concept collection</Link>
    </main>
  );
}

function FindBasin({
  role,
  selectedRecord,
  setSelectedRecord,
  go,
}: {
  role: "client" | "freelancer";
  selectedRecord: number;
  setSelectedRecord: (index: number) => void;
  go: (view: ViewId) => void;
}) {
  const records = role === "client" ? APPLICANTS : GIGS;
  const active = records[selectedRecord] ?? records[0];
  return (
    <section className="cu-basin-content cu-find">
      <small>{role === "client" ? "FOUR APPLICANTS IN REVIEW" : "THREE OPEN OPPORTUNITIES"}</small>
      <h1>{"name" in active ? active.name : active.company}</h1>
      <p>{"headline" in active ? active.headline : active.title}</p>
      <strong>{"match" in active ? active.match : 0} evidence fit</strong>
      <div className="cu-record-switcher">{records.map((item, index) => <button key={item.id} aria-pressed={selectedRecord === index} onClick={() => setSelectedRecord(index)}><i>{index + 1}</i><span>{"name" in item ? item.name : item.company}</span></button>)}</div>
      <button onClick={() => go(role === "client" ? "candidate" : "gig")}>Open this record in the current <ArrowRight /></button>
    </section>
  );
}

function ProposeBasin({
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
  if (role === "client") {
    return (
      <section className="cu-basin-content">
        <small>FIXED BRIEF · VERSION {state.gigVersion}</small>
        <h1>Four outcomes define the channel.</h1>
        <p>Audit · accessible foundation · two workflow migrations · product-team adoption</p>
        <button onClick={() => go("candidate")}>Follow applicant evidence <ArrowRight /></button>
      </section>
    );
  }
  return (
    <form className="cu-basin-content cu-proposal" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "submit-revision" }); go("applications"); }}>
      <small>PROPOSAL CHANNEL · NEW v{state.applicationVersion + 1}</small>
      <h1>Shape the exact promise.</h1>
      <div><label>Fixed proposal<input defaultValue="₹5.8L" /></label><label>Capacity<input type="number" min="26" max="30" defaultValue="28" /></label><label>Workshops<input type="number" min="1" defaultValue="4" /></label></div>
      <button type="submit">Release immutable version <ArrowRight /></button>
    </form>
  );
}

function ReviewBasin({
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
  return (
    <section className="cu-basin-content cu-review">
      <small>APPLICATION v{state.applicationVersion} · {state.applicationStage}</small>
      <h1>{role === "client" ? "Evidence before price." : "One structured clarification."}</h1>
      {role === "client" ? (
        <>
          <p>React systems · TypeScript migration · WCAG 2.2 supported. Direct clinical-trial delivery remains a disclosed gap.</p>
          <div><button onClick={() => dispatch({ type: "toggle-shortlist" })}>{state.shortlisted ? "Remove private shortlist" : "Add private shortlist"}</button><button onClick={() => dispatch({ type: "toggle-advance" })}>{state.advanced ? "Return to review" : "Advance visibly"}</button></div>
        </>
      ) : (
        <>
          <blockquote>{QA.question}</blockquote>
          {state.qaAnswered ? <p>{QA.answer}</p> : <button onClick={() => dispatch({ type: "answer-qa" })}>Record answer</button>}
        </>
      )}
      <button onClick={() => go("selection")}>Follow to confirmation <ArrowRight /></button>
    </section>
  );
}

function ConfirmBasin({
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
    <section className={`cu-basin-content cu-confirm is-${status}`}>
      <ShieldCheck />
      <small>EXACT CONFIRMATION CHANNEL</small>
      <h1>{TERMS.proposal}</h1>
      <p>application v{state.applicationVersion} × gig v{state.gigVersion}<br />14 weeks · 28 hours/week · four workshops</p>
      <strong>{status}</strong>
      {status === "invalidated" || status === "expired" ? <div role="alert"><X /><span>{status === "expired" ? "The response channel closed." : "Revision diverted the record from this authority."}</span></div> : null}
      {role === "client" && status !== "pending" && status !== "accepted" ? <footer><label>Open for<select value={deadline} onChange={(event) => setDeadline(event.target.value as typeof deadline)}><option value="24">24h</option><option value="48">48h</option><option value="72">72h</option></select></label><button onClick={() => dispatch({ type: "send-selection", deadline })}>Open fresh channel <Send /></button></footer> : null}
      {role === "freelancer" && status === "pending" ? <button onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Accept and flow into work <Check /></button> : null}
      {status === "accepted" ? <button onClick={() => go("engagement")}>Enter engagement current <ArrowRight /></button> : null}
    </section>
  );
}

function WorkBasin({
  state,
  dispatch,
}: {
  state: ReturnType<typeof useConceptRoute>["state"];
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
}) {
  const exact = immutableTerms(state);
  return (
    <section className="cu-basin-content cu-work">
      <ShieldCheck />
      <small>IMMUTABLE WORK CURRENT</small>
      <h1>{state.engagementStatus.replaceAll("_", " ")}</h1>
      <p>{exact.proposal} · {exact.duration} · {exact.capacity}<br />source v{exact.applicationVersion} × brief v{exact.gigVersion}</p>
      <button onClick={() => dispatch({ type: "advance-engagement" })} disabled={state.engagementStatus === "completed"}>Advance participant-reported state <ArrowRight /></button>
      <div className="cu-contact">
        {state.contactPermission.revealed ? <Eye /> : <LockKeyhole />}
        <span><small>CONTACT CURRENT</small><b>{state.contactPermission.revealed ? "kavya.menon@example.com" : state.contactPermission.consentActive ? "k•••••@example.com" : "Private"}</b></span>
        {!state.contactPermission.consentActive || state.contactPermission.revoked ? <button onClick={() => dispatch({ type: "share-contact" })}>Record consent</button> : state.contactPermission.revealed ? <button onClick={() => dispatch({ type: "revoke-contact" })}>Revoke display</button> : <button onClick={() => dispatch({ type: "reveal-contact" })}>Authorize reveal</button>}
      </div>
    </section>
  );
}

export function Current() {
  const { role, view, go, switchRole, state, dispatch } = useConceptRoute("current");
  const params = useParams<{ role?: string }>();
  const publicEntry = !params.role;
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(stageForView(view));
  const [selectedRecord, setSelectedRecord] = useState(0);
  const workflowChannel = currentChannel(state);
  const records = role === "client" ? APPLICANTS : GIGS;

  useEffect(() => setStage(stageForView(view)), [view]);

  const channelLabels = useMemo(() => records.slice(0, 3).map((record) => "name" in record ? record.name : record.company), [records]);

  if (publicEntry) return <div className="current-concept"><CurrentLanding enter={switchRole} /></div>;

  const selectStage = (index: number) => {
    setStage(index);
    go(viewForStage(role, index));
  };

  return (
    <div className="current-concept">
      <main id="main-content" className={`cu-field is-${workflowChannel}`}>
        <div className="cu-utility">
          <Link to="/">GM / 26</Link>
          <button onClick={() => dispatch({ type: "reset" })}><RotateCcw /> Reset</button>
          <div><button aria-pressed={role === "freelancer"} onClick={() => switchRole("freelancer")}>Kavya</button><button aria-pressed={role === "client"} onClick={() => switchRole("client")}>Ternary</button></div>
        </div>

        <svg className="cu-flow-map" viewBox="0 0 1200 760" preserveAspectRatio="none" aria-hidden="true">
          {[
            { d: "M-90 190 C160 10 300 650 555 400 S930 100 1290 300", className: "primary" },
            { d: "M-90 390 C190 200 365 770 650 505 S960 230 1290 480", className: "secondary" },
            { d: "M-90 575 C160 390 415 805 700 625 S990 410 1290 650", className: "tertiary" },
          ].map((channel, index) => (
            <motion.path
              key={channel.className}
              d={channel.d}
              className={`cu-channel cu-channel--${channel.className} ${selectedRecord === index ? "is-selected" : ""}`}
              initial={
                reduced
                  ? { strokeWidth: selectedRecord === index ? 116 : 72 }
                  : { pathLength: 0, strokeWidth: 72 }
              }
              animate={{ pathLength: 1, strokeWidth: selectedRecord === index ? 116 : 72 }}
              transition={{ duration: reduced ? 0 : .58, ease: [0.2, .7, .2, 1] }}
            />
          ))}
          {workflowChannel === "revision" ? <motion.path className="cu-diversion" d="M760 270 C650 160 490 230 515 390" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} /> : null}
        </svg>

        <div className="cu-channel-labels">
          {channelLabels.map((label, index) => <button key={label} aria-pressed={selectedRecord === index} onClick={() => setSelectedRecord(index)}><i>{index + 1}</i><span>{label}</span></button>)}
        </div>

        <nav className="cu-checkpoints" aria-label="Workflow current">
          {STAGES.map((label, index) => {
            const position = STAGE_POSITIONS[index];
            return (
              <motion.button
                layout
                key={label}
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
                aria-current={stage === index ? "step" : undefined}
                onClick={() => selectStage(index)}
                animate={reduced ? undefined : { scale: stage === index ? 1.18 : 1 }}
                transition={{ type: "spring", bounce: .2, duration: .42 }}
              >
                <i>{String(index + 1).padStart(2, "0")}</i><span>{label}</span>
              </motion.button>
            );
          })}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            className="cu-basin"
            key={`${stage}-${selectedRecord}-${state.applicationVersion}-${state.selectionRequest?.status}`}
            initial={reduced ? false : { opacity: 0, scale: .92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .96, y: -18 }}
            transition={{ duration: reduced ? 0 : .32, ease: [0.22, 1, 0.36, 1] }}
          >
            {stage === 0 ? <FindBasin role={role} selectedRecord={selectedRecord} setSelectedRecord={setSelectedRecord} go={go} /> : null}
            {stage === 1 ? <ProposeBasin role={role} state={state} dispatch={dispatch} go={go} /> : null}
            {stage === 2 ? <ReviewBasin role={role} state={state} dispatch={dispatch} go={go} /> : null}
            {stage === 3 ? <ConfirmBasin role={role} state={state} dispatch={dispatch} go={go} /> : null}
            {stage === 4 ? <WorkBasin state={state} dispatch={dispatch} /> : null}
          </motion.div>
        </AnimatePresence>
      </main>
      {state.toast ? <div className="cu-toast" role="status">{state.toast}</div> : null}
    </div>
  );
}
