import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { GoogleAuthControl } from "../components/GoogleAuthControl";
import { PasswordField } from "../components/PasswordField";
import { VerificationRequired } from "../components/VerificationRequired";
import { authCallbackUrl, isAuthRateLimitError } from "../lib/authFlow";
import { passwordMeetsPolicy, passwordRules } from "../lib/passwordPolicy";
import { supabase } from "../lib/supabaseClient";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (errorMessage) errorRef.current?.focus();
  }, [errorMessage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!passwordMeetsPolicy(password)) {
      setErrorMessage("Password must satisfy all five requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Password and confirmation must match.");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authCallbackUrl() },
    });

    if (error || !data.user) {
      setErrorMessage(isAuthRateLimitError(error)
        ? "Please wait before trying to create another account."
        : "Unable to create account. Check the password requirements and try again.");
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      await supabase.auth.signOut();
      setErrorMessage("Registration is temporarily unavailable because email verification is not active. No profile was created.");
      setIsSubmitting(false);
      return;
    }

    setPendingEmail(email);
    setIsSubmitting(false);
  }

  if (pendingEmail) return <VerificationRequired email={pendingEmail} />;
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  return (
    <section className="switchboard-auth-page is-signup" aria-labelledby="signup-title">
      <aside className="switchboard-auth-context">
        <span className="switchboard-public-eyebrow">ACCOUNT CREATION / VERIFIED IDENTITY</span>
        <h1 id="signup-title">Confirm identity before choosing a side.</h1>
        <p>Signup establishes your Auth identity only. After confirmation, account setup collects your editable name and freelancer or client role.</p>
        <dl>
          <div><dt>Step 01</dt><dd>Create Auth identity</dd></div>
          <div><dt>Step 02</dt><dd>Confirm email ownership</dd></div>
          <div><dt>Step 03</dt><dd>Complete participant profile</dd></div>
        </dl>
      </aside>
      <div className="switchboard-auth-panel">
        <header>
          <span>SIGNUP / NEW IDENTITY</span>
          <h2>Create account</h2>
          <p>Your full name and role are collected only after verification.</p>
        </header>
        <form onSubmit={handleSubmit} noValidate aria-describedby={errorMessage ? "signup-error" : "password-rules"}>
          <GoogleAuthControl onError={setErrorMessage} />
          <label htmlFor="signup-email"><span>Email</span><input id="signup-email" type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <PasswordField id="signup-password" label="Password" name="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="password-rules" required />
          <ul id="password-rules" className="switchboard-password-rules" aria-label="Password requirements" aria-live="polite">
            {passwordRules.map((rule) => {
              const passes = rule.passes(password);
              return <li key={rule.id} className={passes ? "is-valid" : undefined}><span aria-hidden="true">{passes ? "✓" : "○"}</span>{rule.label}</li>;
            })}
          </ul>
          <PasswordField id="signup-password-confirmation" label="Confirm Password" name="password-confirmation" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={!passwordsMatch} aria-describedby={!passwordsMatch ? "password-match-error" : undefined} required />
          {!passwordsMatch ? <p id="password-match-error" className="switchboard-field-error">Passwords do not match.</p> : null}
          {errorMessage ? <p ref={errorRef} tabIndex={-1} id="signup-error" className="switchboard-auth-message is-error" role="alert">{errorMessage}</p> : null}
          <button type="submit" disabled={isSubmitting} className="switchboard-auth-submit"><span>{isSubmitting ? "Creating identity..." : "Create account"}</span><b aria-hidden="true">→</b></button>
        </form>
        <p className="switchboard-auth-alternate">Already have an account? <Link to="/login">Login</Link>.</p>
      </div>
    </section>
  );
}
