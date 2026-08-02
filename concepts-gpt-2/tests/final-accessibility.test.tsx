import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";
import { WorkflowProvider } from "../src/domain/WorkflowProvider";

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WorkflowProvider>
        <App />
      </WorkflowProvider>
    </MemoryRouter>,
  );
}

describe("final collection keyboard and semantic controls", () => {
  it("keeps Bench queue and navigation operable", async () => {
    renderRoute("/bench/freelancer/home");
    expect(await screen.findByRole("list", { name: "Opportunity queue" })).toBeInTheDocument();
    const pin = screen.getByRole("button", { name: /Pin Meridian Ledger/ });
    fireEvent.click(pin);
    expect(pin).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Proposal" }));
    expect(await screen.findByText("Write the exact promise.")).toBeInTheDocument();
  });

  it("provides numeric alternatives to Measure manipulation", async () => {
    renderRoute("/measure/freelancer/proposal");
    const capacity = await screen.findByRole("spinbutton", { name: "Weekly capacity in hours" });
    expect(capacity).toHaveValue(28);
    fireEvent.click(screen.getByRole("button", { name: "Decrease weekly capacity" }));
    expect(capacity).toHaveValue(27);
  });

  it("moves Crosscheck with explicit axis controls", async () => {
    renderRoute("/crosscheck/client/review");
    expect(await screen.findByRole("button", { name: "Next requirement" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next requirement" }));
    expect(await screen.findByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByLabelText("Workspace")).toBeInTheDocument();
  });

  it("implements Orbit as semantic buttons with roving focus", async () => {
    renderRoute("/orbit/freelancer/discover");
    expect(await screen.findByRole("toolbar", { name: "Semantic depth controls" })).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Market records" });
    const buttons = group.querySelectorAll("button");
    expect(buttons[0]).toHaveAttribute("tabindex", "0");
    expect(buttons[1]).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(buttons[0], { key: "ArrowRight" });
    await waitFor(() => expect(buttons[1]).toHaveFocus());
  });

  it("backs every Weave path with labelled junction controls", async () => {
    renderRoute("/weave/client/selection");
    const group = await screen.findByRole("group", { name: "Inspect provenance junctions" });
    expect(group.querySelectorAll("button")).toHaveLength(5);
    expect(screen.getAllByText("pending").length).toBeGreaterThan(0);
  });

  it("exposes Current checkpoints as real navigation", async () => {
    renderRoute("/current/freelancer/discover");
    const navigation = await screen.findByRole("navigation", { name: "Workflow current" });
    const work = navigation.querySelectorAll("button")[4];
    fireEvent.click(work);
    expect(await screen.findByText("IMMUTABLE WORK CURRENT")).toBeInTheDocument();
  });
});
