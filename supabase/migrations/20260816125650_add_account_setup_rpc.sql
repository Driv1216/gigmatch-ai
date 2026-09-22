-- Compatibility phase: add the restricted account-setup authority while the
-- pre-cutover frontend can still use its existing profile insert path.
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
  v_email_confirmed_at timestamptz;
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
    auth_user.email_confirmed_at,
    case
      when auth_user.is_anonymous is null then false
      else auth_user.is_anonymous
    end
  into v_email, v_email_confirmed_at, v_is_anonymous
  from auth.users as auth_user
  where auth_user.id = v_user_id;

  if not found or v_email is null or v_email_confirmed_at is null or v_is_anonymous then
    raise exception using
      errcode = '42501',
      message = 'A verified email identity is required to complete account setup.';
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
  'Creates one verified freelancer/client profile from auth.uid() and auth.users email; returns only id, email, full_name, and role.';
