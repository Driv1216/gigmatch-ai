begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
set constraints all deferred;

create temporary table auth_hardening_case (
  verified_user uuid not null,
  unverified_user uuid not null,
  mismatch_user uuid not null
);
grant select on auth_hardening_case to authenticated;

do $$
declare
  verified_id uuid := gen_random_uuid();
  unverified_id uuid := gen_random_uuid();
  mismatch_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    ('00000000-0000-0000-0000-000000000000', verified_id, 'authenticated', 'authenticated',
      'trusted-setup@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', unverified_id, 'authenticated', 'authenticated',
      'unverified-setup@example.test', '', null, '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', mismatch_id, 'authenticated', 'authenticated',
      'trusted-mismatch@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

  insert into public.user_profiles (id, email, full_name, role)
  values (mismatch_id, 'forged-mismatch@example.test', 'Existing mismatch', 'client');

  insert into auth_hardening_case values (verified_id, unverified_id, mismatch_id);
end;
$$;

select has_function(
  'public',
  'complete_account_setup',
  array['text', 'text'],
  'account setup RPC exists with only full name and role inputs'
);

select is(
  pg_get_function_result('public.complete_account_setup(text,text)'::regprocedure),
  'TABLE(id uuid, email text, full_name text, role text)',
  'RPC response exposes only allowlisted setup fields'
);

select ok(
  has_function_privilege('authenticated', 'public.complete_account_setup(text,text)', 'EXECUTE'),
  'authenticated callers may execute setup RPC'
);

select ok(
  not has_function_privilege('anon', 'public.complete_account_setup(text,text)', 'EXECUTE'),
  'anonymous callers cannot execute setup RPC'
);

select ok(
  position('SET search_path TO ''''' in pg_get_functiondef('public.complete_account_setup(text,text)'::regprocedure)) > 0,
  'security definer RPC fixes an empty search_path'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', (select verified_user::text from auth_hardening_case), true);

select is(
  (select email from public.complete_account_setup('  Verified Person  ', 'freelancer')),
  'trusted-setup@example.test',
  'RPC persists email from the authenticated auth.users row'
);

select is(
  (select full_name from public.user_profiles where id = (select verified_user from auth_hardening_case)),
  'Verified Person',
  'RPC trims and persists the validated full name'
);

select is(
  (select role from public.user_profiles where id = (select verified_user from auth_hardening_case)),
  'freelancer',
  'RPC persists only the selected participant role'
);

select is(
  (select full_name from public.complete_account_setup('Changed Name', 'client')),
  'Verified Person',
  'duplicate setup is idempotent and does not change the existing profile'
);

select throws_ok(
  $$select * from public.complete_account_setup('', 'freelancer')$$,
  '22023',
  'Full name must contain 1 to 100 characters on one line.',
  'blank full name is rejected'
);

select throws_ok(
  $$select * from public.complete_account_setup('Line one' || chr(10) || 'Line two', 'freelancer')$$,
  '22023',
  'Full name must contain 1 to 100 characters on one line.',
  'multi-line full name is rejected'
);

select throws_ok(
  $$select * from public.complete_account_setup('Verified Person', 'admin')$$,
  '22023',
  'Role must be freelancer or client.',
  'admin role is rejected'
);

select throws_ok(
  $$insert into public.user_profiles (id, email, full_name, role) values (gen_random_uuid(), 'browser-forged@example.test', 'Browser Forged', 'client')$$,
  '42501',
  null,
  'authenticated browser cannot insert a profile directly'
);

select throws_ok(
  $$insert into public.user_profiles (id, email, full_name, role) values ((select verified_user from auth_hardening_case), 'browser-forged@example.test', 'Browser Forged', 'client') on conflict (id) do update set full_name = excluded.full_name$$,
  '42501',
  null,
  'authenticated browser cannot use upsert as a creation authority'
);

select lives_ok(
  $$update public.user_profiles set full_name = 'Safe profile update' where id = (select verified_user from auth_hardening_case)$$,
  'existing safe full_name update remains available'
);

select is(
  (select full_name from public.user_profiles where id = (select verified_user from auth_hardening_case)),
  'Safe profile update',
  'safe profile update persists'
);

select throws_ok(
  $$update public.user_profiles set role = 'client' where id = (select verified_user from auth_hardening_case)$$,
  '42501',
  null,
  'browser role update remains unavailable'
);

select throws_ok(
  $$select * from public.complete_account_setup(p_full_name => 'Forged', p_role => 'client', p_email => 'forged@example.test')$$,
  '42883',
  null,
  'RPC has no browser-controlled email parameter'
);

select set_config('request.jwt.claim.sub', (select unverified_user::text from auth_hardening_case), true);
select throws_ok(
  $$select * from public.complete_account_setup('Unverified Person', 'client')$$,
  '42501',
  'A verified email identity is required to complete account setup.',
  'unverified identity cannot create a profile'
);

select set_config('request.jwt.claim.sub', (select mismatch_user::text from auth_hardening_case), true);
select throws_ok(
  $$select * from public.complete_account_setup('Mismatch Person', 'client')$$,
  '23514',
  'The existing profile email does not match the authenticated identity.',
  'existing profile email mismatch fails closed'
);

reset role;
set local role anon;
select throws_ok(
  $$select * from public.complete_account_setup('Anonymous Person', 'client')$$,
  '42501',
  null,
  'anon role cannot execute setup RPC'
);

reset role;
select * from finish();
rollback;
