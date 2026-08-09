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

describe("Command × Current concept interactions", () => {
  it("focuses Conduit's command with slash and exposes safe invalid suggestions", async () => {
    renderRoute("/conduit/freelancer/home");
    await screen.findByRole("textbox", { name: "Conduit command input" });
    fireEvent.keyDown(window, { key: "/" });
    const input = await screen.findByRole("textbox", { name: "Conduit command input" });
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.change(input, { target: { value: "delete everything" } });
    fireEvent.click(screen.getByRole("button", { name: "Run command" }));
    expect(await screen.findByText(/No command found/)).toBeInTheDocument();
    expect(screen.getByLabelText("Suggested commands")).toBeInTheDocument();
  });

  it("routes a Switchboard command to the equivalent client record view", async () => {
    renderRoute("/switchboard/freelancer/home");
    await screen.findByRole("textbox", { name: "Switchboard command input" });
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const input = await screen.findByRole("textbox", { name: "Switchboard command input" });
    fireEvent.change(input, { target: { value: "compare applicants" } });
    fireEvent.click(screen.getByRole("button", { name: "Run command" }));
    expect(await screen.findByText(/Compare records without leaving the field/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ternary" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps Delta's simple product navigation semantic", async () => {
    renderRoute("/delta/freelancer/discover");
    const navigation = await screen.findByRole("navigation", { name: "Delta primary" });
    fireEvent.click(navigation.querySelectorAll("button")[4]);
    expect(await screen.findByText("Work keeps its accepted source.")).toBeInTheDocument();
  });

  it("shows proposal revision invalidation in Conduit's exact record", async () => {
    renderRoute("/conduit/freelancer/proposal");
    const reason = await screen.findByRole("textbox", { name: /Describe the changed delivery commitment/ });
    fireEvent.change(reason, { target: { value: "Increase workshops and preserve delivery capacity." } });
    fireEvent.click(screen.getByRole("button", { name: /Release new version/ }));
    expect(await screen.findByText("Kavya Menon for Ternary")).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Conduit primary" });
    fireEvent.click(Array.from(navigation.querySelectorAll("button")).find((button) => button.textContent?.includes("Selection"))!);
    expect(await screen.findAllByText("invalidated")).not.toHaveLength(0);
    expect(screen.getByText(/proposal revision invalidated the previous confirmation/i)).toBeInTheDocument();
  });

  it("accepts Delta authority and preserves contact controls in work", async () => {
    renderRoute("/delta/freelancer/selection");
    fireEvent.click(await screen.findByRole("button", { name: /Accept and create engagement/ }));
    expect(await screen.findByText("Work keeps its accepted source.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Record consent" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Authorize reveal" })).toBeInTheDocument());
  });

  it("dismisses persistent command suggestions with Escape without leaving the route", async () => {
    renderRoute("/delta/freelancer/home");
    const input = await screen.findByRole("textbox", { name: "Delta command input" });
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByLabelText("Suggested commands")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByLabelText("Suggested commands")).not.toBeInTheDocument());
    expect(screen.getByText("One record, from discovery to delivery.")).toBeInTheDocument();
  });

  it("uses Command's simple labels and expands a Switchboard lane inline", async () => {
    renderRoute("/switchboard/freelancer/home");
    const navigation = await screen.findByRole("navigation", { name: "Switchboard primary" });
    expect(navigation).toHaveTextContent("Home");
    expect(navigation).toHaveTextContent("Market");
    expect(navigation).toHaveTextContent("Application");
    expect(navigation).toHaveTextContent("Selection");
    expect(navigation).toHaveTextContent("Engagement");
    expect(navigation).not.toHaveTextContent("Find");
    const lane = screen.getByRole("button", { name: /open market/i });
    expect(lane).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(lane);
    expect(lane).toHaveAttribute("aria-expanded", "true");
  });
});
