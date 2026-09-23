import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole } from "../lib/auth";
import { isSupportedAuthUser } from "../lib/authFlow";
import { AuthStatePage } from "./AuthStatePage";

export function AccountSetupBoundary({ children }: { children: ReactNode }) {
  const { user, role, loading, profileStatus, refreshProfile, logout } = useAuth();

  if (loading || (user && profileStatus === "loading")) {
    return <AuthStatePage eyebrow="ACCOUNT SETUP / RESOLVING" title="Checking setup eligibility." description="The setup form remains unavailable until Auth and profile state resolve." panelTitle="Resolving account" panelBody="Please wait." />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (profileStatus === "error") {
    return <AuthStatePage eyebrow="ACCOUNT SETUP / FAIL CLOSED" title="Profile setup cannot continue." description="A profile read error must be resolved before any creation attempt." panelTitle="Unable to read profile state" panelBody="Retry the profile check or log out." status="alert" actions={<><button className="switchboard-auth-submit" type="button" onClick={() => void refreshProfile().catch(() => undefined)}><span>Retry profile</span><b aria-hidden="true">→</b></button><button className="switchboard-auth-secondary" type="button" onClick={() => void logout().catch(() => undefined)}>Logout</button></>} />;
  }
  if (!isSupportedAuthUser(user)) {
    return <AuthStatePage eyebrow="ACCOUNT SETUP / SAFE DENIAL" title="This identity is not eligible." description="Account setup requires a non-anonymous Supabase Auth identity with an email." panelTitle="Setup denied" panelBody="Log out and use a supported identity." status="alert" actions={<button className="switchboard-auth-secondary" type="button" onClick={() => void logout().catch(() => undefined)}>Logout</button>} />;
  }
  if (profileStatus === "ready" && role) {
    return <Navigate to={dashboardPathForRole(role)} replace />;
  }
  if (profileStatus !== "missing") {
    return <AuthStatePage eyebrow="ACCOUNT SETUP / SAFE DENIAL" title="Setup is unavailable." description="The current account state does not permit profile creation." panelTitle="Setup denied" panelBody="Retry after the account state has resolved." status="alert" />;
  }
  return children;
}
