import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ParticipantHeaderContextProvider } from "../context/ParticipantHeaderContext";
import {
  participantPrimaryNavigation,
  participantStageFiveOwnsPath,
  participantStageEightOwnsPath,
  participantStageFourOwnsPath,
  participantStageThreeOwnsPath,
  participantStageTwoOwnsPath,
  type ParticipantRole,
} from "../lib/participantNavigation";
import { useDismissibleLayer, type DismissReason } from "../lib/useDismissibleLayer";
import { ParticipantCommandSurface } from "./ParticipantCommandSurface";

type ParticipantShellProps = {
  children: ReactNode;
  role: ParticipantRole;
};

export function ParticipantShell({ children, role }: ParticipantShellProps) {
  const { profile } = useAuth();
  const location = useLocation();
  const contextResetKey = [
    location.pathname,
    role,
    profile?.id ?? "no-profile",
    profile?.updated_at ?? "no-profile-version",
  ].join(":");

  return (
    <ParticipantHeaderContextProvider key={contextResetKey}>
      <ParticipantShellContent role={role}>{children}</ParticipantShellContent>
    </ParticipantHeaderContextProvider>
  );
}

function ParticipantShellContent({ children, role }: ParticipantShellProps) {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
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
    setAccountOpen(false);
    await logout();
    navigate("/login");
  }

  function handleAccountDismiss(reason: DismissReason) {
    setAccountOpen(false);
    if (reason === "escape") {
      window.requestAnimationFrame(() => accountTriggerRef.current?.focus());
    }
  }

  function handleAccountBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setAccountOpen(false);
    }
  }

  useDismissibleLayer({
    open: accountOpen,
    layerRef: accountRef,
    onDismiss: handleAccountDismiss,
  });

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname, profile?.id, profile?.updated_at, role]);

  return (
    <div className="switchboard-shell" data-participant-role={role}>
      <a className="switchboard-skip-link" href="#participant-main">Skip to main content</a>
      <header className="switchboard-topbar">
        <Link className="switchboard-brand" to={dashboardPath} aria-label="GigMatch AI dashboard">
          <span aria-hidden="true">GM</span>
          <strong>GigMatch AI</strong>
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
        <div className="switchboard-account" ref={accountRef} onBlur={handleAccountBlur}>
          <button
            ref={accountTriggerRef}
            type="button"
            className="switchboard-account-trigger"
            aria-label={`${displayName} account`}
            aria-expanded={accountOpen}
            aria-controls="participant-account-disclosure"
            onClick={() => setAccountOpen((value) => !value)}
          >
            <span>
              <small>{role}</small>
              <strong>{displayName}</strong>
            </span>
            <i aria-hidden="true" />
          </button>
          {accountOpen ? (
            <div id="participant-account-disclosure" className="switchboard-account-disclosure">
              <Link to={profilePath} onClick={() => setAccountOpen(false)}>Profile</Link>
              <button type="button" onClick={handleLogout}>Logout</button>
            </div>
          ) : null}
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
