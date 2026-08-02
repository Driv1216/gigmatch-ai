import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";
import { WorkflowProvider } from "../src/domain/WorkflowProvider";

const cases = [
  ["/northline/freelancer/home", "Freelancer workspace"],
  ["/northline/client/review", "Review evidence in context."],
  ["/covenant/freelancer/discover", "Work worth examining"],
  ["/covenant/client/candidate", "Kavya Menon"],
  ["/waypoint/freelancer/gig", "THE OUTCOME"],
  ["/waypoint/client/review", "Four people."],
  ["/relay/freelancer/applications", "Application protocol"],
  ["/relay/client/candidate", "Applicant packet AP.001"],
  ["/monument/freelancer/discover", "THREE BRIEFS."],
  ["/monument/client/selection", "THIS."],
  ["/tempo/freelancer/discover", "What fits next?"],
  ["/tempo/client/candidate", "Kavya Menon"],
  ["/duet/freelancer/proposal", "Put your answer beside"],
  ["/duet/client/review", "Keep the requirement fixed"],
  ["/aperture/freelancer/discover", "Move the field"],
  ["/aperture/client/candidate", "Kavya Menon"],
  ["/facet/freelancer/applications", "complete record"],
  ["/facet/client/review", "Compare evidence"],
  ["/fold/freelancer/gig", "Senior Frontend Systems Engineer"],
  ["/fold/client/review", "Four proposals"],
  ["/tally/freelancer/proposal", "Allocate the promise precisely"],
  ["/tally/client/review", "Coverage first"],
  ["/lane/freelancer/discover", "Three briefs"],
  ["/lane/client/candidate", "Kavya Menon"],
  ["/command/freelancer/gig", "Senior Frontend Systems Engineer"],
  ["/command/client/review", "Applicant result set"],
  ["/proofroom/freelancer/discover", "Begin with the requirement label"],
  ["/proofroom/client/candidate", "Kavya Menon"],
  ["/trace/freelancer/applications", "Every version remains attributable"],
  ["/trace/client/selection", "Every source required"],
  ["/harbor/freelancer/discover", "What can fit next?"],
  ["/harbor/client/candidate", "Strong evidence. Credible capacity."],
  ["/accord/freelancer/applications", "complete specialist position"],
  ["/accord/client/selection", "confirmation instrument"],
  ["/vector/freelancer/proposal", "Change the source"],
  ["/vector/client/review", "Four records. No inferred claims."],
  ["/atelier/freelancer/gig", "Senior Frontend Systems Engineer"],
  ["/atelier/client/candidate", "Five rooms. One honest absence."],
  ["/index/freelancer/applications", "THE COMPLETE RECORD."],
  ["/index/client/review", "COMPARE EVIDENCE"],
  ["/bench/freelancer/home", "Reviewed evidence against this brief"],
  ["/bench/client/review", "Kavya Menon"],
  ["/measure/freelancer/proposal", "The promise must fit the week"],
  ["/measure/client/review", "The delivery plan must fit"],
  ["/crosscheck/freelancer/applications", "Application v2"],
  ["/crosscheck/client/selection", "EXACT INTERSECTION"],
  ["/orbit/freelancer/discover", "Ternary Health"],
  ["/orbit/client/selection", "QUIET AUTHORITY"],
  ["/weave/freelancer/applications", "APPLICATION v2"],
  ["/weave/client/selection", "EXACT AUTHORITY"],
  ["/current/freelancer/proposal", "Shape the exact promise"],
  ["/current/client/selection", "EXACT CONFIRMATION"],
] as const;

describe("concept route coverage", () => {
  it.each(cases)("renders %s", async (path, expected) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <WorkflowProvider>
          <App />
        </WorkflowProvider>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText(expected, { exact: false })).length).toBeGreaterThan(0);
  });
});
