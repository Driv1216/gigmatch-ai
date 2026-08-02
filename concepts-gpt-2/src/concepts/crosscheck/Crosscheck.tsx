import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  History,
  LockKeyhole,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { APPLICANTS, QA, TERMS } from "../../domain/fixtures";
import { CROSSCHECK_REQUIREMENTS, crosscheckPoint, immutableTerms } from "../../domain/final-collection";
import { useConceptRoute } from "../../domain/useConceptRoute";
import type { ViewId } from "../../domain/types";
import "./crosscheck.css";

const CLIENT_DESTINATIONS: Array<[string, ViewId]> = [["Review", "review"], ["Candidate", "candidate"], ["Authority", "selection"], ["Work", "engagement"]];
const FREELANCER_DESTINATIONS: Array<[string, ViewId]> = [["Market", "discover"], ["Brief", "gig"], ["Proposal", "proposal"], ["Record", "applications"], ["Authority", "selection"], ["Work", "engagement"]];

function CrosscheckLanding({ enter }: { enter: (role: "client" | "freelancer") => void }) {
  return (
    <main id="main-content" className="cc-landing">
      <div className="cc-landing-axis cc-landing-axis--x"><span>application v1</span><b>v2 · effective</b><span>engagement</span></div>
      <div className="cc-landing-axis cc-landing-axis--y"><span>requirement</span><b>evidence</b><span>authority</span></div>
      <section className="cc-landing-focus">
        <small>CROSSCHECK / 23</small>
        <h1>React systems<br />× reviewed evidence</h1>
        <p>Ternary asks for typed patterns across three products.</p>
        <strong>Kavya supports the claim with two reviewed platform systems.</strong>
        <div><button onClick={() => enter("freelancer")}>Enter as Kavya <ArrowRight /></button><button onClick={() => enter("client")}>Enter as Ternary <ArrowRight /></button></div>
      </section>
      <Link to="/"><ArrowLeft /> Twenty-six concepts</Link>
    </main>
  );
}

function AxisButton({
  direction,
  label,
  onClick,
}: {
  direction: "up" | "down" | "left" | "right";
  label: string;
  onClick: () => void;
}) {
  const Icon = direction === "up" ? ChevronUp : direction === "down" ? ChevronDown : direction === "left" ? ChevronLeft : ChevronRight;
  return <button className={`cc-axis-button cc-axis-button--${direction}`} onClick={onClick} aria-label={label}><Icon /><span>{label}</span></button>;
}

function CrosscheckFocus({
  requirementIndex,
  version,
  state,
  candidate,
  role,
  view,
  dispatch,
  go,
}: {
  requirementIndex: number;
  version: number;
  state: ReturnType<typeof useConceptRoute>["state"];
  candidate: number;
  role: "client" | "freelancer";
  view: ViewId;
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
  go: (view: ViewId) => void;
}) {
  const point = crosscheckPoint(requirementIndex, version, state);
  const applicant = APPLICANTS[candidate];
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const exact = immutableTerms(state);
  const selectionMode = view === "selection";
  const engagementMode = view === "engagement";
  const proposalMode = view === "proposal";
  const applicationMode = view === "applications";

  if (selectionMode) {
    const status = state.selectionRequest?.status ?? "unissued";
    return (
      <section className={`cc-focus cc-authority is-${status}`}>
        <div className="cc-party cc-party--client"><span>Client acknowledges</span><b>Brief v{state.gigVersion} · four requirements</b></div>
        <div className="cc-intersection">
          <ShieldCheck />
          <small>EXACT INTERSECTION</small>
          <h1>v{state.applicationVersion} × v{state.gigVersion}</h1>
          <p>{TERMS.proposal} · 14 weeks · 28 hours/week</p>
          <strong>{status}</strong>
        </div>
        <div className="cc-party cc-party--freelancer"><span>Freelancer acknowledges</span><b>Four workshops · one disclosed gap</b></div>
        {status === "invalidated" || status === "expired" ? <div className="cc-cross-alert" role="alert"><X /><p><b>{status === "expired" ? "The crosscheck expired." : "The old intersection is no longer effective."}</b>A fresh request must point to application v{state.applicationVersion}.</p></div> : null}
        {role === "client" && status !== "pending" && status !== "accepted" ? <div className="cc-cross-action"><label>Open for<select value={deadline} onChange={(event) => setDeadline(event.target.value as typeof deadline)}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button onClick={() => dispatch({ type: "send-selection", deadline })}>Create exact intersection <Send /></button></div> : null}
        {role === "freelancer" && status === "pending" ? <button className="cc-cross-accept" onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Accept the focused intersection <Check /></button> : null}
        {status === "accepted" ? <button className="cc-cross-accept" onClick={() => go("engagement")}>Open accepted work <ArrowRight /></button> : null}
      </section>
    );
  }

  if (engagementMode) {
    return (
      <section className="cc-focus cc-work">
        <div className="cc-party cc-party--client"><span>Immutable source</span><b>Gig terms v{exact.gigVersion}</b></div>
        <div className="cc-intersection">
          <ShieldCheck />
          <small>{state.engagementStatus.replaceAll("_", " ")}</small>
          <h1>{exact.proposal}</h1>
          <p>{exact.duration} · {exact.capacity}</p>
          <button onClick={() => dispatch({ type: "advance-engagement" })} disabled={state.engagementStatus === "completed"}>Advance lifecycle</button>
        </div>
        <div className="cc-party cc-party--freelancer"><span>Immutable source</span><b>Application v{exact.applicationVersion}</b></div>
        <div className="cc-contact">
          {state.contactPermission.revealed ? <Eye /> : <LockKeyhole />}
          <span><small>Permission crosscheck</small><b>{state.contactPermission.revealed ? "kavya.menon@example.com" : state.contactPermission.consentActive ? "k•••••@example.com" : "Private"}</b></span>
          {!state.contactPermission.consentActive || state.contactPermission.revoked ? <button onClick={() => dispatch({ type: "share-contact" })}>Record consent</button> : state.contactPermission.revealed ? <button onClick={() => dispatch({ type: "revoke-contact" })}>Revoke display</button> : <button onClick={() => dispatch({ type: "reveal-contact" })}>Authorize reveal</button>}
        </div>
      </section>
    );
  }

  if (proposalMode) {
    return (
      <section className="cc-focus cc-proposal">
        <div className="cc-party cc-party--client"><span>Current requirement</span><b>Four product-team workshops must be explicit.</b></div>
        <form className="cc-intersection" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "submit-revision" }); go("applications"); }}>
          <small>CREATE v{state.applicationVersion + 1}</small>
          <label>Fixed proposal<input defaultValue="₹5.8L" /></label>
          <label>Workshop commitment<input type="number" min="1" max="8" defaultValue="4" /></label>
          <label>Capacity<input type="number" min="26" max="30" defaultValue="28" /></label>
          <button type="submit">Record immutable version <ArrowRight /></button>
        </form>
        <div className="cc-party cc-party--freelancer"><span>Resulting consequence</span><b>Any pending authority will retract from the prior version.</b></div>
      </section>
    );
  }

  if (applicationMode) {
    return (
      <section className="cc-focus cc-application">
        <div className="cc-party cc-party--client"><span>Structured question</span><b>{QA.question}</b></div>
        <div className="cc-intersection">
          <small>Q&A / NOT CHAT</small>
          <History />
          <h1>Application v{state.applicationVersion}</h1>
          {state.qaAnswered ? <p>{QA.answer}</p> : <button onClick={() => dispatch({ type: "answer-qa" })}>Record answer</button>}
          <button onClick={() => go("proposal")}>Create a new version</button>
        </div>
        <div className="cc-party cc-party--freelancer"><span>Official answer</span><b>{state.qaAnswered ? "Recorded and attributable" : "Awaiting response"}</b></div>
      </section>
    );
  }

  return (
    <section className="cc-focus">
      <div className="cc-party cc-party--client"><span>Ternary requirement</span><b>{point.requirement.client}</b></div>
      <div className="cc-intersection">
        <small>{point.effective ? "EFFECTIVE NOW" : "HISTORICAL STATE"} · APPLICATION v{version}</small>
        <h1>{point.requirement.label}</h1>
        <p>{role === "client" ? applicant.name : "Kavya Menon"} · {point.requirement.status === "gap" ? "Disclosed gap" : "Reviewed support"}</p>
        <strong>{point.authority}</strong>
      </div>
      <div className="cc-party cc-party--freelancer"><span>{role === "client" ? `${applicant.name} evidence` : "Kavya evidence"}</span><b>{point.requirement.freelancer}</b></div>
    </section>
  );
}

export function Crosscheck() {
  const { role, view, go, switchRole, state, dispatch } = useConceptRoute("crosscheck");
  const params = useParams<{ role?: string }>();
  const publicEntry = !params.role;
  const [requirement, setRequirement] = useState(0);
  const [version, setVersion] = useState(state.applicationVersion);
  const [candidate, setCandidate] = useState(0);
  const reduced = useReducedMotion();
  const focusRef = useRef<HTMLDivElement>(null);
  const destinations = role === "client" ? CLIENT_DESTINATIONS : FREELANCER_DESTINATIONS;

  useEffect(() => {
    setVersion(state.applicationVersion);
  }, [state.applicationVersion]);

  if (publicEntry) return <div className="crosscheck"><CrosscheckLanding enter={switchRole} /></div>;

  const moveRequirement = (delta: number) => setRequirement((current) => (current + delta + CROSSCHECK_REQUIREMENTS.length) % CROSSCHECK_REQUIREMENTS.length);
  const moveVersion = (delta: number) => setVersion((current) => Math.max(1, Math.min(state.applicationVersion, current + delta)));

  return (
    <div className="crosscheck">
      <main
        id="main-content"
        className={`cc-plane is-${view}`}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") moveRequirement(-1);
          if (event.key === "ArrowDown") moveRequirement(1);
          if (event.key === "ArrowLeft") moveVersion(-1);
          if (event.key === "ArrowRight") moveVersion(1);
        }}
      >
        <div className="cc-corner cc-corner--nw"><Link to="/">GM / 23</Link><span>Crosscheck</span></div>
        <div className="cc-corner cc-corner--ne"><button aria-pressed={role === "freelancer"} onClick={() => switchRole("freelancer")}>Kavya</button><button aria-pressed={role === "client"} onClick={() => switchRole("client")}>Ternary</button></div>
        <div className="cc-corner cc-corner--sw"><button onClick={() => dispatch({ type: "reset" })}><RotateCcw /> Reset scenario</button></div>
        <div className="cc-corner cc-corner--se">
          <label>Workspace<select value={view} onChange={(event) => go(event.target.value as ViewId)}>{destinations.map(([label, destination]) => <option key={destination} value={destination}>{label}</option>)}</select></label>
        </div>

        <div className="cc-x-axis" aria-label="Application versions">
          {Array.from({ length: state.applicationVersion }, (_, index) => index + 1).map((item) => <button key={item} aria-pressed={version === item} onClick={() => setVersion(item)}>v{item}<small>{item === state.applicationVersion ? "current" : "superseded"}</small></button>)}
        </div>
        <div className="cc-y-axis" aria-label="Requirements">
          {CROSSCHECK_REQUIREMENTS.map((item, index) => <button key={item.id} aria-pressed={requirement === index} onClick={() => setRequirement(index)}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</button>)}
        </div>
        {role === "client" && ["home", "review", "candidate"].includes(view) ? <div className="cc-candidates">{APPLICANTS.map((item, index) => <button key={item.id} aria-pressed={candidate === index} onClick={() => setCandidate(index)}>{item.initials}<span>{item.name}</span></button>)}</div> : null}

        <AxisButton direction="up" label="Previous requirement" onClick={() => moveRequirement(-1)} />
        <AxisButton direction="down" label="Next requirement" onClick={() => moveRequirement(1)} />
        <AxisButton direction="left" label="Previous version" onClick={() => moveVersion(-1)} />
        <AxisButton direction="right" label="Next version" onClick={() => moveVersion(1)} />

        <div className="cc-center" ref={focusRef} tabIndex={-1}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${view}-${requirement}-${version}-${candidate}`}
              initial={reduced ? false : { opacity: 0, scale: .94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: reduced ? 0 : .25, ease: [0.22, 1, 0.36, 1] }}
            >
              <CrosscheckFocus requirementIndex={requirement} version={version} state={state} candidate={candidate} role={role} view={view} dispatch={dispatch} go={go} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      {state.toast ? <div className="cc-toast" role="status">{state.toast}</div> : null}
    </div>
  );
}
