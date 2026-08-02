import { type ReactNode, useEffect, useReducer } from "react";
import type { WorkflowState } from "./types";
import { WorkflowContext } from "./workflow-context";
import { INITIAL_STATE, normalizeWorkflowState, workflowReducer } from "./workflow";

const storageKey = "gigmatch-concepts-gpt-2-state";

function restoreState(): WorkflowState {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return INITIAL_STATE;
    const parsed = JSON.parse(saved) as Partial<WorkflowState>;
    return normalizeWorkflowState(parsed);
  } catch {
    return INITIAL_STATE;
  }
}

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workflowReducer, undefined, restoreState);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ ...state, toast: null }));
  }, [state]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = window.setTimeout(() => dispatch({ type: "dismiss-toast" }), 3200);
    return () => window.clearTimeout(timer);
  }, [state.toast]);

  return <WorkflowContext.Provider value={{ state, dispatch }}>{children}</WorkflowContext.Provider>;
}
