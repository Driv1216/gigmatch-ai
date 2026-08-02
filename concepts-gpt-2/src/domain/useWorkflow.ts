import { useContext } from "react";
import { WorkflowContext, type WorkflowContextValue } from "./workflow-context";

export function useWorkflow(): WorkflowContextValue {
  const value = useContext(WorkflowContext);
  if (!value) throw new Error("useWorkflow must be used within WorkflowProvider");
  return value;
}
