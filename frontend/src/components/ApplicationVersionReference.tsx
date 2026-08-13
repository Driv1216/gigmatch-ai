type ApplicationVersionReferenceProps = {
  applicationVersion: number;
  proposalContractVersion: number | null;
  answeredGigVersion: number;
  currentMaterialGigVersion?: number;
};

export function ApplicationVersionReference({
  applicationVersion,
  proposalContractVersion,
  answeredGigVersion,
  currentMaterialGigVersion,
}: ApplicationVersionReferenceProps) {
  const responseRequired = currentMaterialGigVersion !== undefined
    && answeredGigVersion !== currentMaterialGigVersion;

  return (
    <section className="application-version-reference" aria-label="Application version reference">
      <div>
        <span>Proposal history</span>
        <strong>Application v{applicationVersion}</strong>
        <small>Immutable record ordinal</small>
      </div>
      <div>
        <span>Proposal schema</span>
        <strong>{proposalContractVersion ? `Contract ${proposalContractVersion}` : "Not reported"}</strong>
        <small>Snapshot contract version</small>
      </div>
      <div>
        <span>Answered gig history</span>
        <strong>Gig v{answeredGigVersion}</strong>
        <small>Terms this proposal answered</small>
      </div>
      {currentMaterialGigVersion !== undefined ? (
        <div className={responseRequired ? "is-attention" : undefined}>
          <span>Current material terms</span>
          <strong>Gig v{currentMaterialGigVersion}</strong>
          <small>{responseRequired ? "Review required" : "Binding is current"}</small>
        </div>
      ) : null}
    </section>
  );
}
