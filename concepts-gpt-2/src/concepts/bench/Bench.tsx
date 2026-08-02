import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Command,
  Eye,
  LockKeyhole,
  Pin,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import { benchQueue, immutableTerms } from "../../domain/final-collection";
import { useConceptRoute } from "../../domain/useConceptRoute";
import type { ViewId } from "../../domain/types";
import "./bench.css";

const CLIENT_ACTIONS: Array<[string, ViewId]> = [
  ["Review", "review"],
  ["Candidate", "candidate"],
  ["Selection", "selection"],
  ["Work", "engagement"],
];

const FREELANCER_ACTIONS: Array<[string, ViewId]> = [
  ["Market", "discover"],
  ["Brief", "gig"],
  ["Proposal", "proposal"],
  ["Application", "applications"],
  ["Selection", "selection"],
  ["Work", "engagement"],
];

function BenchLanding({ enter }: { enter: (role: "client" | "freelancer") => void }) {
  return (
    <main id="main-content" className="bn-landing">
      <div className="bn-live-label"><span>GM / BENCH 21</span><small>Live market entry</small></div>
      <section className="bn-live-record" aria-label="Live marketplace record">
        <div className="bn-record-seal">TH–042</div>
        <p>Ternary Health needs one consequential decision.</p>
        <h1>Senior Frontend Systems Engineer<br />for Clinical Trial Operations</h1>
        <dl>
          <div><dt>Evidence fit</dt><dd>Strong · one disclosed domain gap</dd></div>
          <div><dt>Commitment</dt><dd>14 weeks · 28 hours/week</dd></div>
          <div><dt>Exact proposal</dt><dd>₹5.8L fixed · application v2</dd></div>
        </dl>
      </section>
      <div className="bn-entry-bench">
        <button onClick={() => enter("freelancer")}><span>Continue as Kavya</span><b>Review the live selection <ArrowRight /></b></button>
        <button onClick={() => enter("client")}><span>Continue as Ternary Health</span><b>Review the applicant record <ArrowRight /></b></button>
      </div>
      <Link to="/" className="bn-back"><ArrowLeft /> All concepts</Link>
    </main>
  );
}

function BenchQueue({
  role,
  active,
  onSelect,
  pinned,
  onPin,
  state,
}: {
  role: "client" | "freelancer";
  active: number;
  onSelect: (index: number) => void;
  pinned: number[];
  onPin: (index: number) => void;
  state: ReturnType<typeof useConceptRoute>["state"];
}) {
  const queue = benchQueue(role, state);
  // Labels are drawn directly from stable fixtures so the visual queue never owns workflow truth.
  const records = role === "client" ? APPLICANTS : GIGS;
  return (
    <div className="bn-queue" role="list" aria-label={role === "client" ? "Applicant review queue" : "Opportunity queue"}>
      {records.map((record, index) => (
        <div role="listitem" className={active === index ? "is-active" : ""} key={record.id}>
          <button onClick={() => onSelect(index)} aria-current={active === index ? "true" : undefined}>
            <i>{String(index + 1).padStart(2, "0")}</i>
            <span>{queue[index]?.priority ?? (index === 0 ? "Primary" : "Next")}</span>
            <b>{"name" in record ? record.name : record.company}</b>
          </button>
          <button aria-label={`${pinned.includes(index) ? "Unpin" : "Pin"} ${"name" in record ? record.name : record.company} for comparison`} aria-pressed={pinned.includes(index)} onClick={() => onPin(index)}>
            <Pin />
          </button>
        </div>
      ))}
    </div>
  );
}

function BenchEvidence({ client, selected }: { client: boolean; selected: number }) {
  const applicant = APPLICANTS[selected] ?? APPLICANTS[0];
  const gig = GIGS[selected] ?? GIGS[0];
  const skills = client ? applicant.skills : gig.matchingSkills;
  const gap = client ? applicant.gap : gig.missingSkills.join(", ");
  return (
    <section className="bn-evidence">
      <div className="bn-evidence-lead">
        <p>{client ? "Candidate evidence in the fixed brief" : "Reviewed evidence against this brief"}</p>
        <h1>{client ? applicant.name : gig.title}</h1>
        <span>{client ? `${applicant.availability} · ${applicant.experience}` : `${gig.company} · ${gig.deadline}`}</span>
      </div>
      <div className="bn-proofline">
        {skills.map((skill, index) => <span key={skill}><i>{index + 1}</i><b>{skill}</b><Check /></span>)}
      </div>
      <div className="bn-gap"><X /><p><b>Disclosed gap</b>{gap}</p></div>
      <p className="bn-evidence-note">{client ? applicant.note : gig.matchReason}</p>
    </section>
  );
}

function BenchProposal({ submit }: { submit: () => void }) {
  const [amount, setAmount] = useState("580000");
  const [hours, setHours] = useState("28");
  const [workshops, setWorkshops] = useState("4");
  const valid = Number(amount) >= 520000 && Number(amount) <= 640000 && Number(hours) >= 26 && Number(hours) <= 30 && Number(workshops) > 0;
  return (
    <form className="bn-proposal" onSubmit={(event) => { event.preventDefault(); if (valid) submit(); }}>
      <header><p>Application v3 will become the only official proposal.</p><h1>Write the exact promise.</h1></header>
      <label>Fixed proposal, ₹<input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
      <label>Hours per week<input inputMode="numeric" value={hours} onChange={(event) => setHours(event.target.value)} /></label>
      <label>Product-team workshops<input inputMode="numeric" value={workshops} onChange={(event) => setWorkshops(event.target.value)} /></label>
      <label className="bn-wide">Delivery note<textarea defaultValue="Audit the system first, establish the accessible typed foundation, migrate two high-risk workflows, then transfer ownership through four workshops." /></label>
      {!valid ? <p role="alert" className="bn-form-error">Use ₹5.2L–₹6.4L, 26–30 hours/week, and at least one workshop.</p> : null}
      <button type="submit" disabled={!valid}>Record immutable revision <ArrowRight /></button>
    </form>
  );
}

function BenchApplication({
  qaAnswered,
  answer,
  revise,
  openSelection,
}: {
  qaAnswered: boolean;
  answer: () => void;
  revise: () => void;
  openSelection: () => void;
}) {
  return (
    <section className="bn-application">
      <div className="bn-version-mark"><span>OFFICIAL</span><strong>v2</strong><small>answers brief v3</small></div>
      <div>
        <h1>A durable application record—not a conversation.</h1>
        <blockquote>{QA.question}</blockquote>
        {qaAnswered ? <p className="bn-answer">{QA.answer}</p> : <button onClick={answer}>Record structured answer</button>}
      </div>
      <div className="bn-application-actions">
        <button onClick={revise}>Revise exact terms</button>
        <button onClick={openSelection}>Inspect selection authority</button>
      </div>
    </section>
  );
}

function BenchSelection({
  role,
  state,
  send,
  accept,
  openWork,
}: {
  role: "client" | "freelancer";
  state: ReturnType<typeof useConceptRoute>["state"];
  send: (deadline: "24" | "48" | "72") => void;
  accept: () => void;
  openWork: () => void;
}) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const request = state.selectionRequest;
  const invalid = request?.status === "invalidated" || request?.status === "expired";
  return (
    <section className={`bn-selection is-${request?.status ?? "unissued"}`}>
      <div className="bn-selection-status"><ShieldCheck /><span>Exact authority</span><b>{request?.status ?? "Not issued"}</b></div>
      <h1>Kavya Menon × Ternary Health</h1>
      <dl>
        <div><dt>Application</dt><dd>v{state.applicationVersion}</dd></div>
        <div><dt>Gig terms</dt><dd>v{state.gigVersion}</dd></div>
        <div><dt>Proposal</dt><dd>{TERMS.proposal}</dd></div>
        <div><dt>Delivery</dt><dd>14 weeks · 28 hours/week</dd></div>
      </dl>
      {invalid ? <div role="alert" className="bn-invalid"><X /><p><b>{request?.status === "expired" ? "The response window expired." : "A newer proposal broke this authority."}</b>Nothing was accepted. Ternary must issue a fresh request for v{state.applicationVersion}.</p></div> : null}
      {role === "client" && request?.status !== "pending" && request?.status !== "accepted" ? (
        <div className="bn-decision">
          <label>Response window<select value={deadline} onChange={(event) => setDeadline(event.target.value as typeof deadline)}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label>
          <button onClick={() => send(deadline)}>Issue exact request <Send /></button>
        </div>
      ) : null}
      {role === "freelancer" && request?.status === "pending" ? <button className="bn-accept" onClick={accept}>Accept these exact terms <Check /></button> : null}
      {request?.status === "accepted" ? <button className="bn-accept" onClick={openWork}>Open confirmed engagement <ArrowRight /></button> : null}
    </section>
  );
}

function BenchEngagement({
  state,
  advance,
  permission,
}: {
  state: ReturnType<typeof useConceptRoute>["state"];
  advance: () => void;
  permission: (action: "share-contact" | "reveal-contact" | "revoke-contact") => void;
}) {
  const exact = immutableTerms(state);
  return (
    <section className="bn-engagement">
      <header><span>EN–001 · {state.engagementStatus.replaceAll("_", " ")}</span><h1>Ternary Health × Kavya Menon</h1></header>
      <div className="bn-engagement-core">
        <dl><div><dt>Accepted proposal</dt><dd>{exact.proposal}</dd></div><div><dt>Source versions</dt><dd>gig v{exact.gigVersion} × application v{exact.applicationVersion}</dd></div><div><dt>Commitment</dt><dd>{exact.duration} · {exact.capacity}</dd></div></dl>
        <button disabled={state.engagementStatus === "completed"} onClick={advance}>Advance lifecycle <ArrowRight /></button>
      </div>
      <div className="bn-permission">
        {state.contactPermission.revealed ? <Eye /> : <LockKeyhole />}
        <div><span>Engagement-scoped contact</span><b>{state.contactPermission.revealed ? "kavya.menon@example.com" : state.contactPermission.consentActive ? "k•••••@example.com" : "Private"}</b><small>{state.contactPermission.revoked ? "Permission revoked; prior viewing cannot be erased." : "No passwords, OTPs, tokens, or banking details."}</small></div>
        {!state.contactPermission.consentActive || state.contactPermission.revoked ? <button onClick={() => permission("share-contact")}>Record consent</button> : state.contactPermission.revealed ? <button onClick={() => permission("revoke-contact")}>Revoke display</button> : <button onClick={() => permission("reveal-contact")}>Authorize reveal</button>}
      </div>
    </section>
  );
}

export function Bench() {
  const route = useConceptRoute("bench");
  const { role, view, go, switchRole, state, dispatch } = route;
  const params = useParams<{ role?: string }>();
  const publicEntry = !params.role;
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState(0);
  const [pinned, setPinned] = useState<number[]>([0]);
  const client = role === "client";
  const actions = client ? CLIENT_ACTIONS : FREELANCER_ACTIONS;

  if (publicEntry) return <div className="bench"><BenchLanding enter={(next) => switchRole(next)} /></div>;

  const togglePin = (index: number) => setPinned((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index].slice(-3));
  const queueVisible = view === "home" || view === "discover" || view === "review";
  const evidenceVisible = ["home", "discover", "review", "gig", "candidate"].includes(view);

  return (
    <div className="bench">
      <main id="main-content" className="bn-session">
        <div className="bn-context-line">
          <Link to="/" aria-label="Return to concept gallery">GM / 21</Link>
          <span>Ternary Health · application v{state.applicationVersion}</span>
          <b>{state.selectionRequest?.status ?? state.applicationStage}</b>
          <button onClick={() => dispatch({ type: "reset" })}><RotateCcw /> Reset</button>
          <div className="bn-role" aria-label="Role"><button aria-pressed={!client} onClick={() => switchRole("freelancer")}>Kavya</button><button aria-pressed={client} onClick={() => switchRole("client")}>Ternary</button></div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            className="bn-work-field"
            key={`${role}-${view}-${selected}`}
            initial={reduced ? false : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {queueVisible ? <BenchQueue role={role} active={selected} onSelect={setSelected} pinned={pinned} onPin={togglePin} state={state} /> : null}
            {evidenceVisible ? <BenchEvidence client={client} selected={selected} /> : null}
            {view === "proposal" ? <BenchProposal submit={() => { dispatch({ type: "submit-revision" }); go("applications"); }} /> : null}
            {view === "applications" ? <BenchApplication qaAnswered={state.qaAnswered} answer={() => dispatch({ type: "answer-qa" })} revise={() => go("proposal")} openSelection={() => go("selection")} /> : null}
            {view === "selection" ? <BenchSelection role={role} state={state} send={(deadline) => dispatch({ type: "send-selection", deadline })} accept={() => { dispatch({ type: "accept-selection" }); go("engagement"); }} openWork={() => go("engagement")} /> : null}
            {view === "engagement" ? <BenchEngagement state={state} advance={() => dispatch({ type: "advance-engagement" })} permission={(type) => dispatch({ type })} /> : null}
          </motion.div>
        </AnimatePresence>

        <div className="bn-action-bench">
          <div className="bn-command"><Command /><span>{client ? "Client authority" : "Freelancer authority"}</span><b>{view}</b><ChevronDown /></div>
          <nav aria-label="Bench actions">{actions.map(([label, destination]) => <button key={destination} className={view === destination ? "is-active" : ""} onClick={() => go(destination)}>{label}</button>)}</nav>
          <button className="bn-next" onClick={() => {
            const index = actions.findIndex(([, destination]) => destination === view);
            go(actions[(index + 1 + actions.length) % actions.length][1]);
          }}>Next action <ArrowRight /></button>
        </div>
      </main>
      {state.toast ? <div className="bn-toast" role="status">{state.toast}</div> : null}
    </div>
  );
}
