import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";
import { WorkflowProvider } from "../src/domain/WorkflowProvider";

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WorkflowProvider><App /></WorkflowProvider>
    </MemoryRouter>,
  );
}

const routes = [
  "/axiom/freelancer/home",
  "/axiom/freelancer/discover",
  "/axiom/freelancer/gig",
  "/axiom/freelancer/proposal",
  "/axiom/freelancer/applications",
  "/axiom/freelancer/selection",
  "/axiom/freelancer/engagement",
  "/axiom/client/home",
  "/axiom/client/review",
  "/axiom/client/candidate",
  "/axiom/client/selection",
  "/axiom/client/engagement",
] as const;

describe("Axiom route and semantic UI coverage", () => {
  it.each(routes)("renders %s with a semantic workspace", async (path) => {
    renderRoute(path);
    expect(await screen.findByRole("main")).toBeInTheDocument();
    expect(await screen.findByRole("navigation", { name: "Axiom workflow" })).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("renders the public 3D entry and both role choices", async () => {
    renderRoute("/axiom");
    expect(await screen.findByText("The deal", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enter as Kavya/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enter as Ternary/ })).toBeInTheDocument();
  });

  it("provides a procedural static object when WebGL is unavailable", async () => {
    renderRoute("/axiom/freelancer/home");
    expect(await screen.findByTestId("axiom-static-artifact")).toBeInTheDocument();
  });

  it("keeps record focusing available through labelled HTML controls", async () => {
    renderRoute("/axiom/freelancer/discover");
    const focus = await screen.findByRole("button", { name: "Focus Meridian Ledger" });
    fireEvent.click(focus);
    expect(focus).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("86% EVIDENCE FIT")).toBeInTheDocument();
  });

  it("validates proposal dimensions before recording a version", async () => {
    renderRoute("/axiom/freelancer/proposal");
    const amount = await screen.findByRole("spinbutton", { name: "Fixed proposal in rupees" });
    fireEvent.change(amount, { target: { value: "100" } });
    expect(screen.getByRole("alert")).toHaveTextContent("₹5.2L–₹6.4L");
    expect(screen.getByRole("button", { name: /Record immutable version/ })).toBeDisabled();
  });

  it("supports client review actions with visible pressed state", async () => {
    renderRoute("/axiom/client/candidate");
    const shortlist = await screen.findByRole("button", { name: "Remove private shortlist" });
    fireEvent.click(shortlist);
    expect(await screen.findByRole("button", { name: "Add private shortlist" })).toHaveAttribute("aria-pressed", "false");
  });

  it("accepts exact authority and enters the immutable engagement", async () => {
    renderRoute("/axiom/freelancer/selection");
    fireEvent.click(await screen.findByRole("button", { name: /Accept exact terms/ }));
    expect(await screen.findByText("IMMUTABLE ENGAGEMENT CORE")).toBeInTheDocument();
    expect(screen.getByText(/Accepted from application v2/)).toBeInTheDocument();
  });

  it("falls incompatible views back to the role home", async () => {
    renderRoute("/axiom/client/proposal");
    expect(await screen.findByText("TERNARY / DECISION CORE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Now/ })).toHaveAttribute("aria-current", "page");
  });

  it("switches roles through explicit pressed controls", async () => {
    renderRoute("/axiom/freelancer/home");
    fireEvent.click(await screen.findByRole("button", { name: "Ternary" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ternary" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByText("TERNARY / DECISION CORE")).toBeInTheDocument();
  });
});
