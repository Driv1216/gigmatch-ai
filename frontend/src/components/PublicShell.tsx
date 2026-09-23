import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole } from "../lib/auth";
import { isSupportedAuthUser } from "../lib/authFlow";

type PublicShellProps = {
  children: ReactNode;
};

function publicLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "is-current" : undefined;
}

export function PublicShell({ children }: PublicShellProps) {
  const { user, role, loading, profileStatus, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="switchboard-public-shell">
      <a className="switchboard-public-skip" href="#public-main">Skip to main content</a>
      <header className="switchboard-public-topbar">
        <NavLink to="/" className="switchboard-public-brand" aria-label="GigMatch home">
          <span aria-hidden="true">GM</span>
          <strong>GigMatch</strong>
          <small>Tech work, structured</small>
        </NavLink>
        <nav aria-label="Public navigation">
          {loading || (user && profileStatus === "loading") ? (
            <span className="switchboard-public-resolution" role="status">Resolving account</span>
          ) : user && profileStatus === "error" ? (
            <>
              <span className="switchboard-public-resolution" role="alert">Profile unavailable</span>
              <button type="button" onClick={handleLogout}>Logout</button>
            </>
          ) : role && profileStatus === "ready" ? (
            <>
              <NavLink to={dashboardPathForRole(role)}>Open dashboard</NavLink>
              <button type="button" onClick={handleLogout}>Logout</button>
            </>
          ) : user && isSupportedAuthUser(user) && profileStatus === "missing" ? (
            <>
              <NavLink to="/account/setup">Complete setup</NavLink>
              <button type="button" onClick={handleLogout}>Logout</button>
            </>
          ) : user ? (
            <><span className="switchboard-public-resolution" role="alert">Account not eligible</span><button type="button" onClick={handleLogout}>Logout</button></>
          ) : (
            <>
              <NavLink to="/login" className={publicLinkClass}>Login</NavLink>
              <NavLink to="/signup" className={publicLinkClass}>Create account</NavLink>
            </>
          )}
        </nav>
      </header>
      <main id="public-main">{children}</main>
      <footer className="switchboard-public-footer">
        <p><strong>GigMatch</strong> connects structured participant input to evidence-led tech-gig workflows.</p>
        <p>Gig discovery and participant records remain behind authenticated access.</p>
      </footer>
    </div>
  );
}
