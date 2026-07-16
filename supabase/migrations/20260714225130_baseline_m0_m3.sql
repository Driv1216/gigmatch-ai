-- GigMatch AI local migration baseline for the already-complete Milestones 0-3.
-- This mirrors docs/database/001_auth_profiles.sql through 004_parsing_foundation.sql
-- so `supabase db reset` can verify later migrations from a clean database.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('freelancer', 'client', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_user_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and new.role is distinct from old.role then
    raise exception 'Role changes are not allowed for authenticated clients.';
  end if;
  return new;
end;
$$;

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create trigger prevent_user_profile_role_change
before update on public.user_profiles
for each row execute function public.prevent_user_profile_role_change();

create table if not exists public.freelancer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(id) on delete cascade,
  headline text,
  bio text,
  location text,
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  primary_role text,
  tech_categories text[] default '{}',
  skills text[] default '{}',
  tools text[] default '{}',
  project_links text[] default '{}',
  github_url text,
  portfolio_url text,
  linkedin_url text,
  availability text check (availability in ('available', 'limited', 'unavailable')),
  preferred_gig_type text check (preferred_gig_type in ('short_term', 'long_term', 'internship', 'part_time', 'any')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(id) on delete cascade,
  company_name text,
  contact_name text,
  website_url text,
  industry text,
  company_size text check (company_size in ('solo', 'small', 'medium', 'large', 'enterprise')),
  hiring_focus text[] default '{}',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_freelancer_profiles_updated_at
before update on public.freelancer_profiles
for each row execute function public.set_updated_at();

create trigger set_client_profiles_updated_at
before update on public.client_profiles
for each row execute function public.set_updated_at();

create table if not exists public.gigs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  description text not null,
  tech_category text not null,
  required_skills text[] default '{}',
  preferred_skills text[] default '{}',
  budget_min integer check (budget_min is null or budget_min >= 0),
  budget_max integer check (budget_max is null or budget_max >= 0),
  difficulty_level text check (difficulty_level in ('beginner', 'intermediate', 'advanced')),
  seniority_needed text check (seniority_needed in ('student', 'junior', 'mid', 'senior', 'any')),
  deliverables text[] default '{}',
  work_mode text check (work_mode in ('remote', 'hybrid', 'onsite')),
  deadline date,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gigs_budget_range_check check (
    budget_min is null or budget_max is null or budget_max >= budget_min
  )
);

create index gigs_client_id_idx on public.gigs (client_id);
create index gigs_status_idx on public.gigs (status);
create index gigs_tech_category_idx on public.gigs (tech_category);
create index gigs_required_skills_gin_idx on public.gigs using gin (required_skills);
create index gigs_preferred_skills_gin_idx on public.gigs using gin (preferred_skills);

create trigger set_gigs_updated_at
before update on public.gigs
for each row execute function public.set_updated_at();

create table if not exists public.resume_parses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(id) on delete cascade,
  source_kind text not null default 'resume_text'
    check (source_kind in ('resume_text', 'resume_pdf', 'resume_docx', 'manual')),
  source_file_name text,
  source_mime_type text,
  source_size_bytes integer check (source_size_bytes is null or source_size_bytes >= 0),
  parser_version text not null default 'deterministic_v1',
  status text not null default 'parsed' check (status in ('parsed', 'reviewed', 'failed')),
  extracted_text_preview text check (extracted_text_preview is null or char_length(extracted_text_preview) <= 2000),
  parsed_json jsonb not null default '{}'::jsonb,
  skills text[] not null default '{}',
  categories text[] not null default '{}',
  matched_terms text[] not null default '{}',
  unmatched_keywords text[] not null default '{}',
  confidence text not null default 'deterministic' check (confidence = 'deterministic'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gig_parses (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null unique references public.gigs(id) on delete cascade,
  parser_version text not null default 'deterministic_v1',
  status text not null default 'parsed' check (status in ('parsed', 'reviewed', 'failed')),
  parsed_json jsonb not null default '{}'::jsonb,
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  categories text[] not null default '{}',
  matched_terms text[] not null default '{}',
  unmatched_keywords text[] not null default '{}',
  confidence text not null default 'deterministic' check (confidence = 'deterministic'),
  seniority_level text,
  deliverables text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_resume_parses_updated_at
before update on public.resume_parses
for each row execute function public.set_updated_at();

create trigger set_gig_parses_updated_at
before update on public.gig_parses
for each row execute function public.set_updated_at();

create index resume_parses_skills_gin_idx on public.resume_parses using gin (skills);
create index resume_parses_categories_gin_idx on public.resume_parses using gin (categories);
create index gig_parses_required_skills_gin_idx on public.gig_parses using gin (required_skills);
create index gig_parses_preferred_skills_gin_idx on public.gig_parses using gin (preferred_skills);
create index gig_parses_categories_gin_idx on public.gig_parses using gin (categories);

alter table public.user_profiles enable row level security;
alter table public.freelancer_profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.gigs enable row level security;
alter table public.resume_parses enable row level security;
alter table public.gig_parses enable row level security;

create policy "Users can select their own profile" on public.user_profiles
for select to authenticated using ((select auth.uid()) = id);
create policy "Users can insert their own non-admin profile" on public.user_profiles
for insert to authenticated with check ((select auth.uid()) = id and role in ('freelancer', 'client'));
create policy "Users can update their own non-admin profile" on public.user_profiles
for update to authenticated using ((select auth.uid()) = id)
with check ((select auth.uid()) = id and role in ('freelancer', 'client'));

create policy "Freelancers can select their own freelancer profile" on public.freelancer_profiles
for select to authenticated using ((select auth.uid()) = user_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'freelancer'
));
create policy "Freelancers can insert their own freelancer profile" on public.freelancer_profiles
for insert to authenticated with check ((select auth.uid()) = user_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'freelancer'
));
create policy "Freelancers can update their own freelancer profile" on public.freelancer_profiles
for update to authenticated using ((select auth.uid()) = user_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'freelancer'
)) with check ((select auth.uid()) = user_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'freelancer'
));
create policy "Admins can select all freelancer profiles" on public.freelancer_profiles
for select to authenticated using (exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'admin'
));

create policy "Clients can select their own client profile" on public.client_profiles
for select to authenticated using ((select auth.uid()) = user_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'client'
));
create policy "Clients can insert their own client profile" on public.client_profiles
for insert to authenticated with check ((select auth.uid()) = user_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'client'
));
create policy "Clients can update their own client profile" on public.client_profiles
for update to authenticated using ((select auth.uid()) = user_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'client'
)) with check ((select auth.uid()) = user_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'client'
));
create policy "Admins can select all client profiles" on public.client_profiles
for select to authenticated using (exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'admin'
));

create policy "Clients can select their own gigs" on public.gigs
for select to authenticated using ((select auth.uid()) = client_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'client'
));
create policy "Clients can insert their own gigs" on public.gigs
for insert to authenticated with check ((select auth.uid()) = client_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'client'
));
create policy "Clients can update their own gigs" on public.gigs
for update to authenticated using ((select auth.uid()) = client_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'client'
)) with check ((select auth.uid()) = client_id and exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'client'
));
create policy "Admins can select all gigs" on public.gigs
for select to authenticated using (exists (
  select 1 from public.user_profiles where id = (select auth.uid()) and role = 'admin'
));

create policy "Freelancers can select their own resume parse" on public.resume_parses
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Freelancers can insert their own resume parse" on public.resume_parses
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Freelancers can update their own resume parse" on public.resume_parses
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Freelancers can delete their own resume parse" on public.resume_parses
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Clients can select parses for their own gigs" on public.gig_parses
for select to authenticated using (exists (
  select 1 from public.gigs g where g.id = gig_parses.gig_id and g.client_id = (select auth.uid())
));
create policy "Clients can insert parses for their own gigs" on public.gig_parses
for insert to authenticated with check (exists (
  select 1 from public.gigs g where g.id = gig_parses.gig_id and g.client_id = (select auth.uid())
));
create policy "Clients can update parses for their own gigs" on public.gig_parses
for update to authenticated using (exists (
  select 1 from public.gigs g where g.id = gig_parses.gig_id and g.client_id = (select auth.uid())
)) with check (exists (
  select 1 from public.gigs g where g.id = gig_parses.gig_id and g.client_id = (select auth.uid())
));
create policy "Clients can delete parses for their own gigs" on public.gig_parses
for delete to authenticated using (exists (
  select 1 from public.gigs g where g.id = gig_parses.gig_id and g.client_id = (select auth.uid())
));

revoke all on public.user_profiles, public.freelancer_profiles, public.client_profiles,
  public.gigs, public.resume_parses, public.gig_parses from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert on public.user_profiles to authenticated;
grant update (full_name, updated_at) on public.user_profiles to authenticated;
grant select, insert on public.freelancer_profiles to authenticated;
grant update (headline, bio, location, experience_level, primary_role, tech_categories, skills, tools,
  project_links, github_url, portfolio_url, linkedin_url, availability, preferred_gig_type, updated_at)
  on public.freelancer_profiles to authenticated;
grant select, insert on public.client_profiles to authenticated;
grant update (company_name, contact_name, website_url, industry, company_size, hiring_focus, bio, updated_at)
  on public.client_profiles to authenticated;
grant select, insert on public.gigs to authenticated;
grant update (title, description, tech_category, required_skills, preferred_skills, budget_min, budget_max,
  difficulty_level, seniority_needed, deliverables, work_mode, deadline, status, updated_at)
  on public.gigs to authenticated;
grant select, insert, delete on public.resume_parses to authenticated;
grant update (source_kind, source_file_name, source_mime_type, source_size_bytes, parser_version, status,
  extracted_text_preview, parsed_json, skills, categories, matched_terms, unmatched_keywords, confidence, updated_at)
  on public.resume_parses to authenticated;
grant select, insert, delete on public.gig_parses to authenticated;
grant update (parser_version, status, parsed_json, required_skills, preferred_skills, categories, matched_terms,
  unmatched_keywords, confidence, seniority_level, deliverables, updated_at)
  on public.gig_parses to authenticated;
