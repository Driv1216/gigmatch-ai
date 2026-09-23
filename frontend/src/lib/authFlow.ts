import type { AuthError, User } from "@supabase/supabase-js";

export const googleAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";

export function authCallbackUrl() {
  return new URL("/auth/callback", window.location.origin).toString();
}

export function isSupportedAuthUser(user: User | null) {
  return Boolean(user?.email && !user.is_anonymous);
}

export function isAuthRateLimitError(error: AuthError | null) {
  return error?.status === 429 || error?.code === "over_email_send_rate_limit";
}

export function callbackErrorFromLocation(location: Pick<Location, "search" | "hash">) {
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
  const error = query.get("error") ?? fragment.get("error");
  const errorCode = query.get("error_code") ?? fragment.get("error_code");

  if (!error && !errorCode) {
    return null;
  }

  return error === "access_denied" || errorCode === "access_denied"
    ? "Google sign-in was cancelled. Your account was not changed."
    : "This authentication link is invalid or has expired. Please try again.";
}
