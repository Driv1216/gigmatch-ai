import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { completeAccountSetup, dashboardPathForRole, type UserRole } from "../lib/auth";

type SetupRole = Exclude<UserRole, "admin">;

function providerNamePrefill(metadata: Record<string, unknown>) {
  const candidate = metadata.full_name ?? metadata.name;
  return typeof candidate === "string" ? candidate.trim().slice(0, 100) : "";
}

export function AccountSetupPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(() => providerNamePrefill(user?.user_metadata ?? {}));
  const [role, setRole] = useState<SetupRole>("freelancer");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (errorMessage) errorRef.current?.focus();
  }, [errorMessage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = fullName.trim();
    setErrorMessage(null);

    if (normalizedName.length < 1 || normalizedName.length > 100 || /[\r\n]/.test(normalizedName)) {
      setErrorMessage("Full name must contain 1 to 100 characters on one line.");
      return;
    }
    if (!user?.email) {
      setErrorMessage("An Auth email is required to complete setup.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completeAccountSetup(normalizedName, role);
      if (result.id !== user.id || result.email !== user.email || (result.role !== "freelancer" && result.role !== "client")) {
        throw new Error("The setup result did not match the authenticated identity.");
      }
      const persistedProfile = await refreshProfile();
      if (!persistedProfile) throw new Error("The persisted profile could not be loaded.");
      navigate(dashboardPathForRole(persistedProfile.role), { replace: true });
    } catch {
      setErrorMessage("Account setup could not be completed. Your Auth identity is unchanged; please retry.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="switchboard-auth-page is-setup" aria-labelledby="setup-title">
      <aside className="switchboard-auth-context">
        <span className="switchboard-public-eyebrow">ACCOUNT SETUP / PROFILE AUTHORITY</span>
        <h1 id="setup-title">Name the profile. Choose the work.</h1>
        <p>Your authenticated Supabase identity supplies ID and email. This form supplies only an editable display name and one participant role.</p>
        <dl>
          <div><dt>Identity</dt><dd>Trusted Auth ID and email</dd></div>
          <div><dt>Profile</dt><dd>Validated name and role</dd></div>
          <div><dt>Authority</dt><dd>Single database RPC</dd></div>
        </dl>
      </aside>
      <div className="switchboard-auth-panel">
        <header><span>SETUP / AUTHENTICATED ACCOUNT</span><h2>Complete account</h2><p>Provider name data is only an editable prefill.</p></header>
        <form onSubmit={handleSubmit} noValidate aria-describedby={errorMessage ? "setup-error" : undefined}>
          <label htmlFor="setup-email"><span>Account email</span><input id="setup-email" type="email" value={user?.email ?? ""} readOnly aria-readonly="true" /></label>
          <label htmlFor="setup-full-name"><span>Full name</span><input id="setup-full-name" type="text" name="full-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={100} required /></label>
          <fieldset className="switchboard-role-choice">
            <legend>Participant role</legend><p>This role is persisted once and cannot be switched in the browser.</p>
            <div>
              <label className={role === "freelancer" ? "is-selected" : undefined}><input type="radio" name="role" value="freelancer" checked={role === "freelancer"} onChange={() => setRole("freelancer")} /><span><b>Freelancer</b><small>Find and propose</small></span></label>
              <label className={role === "client" ? "is-selected" : undefined}><input type="radio" name="role" value="client" checked={role === "client"} onChange={() => setRole("client")} /><span><b>Client</b><small>Create and review</small></span></label>
            </div>
          </fieldset>
          {errorMessage ? <p ref={errorRef} tabIndex={-1} id="setup-error" className="switchboard-auth-message is-error" role="alert">{errorMessage}</p> : null}
          <button type="submit" disabled={isSubmitting} className="switchboard-auth-submit"><span>{isSubmitting ? "Saving profile..." : "Complete account setup"}</span><b aria-hidden="true">→</b></button>
        </form>
      </div>
    </section>
  );
}
