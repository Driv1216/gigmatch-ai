import { Link } from "react-router-dom";

const workflowLanes = [
  {
    index: "01",
    label: "Source",
    title: "Reviewed participant input",
    copy: "Structured profiles, reviewed resume extraction, and client-owned gig briefs make the source of each match visible.",
    tone: "bone",
  },
  {
    index: "02",
    label: "Match",
    title: "Evidence before ranking",
    copy: "Keyword, semantic, and hybrid matching can explain shared skills and gaps, with honest fallback when a ranking mode is unavailable.",
    tone: "glass",
  },
  {
    index: "03",
    label: "Apply",
    title: "Proposals keep their version",
    copy: "Structured applications and client review preserve the exact gig and proposal versions behind a selection decision.",
    tone: "bone",
  },
  {
    index: "04",
    label: "Engage",
    title: "Contact follows consent",
    copy: "Accepted terms continue into an Engagement Workspace, where Secure Contact Exchange remains consent-based and revocable.",
    tone: "coral",
  },
] as const;

export function LandingPage() {
  return (
    <div className="switchboard-landing">
      <section className="switchboard-landing-hero" aria-labelledby="landing-title">
        <div className="switchboard-landing-copy">
          <span className="switchboard-public-eyebrow">TECH GIGS / STRUCTURED AUTHORITY</span>
          <h1 id="landing-title">Match the work.<br />Keep the evidence.</h1>
          <p>
            GigMatch connects freelancers and clients through reviewed inputs, explainable matching,
            structured applications, and version-bound selection.
          </p>
          <div className="switchboard-public-actions">
            <Link className="switchboard-public-action is-primary" to="/signup">
              Join as a freelancer or client <span aria-hidden="true">→</span>
            </Link>
            <Link className="switchboard-public-action" to="/login">
              Use an existing account <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <p className="switchboard-landing-boundary">
            Public entry only. Marketplace discovery and participant workflow data require an account.
          </p>
        </div>

        <div className="switchboard-landing-lanes" aria-label="GigMatch workflow">
          {workflowLanes.map((lane) => (
            <article key={lane.index} className={`is-${lane.tone}`}>
              <span>{lane.index}</span>
              <div>
                <small>{lane.label}</small>
                <h2>{lane.title}</h2>
                <p>{lane.copy}</p>
              </div>
              <b aria-hidden="true">↗</b>
            </article>
          ))}
        </div>
      </section>

      <section className="switchboard-landing-register" aria-labelledby="register-title">
        <header>
          <span className="switchboard-public-eyebrow">SOURCE → ACTION → CONSEQUENCE</span>
          <h2 id="register-title">A marketplace workflow with its decisions attached.</h2>
        </header>
        <div>
          <article>
            <span>FREELANCER</span>
            <h3>Build a reviewed work source.</h3>
            <p>Maintain a structured profile, review extracted resume details, discover tech gigs, and submit proposals with explicit scope and terms.</p>
          </article>
          <article>
            <span>CLIENT</span>
            <h3>Move from brief to selection.</h3>
            <p>Create and review gig input, compare applicants with matching evidence, and send a selection bound to the exact reviewed versions.</p>
          </article>
          <article>
            <span>TOGETHER</span>
            <h3>Continue with controlled access.</h3>
            <p>Use the Engagement Workspace for accepted terms and lifecycle context, then exchange contact details only through participant consent.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
