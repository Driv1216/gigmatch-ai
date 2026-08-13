type GigVersionReferenceProps = {
  displayVersion: number;
  materialVersion: number;
  contractVersion: number;
  latestChangedFields?: string[];
};

export function GigVersionReference({
  displayVersion,
  materialVersion,
  contractVersion,
  latestChangedFields = [],
}: GigVersionReferenceProps) {
  const displayOnly = displayVersion !== materialVersion;

  return (
    <section className="gig-version-reference" aria-label="Gig version reference">
      <div>
        <span>Display version</span>
        <strong>v{displayVersion}</strong>
        <small>{displayOnly ? "Current wording and presentation" : "Current published record"}</small>
      </div>
      <div>
        <span>Material terms</span>
        <strong>v{materialVersion}</strong>
        <small>{displayOnly ? "Applicant-relevant contract remains here" : "Matches the display version"}</small>
      </div>
      <div>
        <span>Terms contract</span>
        <strong>{contractVersion === 0 ? "Legacy" : `Contract ${contractVersion}`}</strong>
        <small>{contractVersion === 0 ? "Manual upgrade required" : "Supported schema"}</small>
      </div>
      {latestChangedFields.length > 0 ? (
        <p><span>Latest material scope</span>{latestChangedFields.map(formatCode).join(" · ")}</p>
      ) : null}
    </section>
  );
}

function formatCode(value: string) {
  return value.replace(/_/g, " ");
}
