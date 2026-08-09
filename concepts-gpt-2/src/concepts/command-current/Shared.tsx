import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { COMMANDS, resolveCommand } from "../../domain/expansion";
import type { ConceptId, Role, ViewId } from "../../domain/types";
import type { useConceptRoute } from "../../domain/useConceptRoute";

export interface PrimaryNavItem {
  view: ViewId;
  label: string;
}

export function primaryNavItems(role: Role): PrimaryNavItem[] {
  return role === "client"
    ? [
        { view: "home", label: "Home" },
        { view: "review", label: "Applicants" },
        { view: "candidate", label: "Candidate" },
        { view: "selection", label: "Selection" },
        { view: "engagement", label: "Engagement" },
      ]
    : [
        { view: "home", label: "Home" },
        { view: "discover", label: "Market" },
        { view: "applications", label: "Application" },
        { view: "selection", label: "Selection" },
        { view: "engagement", label: "Engagement" },
      ];
}

export function navViewIsCurrent(current: ViewId, item: ViewId) {
  if (item === "discover") return current === "discover" || current === "gig";
  if (item === "review") return current === "review";
  if (item === "applications") return current === "applications" || current === "proposal";
  if (item === "candidate") return current === "candidate";
  return current === item;
}

export function workflowPosition(view: ViewId) {
  if (view === "home" || view === "discover" || view === "review") return 0;
  if (view === "gig" || view === "proposal") return 1;
  if (view === "applications" || view === "candidate") return 2;
  if (view === "selection") return 3;
  return 4;
}

export const roleLabel = (role: Role) => role === "client" ? "Ternary team" : "Kavya Menon";

export const viewLabel = (view: ViewId) => ({
  home: "Home",
  discover: "Market",
  gig: "Gig brief",
  proposal: "Proposal",
  applications: "Application",
  review: "Applicants",
  candidate: "Candidate",
  selection: "Selection",
  engagement: "Engagement",
})[view];

export type HybridRoute = ReturnType<typeof useConceptRoute>;

export interface ConceptViewProps extends HybridRoute {
  selectedRecord: number;
  setSelectedRecord: (index: number) => void;
}

export function useHybridCommand(concept: ConceptId, route: HybridRoute) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInputValue] = useState("");
  const [notice, setNotice] = useState("Ready for a command");
  const [invalid, setInvalid] = useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);

  const focus = useCallback(() => {
    setSuggestionsVisible(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const dismiss = useCallback(() => {
    setSuggestionsVisible(false);
    setInvalid(false);
  }, []);

  const setInput = useCallback((value: string) => {
    setInputValue(value);
    setInvalid(false);
    setSuggestionsVisible(true);
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const editing = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
      if ((event.key === "/" && !editing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        focus();
      } else if (event.key === "Escape" && suggestionsVisible) {
        event.preventDefault();
        dismiss();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [dismiss, focus, suggestionsVisible]);

  function run(raw = input) {
    const result = resolveCommand(raw);
    setInvalid(false);
    if (result.kind === "route") {
      const nextRole = result.role ?? route.role;
      if (nextRole !== route.role) route.dispatch({ type: "set-role", role: nextRole });
      navigate(`/${concept}/${nextRole}/${result.view}`);
      setNotice(`Opened ${result.label}`);
      setInputValue("");
      setSuggestionsVisible(false);
    } else if (result.kind === "role") {
      route.switchRole(result.role);
      setNotice(`Switched to ${roleLabel(result.role)}`);
      setInputValue("");
      setSuggestionsVisible(false);
    } else if (result.kind === "reset") {
      route.dispatch({ type: "reset" });
      setNotice("Scenario reset");
      setInputValue("");
      setSuggestionsVisible(false);
    } else {
      setNotice(`No command found for “${raw}”`);
      setInvalid(true);
      setSuggestionsVisible(true);
    }
  }

  return {
    inputRef,
    input,
    setInput,
    notice,
    invalid,
    suggestionsVisible,
    focus,
    dismiss,
    run,
    suggestions: COMMANDS.slice(0, 4),
  };
}

export type HybridCommand = ReturnType<typeof useHybridCommand>;
