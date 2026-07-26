-- GigMatch AI Milestone 7J: coherent, bounded dashboard read projections.
-- This migration adds no mutable dashboard state and performs no workflow writes.

begin;

create or replace function private.dashboard_require_role(
  p_acting_user_id uuid,
  p_required_role text
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_required_role not in ('client', 'freelancer')
     or not exists (
       select 1
       from public.user_profiles up
       where up.id = p_acting_user_id
         and up.role = p_required_role
     ) then
    raise exception using
      errcode = '42501',
      message = case
        when p_required_role = 'freelancer'
          then 'M7J_FREELANCER_DASHBOARD_NOT_ALLOWED'
        else 'M7J_CLIENT_DASHBOARD_NOT_ALLOWED'
      end;
  end if;
  return p_acting_user_id;
end;
$$;

create or replace function private.dashboard_engagement_requires_response(
  p_engagement public.engagements,
  p_actor_user_id uuid
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when private.engagement_actor_role(p_engagement, p_actor_user_id) is null
      then false
    when p_engagement.status = 'completion_pending'
      then p_engagement.completion_requested_by_user_id <> p_actor_user_id
    when p_engagement.status = 'cancellation_pending'
      then p_engagement.cancellation_requested_by_user_id <> p_actor_user_id
    else false
  end
$$;

create or replace function private.dashboard_reconsideration_requires_response(
  p_invitation_id uuid,
  p_actor_user_id uuid
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_array_length(
      private.reconsideration_result(p_invitation_id, p_actor_user_id)
      -> 'allowed_actions'
    ) > 0
    and private.reconsideration_result(p_invitation_id, p_actor_user_id)
      ->> 'viewer_role' = 'freelancer',
    false
  )
$$;

create or replace function public.dashboard_freelancer_get(
  p_acting_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with
  authority as materialized (
    select clock_timestamp() as authoritative_now
  ),
  actor as materialized (
    select checked.user_id, fp.id as freelancer_profile_id
    from (
      select private.dashboard_require_role(
        p_acting_user_id,
        'freelancer'
      ) as user_id
    ) checked
    join public.freelancer_profiles fp on fp.user_id = checked.user_id
  ),
  owned_applications as materialized (
    select
      a.id as application_id,
      a.gig_id,
      a.stage,
      a.current_version_id,
      a.last_updated_at,
      av.version_number as application_version_number,
      av.gig_version_id as answered_gig_version_id,
      g.current_material_gig_version_id,
      g.title as gig_title,
      g.opportunity_lifecycle,
      g.operational_state
    from actor ac
    join public.applications a
      on a.freelancer_profile_id = ac.freelancer_profile_id
    join public.application_versions av on av.id = a.current_version_id
    join public.gigs g on g.id = a.gig_id
  ),
  effective_selection as materialized (
    select
      sr.id as selection_request_id,
      sr.application_id,
      sr.gig_id,
      sr.created_at,
      sr.expires_at
    from authority n
    join owned_applications oa on true
    join public.selection_requests sr on sr.application_id = oa.application_id
    where sr.status = 'pending'
      and sr.expires_at > n.authoritative_now
  ),
  actionable_selection as materialized (
    select selection.*
    from effective_selection selection
    join owned_applications oa
      on oa.application_id = selection.application_id
    where oa.opportunity_lifecycle = 'active'
      and oa.operational_state = 'active'
      and oa.stage = 'advanced'
      and exists (
        select 1
        from public.selection_requests sr
        where sr.id = selection.selection_request_id
          and sr.application_version_id = oa.current_version_id
          and sr.gig_version_id = oa.current_material_gig_version_id
      )
      and not exists (
        select 1
        from public.engagements existing
        where existing.gig_id = oa.gig_id
          and existing.status <> 'cancelled'
      )
  ),
  unresolved_questions as materialized (
    select
      message.id as message_id,
      message.application_id,
      message.gig_id,
      message.created_at
    from actor ac
    join owned_applications oa on true
    join public.application_qa_threads thread
      on thread.application_id = oa.application_id
    join public.application_qa_messages message
      on message.application_id = oa.application_id
    where message.message_kind in ('initial_question', 'question')
      and message.sender_user_id <> ac.user_id
      and oa.opportunity_lifecycle = 'active'
      and oa.operational_state = 'active'
      and (
        (
          message.message_kind = 'initial_question'
          and oa.stage = 'under_review'
          and thread.full_discussion_unlocked_at is null
        )
        or (
          message.message_kind = 'question'
          and oa.stage = 'advanced'
        )
      )
      and not exists (
        select 1
        from public.application_qa_messages response
        where response.application_id = message.application_id
          and response.in_reply_to_message_id = message.id
          and response.message_kind in ('answer', 'decline')
      )
  ),
  actionable_revisions as materialized (
    select
      revision.id as revision_request_id,
      revision.application_id,
      revision.gig_id,
      revision.created_at
    from owned_applications oa
    join public.application_revision_requests revision
      on revision.application_id = oa.application_id
    where revision.status = 'open'
      and oa.opportunity_lifecycle = 'active'
      and oa.operational_state = 'active'
      and oa.stage = 'advanced'
      and revision.requested_application_version_id = oa.current_version_id
      and revision.requested_material_gig_version_id =
        oa.current_material_gig_version_id
  ),
  actionable_reconsiderations as materialized (
    select
      invitation.id as invitation_id,
      invitation.application_id,
      invitation.gig_id,
      invitation.created_at
    from actor ac
    join owned_applications oa on true
    join public.application_reconsideration_invitations invitation
      on invitation.application_id = oa.application_id
    where invitation.status = 'pending'
      and private.dashboard_reconsideration_requires_response(
        invitation.id,
        ac.user_id
      )
  ),
  participant_engagements as materialized (
    select
      engagement.id as engagement_id,
      engagement.gig_id,
      engagement.application_id,
      engagement.status,
      engagement.confirmed_at,
      engagement.work_started_at,
      engagement.completion_requested_at,
      engagement.cancellation_requested_at,
      engagement.lifecycle_version,
      g.title as gig_title
    from actor ac
    join public.engagements engagement
      on engagement.freelancer_participant_user_id = ac.user_id
    join public.gigs g on g.id = engagement.gig_id
  ),
  updated_gig_actions as (
    select
      'updated_gig_response_required'::text as action_kind,
      oa.application_id as resource_id,
      oa.application_id,
      oa.gig_id,
      oa.gig_title,
      null::timestamptz as deadline_at,
      oa.last_updated_at as latest_activity_at,
      7 as action_priority
    from owned_applications oa
    where oa.stage in ('under_review', 'advanced')
      and oa.opportunity_lifecycle = 'active'
      and oa.operational_state = 'active'
      and oa.answered_gig_version_id <> oa.current_material_gig_version_id
  ),
  qa_actions as (
    select
      'qa_response_required'::text,
      question.message_id,
      question.application_id,
      question.gig_id,
      oa.gig_title,
      null::timestamptz,
      question.created_at,
      6
    from unresolved_questions question
    join owned_applications oa
      on oa.application_id = question.application_id
  ),
  revision_actions as (
    select
      'revision_request_response_required'::text,
      revision.revision_request_id,
      revision.application_id,
      revision.gig_id,
      oa.gig_title,
      null::timestamptz,
      revision.created_at,
      5
    from actionable_revisions revision
    join owned_applications oa
      on oa.application_id = revision.application_id
  ),
  selection_actions as (
    select
      'selection_response_required'::text,
      selection.selection_request_id,
      selection.application_id,
      selection.gig_id,
      oa.gig_title,
      selection.expires_at,
      selection.created_at,
      3
    from actionable_selection selection
    join owned_applications oa
      on oa.application_id = selection.application_id
  ),
  reconsideration_actions as (
    select
      'reconsideration_response_required'::text,
      invitation.invitation_id,
      invitation.application_id,
      invitation.gig_id,
      oa.gig_title,
      null::timestamptz,
      invitation.created_at,
      4
    from actionable_reconsiderations invitation
    join owned_applications oa
      on oa.application_id = invitation.application_id
  ),
  engagement_actions as (
    select
      'engagement_response_required'::text,
      engagement.engagement_id,
      engagement.application_id,
      engagement.gig_id,
      engagement.gig_title,
      null::timestamptz,
      greatest(
        engagement.confirmed_at,
        engagement.work_started_at,
        engagement.completion_requested_at,
        engagement.cancellation_requested_at
      ),
      2
    from actor ac
    join participant_engagements engagement on true
    join public.engagements source
      on source.id = engagement.engagement_id
    where private.dashboard_engagement_requires_response(source, ac.user_id)
  ),
  attention(
    action_kind,
    resource_id,
    application_id,
    gig_id,
    gig_title,
    deadline_at,
    latest_activity_at,
    action_priority
  ) as materialized (
    select * from engagement_actions
    union all select * from selection_actions
    union all select * from reconsideration_actions
    union all select * from revision_actions
    union all select * from qa_actions
    union all select * from updated_gig_actions
  ),
  ordered_attention as (
    select
      action_kind,
      resource_id,
      application_id,
      gig_id,
      gig_title,
      deadline_at,
      latest_activity_at
    from attention
    order by
      deadline_at asc nulls last,
      action_priority,
      latest_activity_at desc,
      resource_id
    limit 8
  ),
  application_preview as (
    select
      oa.application_id,
      oa.gig_id,
      oa.gig_title,
      oa.stage,
      oa.application_version_number,
      (
        oa.stage in ('under_review', 'advanced')
        and oa.opportunity_lifecycle = 'active'
        and oa.operational_state = 'active'
        and oa.answered_gig_version_id <> oa.current_material_gig_version_id
      ) as updated_gig_response_required,
      (
        select count(*)::integer
        from unresolved_questions question
        where question.application_id = oa.application_id
      ) as qa_action_count,
      exists (
        select 1
        from effective_selection selection
        where selection.application_id = oa.application_id
      ) as has_effective_selection_request,
      oa.last_updated_at
    from owned_applications oa
    order by oa.last_updated_at desc, oa.application_id
    limit 6
  ),
  engagement_preview as (
    select
      engagement.engagement_id,
      engagement.gig_id,
      engagement.application_id,
      engagement.gig_title,
      engagement.status,
      engagement.lifecycle_version,
      engagement.confirmed_at,
      greatest(
        engagement.confirmed_at,
        engagement.work_started_at,
        engagement.completion_requested_at,
        engagement.cancellation_requested_at
      ) as latest_activity_at,
      private.dashboard_engagement_requires_response(source, ac.user_id)
        as response_required
    from actor ac
    join participant_engagements engagement on true
    join public.engagements source
      on source.id = engagement.engagement_id
    where engagement.status in (
      'confirmed',
      'kickoff_pending',
      'in_progress',
      'completion_pending',
      'cancellation_pending'
    )
    order by latest_activity_at desc, engagement.engagement_id
    limit 5
  )
  select jsonb_build_object(
      'authoritative_now', (select authoritative_now from authority),
      'summary', jsonb_build_object(
        'total_applications', (select count(*) from owned_applications),
        'under_review_applications', (
          select count(*) from owned_applications where stage = 'under_review'
        ),
        'advanced_applications', (
          select count(*) from owned_applications where stage = 'advanced'
        ),
        'response_required_applications', (
          select count(distinct application_id)
          from attention
          where application_id is not null
        ),
        'effective_selection_requests', (
          select count(*) from effective_selection
        ),
        'active_engagements', (
          select count(*)
          from participant_engagements
          where status in (
            'confirmed',
            'kickoff_pending',
            'in_progress',
            'completion_pending',
            'cancellation_pending'
          )
        )
      ),
      'attention', jsonb_build_object(
        'items', coalesce(
          (select jsonb_agg(to_jsonb(item)) from ordered_attention item),
          '[]'::jsonb
        ),
        'attention_action_count', (select count(*) from attention),
        'attention_resource_count', (
          select count(distinct coalesce(application_id, resource_id))
          from attention
        ),
        'limit', 8,
        'has_more', (select count(*) > 8 from attention)
      ),
      'recent_applications', jsonb_build_object(
        'items', coalesce(
          (select jsonb_agg(to_jsonb(item)) from application_preview item),
          '[]'::jsonb
        ),
        'total', (select count(*) from owned_applications),
        'limit', 6,
        'has_more', (select count(*) > 6 from owned_applications)
      ),
      'active_engagements', jsonb_build_object(
        'items', coalesce(
          (select jsonb_agg(to_jsonb(item)) from engagement_preview item),
          '[]'::jsonb
        ),
        'total', (
          select count(*)
          from participant_engagements
          where status in (
            'confirmed',
            'kickoff_pending',
            'in_progress',
            'completion_pending',
            'cancellation_pending'
          )
        ),
        'limit', 5,
        'has_more', (
          select count(*) > 5
          from participant_engagements
          where status in (
            'confirmed',
            'kickoff_pending',
            'in_progress',
            'completion_pending',
            'cancellation_pending'
          )
        )
      )
    )
$$;

create or replace function public.dashboard_client_get(
  p_acting_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with
  authority as materialized (
    select clock_timestamp() as authoritative_now
  ),
  actor as materialized (
    select private.dashboard_require_role(
      p_acting_user_id,
      'client'
    ) as user_id
  ),
  owned_gigs as materialized (
    select
      g.id as gig_id,
      g.title as gig_title,
      g.status as product_state,
      g.opportunity_lifecycle,
      g.application_intake,
      g.operational_state,
      g.updated_at
    from actor ac
    join public.gigs g on g.client_id = ac.user_id
  ),
  owned_applications as materialized (
    select
      a.id as application_id,
      a.gig_id,
      a.stage,
      a.current_version_id,
      a.last_updated_at
    from owned_gigs g
    join public.applications a on a.gig_id = g.gig_id
  ),
  effective_selection as materialized (
    select
      sr.id as selection_request_id,
      sr.application_id,
      sr.gig_id,
      sr.created_at,
      sr.expires_at
    from authority n
    join owned_applications oa on true
    join public.selection_requests sr on sr.application_id = oa.application_id
    where sr.status = 'pending'
      and sr.expires_at > n.authoritative_now
  ),
  client_questions as materialized (
    select
      message.id as message_id,
      message.application_id,
      message.gig_id,
      message.created_at
    from actor ac
    join owned_applications oa on true
    join owned_gigs og on og.gig_id = oa.gig_id
    join public.application_qa_threads thread
      on thread.application_id = oa.application_id
    join public.application_qa_messages message
      on message.application_id = oa.application_id
    where message.message_kind = 'question'
      and message.sender_user_id <> ac.user_id
      and oa.stage = 'advanced'
      and og.opportunity_lifecycle = 'active'
      and og.operational_state = 'active'
      and not exists (
        select 1
        from public.application_qa_messages response
        where response.application_id = message.application_id
          and response.in_reply_to_message_id = message.id
          and response.message_kind in ('answer', 'decline')
      )
  ),
  owned_engagements as materialized (
    select
      engagement.id as engagement_id,
      engagement.gig_id,
      engagement.application_id,
      engagement.status,
      engagement.lifecycle_version,
      engagement.confirmed_at,
      engagement.work_started_at,
      engagement.completion_requested_at,
      engagement.cancellation_requested_at,
      g.gig_title
    from actor ac
    join public.engagements engagement
      on engagement.client_participant_user_id = ac.user_id
    join owned_gigs g on g.gig_id = engagement.gig_id
  ),
  qa_actions as (
    select
      'qa_response_required'::text as action_kind,
      question.message_id as resource_id,
      question.application_id,
      question.gig_id,
      gig.gig_title,
      null::timestamptz as deadline_at,
      question.created_at as latest_activity_at,
      6 as action_priority
    from client_questions question
    join owned_gigs gig on gig.gig_id = question.gig_id
  ),
  engagement_actions as (
    select
      'engagement_response_required'::text,
      engagement.engagement_id,
      engagement.application_id,
      engagement.gig_id,
      engagement.gig_title,
      null::timestamptz,
      greatest(
        engagement.confirmed_at,
        engagement.work_started_at,
        engagement.completion_requested_at,
        engagement.cancellation_requested_at
      ),
      2
    from actor ac
    join owned_engagements engagement on true
    join public.engagements source
      on source.id = engagement.engagement_id
    where private.dashboard_engagement_requires_response(source, ac.user_id)
  ),
  attention(
    action_kind,
    resource_id,
    application_id,
    gig_id,
    gig_title,
    deadline_at,
    latest_activity_at,
    action_priority
  ) as materialized (
    select * from engagement_actions
    union all select * from qa_actions
  ),
  ordered_attention as (
    select
      action_kind,
      resource_id,
      application_id,
      gig_id,
      gig_title,
      deadline_at,
      latest_activity_at
    from attention
    order by
      deadline_at asc nulls last,
      action_priority,
      latest_activity_at desc,
      resource_id
    limit 8
  ),
  latest_application_activity as materialized (
    select
      oa.gig_id,
      max(oa.last_updated_at) as latest_application_activity_at
    from owned_applications oa
    group by oa.gig_id
  ),
  gig_review_population as materialized (
    select
      gig.gig_id,
      gig.gig_title,
      gig.product_state,
      gig.opportunity_lifecycle,
      gig.application_intake,
      gig.operational_state,
      count(*) filter (where application.stage = 'under_review')::integer
        as under_review_count,
      count(*) filter (where application.stage = 'advanced')::integer
        as advanced_count,
      count(*) filter (
        where review.is_shortlisted
          and application.stage in ('under_review', 'advanced')
      )::integer as internal_shortlist_count,
      (
        select count(*)::integer
        from client_questions question
        where question.gig_id = gig.gig_id
      ) as client_qa_action_count,
      exists (
        select 1
        from effective_selection selection
        where selection.gig_id = gig.gig_id
      ) as has_effective_selection_request,
      activity.latest_application_activity_at
    from owned_gigs gig
    left join owned_applications application
      on application.gig_id = gig.gig_id
    left join public.application_review_states review
      on review.application_id = application.application_id
    left join latest_application_activity activity
      on activity.gig_id = gig.gig_id
    group by
      gig.gig_id,
      gig.gig_title,
      gig.product_state,
      gig.opportunity_lifecycle,
      gig.application_intake,
      gig.operational_state,
      activity.latest_application_activity_at
    having
      count(*) filter (
        where application.stage in ('under_review', 'advanced')
      ) > 0
      or exists (
        select 1
        from effective_selection selection
        where selection.gig_id = gig.gig_id
      )
      or activity.latest_application_activity_at is not null
  ),
  gig_review_preview as (
    select *
    from gig_review_population
    order by
      client_qa_action_count desc,
      has_effective_selection_request desc,
      latest_application_activity_at desc nulls last,
      gig_id
    limit 6
  ),
  selection_preview as (
    select
      selection.selection_request_id,
      selection.application_id,
      selection.gig_id,
      gig.gig_title,
      selection.created_at,
      selection.expires_at
    from effective_selection selection
    join owned_gigs gig on gig.gig_id = selection.gig_id
    order by selection.expires_at, selection.selection_request_id
    limit 5
  ),
  engagement_preview as (
    select
      engagement.engagement_id,
      engagement.gig_id,
      engagement.application_id,
      engagement.gig_title,
      engagement.status,
      engagement.lifecycle_version,
      engagement.confirmed_at,
      greatest(
        engagement.confirmed_at,
        engagement.work_started_at,
        engagement.completion_requested_at,
        engagement.cancellation_requested_at
      ) as latest_activity_at,
      private.dashboard_engagement_requires_response(source, ac.user_id)
        as response_required
    from actor ac
    join owned_engagements engagement on true
    join public.engagements source
      on source.id = engagement.engagement_id
    where engagement.status in (
      'confirmed',
      'kickoff_pending',
      'in_progress',
      'completion_pending',
      'cancellation_pending'
    )
    order by latest_activity_at desc, engagement.engagement_id
    limit 5
  )
  select jsonb_build_object(
      'authoritative_now', (select authoritative_now from authority),
      'summary', jsonb_build_object(
        'active_owned_gigs', (
          select count(*)
          from owned_gigs
          where opportunity_lifecycle = 'active'
        ),
        'active_applications', (
          select count(*)
          from owned_applications
          where stage in ('under_review', 'advanced')
        ),
        'under_review_applications', (
          select count(*)
          from owned_applications
          where stage = 'under_review'
        ),
        'advanced_applications', (
          select count(*)
          from owned_applications
          where stage = 'advanced'
        ),
        'shortlisted_applications', (
          select count(*)
          from owned_applications application
          join public.application_review_states review
            on review.application_id = application.application_id
          where review.is_shortlisted
            and application.stage in ('under_review', 'advanced')
        ),
        'effective_selection_requests', (
          select count(*) from effective_selection
        ),
        'active_engagements', (
          select count(*)
          from owned_engagements
          where status in (
            'confirmed',
            'kickoff_pending',
            'in_progress',
            'completion_pending',
            'cancellation_pending'
          )
        )
      ),
      'attention', jsonb_build_object(
        'items', coalesce(
          (select jsonb_agg(to_jsonb(item)) from ordered_attention item),
          '[]'::jsonb
        ),
        'attention_action_count', (select count(*) from attention),
        'attention_resource_count', (
          select count(distinct coalesce(application_id, resource_id))
          from attention
        ),
        'limit', 8,
        'has_more', (select count(*) > 8 from attention)
      ),
      'gig_review_overview', jsonb_build_object(
        'items', coalesce(
          (select jsonb_agg(to_jsonb(item)) from gig_review_preview item),
          '[]'::jsonb
        ),
        'total', (select count(*) from gig_review_population),
        'limit', 6,
        'has_more', (select count(*) > 6 from gig_review_population)
      ),
      'pending_selection_requests', jsonb_build_object(
        'items', coalesce(
          (select jsonb_agg(to_jsonb(item)) from selection_preview item),
          '[]'::jsonb
        ),
        'total', (select count(*) from effective_selection),
        'limit', 5,
        'has_more', (select count(*) > 5 from effective_selection)
      ),
      'active_engagements', jsonb_build_object(
        'items', coalesce(
          (select jsonb_agg(to_jsonb(item)) from engagement_preview item),
          '[]'::jsonb
        ),
        'total', (
          select count(*)
          from owned_engagements
          where status in (
            'confirmed',
            'kickoff_pending',
            'in_progress',
            'completion_pending',
            'cancellation_pending'
          )
        ),
        'limit', 5,
        'has_more', (
          select count(*) > 5
          from owned_engagements
          where status in (
            'confirmed',
            'kickoff_pending',
            'in_progress',
            'completion_pending',
            'cancellation_pending'
          )
        )
      )
    )
$$;

revoke all on function private.dashboard_engagement_requires_response(
  public.engagements,
  uuid
) from public, anon, authenticated;
revoke all on function private.dashboard_require_role(uuid, text)
  from public, anon, authenticated;
revoke all on function private.dashboard_reconsideration_requires_response(
  uuid,
  uuid
) from public, anon, authenticated;

revoke all on function public.dashboard_freelancer_get(uuid)
  from public, anon, authenticated;
revoke all on function public.dashboard_client_get(uuid)
  from public, anon, authenticated;
grant execute on function public.dashboard_freelancer_get(uuid)
  to service_role;
grant execute on function public.dashboard_client_get(uuid)
  to service_role;

comment on function public.dashboard_freelancer_get(uuid) is
  'Service-only coherent freelancer workflow dashboard read projection.';
comment on function public.dashboard_client_get(uuid) is
  'Service-only coherent client workflow dashboard read projection.';

commit;
