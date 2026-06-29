import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/PageContainer";
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
      setErrorMessage(error?.message ?? "Unable to create account.");
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
      setErrorMessage(profileError.message);
      setIsSubmitting(false);
      return;
    }

    await refreshProfile();
    navigate(dashboardPathForRole(role));
  }

  return (
    <PageContainer>
      <div className="max-w-xl rounded-lg border border-line bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold tracking-normal text-ink">Signup</h1>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className="mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
            />
          </label>
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
              minLength={6}
              className="mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as SignupRole)}
              className="mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
            >
              <option value="freelancer">Freelancer</option>
              <option value="client">Client</option>
            </select>
          </label>
          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
    </PageContainer>
  );
}
