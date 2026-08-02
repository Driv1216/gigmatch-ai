import { describe, expect, it } from "vitest";
import {
  CROSSCHECK_REQUIREMENTS,
  benchQueue,
  crosscheckPoint,
  currentChannel,
  evidenceRanking,
  measurePlan,
  orbitDepthForView,
  weaveJunctions,
} from "../src/domain/final-collection";
import { INITIAL_STATE, normalizeWorkflowState, stateForPreset, workflowReducer } from "../src/domain/workflow";

describe("final collection shared model", () => {
  it("migrates legacy flat state without losing the saved version", () => {
    const restored = normalizeWorkflowState({
      role: "client",
      applicationVersion: 4,
      selectionStatus: "pending",
      selectionDeadline: "72",
      contactShared: true,
    });
    expect(restored.schemaVersion).toBe(2);
    expect(restored.applicationVersion).toBe(4);
    expect(restored.selectionRequest).toMatchObject({ applicationVersion: 4, deadlineHours: "72", gigVersion: 3 });
    expect(restored.contactPermission.consentActive).toBe(true);
  });

  it("ranks evidence independently from proposal price", () => {
    const ranking = evidenceRanking();
    expect(ranking.map((item) => item.id)).toEqual(["kavya", "dev", "sana", "rohan"]);
    expect(ranking[0].proposal).toBe("₹5.8L fixed");
    expect(ranking[3].proposal).toBe("₹4.9L fixed");
  });

  it("expires authority deterministically and refuses acceptance", () => {
    const expired = workflowReducer(INITIAL_STATE, { type: "expire-selection" });
    expect(expired.selectionRequest?.status).toBe("expired");
    expect(expired.selectionStatus).toBe("invalidated");
    const refused = workflowReducer(expired, { type: "accept-selection" });
    expect(refused.gigStatus).toBe("open");
    expect(refused.engagement).toBeNull();
  });

  it("creates exact deterministic 24/48/72-hour requests", () => {
    for (const deadline of ["24", "48", "72"] as const) {
      const selected = workflowReducer(INITIAL_STATE, { type: "send-selection", deadline });
      const request = selected.selectionRequest;
      expect(request).not.toBeNull();
      expect(request?.deadlineHours).toBe(deadline);
      expect(
        (Date.parse(request!.expiresAt) - Date.parse(request!.requestedAt)) /
          (60 * 60 * 1000),
      ).toBe(Number(deadline));
    }
  });

  it("rejects stale, mismatched, and elapsed pending authority", () => {
    const invalidated = workflowReducer(INITIAL_STATE, { type: "submit-revision" });
    expect(workflowReducer(invalidated, { type: "accept-selection" }).engagement).toBeNull();

    const mismatched = {
      ...INITIAL_STATE,
      selectedApplicationId: "application-dev",
    };
    expect(workflowReducer(mismatched, { type: "accept-selection" }).engagement).toBeNull();

    const elapsed = {
      ...INITIAL_STATE,
      selectionRequest: {
        ...INITIAL_STATE.selectionRequest!,
        status: "pending" as const,
        expiresAt: "2026-07-27T15:00:00.000Z",
      },
    };
    expect(workflowReducer(elapsed, { type: "accept-selection" }).engagement).toBeNull();
  });

  it("accepts the latest exact request atomically", () => {
    const revised = workflowReducer(INITIAL_STATE, { type: "submit-revision" });
    const renewed = workflowReducer(revised, { type: "send-selection", deadline: "24" });
    const accepted = workflowReducer(renewed, { type: "accept-selection" });
    expect(accepted.gigStatus).toBe("filled");
    expect(accepted.selectionRequest).toMatchObject({ status: "accepted", applicationVersion: 3, deadlineHours: "24" });
    expect(accepted.engagement).toMatchObject({ gigVersion: 3, applicationVersion: 3, proposal: "₹5.8L fixed" });
    expect(accepted.applicantOutcomes).toEqual({
      "application-kavya": "confirmed",
      "application-dev": "not_selected",
      "application-sana": "not_selected",
      "application-rohan": "not_selected",
    });
  });

  it("keeps engagement source versions immutable after acceptance", () => {
    const accepted = workflowReducer(INITIAL_STATE, { type: "accept-selection" });
    const source = accepted.engagement;
    const laterState = workflowReducer(accepted, { type: "submit-revision" });
    expect(laterState.engagement).toEqual(source);
    expect(laterState.engagement).toMatchObject({
      gigVersion: 3,
      applicationVersion: 2,
    });
  });

  it("records consent, authorization, reveal, and revocation lineage", () => {
    const accepted = workflowReducer(INITIAL_STATE, { type: "accept-selection" });
    const shared = workflowReducer(accepted, { type: "share-contact" });
    const revealed = workflowReducer(shared, { type: "reveal-contact" });
    const revoked = workflowReducer(revealed, { type: "revoke-contact" });
    expect(revealed.contactPermission.events.slice(0, 3).map((event) => event.kind)).toEqual(["reveal", "authorization", "consent"]);
    expect(revoked.contactPermission).toMatchObject({ consentActive: false, revealed: false, revoked: true });
    expect(revoked.contactPermission.events[0].kind).toBe("revocation");
  });

  it("provides deterministic presets for visual comparison", () => {
    expect(stateForPreset("invalidated").selectionRequest?.status).toBe("invalidated");
    expect(stateForPreset("expired").selectionRequest?.status).toBe("expired");
    expect(stateForPreset("engaged").engagement?.applicationVersion).toBe(2);
  });
});

describe("six native operating models", () => {
  it("prioritizes the actionable record on Bench", () => {
    const queue = benchQueue("freelancer", INITIAL_STATE);
    expect(queue[0]).toMatchObject({ label: "Ternary Health", priority: "Decision due" });
  });

  it("derives Measure totals and capacity conflicts", () => {
    expect(measurePlan(28)).toMatchObject({ amount: 5.8, totalWeeks: 14, conflict: false });
    expect(measurePlan(24)).toMatchObject({ conflict: true, conflictMessage: "Delivery extends beyond 14 weeks" });
    expect(measurePlan(32)).toMatchObject({ conflict: true, conflictMessage: "Exceeds stated weekly availability" });
  });

  it("resolves Crosscheck requirement, version, and authority together", () => {
    const current = crosscheckPoint(0, 2, INITIAL_STATE);
    expect(current).toMatchObject({ effective: true, authority: "pending" });
    expect(current.requirement).toBe(CROSSCHECK_REQUIREMENTS[0]);
    const old = crosscheckPoint(3, 1, INITIAL_STATE);
    expect(old).toMatchObject({ effective: false, authority: "superseded" });
    expect(old.requirement.status).toBe("gap");
  });

  it("maps Orbit routes into safe semantic depth", () => {
    expect(orbitDepthForView("home")).toBe(0);
    expect(orbitDepthForView("proposal")).toBe(2);
    expect(orbitDepthForView("selection")).toBe(3);
    expect(orbitDepthForView("engagement")).toBe(4);
  });

  it("breaks and renews the Weave authority junction", () => {
    const invalid = workflowReducer(INITIAL_STATE, { type: "submit-revision" });
    expect(weaveJunctions(invalid)[2]).toMatchObject({ id: "authority", state: "invalidated" });
    const renewed = workflowReducer(invalid, { type: "send-selection", deadline: "48" });
    expect(weaveJunctions(renewed)[2]).toMatchObject({ state: "pending" });
  });

  it("moves Current through revision, confirm, and work", () => {
    const invalid = workflowReducer(INITIAL_STATE, { type: "submit-revision" });
    expect(currentChannel(invalid)).toBe("revision");
    const renewed = workflowReducer(invalid, { type: "send-selection", deadline: "48" });
    expect(currentChannel(renewed)).toBe("confirm");
    const accepted = workflowReducer(renewed, { type: "accept-selection" });
    expect(currentChannel(accepted)).toBe("work");
  });
});
