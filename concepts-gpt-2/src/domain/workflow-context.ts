import { createContext, type Dispatch } from "react";
import type { WorkflowAction, WorkflowState } from "./types";

export interface WorkflowContextValue {
  state: WorkflowState;
  dispatch: Dispatch<WorkflowAction>;
}

export const WorkflowContext = createContext<WorkflowContextValue | null>(null);
