import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  LockKeyhole,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { APPLICANTS, GIGS, QA, TERMS } from "../../domain/fixtures";
import { useConceptRoute } from "../../domain/useConceptRoute";
import type { Role, ViewId } from "../../domain/types";
import { AxiomScene } from "./AxiomScene";
import { axiomViewForPhase, createAxiomSceneDescriptor, type AxiomPhase } from "./model";
import "./axiom.css";

const PHASES: Array<{ id: AxiomPhase; number: string; label: string }> = [
  { id: "market", number: "01", label: "Field" },
  { id: "evidence", number: "02", label: "Proof" },
  { id: "promise", number: "03", label: "Form" },
  { id: "authority", number: "04", label: "Lock" },
  { id: "work", number: "05", label: "Core" },
];

const NAV: Record<Role, Array<{ view: ViewId; label: string }>> = {
  freelancer: [
    { view: "home", label: "Now" },
    { view: "discover", label: "Opportunities" },
    { view: "gig", label: "Evidence" },
    { view: "proposal", label: "Proposal" },
    { view: "applications", label: "Record" },
    { view: "selection", label: "Authority" },
    { view: "engagement", label: "Engagement" },
  ],
  client: [
    { view: "home", label: "Now" },
    { view: "review", label: "Applicants" },
    { view: "candidate", label: "Evidence" },
    { view: "selection", label: "Authority" },
    { view: "engagement", label: "Engagement" },
  ],
};

type RouteState = ReturnType<typeof useConceptRoute>;

function StatusPill({ status }: { status: string }) {
  const className = status.toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  return <span className={`ax-status is-${className}`}><i />{status.replaceAll("_", " ")}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="ax-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function HomePanel({ role, state, go }: Pick<RouteState, "role" | "state" | "go">) {
  const pending = state.selectionRequest?.status === "pending";
  return (
    <section className="ax-panel ax-home">
      <header><small>{role === "client" ? "TERNARY / DECISION CORE" : "KAVYA / ACTIVE FIELD"}</small><StatusPill status={state.applicationStage} /></header>
      <h1>{pending ? "One exact decision is already in motion." : role === "client" ? "Shape the field around evidence." : "Your strongest opportunity is taking form."}</h1>
      <p>The object at left is the live record: evidence on its surface, versions in its shells, authority through its aligned rings.</p>
      <div className="ax-metrics">
        <Metric label="Evidence fit" value="92%" />
        <Metric label="Application" value={`v${state.applicationVersion}`} />
        <Metric label="Brief" value={`v${state.gigVersion}`} />
      </div>
      <button className="ax-primary" onClick={() => go(pending ? "selection" : role === "client" ? "review" : "discover")}>{pending ? "Inspect exact authority" : role === "client" ? "Compare applicants" : "Enter opportunity field"}<ArrowRight /></button>
    </section>
  );
}

function MarketPanel({ role, focusedRecord, setFocusedRecord, go }: Pick<RouteState, "role" | "go"> & { focusedRecord: number; setFocusedRecord: (index: number) => void }) {
  const records = role === "client" ? APPLICANTS : GIGS;
  const current = records[focusedRecord] ?? records[0];
  return (
    <section className="ax-panel ax-market">
      <header><small>{role === "client" ? "APPLICANT FIELD / 04 RECORDS" : "OPPORTUNITY FIELD / 03 BRIEFS"}</small><span>Drag the object to inspect</span></header>
      <div className="ax-records" role="list" aria-label={role === "client" ? "Applicants" : "Opportunities"}>
        {records.map((record, index) => (
          <div role="listitem" key={record.id}>
            <button aria-pressed={focusedRecord === index} onClick={() => setFocusedRecord(index)}>
              <i>{String(index + 1).padStart(2, "0")}</i>
              <span><b>{"name" in record ? record.name : record.company}</b><small>{"headline" in record ? record.headline : record.title}</small></span>
              <strong>{record.match}%</strong>
            </button>
          </div>
        ))}
      </div>
      <div className="ax-focus-record">
        <span>Focused record</span>
        <h1>{"name" in current ? current.name : current.company}</h1>
        <p>{"headline" in current ? current.headline : current.summary}</p>
        <button className="ax-primary" onClick={() => go(role === "client" ? "candidate" : "gig")}>Inspect the evidence surface <ArrowRight /></button>
      </div>
    </section>
  );
}

function EvidencePanel({ role, state, dispatch, go }: Pick<RouteState, "role" | "state" | "dispatch" | "go">) {
  return (
    <section className="ax-panel ax-evidence">
      <header><small>EVIDENCE SURFACE / APPLICATION v{state.applicationVersion}</small><StatusPill status="92% verified fit" /></header>
      <h1>{role === "client" ? "Kavya Menon" : GIGS[0].title}</h1>
      <p>{role === "client" ? APPLICANTS[0].headline : GIGS[0].summary}</p>
      <div className="ax-evidence-grid">
        <div>
          <span>Verified facets</span>
          {GIGS[0].matchingSkills.map((skill) => <p key={skill}><Check />{skill}</p>)}
        </div>
        <div className="ax-gap">
          <span>Disclosed interruption</span>
          <CircleAlert />
          <p>{APPLICANTS[0].gap}</p>
        </div>
      </div>
      {role === "client" ? (
        <div className="ax-action-row">
          <button aria-pressed={state.shortlisted} onClick={() => dispatch({ type: "toggle-shortlist" })}>{state.shortlisted ? "Remove private shortlist" : "Add private shortlist"}</button>
          <button aria-pressed={state.advanced} onClick={() => dispatch({ type: "toggle-advance" })}>{state.advanced ? "Return to review" : "Advance visibly"}</button>
          <button onClick={() => dispatch({ type: "request-revision" })}>Request proposal revision</button>
        </div>
      ) : (
        <button className="ax-primary" onClick={() => state.applicationVersion ? go("proposal") : dispatch({ type: "apply" })}>{state.applicationVersion ? "Shape proposal form" : "Begin application"}<ArrowRight /></button>
      )}
    </section>
  );
}

function ProposalPanel({ state, dispatch, go }: Pick<RouteState, "state" | "dispatch" | "go">) {
  const [amount, setAmount] = useState(580000);
  const [hours, setHours] = useState(28);
  const [workshops, setWorkshops] = useState(4);
  const valid = amount >= 520000 && amount <= 640000 && hours >= 26 && hours <= 30 && workshops >= 1;
  return (
    <form className="ax-panel ax-proposal" onSubmit={(event) => { event.preventDefault(); if (!valid) return; dispatch({ type: "submit-revision" }); go("applications"); }}>
      <header><small>PROPOSAL FORM / RECORD NEW v{state.applicationVersion + 1}</small><span>Every edit creates a new shell</span></header>
      <h1>Give the promise exact dimensions.</h1>
      <div className="ax-form-grid">
        <label>Fixed proposal <span>₹</span><input aria-label="Fixed proposal in rupees" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label>
        <label>Weekly capacity <span>HRS</span><input aria-label="Weekly capacity in hours" type="number" value={hours} onChange={(event) => setHours(Number(event.target.value))} /></label>
        <label>Product workshops <span>COUNT</span><input aria-label="Product team workshops" type="number" value={workshops} onChange={(event) => setWorkshops(Number(event.target.value))} /></label>
      </div>
      {!valid ? <p className="ax-error" role="alert">Use ₹5.2L–₹6.4L, 26–30 hours/week, and at least one workshop.</p> : null}
      {state.selectionRequest?.status === "pending" ? <p className="ax-warning"><CircleAlert />Recording a revision separates the currently aligned authority rings.</p> : null}
      <button className="ax-primary" type="submit" disabled={!valid}>Record immutable version <ArrowRight /></button>
    </form>
  );
}

function RecordPanel({ state, dispatch, go }: Pick<RouteState, "state" | "dispatch" | "go">) {
  return (
    <section className="ax-panel ax-record">
      <header><small>APPLICATION RECORD / {state.activity.length} EVENTS</small><StatusPill status={state.applicationStage} /></header>
      <h1>Version {state.applicationVersion} is the active shell.</h1>
      {state.revisionRequested ? <p role="alert" className="ax-warning"><CircleAlert />The client requested clearer workshop scope.</p> : null}
      <blockquote><span>Structured question</span>{QA.question}</blockquote>
      {state.qaAnswered ? <p className="ax-answer"><Check />{QA.answer}</p> : <button onClick={() => dispatch({ type: "answer-qa" })}>Record structured answer</button>}
      <ol className="ax-history">
        {state.activity.slice(0, 4).map((item) => <li key={item.id}><span>{item.at}</span><div><b>{item.title}</b><p>{item.detail}</p></div></li>)}
      </ol>
      <div className="ax-action-row"><button onClick={() => go("proposal")}>Create another version</button><button onClick={() => go("selection")}>Inspect authority</button></div>
    </section>
  );
}

function SelectionPanel({ role, state, dispatch, go }: Pick<RouteState, "role" | "state" | "dispatch" | "go">) {
  const [deadline, setDeadline] = useState<"24" | "48" | "72">(state.selectionDeadline);
  const status = state.selectionRequest?.status ?? "unissued";
  const invalid = status === "invalidated" || status === "expired";
  return (
    <section className={`ax-panel ax-selection is-${status}`}>
      <header><small>EXACT AUTHORITY / TWO SOURCE RINGS</small><StatusPill status={status} /></header>
      <div className="ax-lock-title"><ShieldCheck /><h1>{invalid ? "The source rings no longer align." : status === "accepted" ? "Authority is locked." : "Only exact versions can lock."}</h1></div>
      <div className="ax-version-pair">
        <Metric label="Application source" value={`v${state.applicationVersion}`} />
        <span>×</span>
        <Metric label="Gig terms source" value={`v${state.gigVersion}`} />
      </div>
      <dl className="ax-exact-terms"><div><dt>Proposal</dt><dd>{TERMS.proposal}</dd></div><div><dt>Duration</dt><dd>{TERMS.timeline}</dd></div><div><dt>Capacity</dt><dd>28 hours/week</dd></div><div><dt>Included</dt><dd>Four workshops</dd></div></dl>
      {invalid ? <p role="alert" className="ax-error">{status === "expired" ? "The response window closed without acceptance." : "The recorded request points to an older application shell."}</p> : null}
      {role === "client" && status !== "pending" && status !== "accepted" ? (
        <div className="ax-send"><label>Response window<select value={deadline} onChange={(event) => setDeadline(event.target.value as typeof deadline)}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button className="ax-primary" onClick={() => dispatch({ type: "send-selection", deadline })}>Align and send <Send /></button></div>
      ) : null}
      {role === "client" && status === "pending" ? <p className="ax-waiting"><Sparkles />Request is aligned and awaiting Kavya’s response.</p> : null}
      {role === "freelancer" && status === "pending" ? <button className="ax-primary" onClick={() => { dispatch({ type: "accept-selection" }); go("engagement"); }}>Accept exact terms <Check /></button> : null}
      {status === "accepted" ? <button className="ax-primary" onClick={() => go("engagement")}>Enter the engagement core <ArrowRight /></button> : null}
    </section>
  );
}

function EngagementPanel({ state, dispatch, go }: Pick<RouteState, "state" | "dispatch" | "go">) {
  if (!state.engagement) {
    return (
      <section className="ax-panel ax-empty-core">
        <LockKeyhole />
        <small>ENGAGEMENT CORE / NOT YET FORMED</small>
        <h1>Acceptance creates the stable object.</h1>
        <p>No engagement exists without an exact-version selection.</p>
        <button className="ax-primary" onClick={() => go("selection")}>Return to authority <ArrowRight /></button>
      </section>
    );
  }
  const permission = state.contactPermission;
  return (
    <section className="ax-panel ax-engagement">
      <header><small>IMMUTABLE ENGAGEMENT CORE</small><StatusPill status={state.engagementStatus} /></header>
      <div className="ax-lock-title"><ShieldCheck /><h1>{state.engagement.proposal} · {state.engagement.duration}</h1></div>
      <p>Accepted from application v{state.engagement.applicationVersion} × gig v{state.engagement.gigVersion}. The source geometry cannot be rewritten.</p>
      <div className="ax-stage-track" aria-label="Engagement progression">
        {["confirmed", "kickoff_pending", "in_progress", "completion_pending", "completed"].map((item, index, stages) => {
          const current = stages.indexOf(state.engagementStatus);
          return <span key={item} className={index <= current ? "is-complete" : ""}><i>{index < current ? <Check /> : index + 1}</i>{item.replaceAll("_", " ")}</span>;
        })}
      </div>
      <button onClick={() => dispatch({ type: "advance-engagement" })} disabled={state.engagementStatus === "completed"}>Advance participant-reported stage <ArrowRight /></button>
      <div className="ax-permission">
        {permission.revealed ? <Eye /> : <LockKeyhole />}
        <span><small>CONTACT PERMISSION ORBIT</small><b>{permission.revealed ? "kavya.menon@example.com" : permission.consentActive ? "k•••••@example.com" : "Private until consent"}</b></span>
        {!permission.consentActive || permission.revoked ? <button onClick={() => dispatch({ type: "share-contact" })}>Record consent</button> : permission.revealed ? <button onClick={() => dispatch({ type: "revoke-contact" })}>Revoke display</button> : <button onClick={() => dispatch({ type: "reveal-contact" })}>Authorize reveal</button>}
      </div>
    </section>
  );
}

function AxiomPanel(props: RouteState & { focusedRecord: number; setFocusedRecord: (index: number) => void }) {
  const { view } = props;
  if (view === "home") return <HomePanel {...props} />;
  if (view === "discover" || view === "review") return <MarketPanel {...props} />;
  if (view === "gig" || view === "candidate") return <EvidencePanel {...props} />;
  if (view === "proposal") return <ProposalPanel {...props} />;
  if (view === "applications") return <RecordPanel {...props} />;
  if (view === "selection") return <SelectionPanel {...props} />;
  return <EngagementPanel {...props} />;
}

function Landing({ enter, descriptor, reducedMotion }: { enter: (role: Role) => void; descriptor: ReturnType<typeof createAxiomSceneDescriptor>; reducedMotion: boolean }) {
  return (
    <main id="main-content" className="ax-landing">
      <div className="ax-canvas ax-canvas--landing" aria-hidden="true"><AxiomScene descriptor={descriptor} reducedMotion={reducedMotion} recordCount={3} onFocusRecord={() => undefined} /></div>
      <div className="ax-landing-top"><span>27 / AXIOM</span><Link to="/"><ArrowLeft /> Concept field</Link></div>
      <section>
        <small>PROCEDURAL 3D WORKFLOW / LIVE AUTHORITY</small>
        <h1>The deal<br />becomes an object.</h1>
        <p>Evidence illuminates its surface. Revisions add shells. Exact authority aligns the rings. Acceptance closes the form.</p>
        <div><button onClick={() => enter("freelancer")}>Enter as Kavya <ArrowRight /></button><button onClick={() => enter("client")}>Enter as Ternary <ArrowRight /></button></div>
      </section>
      <footer><span>DRAG TO INSPECT</span><span>THREE.JS / R3F / PROCEDURAL GEOMETRY</span></footer>
    </main>
  );
}

export function Axiom() {
  const route = useConceptRoute("axiom");
  const { role, view, go, switchRole, state, dispatch } = route;
  const params = useParams<{ role?: string }>();
  const reducedMotion = Boolean(useReducedMotion());
  const [focusedRecord, setFocusedRecord] = useState(0);
  const records = role === "client" ? APPLICANTS : GIGS;
  const descriptor = useMemo(
    () => createAxiomSceneDescriptor(state, view, role, focusedRecord),
    [focusedRecord, role, state, view],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [params.role, role, view]);

  if (!params.role) return <Landing enter={switchRole} descriptor={descriptor} reducedMotion={reducedMotion} />;

  return (
    <div className={`axiom-concept is-${descriptor.accent}`}>
      <main id="main-content" className="ax-shell">
        <header className="ax-utility">
          <Link to="/">GM / 27</Link>
          <span>AXIOM / LIVING DEAL OBJECT</span>
          <button onClick={() => dispatch({ type: "reset" })}><RotateCcw /> Reset object</button>
          <div aria-label="Viewing role"><button aria-pressed={role === "freelancer"} onClick={() => switchRole("freelancer")}>Kavya</button><button aria-pressed={role === "client"} onClick={() => switchRole("client")}>Ternary</button></div>
        </header>

        <nav className="ax-navigation" aria-label="Axiom workflow">
          {NAV[role].map((item) => <button key={item.view} aria-current={view === item.view ? "page" : undefined} onClick={() => go(item.view)}><span>{String(NAV[role].indexOf(item) + 1).padStart(2, "0")}</span>{item.label}</button>)}
        </nav>

        <section className="ax-object-field" aria-label="Living deal object visualization">
          <div className="ax-canvas" aria-hidden="true"><AxiomScene descriptor={descriptor} reducedMotion={reducedMotion} recordCount={records.length} onFocusRecord={setFocusedRecord} /></div>
          <div className="ax-object-meta">
            <span>{descriptor.phase.toUpperCase()} FORM</span>
            <b>{descriptor.evidenceFit}% EVIDENCE FIT</b>
          </div>
          <p className="ax-scene-status" aria-live="polite">{descriptor.summary}</p>
          <div className="ax-focus-dots" role="group" aria-label={role === "client" ? "Focus applicant in object" : "Focus opportunity in object"}>
            {records.map((record, index) => <button key={record.id} aria-label={`Focus ${"name" in record ? record.name : record.company}`} aria-pressed={focusedRecord === index} onClick={() => setFocusedRecord(index)}>{index + 1}</button>)}
          </div>
        </section>

        <aside className="ax-workspace" aria-label={`${descriptor.phase} workspace`}>
          <AxiomPanel {...route} focusedRecord={focusedRecord} setFocusedRecord={setFocusedRecord} />
        </aside>

        <nav className="ax-phase-rail" aria-label="Deal object phases">
          {PHASES.map((phase) => <button key={phase.id} aria-current={descriptor.phase === phase.id ? "step" : undefined} onClick={() => go(axiomViewForPhase(role, phase.id))}><i>{phase.number}</i><span>{phase.label}</span></button>)}
        </nav>
      </main>
      {state.toast ? <div className="ax-toast" role="status">{state.toast}</div> : null}
    </div>
  );
}
