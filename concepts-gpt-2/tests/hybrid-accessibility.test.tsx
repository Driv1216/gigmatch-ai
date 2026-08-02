import { fireEvent, render, screen } from "@testing-library/react";
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

describe("hybrid interaction accessibility", () => {
  it("focuses Vector command input with the visible slash shortcut and returns safe suggestions", async () => {
    renderRoute("/vector/freelancer/home");
    const command = await screen.findByRole("textbox", { name: "Vector command" });
    fireEvent.keyDown(window, { key: "/" });
    expect(command).toHaveFocus();
    fireEvent.change(command, { target: { value: "erase records" } });
    fireEvent.submit(command.closest("form") as HTMLFormElement);
    expect(await screen.findByText("SAFE SUGGESTIONS")).toBeInTheDocument();
  });

  it("exposes labeled Harbor capacity input and proposal validation", async () => {
    renderRoute("/harbor/freelancer/proposal");
    expect(await screen.findByRole("slider", { name: "Weekly hours" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("at least 24 characters");
    expect(screen.getByRole("button", { name: /Record application/ })).toBeDisabled();
  });

  it("provides explicit controls for Atelier carousel and Index comparison axes", async () => {
    renderRoute("/atelier/client/review");
    expect(await screen.findByRole("button", { name: "Previous applicant" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next applicant" })).toBeInTheDocument();
  });

  it("labels Index comparison navigation and keeps the main landmark addressable", async () => {
    renderRoute("/index/client/review");
    expect(await screen.findByRole("navigation", { name: "Sort applicants" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("provides Accord role and record navigation as keyboard-operable buttons", async () => {
    renderRoute("/accord/client/home");
    expect(await screen.findByRole("button", { name: "Specialist" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Instrument" })).toBeInTheDocument();
  });
});
