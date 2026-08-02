import { describe, expect, it } from "vitest";
import { INITIAL_STATE, workflowReducer } from "../src/domain/workflow";

describe("shared marketplace workflow", () => {
  it("invalidates an active selection when a new proposal version is recorded", () => {
    const next = workflowReducer(INITIAL_STATE, { type: "submit-revision" });
    expect(next.applicationVersion).toBe(3);
    expect(next.selectionStatus).toBe("invalidated");
    expect(next.applicationStage).toBe("Advanced");
  });

  it("requires a fresh exact-version request after invalidation", () => {
    const revised = workflowReducer(INITIAL_STATE, { type: "submit-revision" });
    const selected = workflowReducer(revised, { type: "send-selection", deadline: "72" });
    expect(selected.selectionStatus).toBe("pending");
    expect(selected.selectionDeadline).toBe("72");
    expect(selected.applicationStage).toBe("Selection pending");
    expect(selected.activity[0].detail).toContain("Application v3");
  });

  it("accepts only an effective selection and confirms the engagement", () => {
    const accepted = workflowReducer(INITIAL_STATE, { type: "accept-selection" });
    expect(accepted.selectionStatus).toBe("accepted");
    expect(accepted.applicationStage).toBe("Confirmed");
    expect(accepted.engagementStatus).toBe("confirmed");

    const invalid = workflowReducer(INITIAL_STATE, { type: "submit-revision" });
    const rejected = workflowReducer(invalid, { type: "accept-selection" });
    expect(rejected.selectionStatus).toBe("invalidated");
    expect(rejected.applicationStage).toBe("Advanced");
  });

  it("keeps contact values masked until active consent and reveal", () => {
    const shared = workflowReducer(INITIAL_STATE, { type: "share-contact" });
    expect(shared.contactShared).toBe(true);
    expect(shared.contactRevealed).toBe(false);

    const revealed = workflowReducer(shared, { type: "reveal-contact" });
    expect(revealed.contactRevealed).toBe(true);

    const revoked = workflowReducer(revealed, { type: "revoke-contact" });
    expect(revoked.contactRevoked).toBe(true);
    expect(revoked.contactRevealed).toBe(false);

    const denied = workflowReducer(revoked, { type: "reveal-contact" });
    expect(denied.contactRevealed).toBe(false);
  });
});
