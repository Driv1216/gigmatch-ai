import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  participantPrimaryNavigation,
  participantStageFiveOwnsPath,
  participantStageEightOwnsPath,
  participantStageFourOwnsPath,
  participantStageThreeOwnsPath,
  participantStageTwoOwnsPath,
  type ParticipantRole,
} from "../lib/participantNavigation";
import { ParticipantCommandSurface } from "./ParticipantCommandSurface";

type ParticipantShellProps = {
  children: ReactNode;
  role: ParticipantRole;
};

export function ParticipantShell({ children, role }: ParticipantShellProps) {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryNavigation = participantPrimaryNavigation(role);
  const dashboardPath = role === "freelancer" ? "/dashboard/freelancer" : "/dashboard/client";
  const profilePath = role === "freelancer" ? "/profile/freelancer" : "/profile/client";
  const isDashboard = location.pathname === dashboardPath;
  const isStageTwo = participantStageTwoOwnsPath(location.pathname);
  const isStageThree = participantStageThreeOwnsPath(location.pathname);
  const isStageFour = participantStageFourOwnsPath(location.pathname);
  const isStageFive = participantStageFiveOwnsPath(location.pathname);
  const isStageEight = participantStageEightOwnsPath(location.pathname);
  const displayName = profile?.full_name?.trim() || profile?.email || role;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="switchboard-shell" data-participant-role={role}>
      <a className="switchboard-skip-link" href="#participant-main">Skip to main content</a>
      <header className="switchboard-topbar">
        <Link className="switchboard-brand" to={dashboardPath} aria-label="GigMatch Switchboard dashboard">
          <span aria-hidden="true">GM</span>
          <strong>GigMatch</strong>
          <small>Switchboard</small>
        </Link>
        <button
          type="button"
          className="switchboard-menu-button"
          aria-expanded={menuOpen}
          aria-controls="participant-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
        <nav
          id="participant-navigation"
          className={menuOpen ? "switchboard-nav is-open" : "switchboard-nav"}
          aria-label={`${role} primary navigation`}
        >
          {primaryNavigation.map((destination) => (
            <NavLink
              key={destination.id}
              to={destination.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => isActive ? "is-current" : undefined}
            >
              {destination.label}
            </NavLink>
          ))}
        </nav>
        <div className="switchboard-identity">
          <span>{role}</span>
          <Link to={profilePath}>{displayName}</Link>
          <button type="button" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <ParticipantCommandSurface role={role} />
      <main
        id="participant-main"
        className={isDashboard ? "switchboard-main is-dashboard" : isStageTwo ? "switchboard-main is-stage-two" : isStageThree ? "switchboard-main is-stage-three" : isStageFour ? "switchboard-main is-stage-four" : isStageFive ? "switchboard-main is-stage-five" : isStageEight ? "switchboard-main is-stage-eight" : "switchboard-main is-stage-ten"}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
