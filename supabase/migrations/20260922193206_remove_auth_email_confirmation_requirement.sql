-- Email confirmation is disabled for GigMatch Auth. Keep profile creation
-- bound to auth.uid() and the server-owned auth.users email, but do not make
-- Auth confirmation timestamps a second authorization requirement.
create or replace function public.complete_account_setup(
  p_full_name text,
  p_role text
)
returns table (
  id uuid,
  email text,
  full_name text,
  role text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_is_anonymous boolean;
  v_full_name text := pg_catalog.btrim(p_full_name);
  v_profile public.user_profiles%rowtype;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to complete account setup.';
  end if;

  select
    auth_user.email,
    case
      when auth_user.is_anonymous is null then false
      else auth_user.is_anonymous
    end
  into v_email, v_is_anonymous
  from auth.users as auth_user
  where auth_user.id = v_user_id;

  if not found or v_email is null or v_is_anonymous then
    raise exception using
      errcode = '42501',
      message = 'An authenticated email identity is required to complete account setup.';
  end if;

  if v_full_name is null
     or pg_catalog.char_length(v_full_name) < 1
     or pg_catalog.char_length(v_full_name) > 100
     or pg_catalog.strpos(v_full_name, pg_catalog.chr(10)) > 0
     or pg_catalog.strpos(v_full_name, pg_catalog.chr(13)) > 0 then
    raise exception using
      errcode = '22023',
      message = 'Full name must contain 1 to 100 characters on one line.';
  end if;

  if p_role is null or (p_role <> 'freelancer' and p_role <> 'client') then
    raise exception using
      errcode = '22023',
      message = 'Role must be freelancer or client.';
  end if;

  select profile.*
  into v_profile
  from public.user_profiles as profile
  where profile.id = v_user_id;

  if found then
    if v_profile.email is distinct from v_email then
      raise exception using
        errcode = '23514',
        message = 'The existing profile email does not match the authenticated identity.';
    end if;

    return query
    select v_profile.id, v_profile.email, v_profile.full_name, v_profile.role;
    return;
  end if;

  insert into public.user_profiles as profile (id, email, full_name, role)
  values (v_user_id, v_email, v_full_name, p_role)
  on conflict on constraint user_profiles_pkey do nothing;

  select profile.*
  into v_profile
  from public.user_profiles as profile
  where profile.id = v_user_id;

  if not found or v_profile.email is distinct from v_email then
    raise exception using
      errcode = '23514',
      message = 'The account profile could not be resolved from the authenticated identity.';
  end if;

  return query
  select v_profile.id, v_profile.email, v_profile.full_name, v_profile.role;
end;
$$;

revoke all on function public.complete_account_setup(text, text) from public;
revoke all on function public.complete_account_setup(text, text) from anon;
grant execute on function public.complete_account_setup(text, text) to authenticated;

comment on function public.complete_account_setup(text, text) is
  'Creates one freelancer/client profile from auth.uid() and the auth.users email; returns only id, email, full_name, and role.';

-- Preserve the secure-contact API and server-sourced value while allowing an
-- authenticated account email regardless of the legacy confirmation column.
-- Phone methods retain their separate phone ownership requirement.
create or replace function private.contact_current_auth_source(
  p_user_id uuid,
  p_method text
) returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_method = 'verified_email' and au.email is not null
      then lower(btrim(au.email))
    when p_method in ('verified_phone', 'whatsapp_phone')
      and au.phone is not null and au.phone_confirmed_at is not null
      then btrim(au.phone)
  end
  from auth.users as au
  where au.id = p_user_id
$$;

comment on function private.contact_current_auth_source(uuid, text) is
  'Returns the current server-owned Auth account email or confirmed phone source for secure contact exchange.';
