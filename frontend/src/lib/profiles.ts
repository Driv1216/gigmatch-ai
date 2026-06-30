import { supabase } from "./supabaseClient";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type Availability = "available" | "limited" | "unavailable";
export type PreferredGigType = "short_term" | "long_term" | "internship" | "part_time" | "any";
export type CompanySize = "solo" | "small" | "medium" | "large" | "enterprise";

export type FreelancerProfile = {
  id: string;
  user_id: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  experience_level: ExperienceLevel | null;
  primary_role: string | null;
  tech_categories: string[];
  skills: string[];
  tools: string[];
  project_links: string[];
  github_url: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  availability: Availability | null;
  preferred_gig_type: PreferredGigType | null;
  created_at: string;
  updated_at: string;
};

export type FreelancerProfileInput = Omit<FreelancerProfile, "id" | "created_at" | "updated_at">;

export type ClientProfile = {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_name: string | null;
  website_url: string | null;
  industry: string | null;
  company_size: CompanySize | null;
  hiring_focus: string[];
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientProfileInput = Omit<ClientProfile, "id" | "created_at" | "updated_at">;

export function csvToArray(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function arrayToCsv(value: string[] | null | undefined) {
  return value?.join(", ") ?? "";
}

export function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function fetchFreelancerProfile(userId: string): Promise<FreelancerProfile | null> {
  const { data, error } = await supabase.from("freelancer_profiles").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data as FreelancerProfile | null;
}

export async function saveFreelancerProfile(input: FreelancerProfileInput, hasExistingProfile: boolean) {
  if (hasExistingProfile) {
    const { user_id: userId, ...editableProfile } = input;
    const { error } = await supabase.from("freelancer_profiles").update(editableProfile).eq("user_id", userId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("freelancer_profiles").insert(input);

  if (error) {
    throw error;
  }
}

export async function fetchClientProfile(userId: string): Promise<ClientProfile | null> {
  const { data, error } = await supabase.from("client_profiles").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data as ClientProfile | null;
}

export async function saveClientProfile(input: ClientProfileInput, hasExistingProfile: boolean) {
  if (hasExistingProfile) {
    const { user_id: userId, ...editableProfile } = input;
    const { error } = await supabase.from("client_profiles").update(editableProfile).eq("user_id", userId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("client_profiles").insert(input);

  if (error) {
    throw error;
  }
}
