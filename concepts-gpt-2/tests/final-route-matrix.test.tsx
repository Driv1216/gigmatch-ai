import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";
import { WorkflowProvider } from "../src/domain/WorkflowProvider";
import { FINAL_VIEWS } from "../src/domain/final-collection";
import type { Role } from "../src/domain/types";

const concepts = [
  "bench",
  "measure",
  "crosscheck",
  "orbit",
  "weave",
  "current",
] as const;

const routeMatrix = concepts.flatMap((concept) =>
  (Object.entries(FINAL_VIEWS) as [Role, (typeof FINAL_VIEWS)[Role]][]).flatMap(
    ([role, views]) =>
      views.map((view) => ({
        path: `/${concept}/${role}/${view}`,
        concept,
      })),
  ),
);

describe("final collection complete route matrix", () => {
  it.each(routeMatrix)("renders $path inside the $concept interface", async ({ path }) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <WorkflowProvider>
          <App />
        </WorkflowProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
