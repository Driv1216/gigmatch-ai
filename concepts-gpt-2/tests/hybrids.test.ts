import { describe, expect, it } from "vitest";
import { accordAlignment, accordDecision, proposalRedline } from "../src/concepts/accord/model";
import { atelierCoverage, atelierDepth, atelierTrail, unsupportedPromises } from "../src/concepts/atelier/model";
import { capacityConflict, deadlineOrder, harborActions, harborSchedule } from "../src/concepts/harbor/model";
import { changedFacets, evidenceRankUnaffectedByCommercial, indexApplicantRows } from "../src/concepts/index/model";
import { contactLineage, resolveVectorCommand, vectorSelectionPath } from "../src/concepts/vector/model";
import { INITIAL_STATE, workflowReducer } from "../src/domain/workflow";

describe("concepts 16–20 hybrid selectors", () => {
  it("orders Harbor actions by consequence and exposes credible schedule capacity", () => {
    expect(harborActions(INITIAL_STATE)[0].id).toBe("selection");
    expect(harborSchedule()).toHaveLength(4);
    expect(capacityConflict(28)).toEqual({ hours: 28, available: 32, buffer: 4, conflict: false });
    expect(capacityConflict(36).conflict).toBe(true);
    expect(deadlineOrder().map((gig) => gig.id)).toEqual(["common-ground", "ternary-clinical", "meridian-platform"]);
  });

  it("keeps Accord alignment, redlines, and exact-version reconciliation explicit", () => {
    expect(accordAlignment(["React", "Clinical trials"], ["React"])).toEqual([
      { requirement: "React", evidence: "React", state: "aligned" },
      { requirement: "Clinical trials", evidence: "No reviewed artifact", state: "gap" },
    ]);
    expect(proposalRedline(2).filter((line) => line.changed).map((line) => line.field)).toEqual(["Fixed proposal", "Workshops"]);
    expect(accordDecision(INITIAL_STATE)).toMatchObject({ questions: 0, reconciled: false });
    expect(accordDecision(workflowReducer(INITIAL_STATE, { type: "accept-selection" })).reconciled).toBe(true);
  });

  it("resolves Vector aliases safely and reflects broken, renewed, and contact paths", () => {
    expect(resolveVectorCommand("  OPEN   TERNARY ")).toMatchObject({ kind: "route", view: "gig", role: "freelancer" });
    expect(resolveVectorCommand("compare")).toMatchObject({ kind: "route", view: "review", role: "client" });
    expect(resolveVectorCommand("switch client")).toEqual({ kind: "role", role: "client" });
    expect(resolveVectorCommand("erase records")).toMatchObject({ kind: "invalid" });
    const revised = workflowReducer(INITIAL_STATE, { type: "submit-revision" });
    expect(vectorSelectionPath(revised)[2].state).toBe("broken");
    const renewed = workflowReducer(revised, { type: "send-selection", deadline: "72" });
    expect(vectorSelectionPath(renewed)[2].state).toBe("verified");
    expect(contactLineage({ contactShared: true, contactRevealed: false, contactRevoked: false })).toEqual([
      { label: "Consent", complete: true },
      { label: "Authorization", complete: true },
      { label: "Display", complete: false },
      { label: "Revocation", complete: false },
    ]);
  });

  it("keeps Atelier depth stable and blocks unsupported promises", () => {
    expect(atelierDepth("home")).toBe(0);
    expect(atelierDepth("selection")).toBe(4);
    expect(atelierTrail("engagement")).toEqual(["Market", "Brief", "Application", "Exact terms", "Engagement"]);
    expect(atelierCoverage(["React", "Clinical trials"])).toEqual([
      { requirement: "React", artifact: "Atlas Design System", room: "01", supported: true },
      { requirement: "Clinical trials", artifact: "No reviewed artifact", room: "05", supported: false },
    ]);
    expect(unsupportedPromises(["React", "Clinical trials"], ["React"])).toEqual(["Clinical trials"]);
  });

  it("keeps Index evidence rank independent from commercial sorting and marks changed facets", () => {
    expect(evidenceRankUnaffectedByCommercial()).toEqual(["kavya", "dev", "sana", "rohan"]);
    expect(indexApplicantRows("commercial").map((row) => row.id)).not.toEqual(evidenceRankUnaffectedByCommercial());
    expect(changedFacets(3).filter((facet) => facet.changed).map((facet) => facet.label)).toEqual([
      "Fixed proposal",
      "Workshops",
      "Application",
    ]);
  });
});
