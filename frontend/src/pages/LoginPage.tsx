import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole, fetchUserProfile } from "../lib/auth";
import { supabase } from "../lib/supabaseClient";

export function LoginPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setErrorMessage("Unable to login with those credentials.");
      setIsSubmitting(false);
      return;
    }

    try {
      const profile = await fetchUserProfile(data.user.id);

      if (!profile) {
        setErrorMessage("Login succeeded, but no profile row was found for this account.");
        setIsSubmitting(false);
        return;
      }

      await refreshProfile();
      navigate(dashboardPathForRole(profile.role));
    } catch {
      setErrorMessage("Login succeeded, but your saved account profile could not be loaded.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="switchboard-auth-page is-login" aria-labelledby="login-title">
      <aside className="switchboard-auth-context">
        <span className="switchboard-public-eyebrow">ACCOUNT ACCESS / TRUSTED PROFILE</span>
        <h1 id="login-title">Return to your switchboard.</h1>
        <p>Sign in with your existing account. Your saved profile role—not this page—selects the dashboard and protected workflow you can access.</p>
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
          <p>Use the email and password already attached to your GigMatch account.</p>
        </header>
        <form onSubmit={handleSubmit} aria-describedby={errorMessage ? "login-error" : undefined}>
          <label>
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {errorMessage ? (
            <p id="login-error" className="switchboard-auth-message is-error" role="alert">{errorMessage}</p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="switchboard-auth-submit"
          >
            <span>{isSubmitting ? "Logging in..." : "Login"}</span>
            <b aria-hidden="true">→</b>
          </button>
        </form>
        <p className="switchboard-auth-alternate">New to GigMatch? <Link to="/signup">Create a freelancer or client account</Link>.</p>
      </div>
    </section>
  );
}
