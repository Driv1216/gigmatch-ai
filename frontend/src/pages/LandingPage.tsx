import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole } from "../lib/auth";

const workflowLanes = [
  {
    index: "01",
    label: "Source",
    title: "Reviewed participant input",
    copy: "Structured profiles, reviewed resume input, and client-owned briefs keep matching tied to visible source material.",
    tone: "bone",
  },
  {
    index: "02",
    label: "Match",
    title: "Evidence before ranking",
    copy: "Keyword, semantic, or hybrid ranking can expose skills and gaps, with honest fallback when semantic matching is unavailable.",
    tone: "glass",
  },
  {
    index: "03",
    label: "Apply",
    title: "Proposals keep their version",
    copy: "Exact proposal and gig versions remain attached so selection reflects the terms actually reviewed.",
    tone: "bone",
  },
  {
    index: "04",
    label: "Engage",
    title: "Contact follows consent",
    copy: "Accepted terms open an Engagement Workspace while contact sharing remains method-specific, consent-based, and revocable.",
    tone: "coral",
  },
] as const;

export function LandingPage() {
  const [openLane, setOpenLane] = useState<string | null>(null);
  const navigate = useNavigate();
  const { profile, role, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

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
            {profile && role ? (
              <>
                <Link className="switchboard-public-action is-primary" to={dashboardPathForRole(role)}>Open {role} dashboard <span aria-hidden="true">→</span></Link>
                <button className="switchboard-public-action" type="button" onClick={handleLogout}>Logout {profile.full_name || profile.email} <span aria-hidden="true">↗</span></button>
              </>
            ) : (
              <>
                <Link className="switchboard-public-action is-primary" to="/signup">Join as a freelancer or client <span aria-hidden="true">→</span></Link>
                <Link className="switchboard-public-action" to="/login">Use an existing account <span aria-hidden="true">↗</span></Link>
              </>
            )}
          </div>
          <p className="switchboard-landing-boundary">
            Public entry only. Marketplace discovery and participant workflow data require an account.
          </p>
        </div>

        <div
          className={`switchboard-landing-lanes${openLane ? " has-open-lane" : ""}`}
          aria-label="GigMatch workflow"
        >
          {workflowLanes.map((lane) => {
            const laneId = lane.label.toLowerCase();
            const isOpen = openLane === laneId;
            const triggerId = `landing-lane-${laneId}-trigger`;
            const panelId = `landing-lane-${laneId}-panel`;

            return (
              <article key={lane.index} className={`is-${lane.tone}${isOpen ? " is-open" : ""}`}>
                <button
                  id={triggerId}
                  type="button"
                  className="switchboard-landing-lane-trigger"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenLane((current) => current === laneId ? null : laneId)}
                >
                  <span>{lane.index}</span>
                  <span>
                    <small>{lane.label}</small>
                    <strong>{lane.title}</strong>
                  </span>
                  <i aria-hidden="true" />
                </button>
                <div
                  id={panelId}
                  className="switchboard-landing-lane-panel"
                  role="region"
                  aria-labelledby={triggerId}
                  aria-hidden={!isOpen}
                >
                  <div>
                    <p>{lane.copy}</p>
                  </div>
                </div>
              </article>
            );
          })}
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
