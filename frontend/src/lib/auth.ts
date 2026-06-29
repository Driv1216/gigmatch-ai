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
