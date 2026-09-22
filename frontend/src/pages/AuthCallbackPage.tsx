import { Navigate, useNavigate } from "react-router-dom";
import { AuthStatePage } from "../components/AuthStatePage";
import { VerificationRequired } from "../components/VerificationRequired";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole } from "../lib/auth";
import { callbackErrorFromLocation, isVerifiedAuthUser } from "../lib/authFlow";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, role, loading, profileStatus, refreshProfile, logout } = useAuth();
  const callbackError = callbackErrorFromLocation(window.location);

  if (callbackError) {
    return <AuthStatePage eyebrow="AUTH CALLBACK / SAFE FAILURE" title="Authentication did not complete." description="No profile write was attempted from this callback." panelTitle="Unable to continue" panelBody={callbackError} status="alert" actions={<button className="switchboard-auth-secondary" type="button" onClick={() => void logout().catch(() => undefined).finally(() => navigate("/login", { replace: true }))}>Return to login</button>} />;
  }
  if (loading || (user && profileStatus === "loading")) {
    return <AuthStatePage eyebrow="AUTH CALLBACK / IMPLICIT SESSION" title="Connecting the verified identity." description="Supabase is detecting and persisting the callback session before routing." panelTitle="Completing authentication" panelBody="Please wait. Do not close this page." />;
  }
  if (!user) {
    return <AuthStatePage eyebrow="AUTH CALLBACK / SAFE FAILURE" title="This link cannot be used." description="The implicit callback did not produce a usable session." panelTitle="Invalid or expired authentication link" panelBody="Return to login or request a new confirmation email." status="alert" actions={<a className="switchboard-auth-secondary" href="/login">Return to login</a>} />;
  }
  if (profileStatus === "error") {
    return <AuthStatePage eyebrow="AUTH CALLBACK / FAIL CLOSED" title="The identity is connected, but profile state is unavailable." description="Routing is blocked until the persisted profile can be read safely." panelTitle="Unable to load account profile" panelBody="Retry the trusted profile read or log out." status="alert" actions={<><button className="switchboard-auth-submit" type="button" onClick={() => void refreshProfile().catch(() => undefined)}><span>Retry profile</span><b aria-hidden="true">→</b></button><button className="switchboard-auth-secondary" type="button" onClick={() => void logout().catch(() => undefined)}>Logout</button></>} />;
  }
  if (!isVerifiedAuthUser(user)) {
    return user.email ? <VerificationRequired email={user.email} signedIn /> : <AuthStatePage eyebrow="AUTH CALLBACK / SAFE DENIAL" title="This identity cannot continue." description="A verified, non-anonymous Auth email is required." panelTitle="Account not eligible" panelBody="Log out and use a supported identity." status="alert" />;
  }
  if (profileStatus === "missing") return <Navigate to="/account/setup" replace />;
  if (profileStatus === "ready" && role) return <Navigate to={dashboardPathForRole(role)} replace />;
  return <AuthStatePage eyebrow="AUTH CALLBACK / SAFE DENIAL" title="Authentication cannot continue." description="The current account state is not routable." panelTitle="Unable to resolve account" panelBody="Return to login and try again." status="alert" />;
}
