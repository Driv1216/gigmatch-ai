# Authentication hardening: profile-creation caller audit

Audited before revoking normal browser `INSERT` on `public.user_profiles`.

## Production runtime callers

| Caller | Operation | Classification | Cutover action |
|---|---|---|---|
| `frontend/src/pages/SignupPage.tsx` | `supabase.from("user_profiles").insert(...)` | The only normal browser profile-creation path | Removed; signup now establishes Auth identity only and `/account/setup` calls `complete_account_setup` |

No production backend route, service helper, or Supabase Edge Function inserts or
upserts `user_profiles`. Backend references are profile reads used for role and
marketplace authorization.

## Non-production and historical matches

- `supabase/migrations/*`: schema, policies, grants, and historical migration definitions.
- `supabase/tests/*`: privileged SQL fixtures that create deterministic test actors.
- `backend/tests/*`: in-memory fixtures, not database writes.

## Final authority

The final migration removes the authenticated table `INSERT` grant and owner-insert
policy. Browser creation is possible only through `public.complete_account_setup`,
which accepts no ID or email input and derives both from `auth.uid()` and
`auth.users`. Existing column-scoped profile `UPDATE` grants and the role-change
trigger remain separate and unchanged.
