import {
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  FileText,
  LockKeyhole,
  Menu,
  MoveUpRight,
  Star,
} from "lucide-react";
import { useState } from "react";
import type { ConceptProps, ViewId } from "../types";
import studioEngineer from "../assets/studio-engineer.jpg";

const freelancerNav: Array<[ViewId, string]> = [
  ["overview", "Today"],
  ["market", "Stories"],
  ["proposal", "Pitch"],
  ["applications", "My work"],
  ["engagement", "Engagement"],
];

const clientNav: Array<[ViewId, string]> = [
  ["overview", "Today"],
  ["review", "Talent"],
  ["engagement", "Engagement"],
];

export function Studio(props: ConceptProps) {
  const navigation = props.role === "client" ? clientNav : freelancerNav;

  return (
    <div className="studio">
      <header className="studio-nav">
        <button className="studio-wordmark" onClick={() => props.onNavigate("overview")}>
          G<span>·</span>M
        </button>
        <nav aria-label="Studio navigation">
          {navigation.map(([view, label]) => (
            <button
              className={props.view === view ? "is-active" : ""}
              key={view}
              onClick={() => props.onNavigate(view)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="studio-nav__identity">
          <span>{props.role === "client" ? "Northstar Health" : "Aisha Raman"}</span>
          <button aria-label="Open account menu"><Menu size={20} /></button>
        </div>
      </header>

      {props.view === "overview" && <StudioOverview {...props} />}
      {props.view === "market" && <StudioMarket {...props} />}
      {props.view === "proposal" && <StudioProposal {...props} />}
      {props.view === "applications" && <StudioApplication {...props} />}
      {props.view === "review" && <StudioReview {...props} />}
      {props.view === "engagement" && <StudioEngagement {...props} />}
    </div>
  );
}

function StudioOverview(props: ConceptProps) {
  const isClient = props.role === "client";

  return (
    <main className="studio-home">
      <section className="studio-cover">
        <img src={studioEngineer} alt="Senior product engineer working with a component library" />
        <div className="studio-cover__wash" />
        <div className="studio-cover__copy">
          <span className="studio-issue">GigMatch Journal · Issue 26/07</span>
          <p>{isClient ? "Independent talent, properly considered" : "Work with consequence"}</p>
          <h1>
            {isClient ? <>Meet people who can <em>change the work.</em></> : <>Find the brief that <em>moves you.</em></>}
          </h1>
          <button onClick={() => props.onNavigate(isClient ? "review" : "market")}>
            {isClient ? "Enter the talent edit" : "Explore this week’s edit"}
            <ArrowRight size={19} />
          </button>
        </div>
        <aside className="studio-cover__caption">
          <span>Featured discipline</span>
          <strong>Design systems × clinical operations</strong>
          <small>12–16 weeks · Remote · India</small>
        </aside>
      </section>

      <section className="studio-now">
        <div className="studio-now__title">
          <span>01</span>
          <h2>{isClient ? "One decision deserves your attention" : "Something important arrived"}</h2>
        </div>
        <div className="studio-now__story">
          <p className="studio-kicker">
            {isClient ? "Applicant profile · Meera Shah" : "Selection request · Northstar Health"}
          </p>
          <h3>{props.activeGig.title}</h3>
          <p>
            {isClient
              ? "A design-systems engineer whose accessibility practice is unusually relevant to the brief."
              : "Northstar wants to proceed on your exact proposal: ₹5.6L fixed over 14 weeks."}
          </p>
          <button onClick={() => props.onNavigate(isClient ? "review" : "applications")}>
            Open the full story <MoveUpRight size={17} />
          </button>
        </div>
        <div className="studio-now__number">
          <strong>{isClient ? "91" : "36"}</strong>
          <span>{isClient ? "% evidence alignment" : "hours to respond"}</span>
        </div>
      </section>
    </main>
  );
}

function StudioMarket(props: ConceptProps) {
  return (
    <main className="studio-market">
      <header>
        <span className="studio-kicker">The opportunity edit</span>
        <h1>Three briefs worth<br /><em>your attention.</em></h1>
        <p>Selected for relevance, clarity, and the quality of the work—not promoted placement.</p>
      </header>

      <section className="studio-market__lead">
        <div className="studio-market__image">
          <img src={studioEngineer} alt="" />
          <span>88% aligned</span>
        </div>
        <div className="studio-market__copy">
          <small>01 / Northstar Health Systems</small>
          <h2>{props.activeGig.title}</h2>
          <p>{props.activeGig.summary}</p>
          <dl>
            <div><dt>Fee</dt><dd>{props.activeGig.budget}</dd></div>
            <div><dt>Commitment</dt><dd>{props.activeGig.weeklyCommitment}</dd></div>
            <div><dt>Window</dt><dd>{props.activeGig.duration}</dd></div>
          </dl>
          <div className="studio-market__actions">
            <button onClick={() => props.onNavigate("proposal")}>Read the brief <ArrowRight size={17} /></button>
            <button onClick={() => props.onToast("Northstar saved to your edit")}>Save for later</button>
          </div>
        </div>
      </section>

      <section className="studio-market__more">
        {props.gigs.slice(1).map((gig, index) => (
          <button key={gig.id} onClick={() => { props.onSelectGig(gig.id); props.onNavigate("proposal"); }}>
            <span>0{index + 2}</span>
            <small>{gig.company}</small>
            <h3>{gig.title}</h3>
            <p>{gig.budget} · {gig.duration}</p>
            <ChevronRight size={24} />
          </button>
        ))}
      </section>
    </main>
  );
}

function StudioProposal(props: ConceptProps) {
  const [editing, setEditing] = useState(false);

  if (props.state.applied && !editing) {
    return (
      <main className="studio-receipt">
        <span className="studio-receipt__mark"><Check size={28} /></span>
        <p className="studio-kicker">Your pitch is on the record</p>
        <h1>Clear terms.<br /><em>Strong point of view.</em></h1>
        <p>Northstar received proposal version 2 against brief version 3.</p>
        <div className="studio-receipt__actions">
          <button onClick={() => props.onNavigate("applications")}>Follow the application <ArrowRight size={18} /></button>
          <button onClick={() => setEditing(true)}>Draft proposal v3</button>
        </div>
      </main>
    );
  }

  return (
    <main className="studio-pitch">
      <aside>
        <span className="studio-kicker">Pitch to Northstar</span>
        <h1>Your response should feel like <em>you.</em></h1>
        <p>The structure keeps the commercial terms clear. The voice remains yours.</p>
        <div>
          <small>Client range</small>
          <strong>{props.activeGig.budget}</strong>
          <span>Fixed price · 12–16 weeks</span>
        </div>
      </aside>
      <form onSubmit={(event) => { event.preventDefault(); props.onApply(); setEditing(false); }}>
        <label>
          <span>Open with your point of view</span>
          <textarea defaultValue="I would begin with the clinical workflow inventory—not the component library—so the system grows from the decisions staff make every day." />
        </label>
        <div className="studio-pitch__pair">
          <label><span>Your fee</span><input defaultValue="₹5,60,000 fixed" /></label>
          <label><span>Delivery window</span><input defaultValue="14 weeks" /></label>
        </div>
        <label>
          <span>What you will deliver</span>
          <textarea defaultValue={"Component audit and migration map\nAccessible React component library\nTwo clinical workflow migrations\nAdoption documentation"} />
        </label>
        <footer>
          <p><LockKeyhole size={15} /> Submitting creates proposal version 2.</p>
          <button>Send your pitch <ArrowRight size={17} /></button>
        </footer>
      </form>
    </main>
  );
}

function StudioApplication(props: ConceptProps) {
  return (
    <main className="studio-application">
      <header>
        <span className="studio-kicker">Northstar Health × Aisha Raman</span>
        <h1>The work is ready.<br /><em>Are you?</em></h1>
      </header>
      <section className="studio-offer">
        <div className="studio-offer__index"><span>Selection</span><strong>01</strong></div>
        <div className="studio-offer__main">
          <p>Northstar has selected your current proposal.</p>
          <h2>₹5.6L fixed<br />14 weeks<br />from 10 August</h2>
          <div><span>Application v2</span><span>Brief v3</span><span>Expires 27 Jul · 10:42</span></div>
        </div>
        <aside>
          {props.state.accepted ? (
            <div className="studio-accepted"><Check size={22} /><strong>Confirmed</strong><span>The engagement record is ready.</span></div>
          ) : (
            <>
              <p>The proposal and brief are frozen. Acceptance cannot add side conditions.</p>
              <button onClick={props.onAccept}>Accept exact terms <ArrowRight size={17} /></button>
              <button onClick={() => props.onToast("Response options opened")}>See other responses</button>
            </>
          )}
        </aside>
      </section>
      <footer className="studio-application__footer">
        <Clock3 size={17} /><p>You have <strong>36 hours</strong> remaining. We will verify the authoritative status before recording your response.</p>
      </footer>
    </main>
  );
}

function StudioReview(props: ConceptProps) {
  const lead = props.applicants[0];
  return (
    <main className="studio-talent">
      <header>
        <span className="studio-kicker">The Northstar talent edit</span>
        <h1>Not a stack of résumés.<br /><em>Three distinct practices.</em></h1>
      </header>
      <div className="studio-talent__counter">01 <span>/ 03</span></div>
      <section className="studio-profile">
        <div className="studio-profile__portrait"><img src={studioEngineer} alt="Meera Shah in her design studio" /></div>
        <div className="studio-profile__story">
          <p className="studio-kicker">Design systems × accessibility</p>
          <h2>{lead.name}</h2>
          <p className="studio-profile__intro">{lead.coverNote}</p>
          <blockquote>“Systems work succeeds when adoption is treated as part of the design.”</blockquote>
          <div className="studio-profile__skills">{lead.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          <p className="studio-profile__gap"><Circle size={9} fill="currentColor" /> Consider: {lead.gap}</p>
        </div>
        <aside className="studio-profile__decision">
          <div><strong>{lead.match}</strong><span>% aligned</span></div>
          <dl>
            <div><dt>Proposal</dt><dd>{lead.proposal}</dd></div>
            <div><dt>Timeline</dt><dd>{lead.timeline}</dd></div>
            <div><dt>Available</dt><dd>10 Aug</dd></div>
          </dl>
          <button className={props.state.shortlisted ? "is-selected" : ""} onClick={props.onShortlist}>
            <Star size={16} /> {props.state.shortlisted ? "On private shortlist" : "Add to shortlist"}
          </button>
          <button className={props.state.advanced ? "is-selected" : ""} onClick={props.onAdvance}>
            {props.state.advanced ? "Advanced to selection" : "Advance Meera"}
          </button>
          <button disabled={!props.state.advanced} onClick={props.onSendSelection}>Send exact offer <ArrowRight size={16} /></button>
        </aside>
      </section>
    </main>
  );
}

function StudioEngagement(props: ConceptProps) {
  return (
    <main className="studio-engagement">
      <section>
        <span className="studio-kicker">Engagement 2048</span>
        <p className="studio-engagement__date">10 Aug — 14 Nov 2026</p>
        <h1>Northstar Health<br /><em>with</em> Aisha Raman</h1>
        <div className="studio-engagement__people"><span>NH</span><i /><span>AR</span></div>
      </section>
      <aside>
        <div><FileText size={20} /><span>Accepted record</span></div>
        <h2>Clinical operations design system</h2>
        <dl>
          <div><dt>Commercial terms</dt><dd>₹5.6L fixed</dd></div>
          <div><dt>Proposal</dt><dd>Application v2</dd></div>
          <div><dt>Brief</dt><dd>Terms v3</dd></div>
          <div><dt>Status</dt><dd>{props.state.accepted ? "Confirmed" : "Preview"}</dd></div>
        </dl>
        <button onClick={() => props.onToast("Accepted scope opened")}>Read accepted scope <ArrowRight size={16} /></button>
      </aside>
    </main>
  );
}
