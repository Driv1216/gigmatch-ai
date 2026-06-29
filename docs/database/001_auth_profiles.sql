-- GigMatch AI: Supabase auth profile foundation.
-- Run this in the Supabase SQL editor for the gigmatch-ai project.

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

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

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

drop trigger if exists prevent_user_profile_role_change on public.user_profiles;

create trigger prevent_user_profile_role_change
before update on public.user_profiles
for each row
execute function public.prevent_user_profile_role_change();

alter table public.user_profiles enable row level security;

drop policy if exists "Users can select their own profile" on public.user_profiles;
drop policy if exists "Users can insert their own non-admin profile" on public.user_profiles;
drop policy if exists "Users can update their own non-admin profile" on public.user_profiles;

create policy "Users can select their own profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert their own non-admin profile"
on public.user_profiles
for insert
to authenticated
with check (
  (select auth.uid()) = id
  and role in ('freelancer', 'client')
);

create policy "Users can update their own non-admin profile"
on public.user_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check (
  (select auth.uid()) = id
  and role in ('freelancer', 'client')
);

revoke all on public.user_profiles from anon;
revoke all on public.user_profiles from authenticated;

grant usage on schema public to authenticated;
grant select, insert on public.user_profiles to authenticated;
grant update (full_name, updated_at) on public.user_profiles to authenticated;
