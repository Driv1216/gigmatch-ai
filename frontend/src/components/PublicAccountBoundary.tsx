import type { ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole } from "../lib/auth";
import { isVerifiedAuthUser } from "../lib/authFlow";
import { AuthStatePage } from "./AuthStatePage";
import { VerificationRequired } from "./VerificationRequired";

type PublicAccountBoundaryProps = {
  mode: "landing" | "auth";
  children: ReactNode;
};

export function PublicAccountBoundary({ mode, children }: PublicAccountBoundaryProps) {
  const navigate = useNavigate();
  const { user, profile, role, loading, profileStatus, refreshProfile, logout } = useAuth();

  if (loading || (user && profileStatus === "loading")) {
    return <AuthStatePage eyebrow="ACCOUNT / RESOLVING" title="Reading the trusted account state." description="Authentication controls remain unavailable until the current session and profile resolve." panelTitle="Resolving account" panelBody="Please wait while GigMatch checks the current Supabase Auth session and persisted profile." />;
  }

  if (!user) {
    return children;
  }

  if (profileStatus === "error") {
    return (
      <AuthStatePage
        eyebrow="ACCOUNT / FAIL CLOSED"
        title="The profile authority is unavailable."
        description="GigMatch will not offer authentication or setup controls while the persisted profile cannot be read."
        panelTitle="Unable to load account profile"
        panelBody="Retry the trusted profile read, or log out and return later."
        status="alert"
        actions={(
          <>
            <button className="switchboard-auth-submit" type="button" onClick={() => void refreshProfile().catch(() => undefined)}><span>Retry profile</span><b aria-hidden="true">→</b></button>
            <button className="switchboard-auth-secondary" type="button" onClick={() => void logout().catch(() => undefined)}>Logout</button>
          </>
        )}
      />
    );
  }

  if (!isVerifiedAuthUser(user)) {
    if (user.email) {
      return <VerificationRequired email={user.email} signedIn />;
    }
    return <AuthStatePage eyebrow="ACCOUNT / SAFE DENIAL" title="This identity cannot continue." description="A non-anonymous Supabase Auth identity with a verified email is required." panelTitle="Account not eligible" panelBody="Log out and use a supported email or Google identity." status="alert" actions={<button className="switchboard-auth-secondary" type="button" onClick={() => void logout().catch(() => undefined)}>Logout</button>} />;
  }

  if (profileStatus === "missing") {
    return <Navigate to="/account/setup" replace />;
  }

  if (mode === "auth" && profile && role) {
    return (
      <AuthStatePage
        eyebrow="ACCOUNT / ACTIVE SESSION"
        title="Your switchboard is already connected."
        description="Password, signup, and Google controls are hidden while this profile-ready session is active."
        panelTitle={profile.full_name || profile.email}
        panelBody={`Signed in as ${profile.email}. Your persisted ${role} role controls access.`}
        actions={(
          <>
            <button className="switchboard-auth-submit" type="button" onClick={() => navigate(dashboardPathForRole(role))}><span>Open dashboard</span><b aria-hidden="true">→</b></button>
            <button className="switchboard-auth-secondary" type="button" onClick={() => void logout().catch(() => undefined)}>Logout</button>
          </>
        )}
      />
    );
  }

  return children;
}
