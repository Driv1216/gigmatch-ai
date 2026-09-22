import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleAuthControl } from "../components/GoogleAuthControl";
import { PasswordField } from "../components/PasswordField";
import { VerificationRequired } from "../components/VerificationRequired";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole } from "../lib/auth";
import { isEmailNotConfirmedError } from "../lib/authFlow";
import { supabase } from "../lib/supabaseClient";

export function LoginPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (errorMessage) errorRef.current?.focus();
  }, [errorMessage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      if (isEmailNotConfirmedError(error)) setVerificationEmail(email);
      else setErrorMessage("Invalid email or password");
      setIsSubmitting(false);
      return;
    }

    try {
      const profile = await refreshProfile();
      if (!profile) {
        navigate("/account/setup", { replace: true });
        return;
      }
      navigate(dashboardPathForRole(profile.role), { replace: true });
    } catch {
      setErrorMessage("Your account was authenticated, but the saved profile could not be loaded.");
      setIsSubmitting(false);
    }
  }

  if (verificationEmail) return <VerificationRequired email={verificationEmail} />;

  return (
    <section className="switchboard-auth-page is-login" aria-labelledby="login-title">
      <aside className="switchboard-auth-context">
        <span className="switchboard-public-eyebrow">ACCOUNT ACCESS / TRUSTED PROFILE</span>
        <h1 id="login-title">Return to your switchboard.</h1>
        <p>Sign in with your existing account. Your persisted profile role—not this form or provider metadata—selects the dashboard you can access.</p>
        <dl>
          <div><dt>Source</dt><dd>Supabase Auth session</dd></div>
          <div><dt>Authority</dt><dd>Persisted user profile</dd></div>
          <div><dt>Destination</dt><dd>Role-protected dashboard</dd></div>
        </dl>
      </aside>
      <div className="switchboard-auth-panel">
        <header>
          <span>LOGIN / EXISTING ACCOUNT</span>
          <h2>Login</h2>
          <p>Use the identity already attached to your GigMatch account.</p>
        </header>
        <form onSubmit={handleSubmit} noValidate aria-describedby={errorMessage ? "login-error" : undefined}>
          <GoogleAuthControl onError={setErrorMessage} />
          <label htmlFor="login-email">
            <span>Email</span>
            <input id="login-email" type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <PasswordField id="login-password" label="Password" name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {errorMessage ? <p ref={errorRef} tabIndex={-1} id="login-error" className="switchboard-auth-message is-error" role="alert">{errorMessage}</p> : null}
          <button type="submit" disabled={isSubmitting} className="switchboard-auth-submit"><span>{isSubmitting ? "Logging in..." : "Login"}</span><b aria-hidden="true">→</b></button>
        </form>
        <p className="switchboard-auth-alternate">New to GigMatch? <Link to="/signup">Create an account</Link>.</p>
      </div>
    </section>
  );
}
