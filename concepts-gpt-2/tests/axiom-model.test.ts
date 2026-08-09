import { describe, expect, it } from "vitest";
import { createAxiomSceneDescriptor } from "../src/concepts/axiom/model";
import { stateForPreset } from "../src/domain/workflow";

describe("Axiom deterministic scene descriptor", () => {
  it("maps routes to stable spatial phases and role-specific cameras", () => {
    const state = stateForPreset("baseline");
    expect(createAxiomSceneDescriptor(state, "discover", "freelancer")).toMatchObject({ phase: "market", phaseIndex: 0, camera: [-1.25, .45, 8.15] });
    expect(createAxiomSceneDescriptor(state, "candidate", "client")).toMatchObject({ phase: "evidence", phaseIndex: 1, camera: [2.4, .5, 7.2] });
    expect(createAxiomSceneDescriptor(state, "proposal", "freelancer")).toMatchObject({ phase: "promise", phaseIndex: 2 });
    expect(createAxiomSceneDescriptor(state, "selection", "client")).toMatchObject({ phase: "authority", phaseIndex: 3 });
    expect(createAxiomSceneDescriptor(state, "engagement", "client")).toMatchObject({ phase: "work", phaseIndex: 4 });
  });

  it("maps baseline and revision presets to aligned pending authority", () => {
    for (const preset of ["baseline", "revision"] as const) {
      expect(createAxiomSceneDescriptor(stateForPreset(preset), "selection", "freelancer")).toMatchObject({
        authorityStatus: "pending",
        authorityOffset: 0,
        authorityOpacity: 1,
        accent: "cyan",
      });
    }
  });

  it("separates invalidated and expired source rings", () => {
    expect(createAxiomSceneDescriptor(stateForPreset("invalidated"), "selection", "client")).toMatchObject({
      authorityStatus: "invalidated",
      authorityOffset: .48,
      accent: "coral",
      versionShells: 3,
    });
    expect(createAxiomSceneDescriptor(stateForPreset("expired"), "selection", "client")).toMatchObject({
      authorityStatus: "expired",
      authorityOffset: .48,
      authorityOpacity: .24,
      accent: "coral",
    });
  });

  it("closes accepted authority into an engagement core and maps permissions", () => {
    const engaged = stateForPreset("engaged");
    const accepted = createAxiomSceneDescriptor(engaged, "engagement", "freelancer");
    expect(accepted).toMatchObject({ authorityStatus: "accepted", engagementClosure: 1, accent: "cyan", permissionMarkers: 0 });

    const revealed = createAxiomSceneDescriptor({
      ...engaged,
      contactPermission: { ...engaged.contactPermission, consentActive: true, revealed: true },
    }, "engagement", "client");
    expect(revealed.permissionMarkers).toBe(2);

    const revoked = createAxiomSceneDescriptor({
      ...engaged,
      contactPermission: { ...engaged.contactPermission, consentActive: false, revealed: false, revoked: true },
    }, "engagement", "client");
    expect(revoked.permissionMarkers).toBe(3);
  });

  it("clamps focused records and maps verified evidence facets", () => {
    const descriptor = createAxiomSceneDescriptor(stateForPreset("baseline"), "review", "client", 99);
    expect(descriptor.focusedRecord).toBe(3);
    expect(descriptor.evidenceFit).toBe(79);
    expect(descriptor.verifiedFacets).toBeGreaterThanOrEqual(3);
    expect(descriptor.gapFacets).toBe(1);
  });
});
