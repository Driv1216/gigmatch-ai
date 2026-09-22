import {
  ArrowDownRight,
  ArrowRight,
  Asterisk,
  Check,
  ChevronRight,
  Circle,
  Equal,
  Grid2X2,
  Lock,
  Square,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Applicant, ConceptProps, Gig, ViewId } from "../types";

const freelancerNav: Array<[ViewId, string]> = [
  ["overview", "Start"],
  ["market", "Opportunity index"],
  ["proposal", "Response form"],
  ["applications", "Active files"],
  ["engagement", "Confirmed"],
];

const clientNav: Array<[ViewId, string]> = [
  ["overview", "Start"],
  ["review", "Applicant index"],
  ["engagement", "Confirmed"],
];

export function SignalIndex(props: ConceptProps) {
  const items = props.role === "client" ? clientNav : freelancerNav;

  return (
    <div className="signal">
      <header className="signal-nav">
        <button className="signal-logo" onClick={() => props.onNavigate("overview")}>
          GM<span>+</span>
        </button>
        <nav aria-label="Signal Index navigation">
          {items.map(([view, label], index) => (
            <button className={props.view === view ? "is-active" : ""} key={view} onClick={() => props.onNavigate(view)}>
              <span>0{index + 1}</span>{label}
            </button>
          ))}
        </nav>
        <div className="signal-role"><Circle size={8} fill="currentColor" /> {props.role}</div>
      </header>

      {props.view === "overview" && <SignalOverview {...props} />}
      {props.view === "market" && <SignalMarket {...props} />}
      {props.view === "proposal" && <SignalProposal {...props} />}
      {props.view === "applications" && <SignalApplication {...props} />}
      {props.view === "review" && <SignalReview {...props} />}
      {props.view === "engagement" && <SignalEngagement {...props} />}
    </div>
  );
}

function SignalOverview(props: ConceptProps) {
  const isClient = props.role === "client";
  return (
    <main className="signal-home">
      <section className="signal-home__headline">
        <div className="signal-tape">LIVE INDEX · 26 JUL 2026 · VERIFIED MARKETPLACE</div>
        <span>GigMatch / {isClient ? "Client" : "Independent"}</span>
        <h1>{isClient ? <>PEOPLE<br />BEFORE<br /><mark>PIPELINE.</mark></> : <>GOOD WORK<br />HAS A<br /><mark>SIGNAL.</mark></>}</h1>
        <p>
          {isClient
            ? "Compare evidence, terms, and availability without reducing people to cards."
            : "Three opportunities align with your practice. One exact selection request needs a response."}
        </p>
      </section>
      <section className="signal-home__action">
        <div className="signal-action-code">{isClient ? "A–01" : "R–01"}</div>
        <small>{isClient ? "Candidate requiring review" : "Response required"}</small>
        <h2>{isClient ? "Meera Shah" : "Northstar Health Systems"}</h2>
        <p>{props.activeGig.title}</p>
        <div>
          <strong>{isClient ? "91%" : "36H"}</strong>
          <span>{isClient ? "evidence alignment" : "remaining"}</span>
        </div>
        <button onClick={() => props.onNavigate(isClient ? "review" : "applications")}>
          Open decision <ArrowDownRight size={24} />
        </button>
      </section>
      <section className="signal-home__legend">
        <span><i className="is-blue" /> Evidence</span>
        <span><i className="is-red" /> Action</span>
        <span><i className="is-yellow" /> Commercial</span>
        <p>Colour is functional. It never changes the suitability score.</p>
      </section>
    </main>
  );
}

function SignalMarket(props: ConceptProps) {
  return (
    <main className="signal-index">
      <header className="signal-page-title">
        <span>INDEX / 03 OPEN RECORDS</span>
        <h1>OPPORTUNITIES<br /><mark>AT A GLANCE</mark></h1>
        <p>Read down a column. Compare across a row.</p>
      </header>

      <section className="signal-matrix" aria-label="Opportunity comparison">
        <div className="signal-matrix__corner"><Grid2X2 size={28} /><span>Comparison<br />criteria</span></div>
        {props.gigs.map((gig, index) => (
          <button
            className={`signal-matrix__head tone-${index + 1} ${props.activeGig.id === gig.id ? "is-active" : ""}`}
            key={gig.id}
            onClick={() => props.onSelectGig(gig.id)}
          >
            <span>0{index + 1}</span>
            <strong>{gig.company}</strong>
            <small>{gig.category}</small>
          </button>
        ))}
        <MatrixLabel label="The work" code="A" />
        {props.gigs.map((gig) => <MatrixCell key={`${gig.id}-work`} strong={gig.title} text={gig.summary} />)}
        <MatrixLabel label="Alignment" code="B" />
        {props.gigs.map((gig) => <MatrixScore key={`${gig.id}-match`} value={`${gig.match}%`} label={gig.matchLabel} />)}
        <MatrixLabel label="Commercial" code="C" />
        {props.gigs.map((gig) => <MatrixCell key={`${gig.id}-budget`} strong={gig.budget} text={`${gig.paymentStructure} · ${gig.duration}`} />)}
        <MatrixLabel label="Known gap" code="D" />
        {props.gigs.map((gig) => <MatrixCell key={`${gig.id}-gap`} strong={gig.missingSkills[0]} text="Preferred, not required" warning />)}
        <MatrixLabel label="Decision" code="E" />
        {props.gigs.map((gig) => (
          <button className="signal-matrix__open" key={`${gig.id}-open`} onClick={() => { props.onSelectGig(gig.id); props.onNavigate("proposal"); }}>
            Open brief <ArrowRight size={16} />
          </button>
        ))}
      </section>
    </main>
  );
}

function MatrixLabel({ code, label }: { code: string; label: string }) {
  return <div className="signal-matrix__label"><span>{code}</span><strong>{label}</strong></div>;
}

function MatrixCell({ strong, text, warning = false }: { strong: string; text: string; warning?: boolean }) {
  return <div className={`signal-matrix__cell ${warning ? "is-warning" : ""}`}><strong>{strong}</strong><p>{text}</p></div>;
}

function MatrixScore({ value, label }: { value: string; label: string }) {
  return <div className="signal-matrix__score"><strong>{value}</strong><span>{label}</span></div>;
}

function SignalProposal(props: ConceptProps) {
  const [editing, setEditing] = useState(false);

  if (props.state.applied && !editing) {
    return (
      <main className="signal-done">
        <div>RECORDED</div>
        <Check size={68} strokeWidth={1.5} />
        <h1>PROPOSAL<br />VERSION 02</h1>
        <p>Response to Northstar brief version 03.</p>
        <div className="signal-done__actions">
          <button onClick={() => props.onNavigate("applications")}>Track the record <ArrowRight size={18} /></button>
          <button onClick={() => setEditing(true)}>Draft v03</button>
        </div>
      </main>
    );
  }

  return (
    <main className="signal-form-page">
      <header className="signal-page-title">
        <span>STRUCTURED RESPONSE / VERSION 02</span>
        <h1>MAKE THE<br /><mark>TERMS CLEAR.</mark></h1>
      </header>
      <form className="signal-form" onSubmit={(event) => { event.preventDefault(); props.onApply(); setEditing(false); }}>
        <label className="signal-form__statement">
          <span><b>01</b> Point of view</span>
          <textarea defaultValue="Begin with clinical workflow evidence, then consolidate the component layer around the decisions staff make most often." />
        </label>
        <label>
          <span><b>02</b> Exact total</span>
          <input defaultValue="₹5,60,000 fixed" />
        </label>
        <label>
          <span><b>03</b> Delivery</span>
          <input defaultValue="14 weeks" />
        </label>
        <label className="signal-form__scope">
          <span><b>04</b> Included scope</span>
          <textarea defaultValue={"01  Component inventory\n02  Accessible React library\n03  Two workflow migrations\n04  Adoption documentation"} />
        </label>
        <aside>
          <Asterisk size={24} />
          <p>Client range<br /><strong>{props.activeGig.budget}</strong></p>
          <p>Responding to<br /><strong>Brief v03</strong></p>
        </aside>
        <button className="signal-form__submit">SUBMIT V02 <ArrowDownRight size={26} /></button>
      </form>
    </main>
  );
}

function SignalApplication(props: ConceptProps) {
  return (
    <main className="signal-file">
      <header className="signal-page-title">
        <span>ACTIVE FILE / GM-A-1182</span>
        <h1>NORTHSTAR<br /><mark>SELECTED YOU.</mark></h1>
      </header>
      <section className="signal-file__grid">
        <div className="signal-file__status">
          <span>STATUS</span>
          <strong>{props.state.accepted ? "CONFIRMED" : "SELECTION PENDING"}</strong>
          <p>{props.state.accepted ? "Engagement record created." : "36 hours remain to respond."}</p>
        </div>
        <div className="signal-file__terms tone-yellow">
          <span>COMMERCIAL</span><strong>₹5.6L</strong><p>Fixed price</p>
        </div>
        <div className="signal-file__terms tone-blue">
          <span>TIME</span><strong>14</strong><p>Weeks · starts 10 Aug</p>
        </div>
        <div className="signal-file__versions">
          <span>BOUND RECORDS</span>
          <p><b>Application</b><strong>V02</strong></p>
          <p><b>Gig terms</b><strong>V03</strong></p>
        </div>
        <div className="signal-file__decision">
          <Lock size={24} />
          <h2>ACCEPT EXACTLY WHAT IS SHOWN.</h2>
          <p>No side conditions. No browser-supplied terms. The server rechecks both versions.</p>
          {!props.state.accepted && <button onClick={props.onAccept}>ACCEPT EXACT TERMS <ArrowRight size={18} /></button>}
          <button onClick={() => props.onToast("Alternative responses opened")}>Other responses</button>
        </div>
      </section>
    </main>
  );
}

function SignalReview(props: ConceptProps) {
  return (
    <main className="signal-index signal-index--applicants">
      <header className="signal-page-title">
        <span>NORTHSTAR / APPLICANT INDEX</span>
        <h1>COMPARE THE<br /><mark>EVIDENCE.</mark></h1>
        <p>Commercial terms are visible, but excluded from alignment.</p>
      </header>
      <section className="signal-applicant-matrix">
        <div className="signal-applicant-matrix__top"><span>Criteria ↓</span>{props.applicants.map((app, index) => <CandidateHead key={app.id} applicant={app} index={index} />)}</div>
        <CandidateRow label="Alignment" applicants={props.applicants} render={(app) => <><strong>{app.match}%</strong><span>{app.match >= 90 ? "Strong" : "Good"}</span></>} />
        <CandidateRow label="Practice" applicants={props.applicants} render={(app) => <p>{app.headline}</p>} />
        <CandidateRow label="Evidence" applicants={props.applicants} render={(app) => <div className="signal-mini-tags">{app.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div>} />
        <CandidateRow label="Known gap" applicants={props.applicants} render={(app) => <p>{app.gap}</p>} />
        <CandidateRow label="Commercial" applicants={props.applicants} render={(app) => <><strong className="signal-price">{app.proposal}</strong><span>{app.timeline}</span></>} />
      </section>
      <section className="signal-review-action">
        <div><span>LEAD RECORD</span><strong>MEERA SHAH · V02</strong></div>
        <button onClick={props.onShortlist}>{props.state.shortlisted ? "★ PRIVATE SHORTLIST" : "☆ SHORTLIST"}</button>
        <button onClick={props.onAdvance}>{props.state.advanced ? "✓ ADVANCED" : "ADVANCE"}</button>
        <button disabled={!props.state.advanced} onClick={props.onSendSelection}>SEND EXACT OFFER <ArrowRight size={18} /></button>
      </section>
    </main>
  );
}

function CandidateHead({ applicant, index }: { applicant: Applicant; index: number }) {
  return (
    <div className={`tone-${index + 1}`}>
      <span>0{index + 1}</span>
      <i>{applicant.initials}</i>
      <strong>{applicant.name}</strong>
      <small>{applicant.location.split(" · ")[0]}</small>
    </div>
  );
}

function CandidateRow({
  label,
  applicants,
  render,
}: {
  label: string;
  applicants: Applicant[];
  render: (applicant: Applicant) => ReactNode;
}) {
  return (
    <div className="signal-applicant-matrix__row">
      <span>{label}</span>
      {applicants.map((applicant) => <div key={applicant.id}>{render(applicant)}</div>)}
    </div>
  );
}

function SignalEngagement(props: ConceptProps) {
  return (
    <main className="signal-confirmed">
      <header><span>GM / E-2048</span><Square size={28} fill="currentColor" /></header>
      <div className="signal-confirmed__title">
        <small>{props.state.accepted ? "CONFIRMED ENGAGEMENT" : "ENGAGEMENT PREVIEW"}</small>
        <h1>NORTHSTAR<br /><Equal size={58} /> AISHA</h1>
      </div>
      <section>
        <div><span>WORK</span><strong>Clinical operations design system</strong></div>
        <div><span>VALUE</span><strong>₹5.6L fixed</strong></div>
        <div><span>TIME</span><strong>14 weeks</strong></div>
        <div><span>RECORD</span><strong>Application v02 × Brief v03</strong></div>
      </section>
      <button onClick={() => props.onToast("Immutable record opened")}>OPEN ACCEPTED RECORD <ChevronRight size={20} /></button>
    </main>
  );
}
