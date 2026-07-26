begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(18);

select is(
  (
    select count(*)
    from unnest(array[
      'gig_versions',
      'applications',
      'application_versions',
      'selection_requests',
      'engagements',
      'marketplace_events',
      'application_review_states',
      'application_qa_threads',
      'application_qa_messages',
      'application_question_reports',
      'application_revision_requests',
      'application_qa_operations',
      'engagement_reopenings',
      'application_reconsideration_invitations',
      'contact_shares',
      'contact_reveals',
      'engagement_contact_blocks',
      'engagement_contact_reports'
    ]::text[]) as expected(table_name)
    join pg_class c on c.relname = expected.table_name
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  ),
  18::bigint,
  'every public Milestone 7 workflow authority exists'
);

select is(
  (
    select count(*)
    from unnest(array[
      'gig_versions',
      'applications',
      'application_versions',
      'selection_requests',
      'engagements',
      'marketplace_events',
      'application_review_states',
      'application_qa_threads',
      'application_qa_messages',
      'application_question_reports',
      'application_revision_requests',
      'application_qa_operations',
      'engagement_reopenings',
      'application_reconsideration_invitations',
      'contact_shares',
      'contact_reveals',
      'engagement_contact_blocks',
      'engagement_contact_reports'
    ]::text[]) as expected(table_name)
    join pg_class c on c.relname = expected.table_name
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relrowsecurity
  ),
  18::bigint,
  'RLS is enabled on every public workflow authority'
);

select is(
  (
    select count(*)
    from unnest(array[
      'selection_operations',
      'engagement_operations',
      'contact_share_material',
      'contact_operations'
    ]::text[]) as expected(table_name)
    join pg_class c on c.relname = expected.table_name
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  ),
  4::bigint,
  'private workflow authorities exist with RLS enabled'
);

select is(
  (
    select count(*)
    from unnest(array[
      'gig_versions',
      'applications',
      'application_versions',
      'selection_requests',
      'engagements',
      'marketplace_events',
      'application_review_states',
      'application_qa_threads',
      'application_qa_messages',
      'application_question_reports',
      'application_revision_requests',
      'application_qa_operations',
      'engagement_reopenings',
      'application_reconsideration_invitations',
      'contact_shares',
      'contact_reveals',
      'engagement_contact_blocks',
      'engagement_contact_reports'
    ]::text[]) as expected(table_name)
    where has_table_privilege(
      'anon',
      format('public.%I', expected.table_name),
      'INSERT,UPDATE,DELETE'
    )
  ),
  0::bigint,
  'anonymous callers cannot mutate workflow authorities'
);

select is(
  (
    select count(*)
    from unnest(array[
      'gig_versions',
      'applications',
      'application_versions',
      'selection_requests',
      'engagements',
      'marketplace_events',
      'application_review_states',
      'application_qa_threads',
      'application_qa_messages',
      'application_question_reports',
      'application_revision_requests',
      'application_qa_operations',
      'engagement_reopenings',
      'application_reconsideration_invitations',
      'contact_shares',
      'contact_reveals',
      'engagement_contact_blocks',
      'engagement_contact_reports'
    ]::text[]) as expected(table_name)
    where has_table_privilege(
      'authenticated',
      format('public.%I', expected.table_name),
      'INSERT,UPDATE,DELETE'
    )
  ),
  0::bigint,
  'browser callers cannot mutate workflow authorities directly'
);

select is(
  (
    select count(*)
    from unnest(array[
      'selection_operations',
      'engagement_operations',
      'contact_share_material',
      'contact_operations'
    ]::text[]) as expected(table_name)
    where has_table_privilege(
      'anon',
      format('private.%I', expected.table_name),
      'SELECT,INSERT,UPDATE,DELETE'
    )
      or has_table_privilege(
        'authenticated',
        format('private.%I', expected.table_name),
        'SELECT,INSERT,UPDATE,DELETE'
      )
  ),
  0::bigint,
  'browser roles have no private authority privileges'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.application_question_reports',
    'SELECT'
  ),
  'browser cannot read private question reports'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.engagement_contact_reports',
    'SELECT'
  ),
  'browser cannot read private contact reports'
);

select ok(
  not has_table_privilege(
    'service_role',
    'private.contact_share_material',
    'SELECT'
  ),
  'service role cannot bypass the audited contact reveal function'
);

select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('service_role', p.oid, 'EXECUTE')
      and (
        has_function_privilege('public', p.oid, 'EXECUTE')
        or has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  ),
  0::bigint,
  'service workflow RPCs are not executable by browser roles or PUBLIC'
);

select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('service_role', p.oid, 'EXECUTE')
      and coalesce(p.proconfig, array[]::text[]) <> array['search_path=""']
  ),
  0::bigint,
  'all service workflow definer RPCs use an empty search path'
);

select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.prosecdef
      and coalesce(p.proconfig, array[]::text[]) <> array['search_path=""']
  ),
  0::bigint,
  'all private security-definer helpers use an empty search path'
);

select is(
  (
    select count(distinct p.proname)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'submit_application',
        'create_application_version',
        'withdraw_application',
        'review_set_shortlist',
        'review_transition_application',
        'qa_write_message',
        'qa_report_message',
        'qa_stop_pre_advancement',
        'revision_create_request',
        'revision_decline_request',
        'revision_submit_update',
        'selection_get_context',
        'selection_get_request',
        'selection_list_requests',
        'selection_send_request',
        'selection_cancel_request',
        'selection_respond_request',
        'confirm_selection_request',
        'engagement_get',
        'engagement_list',
        'engagement_timeline',
        'engagement_transition',
        'engagement_reopen_gig',
        'reconsideration_get_context',
        'reconsideration_get_invitation',
        'reconsideration_create_invitation',
        'reconsideration_cancel_invitation',
        'reconsideration_respond_invitation',
        'contact_exchange_get',
        'contact_share_encryption_context',
        'contact_share_create',
        'contact_share_revoke',
        'contact_share_reveal',
        'engagement_contact_block',
        'engagement_contact_report',
        'dashboard_freelancer_get',
        'dashboard_client_get'
      ]::text[])
      and p.prosecdef
      and has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  37::bigint,
  'the service-only workflow RPC surface is complete'
);

select is(
  (
    select count(*)
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname in ('public', 'private')
      and t.tgname = any(array[
        'enforce_application_version_chronology',
        'reject_application_version_mutation',
        'reject_gig_version_mutation',
        'reject_marketplace_event_mutation',
        'protect_contact_share',
        'protect_contact_reveal',
        'protect_engagement_contact_block',
        'protect_engagement_contact_report',
        'protect_contact_material'
      ]::text[])
  ),
  9::bigint,
  'immutable-version, append-only, and contact-retirement guards exist'
);

select is(
  (
    select count(*)
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'application_review_states',
        'application_question_reports',
        'engagement_contact_reports'
      )
      and (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') ilike '%freelancer%'
        or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '')
          ilike '%freelancer%'
      )
  ),
  0::bigint,
  'private shortlist and report authorities have no freelancer policy'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.contact_share_reveal(uuid,uuid,text,uuid,integer,integer)',
    'EXECUTE'
  ),
  'service role retains the audited contact reveal entry point'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.dashboard_client_get(uuid)',
    'EXECUTE'
  ),
  'browser cannot call consolidated dashboard projection directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.dashboard_client_get(uuid)',
    'EXECUTE'
  ),
  'backend retains consolidated dashboard projection access'
);

select * from finish();
rollback;
