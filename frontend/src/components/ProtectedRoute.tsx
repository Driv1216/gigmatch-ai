import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole, type UserRole } from "../lib/auth";
import { PageContainer } from "./PageContainer";

type ProtectedRouteProps = {
  allowedRole: UserRole;
  children: ReactNode;
};

export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { user, profile, role, loading, profileError } = useAuth();

  if (loading) {
    return (
      <PageContainer>
        <p className="text-sm font-medium text-muted">Loading your account...</p>
      </PageContainer>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile || !role) {
    return (
      <PageContainer>
        <div className="max-w-xl rounded-lg border border-red-200 bg-white p-8 shadow-soft">
          <h1 className="text-2xl font-bold tracking-normal text-ink">Profile setup issue</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            {profileError ?? "Your account exists, but no role profile was found."}
          </p>
        </div>
      </PageContainer>
    );
  }

  if (role !== allowedRole) {
    return <Navigate to={dashboardPathForRole(role)} replace />;
  }

  return children;
}
