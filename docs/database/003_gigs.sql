-- GigMatch AI: client gig posting.
-- Run this in the Supabase SQL editor after docs/database/001_auth_profiles.sql
-- and docs/database/002_profiles.sql.

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
    budget_min is null
    or budget_max is null
    or budget_max >= budget_min
  )
);

create index if not exists gigs_client_id_idx on public.gigs (client_id);
create index if not exists gigs_status_idx on public.gigs (status);
create index if not exists gigs_tech_category_idx on public.gigs (tech_category);
create index if not exists gigs_required_skills_gin_idx on public.gigs using gin (required_skills);
create index if not exists gigs_preferred_skills_gin_idx on public.gigs using gin (preferred_skills);

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

drop trigger if exists set_gigs_updated_at on public.gigs;

create trigger set_gigs_updated_at
before update on public.gigs
for each row
execute function public.set_updated_at();

alter table public.gigs enable row level security;

drop policy if exists "Clients can select their own gigs" on public.gigs;
drop policy if exists "Clients can insert their own gigs" on public.gigs;
drop policy if exists "Clients can update their own gigs" on public.gigs;
drop policy if exists "Admins can select all gigs" on public.gigs;

create policy "Clients can select their own gigs"
on public.gigs
for select
to authenticated
using (
  (select auth.uid()) = client_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'client'
  )
);

create policy "Clients can insert their own gigs"
on public.gigs
for insert
to authenticated
with check (
  (select auth.uid()) = client_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'client'
  )
);

create policy "Clients can update their own gigs"
on public.gigs
for update
to authenticated
using (
  (select auth.uid()) = client_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'client'
  )
)
with check (
  (select auth.uid()) = client_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'client'
  )
);

create policy "Admins can select all gigs"
on public.gigs
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
);

revoke all on public.gigs from anon;
revoke all on public.gigs from authenticated;

grant usage on schema public to authenticated;

grant select, insert on public.gigs to authenticated;
grant update (
  title,
  description,
  tech_category,
  required_skills,
  preferred_skills,
  budget_min,
  budget_max,
  difficulty_level,
  seniority_needed,
  deliverables,
  work_mode,
  deadline,
  status,
  updated_at
) on public.gigs to authenticated;
