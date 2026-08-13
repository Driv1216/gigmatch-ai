import { Link } from "react-router-dom";

type GigRouteContextRailProps = {
  title: string;
  state: string;
  phase: string;
  returnLabel: string;
  returnTo: string;
};

export function GigRouteContextRail({
  title,
  state,
  phase,
  returnLabel,
  returnTo,
}: GigRouteContextRailProps) {
  return (
    <aside className="gig-route-context" aria-label="Current gig context">
      <div className="gig-route-context-record">
        <span>Current gig</span>
        <strong>{title}</strong>
      </div>
      <dl>
        <div>
          <dt>State</dt>
          <dd>{state.replace(/_/g, " ")}</dd>
        </div>
        <div>
          <dt>Current area</dt>
          <dd>{phase}</dd>
        </div>
      </dl>
      <Link to={returnTo}>{returnLabel}</Link>
    </aside>
  );
}
