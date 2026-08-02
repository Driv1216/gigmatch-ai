import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  GitBranch,
  Link2,
  LockKeyhole,
  RotateCcw,
  Scissors,
  Send,
  Unplug,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { QA, TERMS } from "../../domain/fixtures";
import { immutableTerms, weaveJunctions } from "../../domain/final-collection";
import { useConceptRoute } from "../../domain/useConceptRoute";
import type { ViewId } from "../../domain/types";
import "./weave.css";

const JUNCTION_POSITIONS = [
  { x: 18, y: 29 },
  { x: 36, y: 53 },
  { x: 52, y: 34 },
  { x: 71, y: 57 },
  { x: 86, y: 31 },
] as const;

function junctionForView(view: ViewId) {
  if (view === "discover" || view === "review" || view === "home") return 0;
  if (view === "gig" || view === "candidate") return 1;
  if (view === "proposal" || view === "applications") return 2;
  if (view === "selection") return 3;
  return 4;
}

function viewForJunction(role: "client" | "freelancer", index: number): ViewId {
  const freelancer: ViewId[] = ["discover", "gig", "applications", "selection", "engagement"];
  const client: ViewId[] = ["review", "candidate", "candidate", "selection", "engagement"];
  return (role === "client" ? client : freelancer)[index];
}

function WeaveLanding({ enter }: { enter: (role: "client" | "freelancer") => void }) {
  return (
    <main id="main-content" className="wv-landing">
      <svg viewBox="0 0 1200 720" aria-hidden="true">
        <path d="M90 0 C90 220 470 150 470 360 S1030 500 1030 720" />
        <path d="M300 0 C300 240 890 180 890 430 S520 500 520 720" />
        <path d="M560 0 C560 170 190 280 190 460 S760 550 760 720" />
        <path d="M820 0 C820 240 620 240 620 390 S250 540 250 720" />
        <path d="M1090 0 C1090 210 750 260 750 430 S950 560 950 720" />
      </svg>
      <div className="wv-landing-sources"><span>Requirement</span><span>Evidence</span><span>Proposal</span><span>Authority</span><span>Consent</span></div>
      <section>
        <small>25 / WEAVE</small>
        <h1>Nothing binds<br />without a source.</h1>
        <p>Follow every claim from the brief to reviewed evidence, exact authority, accepted work, and revocable contact permission.</p>
        <div><button onClick={() => enter("freelancer")}>Trace as Kavya <ArrowRight /></button><button onClick={() => enter("client")}>Trace as Ternary <ArrowRight /></button></div>
      </section>
      <Link to="/"><ArrowLeft /> Concept collection</Link>
    </main>
  );
}

function WeaveJunctionContent({
  index,
  role,
  view,
  state,
  dispatch,
  go,
}: {
  index: number;
  role: "client" | "freelancer";
  view: ViewId;
  state: ReturnType<typeof useConceptRoute>["state"];
  dispatch: ReturnType<typeof useConceptRoute>["dispatch"];
  go: (view: ViewId) => void;
}) {
  const [editing, setEditing] = useState(view === "proposal");
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const exact = immutableTerms(state);

  useEffect(() => setEditing(view === "proposal"), [view]);

  if (index === 0) {
    return (
      <section className="wv-detail">
        <small>JUNCTION 01 · BRIEF SOURCE</small>
        <h1>Four requirements enter the record.</h1>
        <p>React systems · TypeScript migration · WCAG 2.2 · regulated product context</p>
        <button onClick={() => go(role === "client" ? "candidate" : "gig")}>Follow to evidence <ArrowRight /></button>
      </section>
    );
  }

  if (index === 1) {
    return (
      <section className="wv-detail">
        <small>JUNCTION 02 · EVIDENCE SUPPORT</small>
        <h1>Three claims bind.<br />One ends honestly.</h1>
        <p>Reviewed artifacts support React, TypeScript, and accessibility. The direct clinical-trial strand terminates at a disclosed gap.</p>
        <div className="wv-gap"><Scissors /><span>No unsupported promise continues beyond this point.</span></div>
        <button onClick={() => go(role === "client" ? "candidate" : "applications")}>Follow proposal promises <ArrowRight /></button>
      </section>
    );
  }

  if (index === 2 && editing) {
    return (
      <form className="wv-detail wv-revision" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "submit-revision" }); setEditing(false); }}>
        <small>NEW VERSION STRAND</small>
        <h1>Application v{state.applicationVersion + 1}</h1>
        <label>Exact proposal<input defaultValue="₹5.8L fixed" /></label>
        <label>Workshop promise<input type="number" min="1" defaultValue="4" /></label>
        <button type="submit">Insert immutable strand <GitBranch /></button>
      </form>
    );
  }

  if (index === 2) {
    return (
      <section className="wv-detail">
        <small>JUNCTION 03 · APPLICATION v{state.applicationVersion}</small>
        <h1>{TERMS.proposal}<br />14 weeks.</h1>
        <blockquote>{QA.question}</blockquote>
        {state.qaAnswered ? <p>{QA.answer}</p> : <button onClick={() => dispatch({ type: "answer-qa" })}>Splice structured answer</button>}
        <div><button onClick={() => setEditing(true)}>Fork proposal version</button><button onClick={() => go("selection")}>Follow authority <ArrowRight /></button></div>
      </section>
    );
  }

  if (index === 3) {
    const status = state.selectionRequest?.status ?? "unissued";
    return (
      <section className={`wv-detail wv-authority is-${status}`}>
        <small>JUNCTION 04 · EXACT AUTHORITY</small>
        <h1>v{state.applicationVersion}<br />binds to v{state.gigVersion}.</h1>
        <p>{TERMS.proposal} · 14 weeks · 28 hours/week</p>
        <div className="wv-authority-state">{status === "invalidated" || status === "expired" ? <Unplug /> : <Link2 />}<b>{status}</b></div>
        {status === "invalidated" || status === "expired" ? <p role="alert">The old authority strand {status === "expired" ? "expired" : "ended at the revision"}. A fresh request must bind the current version.</p> : null}
        {role === "client" && status !== "pending" && status !== "accepted" ? <div className="wv-issue"><label>Authority window<select value={deadline} onChange={(event) => setDeadline(event.target.value as typeof deadline)}><option value="24">24h</option><option value="48">48h</option><option value="72">72h</option></select></label><button onClick={() => dispatch({ type: "send-selection", deadline })}>Bind fresh authority <Send /></button></div> : null}
        {role === "freelancer" && status === "pending" ? <button onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Accept and bind engagement <Check /></button> : null}
        {status === "accepted" ? <button onClick={() => go("engagement")}>Inspect accepted weave <ArrowRight /></button> : null}
      </section>
    );
  }

  return (
    <section className="wv-detail wv-work">
      <small>JUNCTION 05 · ACCEPTED CONSEQUENCE</small>
      <h1>{exact.proposal}<br />{state.engagementStatus.replaceAll("_", " ")}.</h1>
      <p>Source: application v{exact.applicationVersion} × gig v{exact.gigVersion} · {exact.duration} · {exact.capacity}</p>
      <button onClick={() => dispatch({ type: "advance-engagement" })} disabled={state.engagementStatus === "completed"}>Advance lifecycle <ArrowRight /></button>
      <div className="wv-permission">
        {state.contactPermission.revealed ? <Eye /> : <LockKeyhole />}
        <span><small>PERMISSION STRAND</small><b>{state.contactPermission.revealed ? "kavya.menon@example.com" : state.contactPermission.consentActive ? "k•••••@example.com" : "No contact source"}</b></span>
        {!state.contactPermission.consentActive || state.contactPermission.revoked ? <button onClick={() => dispatch({ type: "share-contact" })}>Bind consent</button> : state.contactPermission.revealed ? <button onClick={() => dispatch({ type: "revoke-contact" })}>Sever display</button> : <button onClick={() => dispatch({ type: "reveal-contact" })}>Authorize reveal</button>}
      </div>
    </section>
  );
}

export function Weave() {
  const { role, view, go, switchRole, state, dispatch } = useConceptRoute("weave");
  const params = useParams<{ role?: string }>();
  const publicEntry = !params.role;
  const [active, setActive] = useState(junctionForView(view));
  const reduced = useReducedMotion();
  const junctions = useMemo(() => weaveJunctions(state), [state]);

  useEffect(() => setActive(junctionForView(view)), [view]);

  if (publicEntry) return <div className="weave"><WeaveLanding enter={switchRole} /></div>;

  const selectJunction = (index: number) => {
    setActive(index);
    go(viewForJunction(role, index));
  };

  return (
    <div className="weave">
      <main id="main-content" className="wv-loom">
        <div className="wv-utility">
          <Link to="/">GM / 25</Link>
          <span>Inspect every source and consequence</span>
          <button onClick={() => dispatch({ type: "reset" })}><RotateCcw /> Reset</button>
          <div><button aria-pressed={role === "freelancer"} onClick={() => switchRole("freelancer")}>Kavya</button><button aria-pressed={role === "client"} onClick={() => switchRole("client")}>Ternary</button></div>
        </div>

        <div className="wv-source-bank">
          {junctions.map((junction, index) => <button key={junction.id} aria-pressed={active === index} onClick={() => selectJunction(index)}><i>{String(index + 1).padStart(2, "0")}</i><span>{junction.from}</span></button>)}
        </div>

        <div className="wv-weave-field">
          <svg viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true">
            {[
              "M100 0 C100 210 420 110 420 325 S990 430 990 700",
              "M320 0 C320 230 845 175 845 390 S540 520 540 700",
              "M570 0 C570 160 220 230 220 440 S760 520 760 700",
              "M820 0 C820 210 625 230 625 390 S285 510 285 700",
              "M1090 0 C1090 190 760 245 760 420 S950 550 950 700",
            ].map((path, index) => (
              <motion.path
                key={path}
                d={path}
                className={`${junctions[index].state === "invalidated" || junctions[index].state === "expired" || junctions[index].state === "severed" ? "is-broken" : ""} ${active === index ? "is-active" : ""}`}
                initial={reduced ? false : { pathLength: 0, opacity: .2 }}
                animate={{ pathLength: 1, opacity: active === index ? 1 : .48 }}
                transition={{ duration: reduced ? 0 : .55, ease: "easeInOut" }}
              />
            ))}
          </svg>

          <div className="wv-junctions" role="group" aria-label="Inspect provenance junctions">
            {junctions.map((junction, index) => (
              <motion.button
                layout
                key={junction.id}
                style={{ left: `${JUNCTION_POSITIONS[index].x}%`, top: `${JUNCTION_POSITIONS[index].y}%` }}
                className={`${active === index ? "is-active" : ""} is-${junction.state}`}
                aria-pressed={active === index}
                onClick={() => selectJunction(index)}
                animate={reduced ? undefined : { scale: active === index ? 1.16 : 1 }}
                transition={{ type: "spring", bounce: .18, duration: .42 }}
              >
                {junction.state === "invalidated" || junction.state === "expired" || junction.state === "severed" ? <Unplug /> : <Link2 />}
                <span>{junction.id}</span><b>{junction.state}</b>
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              className="wv-active-detail"
              key={`${active}-${state.applicationVersion}-${state.selectionRequest?.status}-${view}`}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: reduced ? 0 : .26 }}
            >
              <WeaveJunctionContent index={active} role={role} view={view} state={state} dispatch={dispatch} go={go} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="wv-consequence-bank">
          {junctions.map((junction, index) => <button key={junction.id} aria-pressed={active === index} onClick={() => selectJunction(index)}><span>{junction.to}</span><b>{junction.state}</b></button>)}
        </div>
      </main>
      {state.toast ? <div className="wv-toast" role="status">{state.toast}</div> : null}
    </div>
  );
}
