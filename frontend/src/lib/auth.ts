import { supabase } from "./supabaseClient";

export type UserRole = "freelancer" | "client" | "admin";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type AccountSetupResult = Pick<UserProfile, "id" | "email" | "full_name" | "role">;

export function dashboardPathForRole(role: UserRole) {
  return `/dashboard/${role}`;
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "freelancer" || value === "client" || value === "admin";
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id,email,full_name,role,created_at,updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  if (!isUserRole(data.role)) {
    throw new Error("Profile has an invalid role.");
  }

  return data as UserProfile;
}

export async function completeAccountSetup(
  fullName: string,
  role: Exclude<UserRole, "admin">,
): Promise<AccountSetupResult> {
  const { data, error } = await supabase
    .rpc("complete_account_setup", {
      p_full_name: fullName,
      p_role: role,
    })
    .single();

  if (error) {
    throw error;
  }

  const result = data as AccountSetupResult | null;

  if (!result || !isUserRole(result.role)) {
    throw new Error("Account setup returned an invalid profile.");
  }

  return {
    id: result.id,
    email: result.email,
    full_name: result.full_name,
    role: result.role,
  };
}
