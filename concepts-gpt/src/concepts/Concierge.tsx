import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  LockKeyhole,
  MessageSquareText,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { ConceptProps } from "../types";
import {
  CommercialTerms,
  ConceptNavigation,
  GigMeta,
  Mark,
  MatchStamp,
  ProcessRail,
  SelectionNotice,
  SkillList,
  TrustNote,
  VersionSeal,
} from "../shared";

export function Concierge(props: ConceptProps) {
  const { role, view, onNavigate } = props;
  return (
    <div className="concept concierge">
      <header className="concierge__header">
        <Mark />
        <ConceptNavigation role={role} active={view} onNavigate={onNavigate} mode="compact" />
        <div className="concierge__identity">
          <button aria-label="Notifications"><Bell size={17} /><span /></button>
          <div><strong>{role === "freelancer" ? "Aisha Raman" : "Kavya · Northstar"}</strong><small>{role === "freelancer" ? "Freelancer" : "Client team"}</small></div>
          <span className="avatar">{role === "freelancer" ? "AR" : "KN"}</span>
        </div>
      </header>
      <main className="concierge__main">
        {view === "overview" && <ConciergeOverview {...props} />}
        {view === "market" && <ConciergeMarket {...props} />}
        {view === "proposal" && <ConciergeProposal {...props} />}
        {view === "applications" && <ConciergeApplications {...props} />}
        {view === "review" && <ConciergeReview {...props} />}
        {view === "engagement" && <ConciergeEngagement {...props} />}
      </main>
    </div>
  );
}

function ConciergeOverview(props: ConceptProps) {
  const { role, state, activeGig, onNavigate } = props;
  const isFreelancer = role === "freelancer";
  return (
    <div className="concierge-home">
      <section className="concierge-welcome">
        <p className="eyebrow">Friday, 24 July</p>
        <h1>{isFreelancer ? "Good morning, Aisha." : "Good morning, Kavya."}</h1>
        <p>{isFreelancer ? "You have one decision that needs your attention." : "Three applicants are ready for a considered review."}</p>
      </section>
      <section className="next-action">
        <div className="next-action__index">01</div>
        <div className="next-action__body">
          <div className="next-action__label"><Sparkles size={15} /> Recommended next action</div>
          {isFreelancer ? (
            <>
              <h2>{state.selectionSent ? "Northstar is ready to proceed" : "Review a strong-fit opportunity"}</h2>
              <p>{state.selectionSent
                ? "The selection request is bound to proposal version 2. Review the exact commercial terms before responding."
                : `${activeGig.company} is looking for your exact combination of React, design systems, and accessibility experience.`}</p>
              <div className="next-action__summary">
                <div><small>{state.selectionSent ? "Frozen proposal" : "Opportunity"}</small><strong>{state.selectionSent ? "₹5.6L · 14 weeks" : activeGig.title}</strong></div>
                <div><small>{state.selectionSent ? "Response due" : "Match evidence"}</small><strong>{state.selectionSent ? "26 Jul · 6:00 PM" : `${activeGig.match}% · ${activeGig.matchLabel}`}</strong></div>
              </div>
              <button className="primary-action" onClick={() => onNavigate(state.selectionSent ? "applications" : "market")}>
                {state.selectionSent ? "Review exact terms" : "Open recommendation"} <ArrowRight size={17} />
              </button>
            </>
          ) : (
            <>
              <h2>Compare the leading applicants</h2>
              <p>Meera, Arjun, and Nila each meet the core brief differently. Review evidence and commercial terms together.</p>
              <div className="next-action__summary">
                <div><small>Opportunity</small><strong>Clinical operations design system</strong></div>
                <div><small>Applicant state</small><strong>3 ready · 1 advanced</strong></div>
              </div>
              <button className="primary-action" onClick={() => onNavigate("review")}>Begin focused review <ArrowRight size={17} /></button>
            </>
          )}
        </div>
        <div className="next-action__aside">
          <span>Why now?</span>
          <p>{isFreelancer ? "This request expires in 48 hours." : "The client review target is 28 July."}</p>
        </div>
      </section>
      <div className="concierge-home__lower">
        <section className="quiet-list">
          <div className="section-heading"><div><span>After that</span><h3>Your remaining work</h3></div><small>Ordered by consequence</small></div>
          <button onClick={() => onNavigate(isFreelancer ? "applications" : "review")}><span><FileText size={17} />{isFreelancer ? "Application version history" : "Review proposal change"}</span><small>{isFreelancer ? "2 versions" : "Meera · v1 → v2"}</small><ChevronRight size={16} /></button>
          <button onClick={() => onNavigate("engagement")}><span><Shield size={17} />Engagement workspace</span><small>Preview secure record</small><ChevronRight size={16} /></button>
        </section>
        <aside className="service-note">
          <CircleHelp size={19} />
          <h3>A quieter marketplace</h3>
          <p>Private shortlist actions stay private. Formal advancement and selection are always explicit.</p>
          <button onClick={() => props.onToast("Safeguards guide opened")}>How decisions work</button>
        </aside>
      </div>
    </div>
  );
}

function ConciergeMarket(props: ConceptProps) {
  const { activeGig, gigs, onSelectGig, onNavigate } = props;
  return (
    <div className="concierge-market">
      <button className="back-link" onClick={() => onNavigate("overview")}><ArrowLeft size={15} /> Home</button>
      <div className="market-intro"><p className="eyebrow">Curated for your reviewed profile</p><h1>Three opportunities worth your time</h1><p>Ranked by suitability. Commercial terms never increase the match score.</p></div>
      <div className="concierge-market__layout">
        <aside className="recommendation-index">
          {gigs.map((gig, i) => (
            <button key={gig.id} onClick={() => onSelectGig(gig.id)} className={activeGig.id === gig.id ? "is-active" : ""}>
              <span>0{i + 1}</span><div><strong>{gig.title}</strong><small>{gig.company} · {gig.match}% match</small></div>
            </button>
          ))}
        </aside>
        <article className="recommendation-brief">
          <div className="recommendation-brief__head">
            <div><span className="company-monogram">NH</span><p>{activeGig.company}<small>Identity and company profile reviewed</small></p></div>
            <button className="icon-button" aria-label="Save opportunity" onClick={() => props.onToast("Opportunity saved privately")}><Bookmark size={18} /></button>
          </div>
          <p className="eyebrow">{activeGig.category}</p>
          <h2>{activeGig.title}</h2>
          <GigMeta gig={activeGig} />
          <MatchStamp gig={activeGig} />
          <p className="brief-summary">{activeGig.summary}</p>
          <div className="why-fit">
            <div><Sparkles size={18} /><h3>Why it fits</h3></div>
            <p>{activeGig.matchReason}</p>
            <SkillList skills={activeGig.matchingSkills} minimal />
            {activeGig.missingSkills.length > 0 && <p className="quiet-warning">Preferred evidence to strengthen: {activeGig.missingSkills.join(", ")}</p>}
          </div>
          <CommercialTerms gig={activeGig} />
          <TrustNote compact />
          <div className="brief-actions">
            <button className="primary-action" onClick={() => onNavigate("proposal")}>Prepare an application <ArrowRight size={17} /></button>
            <span>Application takes about 8 minutes</span>
          </div>
        </article>
      </div>
    </div>
  );
}

function ConciergeProposal(props: ConceptProps) {
  const { activeGig, state, onApply, onNavigate } = props;
  if (state.applied) {
    return <div className="completion-page"><span className="completion-icon"><Check size={26} /></span><p className="eyebrow">Application recorded</p><h1>Your proposal is now under review.</h1><p>Proposal version 2 is tied to Northstar’s gig terms version 3. Neither record can be silently rewritten.</p><button className="primary-action" onClick={() => onNavigate("applications")}>View application record <ArrowRight size={17} /></button></div>;
  }
  return (
    <div className="guided-proposal">
      <button className="back-link" onClick={() => onNavigate("market")}><ArrowLeft size={15} /> Opportunity</button>
      <div className="guided-proposal__head"><p className="eyebrow">Structured application</p><h1>Build a proposal both sides can trust</h1><p>We’ve separated scope, money, and availability so each term remains clear.</p></div>
      <ProcessRail state={state} />
      <form onSubmit={(e) => { e.preventDefault(); onApply(); }} className="guided-form">
        <section><div className="form-section-number">1</div><div><h2>Your note to Northstar</h2><p>Focus on evidence relevant to this specific brief.</p><textarea defaultValue="I’ve led two multi-product design-system migrations, including accessibility remediation and adoption documentation. I would begin with a component and workflow inventory, then agree the migration order with your clinical operations team." /><small>428 / 1,500 characters</small></div></section>
        <section><div className="form-section-number">2</div><div><h2>Commercial proposal</h2><p>Client guidance: {activeGig.budget} · {activeGig.paymentStructure}</p><div className="field-grid"><label>Proposed total<span className="input-affix"><b>₹</b><input defaultValue="560000" /></span></label><label>Timeline<select defaultValue="14 weeks"><option>14 weeks</option><option>12–14 weeks</option><option>Requires discussion</option></select></label></div><label>Included work<textarea defaultValue={"Component audit and migration map\nAccessible component library\nAppointment and care-plan workflow migration\nAdoption documentation"} /></label></div></section>
        <section><div className="form-section-number">3</div><div><h2>Availability and assumptions</h2><div className="field-grid"><label>Available from<input type="date" defaultValue="2026-08-10" /></label><label>Weekly availability<input defaultValue="28 hours" /></label></div><label>Material assumptions<textarea defaultValue="Northstar provides access to current product repositories, clinician research summaries, and one product owner for weekly decisions." /></label></div></section>
        <div className="proposal-confirm"><label><input type="checkbox" defaultChecked /> I confirm this proposal reflects the scope and terms shown above.</label><button className="primary-action" type="submit">Submit application <LockKeyhole size={16} /></button></div>
      </form>
    </div>
  );
}

function ConciergeApplications(props: ConceptProps) {
  const { activeGig, state, onNavigate } = props;
  return (
    <div className="application-focus">
      <div className="market-intro"><p className="eyebrow">Your application</p><h1>{activeGig.company}</h1><p>{activeGig.title}</p></div>
      <ProcessRail state={state} />
      {state.selectionSent && <SelectionNotice state={state} onAccept={props.onAccept} onToast={props.onToast} />}
      <div className="application-focus__grid">
        <section className="record-card">
          <div className="record-card__head"><VersionSeal version={state.applicationVersion} /><span>{state.applicationStage}</span></div>
          <h2>₹5.6L fixed · 14 weeks</h2>
          <p>Available 10 August · 28 hours per week</p>
          <div className="record-scope"><span>Included scope</span><ul><li>Component audit and migration map</li><li>Accessible React component library</li><li>Two clinical workflow migrations</li></ul></div>
          <button className="secondary-action" onClick={() => props.onToast("Version comparison opened")}>Compare v1 and v2</button>
        </section>
        <aside className="conversation-preview">
          <span><MessageSquareText size={15} /> Clarification</span><p>“Could the audit cover both desktop and tablet variants?”</p><small>Northstar · 24 Jul, 9:14 AM</small><button onClick={() => props.onToast("Structured answer composer opened")}>Answer question <ArrowRight size={14} /></button>
        </aside>
      </div>
      <button className="text-action" onClick={() => onNavigate("market")}>Continue browsing opportunities</button>
    </div>
  );
}

function ConciergeReview(props: ConceptProps) {
  const { applicants, state } = props;
  const lead = applicants[0];
  return (
    <div className="focused-review">
      <div className="focused-review__head"><div><p className="eyebrow">Applicant review · 1 of 3</p><h1>Review Meera on the whole record</h1><p>Match evidence and commercial terms are shown together. Price does not affect suitability.</p></div><div className="review-arrows"><button aria-label="Previous applicant"><ArrowLeft size={17} /></button><button aria-label="Next applicant" onClick={() => props.onToast("Next applicant: Arjun Rao")}><ArrowRight size={17} /></button></div></div>
      <div className="candidate-portrait">
        <div className="candidate-identity"><span className="large-avatar">{lead.initials}</span><div><h2>{lead.name}</h2><p>{lead.headline}</p><small>{lead.location} · {lead.experience}</small></div></div>
        <MatchStamp gig={{ ...props.activeGig, match: lead.match, matchLabel: "Strong match" }} />
      </div>
      <div className="focused-review__body">
        <section className="evidence-column">
          <h3>Evidence for this brief</h3><p>{lead.coverNote}</p><SkillList skills={lead.skills} /><div className="consideration"><span>Consideration</span><p>{lead.gap}</p></div>
        </section>
        <section className="terms-column"><VersionSeal version={lead.version} /><dl><div><dt>Proposal</dt><dd>{lead.proposal}</dd></div><div><dt>Timeline</dt><dd>{lead.timeline}</dd></div><div><dt>Availability</dt><dd>{lead.availability}</dd></div></dl><button className="secondary-action" onClick={() => props.onToast("Full application record opened")}>Read full application</button></section>
        <aside className="decision-column">
          <p className="eyebrow">Decision</p>
          <button className={state.shortlisted ? "decision-button is-selected" : "decision-button"} onClick={props.onShortlist}><Bookmark size={17} /> {state.shortlisted ? "Saved privately" : "Save privately"}</button>
          <button className={state.advanced ? "decision-button is-selected" : "decision-button"} onClick={props.onAdvance}><UserRound size={17} /> {state.advanced ? "Advanced" : "Advance applicant"}</button>
          <button className="primary-action" disabled={!state.advanced} onClick={props.onSendSelection}><LockKeyhole size={16} /> Send selection request</button>
          <small>Only one active request is allowed for this gig.</small>
        </aside>
      </div>
    </div>
  );
}

function ConciergeEngagement(props: ConceptProps) {
  return (
    <div className="concierge-engagement">
      <div className="market-intro"><p className="eyebrow">Secure engagement record</p><h1>Northstar × {props.role === "freelancer" ? "Aisha Raman" : "Meera Shah"}</h1><p>A lightweight record of confirmed terms—not a contract or project-management space.</p></div>
      <div className="engagement-status"><span><BriefcaseBusiness size={21} /></span><div><small>Current status</small><strong>{props.state.accepted ? "Confirmed" : "Preview · pending selection acceptance"}</strong></div><button onClick={() => props.onToast("Engagement activity opened")}>View activity</button></div>
      <div className="engagement-layout">
        <section className="immutable-record"><div><LockKeyhole size={18} /><p><strong>Immutable accepted proposal</strong><span>Application v2 · Gig terms v3</span></p></div><CommercialTerms gig={props.activeGig} /><div className="record-scope"><span>Confirmed scope</span><ul>{props.activeGig.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
        <aside className="contact-consent"><Shield size={20} /><h3>Contact exchange</h3><p>Contact details appear only after both parties choose what to share for this engagement.</p><div><span>p•••••@northstar.health</span><LockKeyhole size={14} /></div><button className="secondary-action" onClick={() => props.onToast("Consent settings opened")}>Manage consent</button></aside>
      </div>
      <TrustNote />
    </div>
  );
}
