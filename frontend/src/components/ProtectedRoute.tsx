import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole, type UserRole } from "../lib/auth";
import { isVerifiedAuthUser } from "../lib/authFlow";
import { AuthStatePage } from "./AuthStatePage";
import { VerificationRequired } from "./VerificationRequired";
import { PageContainer } from "./PageContainer";

type ProtectedRouteProps = {
  allowedRole?: UserRole;
  allowedRoles?: UserRole[];
  children: ReactNode;
};

export function ProtectedRoute({ allowedRole, allowedRoles, children }: ProtectedRouteProps) {
  const { user, profile, role, loading, profileStatus, refreshProfile, logout } = useAuth();

  if (loading || (user && profileStatus === "loading")) {
    return (
      <PageContainer>
        <p className="text-sm font-medium text-muted">Loading your account...</p>
      </PageContainer>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isVerifiedAuthUser(user)) {
    return user.email
      ? <VerificationRequired email={user.email} signedIn />
      : <AuthStatePage eyebrow="PROTECTED ROUTE / SAFE DENIAL" title="This identity cannot continue." description="Protected workflows require a verified, non-anonymous Auth email and persisted profile." panelTitle="Account not eligible" panelBody="Log out and use a supported identity." status="alert" />;
  }

  if (profileStatus === "error") {
    return <AuthStatePage eyebrow="PROTECTED ROUTE / FAIL CLOSED" title="The profile authority is unavailable." description="Protected content remains hidden until the profile read succeeds." panelTitle="Unable to load account profile" panelBody="Retry the profile read or log out." status="alert" actions={<><button className="switchboard-auth-submit" type="button" onClick={() => void refreshProfile().catch(() => undefined)}><span>Retry profile</span><b aria-hidden="true">→</b></button><button className="switchboard-auth-secondary" type="button" onClick={() => void logout().catch(() => undefined)}>Logout</button></>} />;
  }

  if (profileStatus === "missing") {
    return <Navigate to="/account/setup" replace />;
  }

  if (!profile || !role) {
    return <AuthStatePage eyebrow="PROTECTED ROUTE / SAFE DENIAL" title="This account cannot be routed." description="A valid persisted role is required." panelTitle="Invalid account profile" panelBody="Contact support before continuing." status="alert" />;
  }

  const permittedRoles = allowedRoles ?? (allowedRole ? [allowedRole] : []);
  if (permittedRoles.length > 0 && !permittedRoles.includes(role)) {
    return <Navigate to={dashboardPathForRole(role)} replace />;
  }

  return children;
}
