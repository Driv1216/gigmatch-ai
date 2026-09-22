-- Final cutover: the RPC is the sole normal public profile-creation authority.
drop policy if exists "Users can insert their own non-admin profile"
on public.user_profiles;

revoke insert on public.user_profiles from authenticated;
