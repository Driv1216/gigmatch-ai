import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  FileClock,
  FilePenLine,
  Fingerprint,
  LockKeyhole,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Stamp,
  UsersRound,
} from "lucide-react";
import type { Applicant, ConceptProps, Gig } from "../types";
import {
  CommercialTerms,
  ConceptNavigation,
  Mark,
  ProcessRail,
  SelectionNotice,
  SkillList,
  TrustNote,
  VersionSeal,
} from "../shared";
import { ACTIVITY } from "../data";

export function Ledger(props: ConceptProps) {
  return (
    <div className="concept ledger">
      <header className="ledger__topbar">
        <Mark compact />
        <span className="ledger__folio">TERMS LEDGER / 2026</span>
        <ConceptNavigation role={props.role} active={props.view} onNavigate={props.onNavigate} mode="compact" />
        <button className="ledger-user">{props.role === "freelancer" ? "A. Raman" : "Northstar"} <ChevronDown size={13} /></button>
      </header>
      <div className="ledger__frame">
        <aside className="ledger-index">
          <span className="ledger-index__title">Record index</span>
          {(props.role === "freelancer"
            ? [["overview", "01", "Desk"], ["market", "02", "Opportunities"], ["applications", "03", "Applications"], ["engagement", "04", "Engagements"]]
            : [["overview", "01", "Desk"], ["review", "02", "Applicant register"], ["engagement", "03", "Engagements"]]
          ).map(([view, num, label]) => (
            <button key={view} className={props.view === view ? "is-active" : ""} onClick={() => props.onNavigate(view as typeof props.view)}>
              <span>{num}</span>{label}
            </button>
          ))}
          <div className="ledger-index__seal"><Fingerprint size={19} /><strong>Record integrity</strong><p>Version references are visible wherever a decision changes terms.</p></div>
        </aside>
        <main className="ledger__paper">
          {props.view === "overview" && <LedgerOverview {...props} />}
          {props.view === "market" && <LedgerMarket {...props} />}
          {props.view === "proposal" && <LedgerProposal {...props} />}
          {props.view === "applications" && <LedgerApplication {...props} />}
          {props.view === "review" && <LedgerReview {...props} />}
          {props.view === "engagement" && <LedgerEngagement {...props} />}
        </main>
      </div>
    </div>
  );
}

function PaperHeader({ code, title, subtitle }: { code: string; title: string; subtitle: string }) {
  return (
    <header className="paper-header">
      <div><span>{code}</span><small>GigMatch AI · Controlled record</small></div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}

function LedgerOverview(props: ConceptProps) {
  const isFreelancer = props.role === "freelancer";
  return (
    <>
      <PaperHeader code="DESK / 24-07-26" title={isFreelancer ? "Aisha Raman’s working register" : "Northstar applicant register"} subtitle="Open items ordered by the decision they require, not by engagement metrics." />
      <section className="ledger-summary-line">
        <div><small>Open records</small><strong>{isFreelancer ? "2 applications" : "12 applications"}</strong></div>
        <div><small>Requires action</small><strong>{isFreelancer ? (props.state.selectionSent ? "1 selection request" : "1 recommendation") : "3 reviews"}</strong></div>
        <div><small>Record status</small><strong><CircleDot size={12} /> Current as of 10:42 IST</strong></div>
      </section>
      <section className="ledger-action-sheet">
        <div className="ledger-action-sheet__flag">ACTION 01</div>
        <div><p className="ledger-caption">{isFreelancer ? "Version-bound decision" : "Applicant review"}</p><h2>{isFreelancer ? (props.state.selectionSent ? "Respond to Northstar’s selection request" : "Review Northstar’s published terms") : "Review Meera Shah · proposal version 2"}</h2><p>{isFreelancer ? "The exact application and gig versions are preserved beside the decision." : "A commercial change was submitted after initial review. Compare the immutable versions before deciding."}</p></div>
        <button className="ledger-primary" onClick={() => props.onNavigate(isFreelancer ? (props.state.selectionSent ? "applications" : "market") : "review")}>Open record <ArrowRight size={15} /></button>
      </section>
      <div className="ledger-columns">
        <section>
          <div className="ledger-section-title"><h3>Recent entries</h3><span>Audit-visible events</span></div>
          <div className="activity-ledger">
            {ACTIVITY.slice(0, 3).map(([time, title, detail]) => <div key={title}><time>{time}</time><span /><p><strong>{title}</strong><small>{detail}</small></p></div>)}
          </div>
        </section>
        <aside className="ledger-note"><BookOpen size={18} /><h3>Interpretation note</h3><p>A private shortlist is an organisational mark. Advancement is a formal stage change visible to the applicant.</p><button onClick={() => props.onToast("Decision glossary opened")}>Open glossary</button></aside>
      </div>
    </>
  );
}

function LedgerMarket(props: ConceptProps) {
  return (
    <>
      <PaperHeader code="MARKET / OPEN" title="Published opportunity register" subtitle="Only active gigs with supported terms and an open application deadline appear here." />
      <div className="ledger-tools"><label><Search size={15} /><input placeholder="Search title, company, skill" /></label><span>03 records</span><button onClick={() => props.onToast("Filter register opened")}>Filter register <ChevronDown size={13} /></button></div>
      <div className="opportunity-ledger">
        <div className="opportunity-ledger__head"><span>Ref.</span><span>Opportunity and required evidence</span><span>Commercial terms</span><span>Match</span><span /></div>
        {props.gigs.map((gig, i) => (
          <button className={props.activeGig.id === gig.id ? "is-active" : ""} key={gig.id} onClick={() => props.onSelectGig(gig.id)}>
            <span>GM-{2048 + i}</span>
            <span><strong>{gig.title}</strong><small>{gig.company} · {gig.requiredSkills.slice(0, 3).join(" · ")}</small></span>
            <span><strong>{gig.budget}</strong><small>{gig.paymentStructure} · {gig.duration}</small></span>
            <span><strong>{gig.match}%</strong><small>{gig.matchLabel}</small></span>
            <ArrowRight size={15} />
          </button>
        ))}
      </div>
      <section className="ledger-detail">
        <div className="ledger-detail__title"><div><span>Selected record</span><h2>{props.activeGig.title}</h2><p>{props.activeGig.company} · Terms version 3</p></div><span className="record-stamp"><Stamp size={18} /> PUBLISHED</span></div>
        <div className="ledger-detail__grid">
          <div><p>{props.activeGig.summary}</p><h3>Deliverables</h3><ol>{props.activeGig.deliverables.map((item) => <li key={item}>{item}</li>)}</ol></div>
          <div><CommercialTerms gig={props.activeGig} condensed /><h3>Suitability evidence</h3><p>{props.activeGig.matchReason}</p><SkillList skills={props.activeGig.matchingSkills} minimal /></div>
        </div>
        <div className="ledger-detail__actions"><span>Application deadline · {props.activeGig.deadline}</span><button className="ledger-primary" onClick={() => props.onNavigate("proposal")}>Open application sheet <ArrowRight size={15} /></button></div>
      </section>
    </>
  );
}

function LedgerProposal(props: ConceptProps) {
  if (props.state.applied) {
    return (
      <>
        <PaperHeader code="APPLICATION / FILED" title="Submission receipt" subtitle="This receipt identifies the exact gig terms and application version recorded at submission." />
        <div className="filing-receipt"><span className="record-stamp"><Check size={17} /> RECORDED</span><h2>Application GM-A-1182</h2><dl><div><dt>Gig terms</dt><dd>Version 3 · 22 Jul 2026</dd></div><div><dt>Proposal</dt><dd>Version 2 · ₹5.6L fixed</dd></div><div><dt>Stage</dt><dd>Under review</dd></div></dl><button className="ledger-primary" onClick={() => props.onNavigate("applications")}>Open application record</button></div>
      </>
    );
  }
  return (
    <>
      <PaperHeader code="APPLICATION / DRAFT" title="Structured proposal sheet" subtitle={`Response to ${props.activeGig.company} · gig terms version 3`} />
      <form className="ledger-form" onSubmit={(e) => { e.preventDefault(); props.onApply(); }}>
        <div className="ledger-form__row"><span>01</span><label>Cover note<textarea defaultValue="I have led two design-system consolidations across multi-product React estates, including accessibility remediation and adoption documentation." /></label><aside>Evidence should be relevant to this brief. General profile claims are not copied into the application record.</aside></div>
        <div className="ledger-form__row"><span>02</span><div className="ledger-form__fields"><label>Proposal mode<select><option>Exact total</option><option>Comfortable within budget</option><option>Total range</option></select></label><label>Exact total<input defaultValue="₹ 5,60,000" /></label><label>Duration<input defaultValue="14 weeks" /></label><label>Available from<input type="date" defaultValue="2026-08-10" /></label></div><aside>Posted budget remains visible: {props.activeGig.budget}. Price does not affect the suitability score.</aside></div>
        <div className="ledger-form__row"><span>03</span><label>Included work<textarea defaultValue={"Component audit and migration map\nAccessible React component library\nTwo clinical workflow migrations\nAdoption documentation"} /></label><aside>One item per line. This becomes part of the immutable proposal version.</aside></div>
        <div className="ledger-signoff"><label><input type="checkbox" defaultChecked /> I have reviewed the published terms and confirm this structured proposal.</label><button className="ledger-primary">File application <LockKeyhole size={15} /></button></div>
      </form>
    </>
  );
}

function LedgerApplication(props: ConceptProps) {
  return (
    <>
      <PaperHeader code="APPLICATION / GM-A-1182" title="Application record" subtitle="A durable history of official proposal versions, stage changes, and participant-visible decisions." />
      <ProcessRail state={props.state} />
      {props.state.selectionSent && <SelectionNotice state={props.state} onAccept={props.onAccept} onToast={props.onToast} />}
      <div className="application-ledger-grid">
        <section>
          <div className="ledger-section-title"><h3>Current official proposal</h3><VersionSeal version={props.state.applicationVersion} /></div>
          <div className="official-terms"><div><small>Proposal</small><strong>₹5.6L fixed</strong></div><div><small>Timeline</small><strong>14 weeks</strong></div><div><small>Availability</small><strong>10 Aug · 28 hrs/week</strong></div></div>
          <h4>Included work</h4><ul>{props.activeGig.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <aside>
          <div className="ledger-section-title"><h3>Version register</h3><span>Immutable</span></div>
          <button className="version-entry is-current"><span>v2</span><p><strong>Current proposal</strong><small>24 Jul · Freelancer edit</small></p><b>₹5.6L</b></button>
          <button className="version-entry" onClick={() => props.onToast("Version 1 comparison opened")}><span>v1</span><p><strong>Initial submission</strong><small>22 Jul · Filed</small></p><b>₹5.4L</b></button>
        </aside>
      </div>
      <TrustNote />
    </>
  );
}

function LedgerReview(props: ConceptProps) {
  return (
    <>
      <PaperHeader code="APPLICANTS / GM-2048" title="Applicant suitability register" subtitle="Best Match ordering assists review. Commercial proposal values are excluded from the suitability score." />
      <div className="register-controls"><span>Sort: <strong>Best match</strong></span><button onClick={() => props.onToast("Sort choices opened")}>Change <ChevronDown size={13} /></button><span className="spacer" /><span>Shortlist 1 / 5</span></div>
      <div className="applicant-register">
        <div className="applicant-register__head"><span>Applicant</span><span>Evidence</span><span>Commercial record</span><span>Stage</span><span /></div>
        {props.applicants.map((app) => <ApplicantLedgerRow key={app.id} applicant={app} active={app.id === "app-meera"} onOpen={() => app.id === "app-meera" ? null : props.onToast(`${app.name} record selected`)} />)}
      </div>
      <section className="review-docket">
        <div className="review-docket__head"><div><span className="initial-block">MS</span><p><strong>Meera Shah</strong><small>Design systems engineer · {props.applicants[0].experience}</small></p></div><span className="record-stamp">91% · STRONG</span></div>
        <div className="review-docket__grid">
          <div><h3>Matching evidence</h3><p>{props.applicants[0].coverNote}</p><SkillList skills={props.applicants[0].skills} minimal /><div className="margin-note"><strong>Gap to consider</strong><p>{props.applicants[0].gap}</p></div></div>
          <div><h3>Commercial record</h3><dl><div><dt>Proposal</dt><dd>{props.applicants[0].proposal}</dd></div><div><dt>Timeline</dt><dd>{props.applicants[0].timeline}</dd></div><div><dt>Availability</dt><dd>{props.applicants[0].availability}</dd></div></dl><VersionSeal version={2} /></div>
          <aside><h3>Decision marks</h3><button className={props.state.shortlisted ? "is-marked" : ""} onClick={props.onShortlist}><FilePenLine size={15} /> {props.state.shortlisted ? "Privately shortlisted" : "Add private mark"}</button><button className={props.state.advanced ? "is-marked" : ""} onClick={props.onAdvance}><UsersRound size={15} /> {props.state.advanced ? "Formally advanced" : "Advance formally"}</button><button className="ledger-primary" disabled={!props.state.advanced} onClick={props.onSendSelection}>Issue selection request</button><small>Request binds gig v3 to proposal v2.</small></aside>
        </div>
      </section>
    </>
  );
}

function ApplicantLedgerRow({ applicant, active, onOpen }: { applicant: Applicant; active: boolean; onOpen: () => void }) {
  return <button className={active ? "is-active" : ""} onClick={onOpen}><span><b>{applicant.initials}</b><span><strong>{applicant.name}</strong><small>{applicant.headline}</small></span></span><span><strong>{applicant.match}%</strong><small>{applicant.skills.slice(0, 2).join(" · ")}</small></span><span><strong>{applicant.proposal}</strong><small>{applicant.timeline} · v{applicant.version}</small></span><span>{applicant.stage}</span><MoreHorizontal size={16} /></button>;
}

function LedgerEngagement(props: ConceptProps) {
  return (
    <>
      <PaperHeader code="ENGAGEMENT / GM-E-2048" title="Confirmed terms register" subtitle="This workspace preserves the selected proposal and a limited operational history. It is not a legal contract." />
      <div className="engagement-certificate">
        <div className="certificate-seal"><ShieldCheck size={28} /><span>{props.state.accepted ? "CONFIRMED" : "PREVIEW"}</span></div>
        <div><p>Engagement between</p><h2>Northstar Health Systems</h2><span>and</span><h2>{props.role === "freelancer" ? "Aisha Raman" : "Meera Shah"}</h2></div>
        <dl><div><dt>Proposal reference</dt><dd>Application v2</dd></div><div><dt>Gig reference</dt><dd>Terms v3</dd></div><div><dt>Commercial terms</dt><dd>₹5.6L fixed · 14 weeks</dd></div><div><dt>Recorded</dt><dd>{props.state.accepted ? "24 Jul 2026 · 10:42 IST" : "Awaiting acceptance"}</dd></div></dl>
      </div>
      <div className="ledger-columns">
        <section><div className="ledger-section-title"><h3>Activity register</h3><span>Participant-visible</span></div><div className="activity-ledger">{ACTIVITY.map(([time, title, detail]) => <div key={title}><time>{time}</time><span /><p><strong>{title}</strong><small>{detail}</small></p></div>)}</div></section>
        <aside className="ledger-note"><FileClock size={18} /><h3>Contact exchange</h3><p>Reveals require engagement membership, sharing consent, and a recorded reveal event.</p><button onClick={() => props.onToast("Contact consent register opened")}>Open consent register</button></aside>
      </div>
    </>
  );
}
