import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  Clock,
  FileCheck2,
  Fingerprint,
  LockKeyhole,
  Menu,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import type { ConceptProps, ViewId } from "../types";
import afterdarkArchitect from "../assets/afterdark-architect.jpg";
import studioEngineer from "../assets/studio-engineer.jpg";

const freelancerNav: Array<[ViewId, string]> = [
  ["overview", "Private desk"],
  ["market", "Open briefs"],
  ["proposal", "Proposal"],
  ["applications", "Decisions"],
  ["engagement", "Engagement"],
];

const clientNav: Array<[ViewId, string]> = [
  ["overview", "Private desk"],
  ["review", "Talent dossiers"],
  ["engagement", "Engagement"],
];

export function Afterdark(props: ConceptProps) {
  const nav = props.role === "client" ? clientNav : freelancerNav;
  return (
    <div className="afterdark">
      <header className="afterdark-nav">
        <button className="afterdark-mark" onClick={() => props.onNavigate("overview")}>
          <span>G</span><i />M
        </button>
        <nav aria-label="Afterdark navigation">
          {nav.map(([view, label]) => (
            <button className={props.view === view ? "is-active" : ""} key={view} onClick={() => props.onNavigate(view)}>
              {label}
            </button>
          ))}
        </nav>
        <button className="afterdark-account">
          <span>{props.role === "client" ? "Northstar" : "Aisha Raman"}</span>
          <Circle size={8} fill="currentColor" />
          <Menu size={18} />
        </button>
      </header>

      {props.view === "overview" && <AfterdarkOverview {...props} />}
      {props.view === "market" && <AfterdarkMarket {...props} />}
      {props.view === "proposal" && <AfterdarkProposal {...props} />}
      {props.view === "applications" && <AfterdarkApplication {...props} />}
      {props.view === "review" && <AfterdarkReview {...props} />}
      {props.view === "engagement" && <AfterdarkEngagement {...props} />}
    </div>
  );
}

function AfterdarkOverview(props: ConceptProps) {
  const isClient = props.role === "client";
  return (
    <main className="afterdark-home">
      <img src={afterdarkArchitect} alt="Independent software architect working in a private studio after dusk" />
      <div className="afterdark-home__veil" />
      <section className="afterdark-home__copy">
        <span className="afterdark-eyebrow">GigMatch Private Network · 26 July</span>
        <h1>{isClient ? <>Exceptional work<br />begins with <em>discernment.</em></> : <>Your best work<br />should feel <em>chosen.</em></>}</h1>
        <p>
          {isClient
            ? "A considered network of senior independent people. Evidence before theatre. Terms before ambiguity."
            : "Serious briefs from teams who know what they need—and can explain why your practice matters."}
        </p>
        <button onClick={() => props.onNavigate(isClient ? "review" : "market")}>
          {isClient ? "Review the private list" : "Enter the open brief room"} <ArrowRight size={18} />
        </button>
      </section>
      <aside className="afterdark-home__decision">
        <div><span>Requires attention</span><strong>01</strong></div>
        <small>{isClient ? "Advanced applicant" : "Exact selection request"}</small>
        <h2>{isClient ? "Meera Shah" : "Northstar Health Systems"}</h2>
        <p>{props.activeGig.title}</p>
        <button onClick={() => props.onNavigate(isClient ? "review" : "applications")}>
          Open dossier <ArrowRight size={16} />
        </button>
      </aside>
    </main>
  );
}

function AfterdarkMarket(props: ConceptProps) {
  const activeIndex = props.gigs.findIndex((gig) => gig.id === props.activeGig.id);
  const previous = () => props.onSelectGig(props.gigs[(activeIndex + props.gigs.length - 1) % props.gigs.length].id);
  const next = () => props.onSelectGig(props.gigs[(activeIndex + 1) % props.gigs.length].id);

  return (
    <main className="afterdark-brief">
      <header>
        <span className="afterdark-eyebrow">Open briefs · Curated for Aisha</span>
        <p>0{activeIndex + 1} <i /> 0{props.gigs.length}</p>
      </header>
      <section className="afterdark-brief__stage">
        <div className="afterdark-brief__visual">
          <img src={afterdarkArchitect} alt="" />
          <div><span>{props.activeGig.match}%</span><small>practice alignment</small></div>
        </div>
        <article>
          <small>{props.activeGig.company} · {props.activeGig.category}</small>
          <h1>{props.activeGig.title}</h1>
          <p>{props.activeGig.summary}</p>
          <div className="afterdark-brief__facts">
            <span><small>Commercial</small><strong>{props.activeGig.budget}</strong></span>
            <span><small>Duration</small><strong>{props.activeGig.duration}</strong></span>
            <span><small>Commitment</small><strong>{props.activeGig.weeklyCommitment}</strong></span>
          </div>
          <blockquote>{props.activeGig.matchReason}</blockquote>
          <footer>
            <button onClick={() => props.onNavigate("proposal")}>Enter brief <ArrowRight size={17} /></button>
            <button onClick={() => props.onToast("Brief added to your private list")}><Plus size={17} /> Save</button>
          </footer>
        </article>
      </section>
      <nav className="afterdark-brief__pager" aria-label="Browse briefs">
        <button onClick={previous}><ArrowLeft size={18} /> Previous</button>
        <span>{props.gigs.map((gig) => <i className={gig.id === props.activeGig.id ? "is-active" : ""} key={gig.id} />)}</span>
        <button onClick={next}>Next <ArrowRight size={18} /></button>
      </nav>
    </main>
  );
}

function AfterdarkProposal(props: ConceptProps) {
  const [editing, setEditing] = useState(false);

  if (props.state.applied && !editing) {
    return (
      <main className="afterdark-complete">
        <Fingerprint size={34} />
        <span className="afterdark-eyebrow">Proposal recorded</span>
        <h1>Your position is<br /><em>clear.</em></h1>
        <p>Application version 2 is now part of the private Northstar dossier.</p>
        <div className="afterdark-complete__actions">
          <button onClick={() => props.onNavigate("applications")}>Open your decision room <ArrowRight size={17} /></button>
          <button onClick={() => setEditing(true)}>Draft proposal v3</button>
        </div>
      </main>
    );
  }

  return (
    <main className="afterdark-proposal">
      <aside>
        <span className="afterdark-eyebrow">Private proposal room</span>
        <h1>Clinical operations<br />design system</h1>
        <p>{props.activeGig.company}</p>
        <dl>
          <div><dt>Published range</dt><dd>{props.activeGig.budget}</dd></div>
          <div><dt>Working window</dt><dd>{props.activeGig.duration}</dd></div>
          <div><dt>Terms reference</dt><dd>Brief version 3</dd></div>
        </dl>
        <div><LockKeyhole size={15} /> Your next save creates a new official proposal version.</div>
      </aside>
      <form onSubmit={(event) => { event.preventDefault(); props.onApply(); setEditing(false); }}>
        <header><span>Application / 02</span><strong>Commercial response</strong></header>
        <label><span>Opening position</span><textarea defaultValue="I would begin with clinical workflow evidence, then consolidate the component layer around the decisions staff make most often." /></label>
        <div>
          <label><span>Exact fee</span><input defaultValue="₹5,60,000 fixed" /></label>
          <label><span>Working period</span><input defaultValue="14 weeks" /></label>
        </div>
        <label><span>Included work</span><textarea defaultValue={"Component inventory and migration map\nAccessible React component library\nTwo clinical workflow migrations\nAdoption documentation"} /></label>
        <footer><span>Draft saved 10:38 IST</span><button>Record proposal <ArrowRight size={17} /></button></footer>
      </form>
    </main>
  );
}

function AfterdarkApplication(props: ConceptProps) {
  return (
    <main className="afterdark-decision">
      <header>
        <span className="afterdark-eyebrow">Decision room · Northstar Health</span>
        <time>Expires 27 July · 10:42 IST</time>
      </header>
      <section>
        <div className="afterdark-decision__title">
          <small>Exact selection request</small>
          <h1>Northstar would like<br />to work <em>with you.</em></h1>
          <p>The request is bound to the unchanged proposal and brief shown here.</p>
        </div>
        <div className="afterdark-decision__terms">
          <span><small>Proposal</small><strong>₹5.6L fixed</strong><em>Application v2</em></span>
          <span><small>Delivery</small><strong>14 weeks</strong><em>From 10 August</em></span>
          <span><small>Brief</small><strong>Terms v3</strong><em>Material version</em></span>
        </div>
        <aside>
          <Clock size={19} />
          <strong>36 hours remain</strong>
          <p>The backend confirms authoritative status before any response is recorded.</p>
        </aside>
      </section>
      <footer>
        {props.state.accepted ? (
          <div><Check size={19} /><span><strong>Terms accepted</strong><small>Engagement record created</small></span></div>
        ) : (
          <>
            <button onClick={props.onAccept}>Accept exact terms <ArrowRight size={17} /></button>
            <button onClick={() => props.onToast("Decline and revision choices opened")}><ChevronDown size={17} /> Other responses</button>
          </>
        )}
      </footer>
    </main>
  );
}

function AfterdarkReview(props: ConceptProps) {
  const lead = props.applicants[0];
  return (
    <main className="afterdark-review">
      <header>
        <div><span className="afterdark-eyebrow">Northstar private list · 01 of 03</span><h1>A practice built for<br /><em>systems change.</em></h1></div>
        <nav><button aria-label="Previous applicant"><ArrowLeft size={18} /></button><button onClick={() => props.onToast("Next dossier: Arjun Rao")} aria-label="Next applicant"><ArrowRight size={18} /></button></nav>
      </header>
      <section className="afterdark-dossier">
        <div className="afterdark-dossier__portrait"><img src={studioEngineer} alt={`Portrait of ${lead.name} in her studio`} /><span>{lead.initials}</span></div>
        <article>
          <span className="afterdark-eyebrow">{lead.headline}</span>
          <h2>{lead.name}</h2>
          <p>{lead.coverNote}</p>
          <blockquote>“The system is only successful when the product teams can confidently extend it.”</blockquote>
          <div className="afterdark-dossier__evidence">
            {lead.skills.map((skill, index) => <span key={skill}><i>0{index + 1}</i>{skill}</span>)}
          </div>
          <small>Consideration · {lead.gap}</small>
        </article>
        <aside>
          <div className="afterdark-dossier__score"><strong>{lead.match}</strong><span>%</span><small>Evidence alignment</small></div>
          <dl>
            <div><dt>Proposal</dt><dd>{lead.proposal}</dd></div>
            <div><dt>Timeline</dt><dd>{lead.timeline}</dd></div>
            <div><dt>Available</dt><dd>10 August</dd></div>
            <div><dt>Record</dt><dd>Version {lead.version}</dd></div>
          </dl>
          <button className={props.state.shortlisted ? "is-active" : ""} onClick={props.onShortlist}>
            {props.state.shortlisted ? "Private list ✓" : "Add to private list"}
          </button>
          <button className={props.state.advanced ? "is-active" : ""} onClick={props.onAdvance}>
            {props.state.advanced ? "Advanced ✓" : "Advance candidate"}
          </button>
          <button disabled={!props.state.advanced} onClick={props.onSendSelection}>Issue exact offer <ArrowRight size={16} /></button>
        </aside>
      </section>
    </main>
  );
}

function AfterdarkEngagement(props: ConceptProps) {
  return (
    <main className="afterdark-engagement">
      <section className="afterdark-engagement__hero">
        <img src={afterdarkArchitect} alt="" />
        <div />
        <article>
          <ShieldCheck size={28} />
          <span className="afterdark-eyebrow">{props.state.accepted ? "Confirmed engagement" : "Engagement preview"}</span>
          <h1>Northstar<br /><em>×</em> Aisha</h1>
          <p>Clinical operations design system</p>
        </article>
      </section>
      <section className="afterdark-engagement__record">
        <header><FileCheck2 size={20} /><span>Immutable accepted record</span><strong>GM-E-2048</strong></header>
        <dl>
          <div><dt>Commercial</dt><dd>₹5.6L fixed</dd></div>
          <div><dt>Duration</dt><dd>14 weeks</dd></div>
          <div><dt>Application</dt><dd>Version 2</dd></div>
          <div><dt>Gig terms</dt><dd>Version 3</dd></div>
        </dl>
        <button onClick={() => props.onToast("Accepted scope opened")}>Read the accepted scope <ArrowRight size={16} /></button>
      </section>
    </main>
  );
}
