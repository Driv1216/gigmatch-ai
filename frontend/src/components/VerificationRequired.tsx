import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authCallbackUrl, isAuthRateLimitError } from "../lib/authFlow";
import { supabase } from "../lib/supabaseClient";
import { AuthStatePage } from "./AuthStatePage";

type VerificationRequiredProps = {
  email: string;
  signedIn?: boolean;
};

export function VerificationRequired({ email, signedIn = false }: VerificationRequiredProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (isError) {
      statusRef.current?.focus();
    }
  }, [isError, message]);

  async function resendConfirmation() {
    setResending(true);
    setMessage(null);
    setIsError(false);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: authCallbackUrl() },
    });

    if (error) {
      setIsError(true);
      setMessage(isAuthRateLimitError(error)
        ? "Please wait before requesting another confirmation email."
        : "We could not resend the confirmation email. Please try again later.");
    } else {
      setMessage("Confirmation email accepted for delivery. Check your inbox and spam folder.");
    }
    setResending(false);
  }

  async function leaveAccount() {
    if (signedIn) {
      await logout();
    }
    navigate("/login");
  }

  return (
    <AuthStatePage
      eyebrow="EMAIL VERIFICATION / IDENTITY GATE"
      title="Confirm the address. Then build the profile."
      description="GigMatch creates a participant profile only after Supabase confirms ownership of the Auth email address."
      panelTitle="Verification required"
      panelBody={`Open the confirmation link sent to ${email}. The link will return you to account setup.`}
      actions={(
        <>
          {message ? (
            <p
              ref={statusRef}
              tabIndex={isError ? -1 : undefined}
              className={`switchboard-auth-message ${isError ? "is-error" : "is-success"}`}
              role={isError ? "alert" : "status"}
            >
              {message}
            </p>
          ) : null}
          <button type="button" className="switchboard-auth-submit" onClick={resendConfirmation} disabled={resending}>
            <span>{resending ? "Requesting..." : "Resend confirmation"}</span><b aria-hidden="true">→</b>
          </button>
          <button type="button" className="switchboard-auth-secondary" onClick={leaveAccount}>
            {signedIn ? "Logout" : "Return to login"}
          </button>
        </>
      )}
    />
  );
}
