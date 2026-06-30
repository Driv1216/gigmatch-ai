-- GigMatch AI: parsing persistence foundation.
-- Review this SQL before running it in the Supabase SQL editor.
-- Run only after docs/database/001_auth_profiles.sql,
-- docs/database/002_profiles.sql, and docs/database/003_gigs.sql.

create table if not exists public.resume_parses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(id) on delete cascade,
  source_kind text not null default 'resume_text'
    check (source_kind in ('resume_text', 'resume_pdf', 'resume_docx', 'manual')),
  source_file_name text,
  source_mime_type text,
  source_size_bytes integer check (source_size_bytes is null or source_size_bytes >= 0),
  parser_version text not null default 'deterministic_v1',
  status text not null default 'parsed'
    check (status in ('parsed', 'reviewed', 'failed')),
  extracted_text_preview text check (
    extracted_text_preview is null
    or char_length(extracted_text_preview) <= 2000
  ),
  parsed_json jsonb not null default '{}'::jsonb,
  skills text[] not null default '{}',
  categories text[] not null default '{}',
  matched_terms text[] not null default '{}',
  unmatched_keywords text[] not null default '{}',
  confidence text not null default 'deterministic'
    check (confidence in ('deterministic')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gig_parses (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null unique references public.gigs(id) on delete cascade,
  parser_version text not null default 'deterministic_v1',
  status text not null default 'parsed'
    check (status in ('parsed', 'reviewed', 'failed')),
  parsed_json jsonb not null default '{}'::jsonb,
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  categories text[] not null default '{}',
  matched_terms text[] not null default '{}',
  unmatched_keywords text[] not null default '{}',
  confidence text not null default 'deterministic'
    check (confidence in ('deterministic')),
  seniority_level text,
  deliverables text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The unique constraints on resume_parses.user_id and gig_parses.gig_id
-- create btree indexes for owner/current-parse lookups.
create index if not exists resume_parses_skills_gin_idx on public.resume_parses using gin (skills);
create index if not exists resume_parses_categories_gin_idx on public.resume_parses using gin (categories);

create index if not exists gig_parses_required_skills_gin_idx on public.gig_parses using gin (required_skills);
create index if not exists gig_parses_preferred_skills_gin_idx on public.gig_parses using gin (preferred_skills);
create index if not exists gig_parses_categories_gin_idx on public.gig_parses using gin (categories);

drop trigger if exists set_resume_parses_updated_at on public.resume_parses;

create trigger set_resume_parses_updated_at
before update on public.resume_parses
for each row
execute function public.set_updated_at();

drop trigger if exists set_gig_parses_updated_at on public.gig_parses;

create trigger set_gig_parses_updated_at
before update on public.gig_parses
for each row
execute function public.set_updated_at();

alter table public.resume_parses enable row level security;
alter table public.gig_parses enable row level security;

drop policy if exists "Freelancers can select their own resume parse" on public.resume_parses;
drop policy if exists "Freelancers can insert their own resume parse" on public.resume_parses;
drop policy if exists "Freelancers can update their own resume parse" on public.resume_parses;
drop policy if exists "Freelancers can delete their own resume parse" on public.resume_parses;

create policy "Freelancers can select their own resume parse"
on public.resume_parses
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

create policy "Freelancers can insert their own resume parse"
on public.resume_parses
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

create policy "Freelancers can update their own resume parse"
on public.resume_parses
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

create policy "Freelancers can delete their own resume parse"
on public.resume_parses
for delete
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

drop policy if exists "Clients can select parses for their own gigs" on public.gig_parses;
drop policy if exists "Clients can insert parses for their own gigs" on public.gig_parses;
drop policy if exists "Clients can update parses for their own gigs" on public.gig_parses;
drop policy if exists "Clients can delete parses for their own gigs" on public.gig_parses;

create policy "Clients can select parses for their own gigs"
on public.gig_parses
for select
to authenticated
using (
  exists (
    select 1
    from public.gigs g
    where g.id = gig_parses.gig_id
      and g.client_id = (select auth.uid())
      and exists (
        select 1
        from public.user_profiles
        where id = (select auth.uid())
          and role = 'client'
      )
  )
);

create policy "Clients can insert parses for their own gigs"
on public.gig_parses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.gigs g
    where g.id = gig_parses.gig_id
      and g.client_id = (select auth.uid())
      and exists (
        select 1
        from public.user_profiles
        where id = (select auth.uid())
          and role = 'client'
      )
  )
);

create policy "Clients can update parses for their own gigs"
on public.gig_parses
for update
to authenticated
using (
  exists (
    select 1
    from public.gigs g
    where g.id = gig_parses.gig_id
      and g.client_id = (select auth.uid())
      and exists (
        select 1
        from public.user_profiles
        where id = (select auth.uid())
          and role = 'client'
      )
  )
)
with check (
  exists (
    select 1
    from public.gigs g
    where g.id = gig_parses.gig_id
      and g.client_id = (select auth.uid())
      and exists (
        select 1
        from public.user_profiles
        where id = (select auth.uid())
          and role = 'client'
      )
  )
);

create policy "Clients can delete parses for their own gigs"
on public.gig_parses
for delete
to authenticated
using (
  exists (
    select 1
    from public.gigs g
    where g.id = gig_parses.gig_id
      and g.client_id = (select auth.uid())
      and exists (
        select 1
        from public.user_profiles
        where id = (select auth.uid())
          and role = 'client'
      )
  )
);

revoke all on public.resume_parses from anon;
revoke all on public.resume_parses from authenticated;
revoke all on public.gig_parses from anon;
revoke all on public.gig_parses from authenticated;

grant usage on schema public to authenticated;

grant select, insert, delete on public.resume_parses to authenticated;
grant update (
  source_kind,
  source_file_name,
  source_mime_type,
  source_size_bytes,
  parser_version,
  status,
  extracted_text_preview,
  parsed_json,
  skills,
  categories,
  matched_terms,
  unmatched_keywords,
  confidence,
  updated_at
) on public.resume_parses to authenticated;

grant select, insert, delete on public.gig_parses to authenticated;
grant update (
  parser_version,
  status,
  parsed_json,
  required_skills,
  preferred_skills,
  categories,
  matched_terms,
  unmatched_keywords,
  confidence,
  seniority_level,
  deliverables,
  updated_at
) on public.gig_parses to authenticated;
