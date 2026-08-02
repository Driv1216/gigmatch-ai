import { describe, expect, it } from "vitest";
import { artifactCoverage, EVIDENCE_ARTIFACTS, laneForState, QUOTE_LINES, quoteTotal, resolveCommand, selectionTrace } from "../src/domain/expansion";
import { INITIAL_STATE, workflowReducer } from "../src/domain/workflow";

describe("concepts 11–15 domain selectors", () => {
  it("totals Tally scope lines without affecting evidence values", () => {
    expect(quoteTotal()).toBe(580000);
    expect(quoteTotal(QUOTE_LINES.slice(0, 2))).toBe(250000);
    expect(INITIAL_STATE.applicationVersion).toBe(2);
  });

  it("places Lane records according to consequential workflow state", () => {
    expect(laneForState(INITIAL_STATE)).toBe("confirm");
    const revised=workflowReducer(INITIAL_STATE,{type:"submit-revision"});
    expect(laneForState(revised)).toBe("review");
    const renewed=workflowReducer(revised,{type:"send-selection",deadline:"48"});
    expect(laneForState(renewed)).toBe("confirm");
    const accepted=workflowReducer(renewed,{type:"accept-selection"});
    expect(laneForState(accepted)).toBe("work");
  });

  it("resolves Command routes, roles, reset, aliases, and invalid input safely", () => {
    expect(resolveCommand("  Compare   Applicants ")).toMatchObject({kind:"route",view:"review",role:"client"});
    expect(resolveCommand("switch client")).toEqual({kind:"role",role:"client"});
    expect(resolveCommand("reset")).toEqual({kind:"reset"});
    expect(resolveCommand("reset scenario")).toEqual({kind:"reset"});
    expect(resolveCommand("delete everything")).toMatchObject({kind:"invalid"});
  });

  it("maps Proofroom artifacts to required evidence and preserves gaps", () => {
    const coverage=artifactCoverage(["React","TypeScript","Design systems","WCAG 2.2","Clinical trials"]);
    expect(coverage.filter(item=>item.covered)).toHaveLength(4);
    expect(coverage.at(-1)).toEqual({skill:"Clinical trials",artifact:null,covered:false});
    expect(EVIDENCE_ARTIFACTS.find(item=>item.id==="gap")?.proves).toHaveLength(0);
  });

  it("shows Trace selection lineage breaking and renewing atomically", () => {
    expect(selectionTrace(2,"pending")[2]).toMatchObject({value:"pending",state:"effective"});
    expect(selectionTrace(3,"invalidated")[2]).toMatchObject({value:"invalidated",state:"broken"});
    expect(selectionTrace(3,"accepted")[3]).toMatchObject({value:"created",state:"effective"});
  });
});
