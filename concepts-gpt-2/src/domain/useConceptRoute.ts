import { useNavigate, useParams } from "react-router-dom";
import { useWorkflow } from "./useWorkflow";
import type { ConceptId, Role, ViewId } from "./types";

const freelancerViews: ViewId[] = ["home", "discover", "gig", "proposal", "applications", "selection", "engagement"];
const clientViews: ViewId[] = ["home", "review", "candidate", "selection", "engagement"];

export function useConceptRoute(concept: ConceptId) {
  const params = useParams<{ role?: string; view?: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useWorkflow();
  const role: Role = params.role === "client" ? "client" : params.role === "freelancer" ? "freelancer" : state.role;
  const allowed = role === "client" ? clientViews : freelancerViews;
  const view = allowed.includes(params.view as ViewId) ? (params.view as ViewId) : "home";

  function go(next: ViewId) {
    const safe = allowed.includes(next) ? next : "home";
    navigate(`/${concept}/${role}/${safe}`);
  }

  function switchRole(next: Role) {
    dispatch({ type: "set-role", role: next });
    navigate(`/${concept}/${next}/home`);
  }

  return { role, view, go, switchRole, state, dispatch };
}
