export type ConceptMode =
  | 'concept_hub'
  | 'concept1_precision'
  | 'concept2_editorial'
  | 'concept3_matrix'
  | 'concept4_splitcanvas'
  | 'concept5_enterprise'
  | 'concept6_terminal'
  | 'concept7_broadsheet'
  | 'concept8_brutalist'
  | 'concept9_aurora'
  | 'concept10_kanban'
  | 'concept11_neumorphic'
  | 'concept12_cyberpunk'
  | 'concept13_blueprint'
  | 'concept14_frostglass'
  | 'concept15_bento'
  | 'concept16_swiss'
  | 'concept17_compliance'
  | 'concept18_retro_os'
  | 'concept19_acid_zine'
  | 'concept20_spatial'
  | 'concept21_constellation'
  | 'concept22_vinyl'
  | 'concept23_arcade'
  | 'concept24_trading'
  | 'concept25_reel';

export type UserRole = 'freelancer' | 'client' | 'admin';

export interface Skill {
  name: string;
  category: 'frontend' | 'backend' | 'ai_ml' | 'devops' | 'mobile' | 'design' | 'database';
  proficiency?: 'expert' | 'advanced' | 'intermediate';
  experience_years?: number;
  extracted_confidence?: number; // 0 to 1
}

export interface MatchBreakdown {
  overall_score: number; // 0 to 100
  keyword_score: number; // 0 to 100
  semantic_score: number; // 0 to 100
  skill_coverage_pct: number;
  matching_skills: string[];
  missing_skills: string[];
  experience_fit: 'Exact' | 'Exceeds' | 'Developing';
  justification: string;
}

export interface Gig {
  id: string;
  title: string;
  client_id: string;
  client_name: string;
  client_company: string;
  client_avatar: string;
  client_industry: string;
  category: string;
  description: string;
  required_skills: string[];
  budget_min: number;
  budget_max: number;
  payment_type: 'hourly' | 'fixed';
  work_mode: 'Remote' | 'Hybrid' | 'Onsite';
  location: string;
  application_deadline: string;
  posted_date: string;
  status: 'open' | 'in_review' | 'closed';
  total_applicants: number;
  match_breakdown?: MatchBreakdown;
}

export interface FreelancerProfile {
  id: string;
  full_name: string;
  title: string;
  avatar: string;
  bio: string;
  hourly_rate: number;
  completed_gigs: number;
  rating: number;
  experience_years: number;
  location: string;
  skills: Skill[];
  parsed_resume_text?: string;
  parsed_at?: string;
  verified_status: boolean;
  availability: 'Immediate' | '2 weeks' | '1 month';
  match_breakdown?: MatchBreakdown;
}

export interface Application {
  id: string;
  gig_id: string;
  gig_title: string;
  freelancer_id: string;
  freelancer_name: string;
  freelancer_title: string;
  freelancer_avatar: string;
  match_score: number; // 0 - 100
  keyword_score: number;
  semantic_score: number;
  applied_at: string;
  status: 'pending' | 'shortlisted' | 'interview' | 'accepted' | 'declined';
  proposal_text: string;
  matching_skills: string[];
  missing_skills: string[];
}

export interface EvaluationBenchmark {
  algorithm_id: 'keyword' | 'semantic' | 'hybrid';
  algorithm_name: string;
  ndcg_5: number;
  ndcg_10: number;
  map_score: number;
  mrr_score: number;
  precision_5: number;
  latency_ms: number;
  total_queries_tested: number;
  relevance_coverage: number;
}
