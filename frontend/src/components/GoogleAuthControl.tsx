import { useState } from "react";
import { authCallbackUrl, googleAuthEnabled } from "../lib/authFlow";
import { supabase } from "../lib/supabaseClient";

type GoogleAuthControlProps = {
  onError: (message: string) => void;
};

export function GoogleAuthControl({ onError }: GoogleAuthControlProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!googleAuthEnabled) {
    return null;
  }

  async function continueWithGoogle() {
    setSubmitting(true);
    onError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl() },
    });

    if (error) {
      onError("Continue with Google is temporarily unavailable. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="switchboard-google-auth">
      <button type="button" onClick={continueWithGoogle} disabled={submitting}>
        <span className="switchboard-google-mark" aria-hidden="true">G</span>
        <span>{submitting ? "Opening Google..." : "Continue with Google"}</span>
      </button>
      <div className="switchboard-auth-divider" aria-hidden="true"><span>OR</span></div>
    </div>
  );
}
