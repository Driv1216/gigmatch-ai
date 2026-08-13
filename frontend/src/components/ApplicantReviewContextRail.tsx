import { Link } from "react-router-dom";

type ApplicantReviewContextRailProps = {
  gigTitle: string;
  gigState: string;
  applicantName?: string;
  applicationStage?: string;
  applicationVersion?: number;
  shortlisted?: boolean;
  returnTo: string;
  returnLabel: string;
};

export function ApplicantReviewContextRail({
  gigTitle,
  gigState,
  applicantName,
  applicationStage,
  applicationVersion,
  shortlisted,
  returnTo,
  returnLabel,
}: ApplicantReviewContextRailProps) {
  return (
    <aside className="applicant-review-context" aria-label="Current applicant review context">
      <div className="applicant-review-context-record">
        <span>{applicantName ? "Current applicant" : "Current owned gig"}</span>
        <strong>{applicantName ?? gigTitle}</strong>
        {applicantName ? <small>{gigTitle}</small> : null}
      </div>
      <dl>
        <Fact label="Gig state" value={gigState} />
        {applicationStage ? <Fact label="Application stage" value={applicationStage} /> : null}
        {applicationVersion ? <Fact label="Current proposal" value={`Application v${applicationVersion}`} /> : null}
        {shortlisted !== undefined ? <Fact label="Private shortlist" value={shortlisted ? "Included" : "Not included"} /> : null}
      </dl>
      <Link to={returnTo}>{returnLabel}</Link>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value.replace(/_/g, " ")}</dd></div>;
}
