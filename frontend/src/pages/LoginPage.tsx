import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/PageContainer";
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
      setErrorMessage(error?.message ?? "Unable to login with those credentials.");
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
    } catch (profileError) {
      setErrorMessage(profileError instanceof Error ? profileError.message : "Unable to load your profile.");
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <div className="max-w-xl rounded-lg border border-line bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold tracking-normal text-ink">Login</h1>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
            />
          </label>
          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </PageContainer>
  );
}
