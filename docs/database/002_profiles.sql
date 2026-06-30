-- GigMatch AI: structured freelancer and client profiles.
-- Run this in the Supabase SQL editor after docs/database/001_auth_profiles.sql.

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

drop trigger if exists set_freelancer_profiles_updated_at on public.freelancer_profiles;

create trigger set_freelancer_profiles_updated_at
before update on public.freelancer_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_client_profiles_updated_at on public.client_profiles;

create trigger set_client_profiles_updated_at
before update on public.client_profiles
for each row
execute function public.set_updated_at();

alter table public.freelancer_profiles enable row level security;
alter table public.client_profiles enable row level security;

drop policy if exists "Freelancers can select their own freelancer profile" on public.freelancer_profiles;
drop policy if exists "Freelancers can insert their own freelancer profile" on public.freelancer_profiles;
drop policy if exists "Freelancers can update their own freelancer profile" on public.freelancer_profiles;
drop policy if exists "Admins can select all freelancer profiles" on public.freelancer_profiles;

create policy "Freelancers can select their own freelancer profile"
on public.freelancer_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'freelancer'
  )
);

create policy "Freelancers can insert their own freelancer profile"
on public.freelancer_profiles
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'freelancer'
  )
);

create policy "Freelancers can update their own freelancer profile"
on public.freelancer_profiles
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'freelancer'
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'freelancer'
  )
);

create policy "Admins can select all freelancer profiles"
on public.freelancer_profiles
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

drop policy if exists "Clients can select their own client profile" on public.client_profiles;
drop policy if exists "Clients can insert their own client profile" on public.client_profiles;
drop policy if exists "Clients can update their own client profile" on public.client_profiles;
drop policy if exists "Admins can select all client profiles" on public.client_profiles;

create policy "Clients can select their own client profile"
on public.client_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'client'
  )
);

create policy "Clients can insert their own client profile"
on public.client_profiles
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'client'
  )
);

create policy "Clients can update their own client profile"
on public.client_profiles
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'client'
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'client'
  )
);

create policy "Admins can select all client profiles"
on public.client_profiles
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

revoke all on public.freelancer_profiles from anon;
revoke all on public.freelancer_profiles from authenticated;
revoke all on public.client_profiles from anon;
revoke all on public.client_profiles from authenticated;

grant usage on schema public to authenticated;

grant select, insert on public.freelancer_profiles to authenticated;
grant update (
  headline,
  bio,
  location,
  experience_level,
  primary_role,
  tech_categories,
  skills,
  tools,
  project_links,
  github_url,
  portfolio_url,
  linkedin_url,
  availability,
  preferred_gig_type,
  updated_at
) on public.freelancer_profiles to authenticated;

grant select, insert on public.client_profiles to authenticated;
grant update (
  company_name,
  contact_name,
  website_url,
  industry,
  company_size,
  hiring_focus,
  bio,
  updated_at
) on public.client_profiles to authenticated;
