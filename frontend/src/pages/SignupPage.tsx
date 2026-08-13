import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole, type UserRole } from "../lib/auth";
import { supabase } from "../lib/supabaseClient";

type SignupRole = Exclude<UserRole, "admin">;

export function SignupPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("freelancer");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error || !data.user) {
      setErrorMessage("Unable to create account. Check your details and try again.");
      setIsSubmitting(false);
      return;
    }

    if (!data.session) {
      setSuccessMessage("Account created. Check your email to confirm your account before logging in.");
      setIsSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: data.user.id,
      email,
      full_name: fullName,
      role,
    });

    if (profileError) {
      setErrorMessage("Account created, but the saved role profile could not be completed. Contact support before continuing.");
      setIsSubmitting(false);
      return;
    }

    try {
      const persistedProfile = await refreshProfile();

      if (!persistedProfile) {
        setErrorMessage("Account created, but no saved role profile could be resolved. Contact support before continuing.");
        setIsSubmitting(false);
        return;
      }

      navigate(dashboardPathForRole(persistedProfile.role));
    } catch {
      setErrorMessage("Account created, but the saved role profile could not be loaded. Contact support before continuing.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="switchboard-auth-page is-signup" aria-labelledby="signup-title">
      <aside className="switchboard-auth-context">
        <span className="switchboard-public-eyebrow">ACCOUNT CREATION / TWO PARTICIPANT ROLES</span>
        <h1 id="signup-title">Choose your side of the work.</h1>
        <p>Create a freelancer or client account. This selection is used once for account creation; your persisted profile becomes the authority after signup.</p>
        <dl>
          <div><dt>Freelancer</dt><dd>Discover gigs and submit structured proposals</dd></div>
          <div><dt>Client</dt><dd>Create gigs and review applicants</dd></div>
          <div><dt>After signup</dt><dd>Saved role controls protected access</dd></div>
        </dl>
      </aside>

      <div className="switchboard-auth-panel">
        <header>
          <span>SIGNUP / NEW PARTICIPANT</span>
          <h2>Signup</h2>
          <p>All fields are required. Existing administrative accounts use the ordinary login page.</p>
        </header>
        <form onSubmit={handleSubmit} aria-describedby={[errorMessage ? "signup-error" : null, successMessage ? "signup-success" : null].filter(Boolean).join(" ") || undefined}>
          <label>
            <span>Full name</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>
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
              name="new-password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>
          <fieldset className="switchboard-role-choice">
            <legend>Role</legend>
            <p>Used for this account-creation operation; it is not a runtime role switch.</p>
            <div>
              <label className={role === "freelancer" ? "is-selected" : undefined}>
                <input type="radio" name="role" value="freelancer" checked={role === "freelancer"} onChange={() => setRole("freelancer")} />
                <span><b>Freelancer</b><small>Find and propose</small></span>
              </label>
              <label className={role === "client" ? "is-selected" : undefined}>
                <input type="radio" name="role" value="client" checked={role === "client"} onChange={() => setRole("client")} />
                <span><b>Client</b><small>Create and review</small></span>
              </label>
            </div>
          </fieldset>
          {errorMessage ? (
            <p id="signup-error" className="switchboard-auth-message is-error" role="alert">{errorMessage}</p>
          ) : null}
          {successMessage ? (
            <p id="signup-success" className="switchboard-auth-message is-success" role="status">{successMessage}</p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="switchboard-auth-submit"
          >
            <span>{isSubmitting ? "Creating account..." : "Create account"}</span>
            <b aria-hidden="true">→</b>
          </button>
        </form>
        <p className="switchboard-auth-alternate">Already have an account? <Link to="/login">Login</Link>.</p>
      </div>
    </section>
  );
}
