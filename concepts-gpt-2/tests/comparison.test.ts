import { describe, expect, it } from "vitest";
import { alignmentStates, applicantFacet, opportunityFacet, scheduleLoad, semanticDepth, workflowBand } from "../src/domain/comparison";

describe("expansion concept selectors", () => {
  it("derives the normalized Tempo phase load", () => {
    expect(scheduleLoad()).toBe(104);
  });

  it("keeps mirrored matches and gaps explicit", () => {
    expect(alignmentStates(["React", "WCAG 2.2", "Clinical trials"], ["React", "WCAG 2.2"])).toEqual([
      { requirement: "React", state: "matched" },
      { requirement: "WCAG 2.2", state: "matched" },
      { requirement: "Clinical trials", state: "gap" },
    ]);
  });

  it("provides stable semantic depths for direct routes", () => {
    expect(semanticDepth("home")).toBe(0);
    expect(semanticDepth("candidate")).toBe(2);
    expect(semanticDepth("selection")).toBe(4);
    expect(semanticDepth("engagement")).toBe(5);
  });

  it("normalizes comparable applicant and opportunity facets", () => {
    expect(opportunityFacet("ternary-clinical", "proposal")).toContain("₹5.2L");
    expect(applicantFacet("kavya", "proposal")).toContain("₹5.8L");
    expect(applicantFacet("kavya", "required")).toContain("92/100");
  });

  it("maps route transitions to the five Fold workspaces", () => {
    expect(workflowBand("gig")).toBe("find");
    expect(workflowBand("proposal")).toBe("propose");
    expect(workflowBand("candidate")).toBe("review");
    expect(workflowBand("selection")).toBe("confirm");
    expect(workflowBand("engagement")).toBe("work");
  });
});
