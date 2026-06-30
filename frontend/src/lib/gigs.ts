import { supabase } from "./supabaseClient";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type SeniorityNeeded = "student" | "junior" | "mid" | "senior" | "any";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type GigStatus = "draft" | "open" | "closed";

export type Gig = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  tech_category: string;
  required_skills: string[];
  preferred_skills: string[];
  budget_min: number | null;
  budget_max: number | null;
  difficulty_level: DifficultyLevel | null;
  seniority_needed: SeniorityNeeded | null;
  deliverables: string[];
  work_mode: WorkMode | null;
  deadline: string | null;
  status: GigStatus;
  created_at: string;
  updated_at: string;
};

export type GigInput = Omit<Gig, "id" | "created_at" | "updated_at">;
export type GigUpdateInput = Omit<GigInput, "client_id">;

export async function fetchClientGigs(clientId: string): Promise<Gig[]> {
  const { data, error } = await supabase
    .from("gigs")
    .select("*")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Gig[];
}

export async function fetchGigForClient(gigId: string, clientId: string): Promise<Gig | null> {
  const { data, error } = await supabase
    .from("gigs")
    .select("*")
    .eq("id", gigId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Gig | null;
}

export async function createGig(input: GigInput) {
  const { error } = await supabase.from("gigs").insert(input);

  if (error) {
    throw error;
  }
}

export async function updateGig(gigId: string, clientId: string, input: GigUpdateInput) {
  const { error } = await supabase.from("gigs").update(input).eq("id", gigId).eq("client_id", clientId);

  if (error) {
    throw error;
  }
}
