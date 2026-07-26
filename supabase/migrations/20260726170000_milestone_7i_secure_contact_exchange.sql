begin;

create table public.contact_shares (
  id uuid primary key,
  engagement_id uuid not null references public.engagements(id) on delete restrict,
  sharer_user_id uuid not null references public.user_profiles(id) on delete restrict,
  recipient_user_id uuid not null references public.user_profiles(id) on delete restrict,
  method text not null check (method in (
    'verified_email','verified_phone','whatsapp_phone',
    'meeting_link','professional_profile'
  )),
  consent_status text not null check (consent_status in ('active','revoked')),
  source_status text not null check (source_status in ('current','invalidated')),
  state_version integer not null check (state_version > 0),
  masked_value text not null check (
    btrim(masked_value) <> '' and char_length(masked_value) <= 320
    and masked_value !~ '[[:cntrl:]]'
  ),
  ownership_verification text not null check (
    ownership_verification in ('verified','user_provided')
  ),
  whatsapp_availability text check (
    whatsapp_availability is null or whatsapp_availability='self_declared'
  ),
  previous_share_id uuid references public.contact_shares(id) on delete restrict,
  created_at timestamptz not null,
  revoked_at timestamptz,
  invalidated_at timestamptz,
  constraint contact_shares_distinct_participants check (
    sharer_user_id <> recipient_user_id
  ),
  constraint contact_shares_method_evidence check (
    (method in ('verified_email','verified_phone')
      and ownership_verification='verified'
      and whatsapp_availability is null)
    or (method='whatsapp_phone'
      and ownership_verification='verified'
      and whatsapp_availability='self_declared')
    or (method in ('meeting_link','professional_profile')
      and ownership_verification='user_provided'
      and whatsapp_availability is null)
  ),
  constraint contact_shares_state_metadata check (
    (consent_status='active' and revoked_at is null)
    or (consent_status='revoked' and revoked_at is not null)
  ),
  constraint contact_shares_source_metadata check (
    (source_status='current' and invalidated_at is null)
    or (source_status='invalidated' and invalidated_at is not null)
  ),
  constraint contact_shares_previous_not_self check (
    previous_share_id is null or previous_share_id <> id
  )
);

create unique index contact_shares_one_active_method_idx
on public.contact_shares(engagement_id,sharer_user_id,method)
where consent_status='active';
create index contact_shares_engagement_idx
on public.contact_shares(engagement_id,id);
create index contact_shares_recipient_idx
on public.contact_shares(recipient_user_id,engagement_id);
create index contact_shares_previous_idx
on public.contact_shares(previous_share_id);
alter table public.contact_shares enable row level security;

create table private.contact_share_material (
  share_id uuid primary key references public.contact_shares(id) on delete restrict,
  source_digest text not null check (source_digest ~ '^[0-9a-f]{64}$'),
  canonical_value_fingerprint text not null
    check (canonical_value_fingerprint ~ '^[0-9a-f]{64}$'),
  ciphertext text,
  nonce text,
  key_id text,
  retired_at timestamptz,
  created_at timestamptz not null,
  constraint contact_share_material_encryption_shape check (
    (
      ciphertext is null and nonce is null
      and (key_id is null or retired_at is not null)
    )
    or (
      ciphertext is not null and nonce is not null and key_id is not null
      and char_length(ciphertext) between 16 and 8192
      and char_length(nonce) between 8 and 128
      and char_length(key_id) between 1 and 100
      and ciphertext !~ '[[:cntrl:]]'
      and nonce !~ '[[:cntrl:]]'
      and key_id !~ '[[:cntrl:]]'
    )
  ),
  constraint contact_share_material_retirement check (
    retired_at is null
    or (ciphertext is null and nonce is null)
  )
);
alter table private.contact_share_material enable row level security;

create table public.contact_reveals (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.contact_shares(id) on delete restrict,
  engagement_id uuid not null references public.engagements(id) on delete restrict,
  recipient_user_id uuid not null references public.user_profiles(id) on delete restrict,
  request_id uuid not null,
  authorised_at timestamptz not null,
  unique(recipient_user_id,request_id)
);
create index contact_reveals_rate_idx
on public.contact_reveals(engagement_id,recipient_user_id,authorised_at desc);
create index contact_reveals_share_idx on public.contact_reveals(share_id);
alter table public.contact_reveals enable row level security;

create table public.engagement_contact_blocks (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete restrict,
  blocker_user_id uuid not null references public.user_profiles(id) on delete restrict,
  blocked_user_id uuid not null references public.user_profiles(id) on delete restrict,
  request_id uuid not null,
  created_at timestamptz not null,
  constraint engagement_contact_blocks_distinct_users check (
    blocker_user_id <> blocked_user_id
  ),
  unique(engagement_id,blocker_user_id),
  unique(blocker_user_id,request_id)
);
create index engagement_contact_blocks_order_idx
on public.engagement_contact_blocks(engagement_id,blocker_user_id);
alter table public.engagement_contact_blocks enable row level security;

create table public.engagement_contact_reports (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete restrict,
  reporter_user_id uuid not null references public.user_profiles(id) on delete restrict,
  reported_user_id uuid not null references public.user_profiles(id) on delete restrict,
  category text not null check (category in (
    'harassment','spam','fraudulent_request','identity_misrepresentation',
    'abusive_communication','suspicious_payment_request',
    'request_for_credentials','other'
  )),
  detail text,
  request_id uuid not null,
  created_at timestamptz not null,
  constraint engagement_contact_reports_distinct_users check (
    reporter_user_id <> reported_user_id
  ),
  constraint engagement_contact_reports_detail check (
    (
      category='other' and detail is not null
      and btrim(detail)<>'' and char_length(detail)<=1000
      and detail !~ '[[:cntrl:]]'
    )
    or (
      category<>'other' and (
        detail is null or (
          btrim(detail)<>'' and char_length(detail)<=1000
          and detail !~ '[[:cntrl:]]'
        )
      )
    )
  ),
  unique(reporter_user_id,request_id)
);
create index engagement_contact_reports_private_idx
on public.engagement_contact_reports(reporter_user_id,engagement_id,created_at desc);
alter table public.engagement_contact_reports enable row level security;

create table private.contact_operations (
  actor_user_id uuid not null references public.user_profiles(id) on delete restrict,
  request_id uuid not null,
  operation_kind text not null check (operation_kind in (
    'share','revoke','reveal','block','report'
  )),
  operation_fingerprint text not null
    check (operation_fingerprint ~ '^[0-9a-f]{64}$'),
  engagement_id uuid not null references public.engagements(id) on delete restrict,
  share_id uuid references public.contact_shares(id) on delete restrict,
  reveal_id uuid references public.contact_reveals(id) on delete restrict,
  block_id uuid references public.engagement_contact_blocks(id) on delete restrict,
  report_id uuid references public.engagement_contact_reports(id) on delete restrict,
  safe_result jsonb not null check (jsonb_typeof(safe_result)='object'),
  created_at timestamptz not null,
  primary key(actor_user_id,request_id)
);
alter table private.contact_operations enable row level security;

revoke all on public.contact_shares,public.contact_reveals,
  public.engagement_contact_blocks,public.engagement_contact_reports
  from public,anon,authenticated,service_role;
revoke all on private.contact_share_material,private.contact_operations
  from public,anon,authenticated,service_role;

create or replace function private.reject_contact_history_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then
    raise exception using errcode='P0001',message='M7I_CONTACT_HISTORY_CANNOT_BE_DELETED';
  end if;
  if tg_table_name='contact_shares' then
    if (new.id,new.engagement_id,new.sharer_user_id,new.recipient_user_id,
        new.method,new.masked_value,new.ownership_verification,
        new.whatsapp_availability,new.previous_share_id,new.created_at)
       is distinct from
       (old.id,old.engagement_id,old.sharer_user_id,old.recipient_user_id,
        old.method,old.masked_value,old.ownership_verification,
        old.whatsapp_availability,old.previous_share_id,old.created_at) then
      raise exception using errcode='P0001',message='M7I_SHARE_IDENTITY_IMMUTABLE';
    end if;
    if new.state_version<>old.state_version+1 then
      raise exception using errcode='P0001',message='M7I_INVALID_SHARE_VERSION';
    end if;
    if old.consent_status='revoked' and new.consent_status<>'revoked' then
      raise exception using errcode='P0001',message='M7I_REVOKED_SHARE_IMMUTABLE';
    end if;
    if old.source_status='invalidated' and new.source_status<>'invalidated' then
      raise exception using errcode='P0001',message='M7I_INVALIDATED_SOURCE_IMMUTABLE';
    end if;
  else
    raise exception using errcode='P0001',message='M7I_CONTACT_HISTORY_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger protect_contact_share
before update or delete on public.contact_shares
for each row execute function private.reject_contact_history_mutation();
create trigger protect_contact_reveal
before update or delete on public.contact_reveals
for each row execute function private.reject_contact_history_mutation();
create trigger protect_engagement_contact_block
before update or delete on public.engagement_contact_blocks
for each row execute function private.reject_contact_history_mutation();
create trigger protect_engagement_contact_report
before update or delete on public.engagement_contact_reports
for each row execute function private.reject_contact_history_mutation();
create trigger protect_contact_operation
before update or delete on private.contact_operations
for each row execute function private.reject_contact_history_mutation();

create or replace function private.protect_contact_material()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then
    raise exception using errcode='P0001',message='M7I_CONTACT_MATERIAL_CANNOT_BE_DELETED';
  end if;
  if new.share_id<>old.share_id
     or new.source_digest<>old.source_digest
     or new.canonical_value_fingerprint<>old.canonical_value_fingerprint
     or new.key_id is distinct from old.key_id
     or new.created_at<>old.created_at then
    raise exception using errcode='P0001',message='M7I_CONTACT_MATERIAL_IMMUTABLE';
  end if;
  if old.retired_at is not null then
    raise exception using errcode='P0001',message='M7I_CONTACT_MATERIAL_RETIRED';
  end if;
  if new.retired_at is null or new.ciphertext is not null or new.nonce is not null then
    raise exception using errcode='P0001',message='M7I_INVALID_MATERIAL_RETIREMENT';
  end if;
  return new;
end;
$$;
create trigger protect_contact_material
before update or delete on private.contact_share_material
for each row execute function private.protect_contact_material();

create or replace function private.contact_hash(parts text[])
returns text language sql immutable strict set search_path='' as $$
  select encode(extensions.digest(array_to_string(parts,E'\x1f'),'sha256'),'hex')
$$;

create or replace function private.contact_actor_role(
  e public.engagements,p_actor uuid
) returns text language sql stable set search_path='' as $$
  select case
    when p_actor=e.client_participant_user_id then 'client'
    when p_actor=e.freelancer_participant_user_id then 'freelancer'
  end
$$;

create or replace function private.contact_other_participant(
  e public.engagements,p_actor uuid
) returns uuid language sql stable set search_path='' as $$
  select case
    when p_actor=e.client_participant_user_id then e.freelancer_participant_user_id
    when p_actor=e.freelancer_participant_user_id then e.client_participant_user_id
  end
$$;

create or replace function private.contact_current_auth_source(
  p_user_id uuid,p_method text
) returns text language sql stable security definer set search_path='' as $$
  select case
    when p_method='verified_email'
      and au.email is not null and au.email_confirmed_at is not null
      then lower(btrim(au.email))
    when p_method in ('verified_phone','whatsapp_phone')
      and au.phone is not null and au.phone_confirmed_at is not null
      then btrim(au.phone)
  end
  from auth.users au where au.id=p_user_id
$$;

create or replace function private.contact_source_digest(
  p_method text,p_value text
) returns text language sql immutable strict set search_path='' as $$
  select private.contact_hash(array['contact-source-v1',p_method,p_value])
$$;

create or replace function private.contact_mask_auth_value(
  p_method text,p_value text
) returns text language plpgsql immutable strict set search_path='' as $$
declare local_part text; domain_part text;
begin
  if p_method='verified_email' then
    local_part:=split_part(p_value,'@',1);
    domain_part:=split_part(p_value,'@',2);
    if local_part='' or domain_part='' then
      raise exception using errcode='22023',message='M7I_VERIFIED_SOURCE_UNAVAILABLE';
    end if;
    return left(local_part,1)||repeat('•',greatest(3,char_length(local_part)-1))
      ||'@'||domain_part;
  end if;
  return repeat('•',greatest(6,char_length(p_value)-4))||right(p_value,4);
end;
$$;

create or replace function private.contact_block_signature(p_engagement_id uuid)
returns text language sql stable set search_path='' as $$
  select coalesce(string_agg(
    b.blocker_user_id::text||':'||b.blocked_user_id::text,',' order by b.blocker_user_id
  ),'')
  from public.engagement_contact_blocks b
  where b.engagement_id=p_engagement_id
$$;

create or replace function private.contact_has_block(p_engagement_id uuid)
returns boolean language sql stable set search_path='' as $$
  select exists(
    select 1 from public.engagement_contact_blocks b
    where b.engagement_id=p_engagement_id
  )
$$;

create or replace function private.contact_effective_source_status(
  s public.contact_shares
) returns text language plpgsql stable security definer set search_path='' as $$
declare material private.contact_share_material%rowtype; current_value text;
begin
  if s.source_status='invalidated' then return 'invalidated'; end if;
  select * into material from private.contact_share_material where share_id=s.id;
  if not found then return 'invalidated'; end if;
  if s.method in ('verified_email','verified_phone','whatsapp_phone') then
    current_value:=private.contact_current_auth_source(s.sharer_user_id,s.method);
    if current_value is null
       or private.contact_source_digest(s.method,current_value)<>material.source_digest then
      return 'invalidated';
    end if;
  elsif material.retired_at is not null or material.ciphertext is null then
    return 'invalidated';
  end if;
  return 'current';
end;
$$;

create or replace function private.contact_share_action_token(
  e public.engagements,p_actor uuid,p_method text
) returns text language plpgsql stable security definer set search_path='' as $$
declare latest public.contact_shares%rowtype; source_value text; source_signature text;
begin
  select * into latest from public.contact_shares s
  where s.engagement_id=e.id and s.sharer_user_id=p_actor and s.method=p_method
  order by s.created_at desc,s.id desc limit 1;
  if p_method in ('verified_email','verified_phone','whatsapp_phone') then
    source_value:=private.contact_current_auth_source(p_actor,p_method);
    source_signature:=case when source_value is null then ''
      else private.contact_source_digest(p_method,source_value) end;
  else source_signature:='user-provided'; end if;
  return private.contact_hash(array[
    'contact-share-action-v1',e.id::text,p_actor::text,p_method,
    e.status,e.lifecycle_version::text,
    private.contact_block_signature(e.id),
    coalesce(latest.id::text,''),coalesce(latest.consent_status,''),
    coalesce(latest.source_status,''),coalesce(latest.state_version::text,''),
    source_signature
  ]);
end;
$$;

create or replace function private.contact_revoke_action_token(
  e public.engagements,s public.contact_shares
) returns text language sql stable set search_path='' as $$
  select private.contact_hash(array[
    'contact-revoke-action-v1',e.id::text,e.status,e.lifecycle_version::text,
    s.id::text,s.sharer_user_id::text,s.method,s.consent_status,
    s.source_status,s.state_version::text
  ])
$$;

create or replace function private.contact_reveal_action_token(
  e public.engagements,s public.contact_shares
) returns text language sql stable set search_path='' as $$
  select private.contact_hash(array[
    'contact-reveal-action-v1',e.id::text,e.status,e.lifecycle_version::text,
    private.contact_block_signature(e.id),
    s.id::text,s.recipient_user_id::text,s.method,s.consent_status,
    s.source_status,s.state_version::text,
    private.contact_effective_source_status(s)
  ])
$$;

create or replace function private.contact_block_action_token(
  e public.engagements,p_actor uuid
) returns text language sql stable set search_path='' as $$
  select private.contact_hash(array[
    'contact-block-action-v1',e.id::text,p_actor::text,e.status,
    e.lifecycle_version::text,private.contact_block_signature(e.id)
  ])
$$;

create or replace function private.contact_report_action_token(
  e public.engagements,p_actor uuid
) returns text language sql stable set search_path='' as $$
  select private.contact_hash(array[
    'contact-report-action-v1',e.id::text,p_actor::text,
    e.status,e.lifecycle_version::text
  ])
$$;

create or replace function private.contact_operation_replay(
  p_actor uuid,p_request uuid,p_fingerprint text
) returns jsonb language plpgsql stable set search_path='' as $$
declare operation private.contact_operations%rowtype;
begin
  select * into operation from private.contact_operations
  where actor_user_id=p_actor and request_id=p_request;
  if not found then return null; end if;
  if operation.operation_fingerprint<>p_fingerprint then
    raise exception using errcode='P0001',message='M7I_IDEMPOTENCY_CONFLICT';
  end if;
  return operation.safe_result||jsonb_build_object('idempotent_replay',true);
end;
$$;

create or replace function private.contact_record_operation(
  p_actor uuid,p_request uuid,p_kind text,p_fingerprint text,
  p_engagement uuid,p_share uuid,p_reveal uuid,p_block uuid,p_report uuid,
  p_result jsonb,p_now timestamptz
) returns void language sql set search_path='' as $$
  insert into private.contact_operations(
    actor_user_id,request_id,operation_kind,operation_fingerprint,
    engagement_id,share_id,reveal_id,block_id,report_id,safe_result,created_at
  ) values(
    p_actor,p_request,p_kind,p_fingerprint,p_engagement,p_share,
    p_reveal,p_block,p_report,p_result,p_now
  )
$$;

create or replace function private.contact_share_public_result(
  s public.contact_shares,p_actor uuid,e public.engagements
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare viewer_is_sharer boolean:=s.sharer_user_id=p_actor;
  effective_source text:=private.contact_effective_source_status(s);
  actions jsonb:='[]'::jsonb;
begin
  if viewer_is_sharer and s.consent_status='active' then
    actions:=actions||jsonb_build_array(jsonb_build_object(
      'action','revoke','action_token',private.contact_revoke_action_token(e,s)
    ));
  elsif not viewer_is_sharer and s.recipient_user_id=p_actor
    and e.status<>'cancelled' and not private.contact_has_block(e.id)
    and s.consent_status='active' and effective_source='current' then
    actions:=actions||jsonb_build_array(jsonb_build_object(
      'action','reveal','action_token',private.contact_reveal_action_token(e,s)
    ));
  end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'share_id',s.id,'direction',case when viewer_is_sharer then 'shared_by_you'
      else 'shared_with_you' end,
    'method',s.method,'masked_value',s.masked_value,
    'consent_status',s.consent_status,'source_status',effective_source,
    'state_version',s.state_version,
    'ownership_verification',s.ownership_verification,
    'whatsapp_availability',s.whatsapp_availability,
    'previous_share_id',s.previous_share_id,
    'created_at',s.created_at,'revoked_at',s.revoked_at,
    'invalidated_at',s.invalidated_at,'actions',actions
  ));
end;
$$;

create or replace function private.contact_exchange_public_result(
  p_engagement_id uuid,p_actor uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  e public.engagements%rowtype; role text; other_user uuid;
  blocked_by_viewer boolean; blocked_by_other boolean;
  own_items jsonb; received_items jsonb; methods jsonb; method_name text;
  source_value text; available boolean;
begin
  select * into e from public.engagements where id=p_engagement_id;
  if not found then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  role:=private.contact_actor_role(e,p_actor);
  if role is null then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  other_user:=private.contact_other_participant(e,p_actor);
  blocked_by_viewer:=exists(select 1 from public.engagement_contact_blocks
    where engagement_id=e.id and blocker_user_id=p_actor);
  blocked_by_other:=exists(select 1 from public.engagement_contact_blocks
    where engagement_id=e.id and blocker_user_id=other_user);

  select coalesce(jsonb_agg(private.contact_share_public_result(s,p_actor,e)
    order by s.created_at desc,s.id),'[]'::jsonb) into own_items
  from public.contact_shares s
  where s.engagement_id=e.id and s.sharer_user_id=p_actor;

  select coalesce(jsonb_agg(private.contact_share_public_result(s,p_actor,e)
    order by s.created_at desc,s.id),'[]'::jsonb) into received_items
  from public.contact_shares s
  where s.engagement_id=e.id and s.recipient_user_id=p_actor;

  methods:='[]'::jsonb;
  foreach method_name in array array[
    'verified_email','verified_phone','whatsapp_phone',
    'meeting_link','professional_profile'
  ] loop
    source_value:=null;
    if method_name in ('verified_email','verified_phone','whatsapp_phone') then
      source_value:=private.contact_current_auth_source(p_actor,method_name);
    end if;
    available:=e.status<>'cancelled' and not blocked_by_viewer
      and not blocked_by_other
      and (method_name in ('meeting_link','professional_profile')
        or source_value is not null)
      and not exists(
        select 1 from public.contact_shares s
        where s.engagement_id=e.id and s.sharer_user_id=p_actor
          and s.method=method_name and s.consent_status='active'
          and private.contact_effective_source_status(s)='current'
      );
    methods:=methods||jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'method',method_name,'available',available,
      'unavailable_reason',case
        when e.status='cancelled' then 'engagement_cancelled'
        when blocked_by_viewer or blocked_by_other then 'engagement_contact_blocked'
        when method_name in ('verified_email','verified_phone','whatsapp_phone')
          and source_value is null then 'verified_source_unavailable'
        when not available then 'already_shared'
      end,
      'ownership_verification',case
        when method_name in ('verified_email','verified_phone','whatsapp_phone')
          then 'verified' else 'user_provided' end,
      'whatsapp_availability',case when method_name='whatsapp_phone'
        then 'self_declared' end,
      'share_action_token',case when available
        then private.contact_share_action_token(e,p_actor,method_name) end
    )));
  end loop;

  return jsonb_build_object(
    'engagement_id',e.id,'viewer_role',role,'engagement_status',e.status,
    'exchange_available',e.status<>'cancelled' and not blocked_by_viewer
      and not blocked_by_other,
    'blocked',blocked_by_viewer or blocked_by_other,
    'blocked_by_viewer',blocked_by_viewer,
    'blocked_by_other',blocked_by_other,
    'available_methods',methods,'shared_by_you',own_items,
    'shared_with_you',received_items,
    'block_action_token',case when not blocked_by_viewer
      then private.contact_block_action_token(e,p_actor) end,
    'report_action_token',private.contact_report_action_token(e,p_actor),
    'warnings',jsonb_build_array(
      'Revoking access hides the detail inside GigMatch but cannot erase information already viewed, copied or saved.',
      'GigMatch does not currently process payments or provide escrow. Never share passwords, OTPs, access tokens or sensitive banking credentials.',
      'Blocking applies only to contact and optional interaction for this engagement.'
    )
  );
end;
$$;

create or replace function public.contact_exchange_get(
  p_engagement_id uuid,p_acting_user_id uuid
) returns jsonb language sql security definer set search_path='' as $$
  select private.contact_exchange_public_result(p_engagement_id,p_acting_user_id)
$$;

create or replace function public.contact_share_encryption_context(
  p_engagement_id uuid,p_acting_user_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.engagements%rowtype; recipient uuid;
begin
  select * into e from public.engagements where id=p_engagement_id;
  if not found then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  recipient:=private.contact_other_participant(e,p_acting_user_id);
  if recipient is null then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  return jsonb_build_object(
    'engagement_id',e.id,'sharer_user_id',p_acting_user_id,
    'recipient_user_id',recipient
  );
end;
$$;

create or replace function public.contact_share_create(
  p_engagement_id uuid,p_acting_user_id uuid,p_method text,
  p_expected_action_token text,p_request_id uuid,p_share_id uuid,
  p_ciphertext text default null,p_nonce text default null,
  p_key_id text default null,p_value_fingerprint text default null,
  p_masked_value text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  e public.engagements%rowtype; role text; other_user uuid;
  authoritative_now timestamptz; source_value text; resolved_source_digest text;
  canonical_fingerprint text; operation_fingerprint text; replay jsonb;
  previous_id uuid;
  ownership text; whatsapp text; mask_value text;
begin
  if p_engagement_id is null or p_acting_user_id is null or p_request_id is null
     or p_share_id is null or btrim(coalesce(p_expected_action_token,''))=''
     or p_method not in (
       'verified_email','verified_phone','whatsapp_phone',
       'meeting_link','professional_profile'
     ) then
    raise exception using errcode='22023',message='M7I_CONTACT_SHARE_NOT_ALLOWED';
  end if;

  select * into e from public.engagements where id=p_engagement_id;
  if not found then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  perform 1 from public.gigs where id=e.gig_id for update;
  select * into e from public.engagements where id=p_engagement_id for update;
  role:=private.contact_actor_role(e,p_acting_user_id);
  if role is null then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  other_user:=private.contact_other_participant(e,p_acting_user_id);
  perform 1 from public.engagement_contact_blocks
    where engagement_id=e.id order by blocker_user_id for update;
  perform 1 from public.contact_shares
    where engagement_id=e.id order by id for update;
  authoritative_now:=clock_timestamp();

  if p_method in ('verified_email','verified_phone','whatsapp_phone') then
    if p_ciphertext is not null or p_nonce is not null or p_key_id is not null
       or p_value_fingerprint is not null or p_masked_value is not null then
      raise exception using errcode='22023',message='M7I_BROWSER_VERIFIED_VALUE_REJECTED';
    end if;
    source_value:=private.contact_current_auth_source(p_acting_user_id,p_method);
    if source_value is null then
      raise exception using errcode='P0001',message='M7I_VERIFIED_SOURCE_UNAVAILABLE';
    end if;
    resolved_source_digest:=private.contact_source_digest(p_method,source_value);
    canonical_fingerprint:=resolved_source_digest;
    mask_value:=private.contact_mask_auth_value(p_method,source_value);
    ownership:='verified';
    whatsapp:=case when p_method='whatsapp_phone' then 'self_declared' end;
  else
    if btrim(coalesce(p_ciphertext,''))='' or btrim(coalesce(p_nonce,''))=''
       or btrim(coalesce(p_key_id,''))=''
       or coalesce(p_value_fingerprint,'') !~ '^[0-9a-f]{64}$'
       or btrim(coalesce(p_masked_value,''))='' then
      raise exception using errcode='22023',message='M7I_ENCRYPTED_MATERIAL_REQUIRED';
    end if;
    resolved_source_digest:=private.contact_hash(array[
      'contact-url-source-v1',p_method,p_value_fingerprint
    ]);
    canonical_fingerprint:=p_value_fingerprint;
    mask_value:=p_masked_value;
    ownership:='user_provided';
    whatsapp:=null;
  end if;

  operation_fingerprint:=private.contact_hash(array[
    'contact-share-operation-v1',e.id::text,p_acting_user_id::text,
    p_method,canonical_fingerprint
  ]);
  replay:=private.contact_operation_replay(
    p_acting_user_id,p_request_id,operation_fingerprint
  );
  if replay is not null then
    return private.contact_exchange_public_result(e.id,p_acting_user_id)
      ||jsonb_build_object('idempotent_replay',true);
  end if;

  if e.status='cancelled' then
    raise exception using errcode='P0001',message='M7I_CONTACT_EXCHANGE_UNAVAILABLE';
  end if;
  if exists(select 1 from public.engagement_contact_blocks
    where engagement_id=e.id) then
    raise exception using errcode='P0001',message='M7I_CONTACT_EXCHANGE_BLOCKED';
  end if;
  if private.contact_share_action_token(e,p_acting_user_id,p_method)
     <>p_expected_action_token then
    raise exception using errcode='40001',message='M7I_STALE_CONTACT_ACTION';
  end if;

  if p_method in ('verified_email','verified_phone','whatsapp_phone') then
    update public.contact_shares s set
      consent_status='revoked',revoked_at=authoritative_now,
      source_status='invalidated',invalidated_at=authoritative_now,
      state_version=s.state_version+1
    where s.engagement_id=e.id and s.sharer_user_id=p_acting_user_id
      and s.method=p_method and s.consent_status='active'
      and s.source_status='current'
      and exists(
        select 1 from private.contact_share_material m
        where m.share_id=s.id and m.source_digest<>resolved_source_digest
      );
    update public.contact_shares s set
      consent_status='revoked',revoked_at=authoritative_now,
      state_version=s.state_version+1
    where s.engagement_id=e.id and s.sharer_user_id=p_acting_user_id
      and s.method=p_method and s.consent_status='active'
      and s.source_status='invalidated';
  end if;

  if exists(
    select 1 from public.contact_shares s
    where s.engagement_id=e.id and s.sharer_user_id=p_acting_user_id
      and s.method=p_method and s.consent_status='active'
  ) then
    raise exception using errcode='P0001',message='M7I_CONTACT_ALREADY_SHARED';
  end if;

  select s.id into previous_id from public.contact_shares s
  where s.engagement_id=e.id and s.sharer_user_id=p_acting_user_id
    and s.method=p_method
  order by s.created_at desc,s.id desc limit 1;

  insert into public.contact_shares(
    id,engagement_id,sharer_user_id,recipient_user_id,method,
    consent_status,source_status,state_version,masked_value,
    ownership_verification,whatsapp_availability,previous_share_id,created_at
  ) values(
    p_share_id,e.id,p_acting_user_id,other_user,p_method,
    'active','current',1,mask_value,ownership,whatsapp,previous_id,
    authoritative_now
  );
  insert into private.contact_share_material(
    share_id,source_digest,canonical_value_fingerprint,
    ciphertext,nonce,key_id,created_at
  ) values(
    p_share_id,resolved_source_digest,canonical_fingerprint,
    p_ciphertext,p_nonce,p_key_id,authoritative_now
  );
  perform private.contact_record_operation(
    p_acting_user_id,p_request_id,'share',operation_fingerprint,
    e.id,p_share_id,null,null,null,
    jsonb_build_object('share_id',p_share_id),authoritative_now
  );
  return private.contact_exchange_public_result(e.id,p_acting_user_id);
end;
$$;

create or replace function public.contact_share_revoke(
  p_share_id uuid,p_acting_user_id uuid,p_expected_action_token text,
  p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  resolved_engagement uuid; e public.engagements%rowtype;
  s public.contact_shares%rowtype; authoritative_now timestamptz;
  fingerprint text; replay jsonb;
begin
  if p_share_id is null or p_acting_user_id is null or p_request_id is null
     or btrim(coalesce(p_expected_action_token,''))='' then
    raise exception using errcode='22023',message='M7I_CONTACT_SHARE_NOT_ALLOWED';
  end if;
  select engagement_id into resolved_engagement
  from public.contact_shares where id=p_share_id;
  if resolved_engagement is null then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  select * into e from public.engagements where id=resolved_engagement;
  perform 1 from public.gigs where id=e.gig_id for update;
  select * into e from public.engagements where id=resolved_engagement for update;
  perform 1 from public.engagement_contact_blocks
    where engagement_id=e.id order by blocker_user_id for update;
  perform 1 from public.contact_shares
    where engagement_id=e.id order by id for update;
  select * into s from public.contact_shares where id=p_share_id;
  if s.sharer_user_id<>p_acting_user_id
     or private.contact_actor_role(e,p_acting_user_id) is null then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  authoritative_now:=clock_timestamp();
  fingerprint:=private.contact_hash(array[
    'contact-revoke-operation-v1',s.id::text,p_acting_user_id::text
  ]);
  replay:=private.contact_operation_replay(p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then
    return private.contact_exchange_public_result(e.id,p_acting_user_id)
      ||jsonb_build_object('idempotent_replay',true);
  end if;
  if private.contact_revoke_action_token(e,s)<>p_expected_action_token then
    raise exception using errcode='40001',message='M7I_STALE_CONTACT_ACTION';
  end if;
  if s.consent_status<>'active' then
    raise exception using errcode='P0001',message='M7I_CONTACT_SHARE_NOT_ACTIVE';
  end if;
  update public.contact_shares set
    consent_status='revoked',revoked_at=authoritative_now,
    state_version=state_version+1
  where id=s.id;
  if s.method in ('meeting_link','professional_profile') then
    update private.contact_share_material set
      ciphertext=null,nonce=null,retired_at=authoritative_now
    where share_id=s.id and retired_at is null;
  end if;
  perform private.contact_record_operation(
    p_acting_user_id,p_request_id,'revoke',fingerprint,
    e.id,s.id,null,null,null,jsonb_build_object('share_id',s.id),
    authoritative_now
  );
  return private.contact_exchange_public_result(e.id,p_acting_user_id);
end;
$$;

create or replace function public.engagement_contact_block(
  p_engagement_id uuid,p_acting_user_id uuid,p_expected_action_token text,
  p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  e public.engagements%rowtype; other_user uuid; authoritative_now timestamptz;
  fingerprint text; replay jsonb; created_block uuid; revoked_ids uuid[];
begin
  if p_engagement_id is null or p_acting_user_id is null or p_request_id is null
     or btrim(coalesce(p_expected_action_token,''))='' then
    raise exception using errcode='22023',message='M7I_CONTACT_BLOCK_NOT_ALLOWED';
  end if;
  select * into e from public.engagements where id=p_engagement_id;
  if not found then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  perform 1 from public.gigs where id=e.gig_id for update;
  select * into e from public.engagements where id=p_engagement_id for update;
  other_user:=private.contact_other_participant(e,p_acting_user_id);
  if other_user is null then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  perform 1 from public.engagement_contact_blocks
    where engagement_id=e.id order by blocker_user_id for update;
  perform 1 from public.contact_shares
    where engagement_id=e.id order by id for update;
  authoritative_now:=clock_timestamp();
  fingerprint:=private.contact_hash(array[
    'contact-block-operation-v1',e.id::text,p_acting_user_id::text
  ]);
  replay:=private.contact_operation_replay(p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then
    return private.contact_exchange_public_result(e.id,p_acting_user_id)
      ||jsonb_build_object('idempotent_replay',true);
  end if;
  if private.contact_block_action_token(e,p_acting_user_id)
     <>p_expected_action_token then
    raise exception using errcode='40001',message='M7I_STALE_CONTACT_ACTION';
  end if;
  if exists(select 1 from public.engagement_contact_blocks
    where engagement_id=e.id and blocker_user_id=p_acting_user_id) then
    raise exception using errcode='P0001',message='M7I_CONTACT_ALREADY_BLOCKED';
  end if;
  insert into public.engagement_contact_blocks(
    engagement_id,blocker_user_id,blocked_user_id,request_id,created_at
  ) values(
    e.id,p_acting_user_id,other_user,p_request_id,authoritative_now
  ) returning id into created_block;

  with revoked as (
    update public.contact_shares s set
      consent_status='revoked',revoked_at=authoritative_now,
      state_version=s.state_version+1
    where s.engagement_id=e.id and s.sharer_user_id=p_acting_user_id
      and s.consent_status='active'
    returning s.id,s.method
  )
  select coalesce(array_agg(id),'{}'::uuid[]) into revoked_ids from revoked;
  update private.contact_share_material m set
    ciphertext=null,nonce=null,retired_at=authoritative_now
  where m.share_id=any(revoked_ids) and m.ciphertext is not null
    and m.retired_at is null;

  perform private.contact_record_operation(
    p_acting_user_id,p_request_id,'block',fingerprint,
    e.id,null,null,created_block,null,
    jsonb_build_object('block_id',created_block),authoritative_now
  );
  return private.contact_exchange_public_result(e.id,p_acting_user_id);
end;
$$;

create or replace function public.engagement_contact_report(
  p_engagement_id uuid,p_acting_user_id uuid,p_expected_action_token text,
  p_request_id uuid,p_category text,p_detail text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  e public.engagements%rowtype; other_user uuid; authoritative_now timestamptz;
  fingerprint text; replay jsonb; created_report uuid; clean_detail text;
begin
  if p_engagement_id is null or p_acting_user_id is null or p_request_id is null
     or btrim(coalesce(p_expected_action_token,''))=''
     or p_category not in (
       'harassment','spam','fraudulent_request','identity_misrepresentation',
       'abusive_communication','suspicious_payment_request',
       'request_for_credentials','other'
     ) then
    raise exception using errcode='22023',message='M7I_CONTACT_REPORT_NOT_ALLOWED';
  end if;
  clean_detail:=nullif(btrim(p_detail),'');
  if (p_category='other' and clean_detail is null)
     or char_length(coalesce(clean_detail,''))>1000
     or coalesce(clean_detail,'')~'[[:cntrl:]]' then
    raise exception using errcode='22023',message='M7I_INVALID_REPORT_DETAIL';
  end if;
  select * into e from public.engagements where id=p_engagement_id;
  if not found then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  perform 1 from public.gigs where id=e.gig_id for update;
  select * into e from public.engagements where id=p_engagement_id for update;
  other_user:=private.contact_other_participant(e,p_acting_user_id);
  if other_user is null then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  perform 1 from public.engagement_contact_blocks
    where engagement_id=e.id order by blocker_user_id for update;
  perform 1 from public.contact_shares
    where engagement_id=e.id order by id for update;
  authoritative_now:=clock_timestamp();
  fingerprint:=private.contact_hash(array[
    'contact-report-operation-v1',e.id::text,p_acting_user_id::text,
    p_category,coalesce(clean_detail,'')
  ]);
  replay:=private.contact_operation_replay(p_acting_user_id,p_request_id,fingerprint);
  if replay is not null then
    return jsonb_build_object(
      'engagement_id',e.id,'report_submitted',true,'idempotent_replay',true
    );
  end if;
  if private.contact_report_action_token(e,p_acting_user_id)
     <>p_expected_action_token then
    raise exception using errcode='40001',message='M7I_STALE_CONTACT_ACTION';
  end if;
  insert into public.engagement_contact_reports(
    engagement_id,reporter_user_id,reported_user_id,category,
    detail,request_id,created_at
  ) values(
    e.id,p_acting_user_id,other_user,p_category,clean_detail,
    p_request_id,authoritative_now
  ) returning id into created_report;
  perform private.contact_record_operation(
    p_acting_user_id,p_request_id,'report',fingerprint,
    e.id,null,null,null,created_report,
    jsonb_build_object('report_id',created_report),authoritative_now
  );
  return jsonb_build_object('engagement_id',e.id,'report_submitted',true);
end;
$$;

create or replace function public.contact_share_reveal(
  p_share_id uuid,p_acting_user_id uuid,p_reveal_action_token text,
  p_request_id uuid,p_rate_limit integer,p_rate_window_minutes integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  resolved_engagement uuid; e public.engagements%rowtype;
  s public.contact_shares%rowtype; material private.contact_share_material%rowtype;
  current_value text; current_digest text; authoritative_now timestamptz;
  fingerprint text; prior_operation private.contact_operations%rowtype;
  reveal_row public.contact_reveals%rowtype; recent_count integer;
  retry_seconds integer; created_reveal uuid;
begin
  if p_share_id is null or p_acting_user_id is null or p_request_id is null
     or btrim(coalesce(p_reveal_action_token,''))=''
     or p_rate_limit not between 1 and 100
     or p_rate_window_minutes not between 1 and 1440 then
    raise exception using errcode='22023',message='M7I_CONTACT_REVEAL_NOT_ALLOWED';
  end if;
  select engagement_id into resolved_engagement
  from public.contact_shares where id=p_share_id;
  if resolved_engagement is null then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  select * into e from public.engagements where id=resolved_engagement;
  perform 1 from public.gigs where id=e.gig_id for update;
  select * into e from public.engagements where id=resolved_engagement for update;
  perform 1 from public.engagement_contact_blocks
    where engagement_id=e.id order by blocker_user_id for update;
  perform 1 from public.contact_shares
    where engagement_id=e.id order by id for update;
  select * into s from public.contact_shares where id=p_share_id;
  if s.recipient_user_id<>p_acting_user_id
     or private.contact_actor_role(e,p_acting_user_id) is null then
    raise exception using errcode='P0002',message='M7I_CONTACT_EXCHANGE_NOT_FOUND';
  end if;
  authoritative_now:=clock_timestamp();
  fingerprint:=private.contact_hash(array[
    'contact-reveal-operation-v1',s.id::text,p_acting_user_id::text
  ]);
  select * into prior_operation from private.contact_operations
  where actor_user_id=p_acting_user_id and request_id=p_request_id;
  if found and prior_operation.operation_fingerprint<>fingerprint then
    raise exception using errcode='P0001',message='M7I_IDEMPOTENCY_CONFLICT';
  end if;

  -- A reveal retry deliberately rechecks all authority before consulting its
  -- earlier audit. Plaintext is never stored in the operation ledger.
  if e.status='cancelled' then
    raise exception using errcode='P0001',message='M7I_CONTACT_EXCHANGE_UNAVAILABLE';
  end if;
  if exists(select 1 from public.engagement_contact_blocks
    where engagement_id=e.id) then
    raise exception using errcode='P0001',message='M7I_CONTACT_EXCHANGE_BLOCKED';
  end if;
  if s.consent_status<>'active' then
    raise exception using errcode='P0001',message='M7I_CONTACT_SHARE_NOT_ACTIVE';
  end if;
  if s.source_status<>'current' then
    raise exception using errcode='P0001',message='M7I_CONTACT_SOURCE_INVALIDATED';
  end if;

  select * into material from private.contact_share_material where share_id=s.id;
  if not found then
    raise exception using errcode='P0001',message='M7I_CONTACT_SOURCE_INVALIDATED';
  end if;
  if s.method in ('verified_email','verified_phone','whatsapp_phone') then
    perform 1 from auth.users where id=s.sharer_user_id for key share;
    current_value:=private.contact_current_auth_source(s.sharer_user_id,s.method);
    current_digest:=case when current_value is null then null
      else private.contact_source_digest(s.method,current_value) end;
    if current_digest is null or current_digest<>material.source_digest then
      update public.contact_shares set
        source_status='invalidated',invalidated_at=authoritative_now,
        state_version=state_version+1
      where id=s.id;
      return jsonb_build_object(
        'authorised',false,'denial_code','contact_source_invalidated'
      );
    end if;
  elsif material.retired_at is not null or material.ciphertext is null
    or material.nonce is null or material.key_id is null then
    update public.contact_shares set
      source_status='invalidated',invalidated_at=authoritative_now,
      state_version=state_version+1
    where id=s.id;
    return jsonb_build_object(
      'authorised',false,'denial_code','contact_source_invalidated'
    );
  end if;

  if private.contact_reveal_action_token(e,s)<>p_reveal_action_token then
    raise exception using errcode='40001',message='M7I_STALE_CONTACT_ACTION';
  end if;

  select * into reveal_row from public.contact_reveals
  where recipient_user_id=p_acting_user_id and request_id=p_request_id;
  if found and reveal_row.share_id<>s.id then
    raise exception using errcode='P0001',message='M7I_IDEMPOTENCY_CONFLICT';
  end if;

  if not found then
    select count(*) into recent_count from public.contact_reveals r
    where r.engagement_id=e.id and r.recipient_user_id=p_acting_user_id
      and r.authorised_at>
        authoritative_now-make_interval(mins=>p_rate_window_minutes);
    if recent_count>=p_rate_limit then
      select greatest(1,ceil(extract(epoch from (
        min(r.authorised_at)+make_interval(mins=>p_rate_window_minutes)
        -authoritative_now
      )))::integer) into retry_seconds
      from public.contact_reveals r
      where r.engagement_id=e.id and r.recipient_user_id=p_acting_user_id
        and r.authorised_at>
          authoritative_now-make_interval(mins=>p_rate_window_minutes);
      return jsonb_build_object(
        'authorised',false,'denial_code','contact_reveal_rate_limited',
        'retry_after_seconds',coalesce(retry_seconds,1)
      );
    end if;
    insert into public.contact_reveals(
      share_id,engagement_id,recipient_user_id,request_id,authorised_at
    ) values(
      s.id,e.id,p_acting_user_id,p_request_id,authoritative_now
    ) returning id into created_reveal;
    perform private.contact_record_operation(
      p_acting_user_id,p_request_id,'reveal',fingerprint,
      e.id,s.id,created_reveal,null,null,
      jsonb_build_object('share_id',s.id,'reveal_id',created_reveal),
      authoritative_now
    );
  else
    created_reveal:=reveal_row.id;
  end if;

  if s.method in ('verified_email','verified_phone','whatsapp_phone') then
    return jsonb_build_object(
      'authorised',true,'audit_id',created_reveal,'share_id',s.id,
      'method',s.method,'ownership_verification','verified',
      'whatsapp_availability',s.whatsapp_availability,
      'authorised_at',authoritative_now,'material_kind','auth_plaintext',
      'value',current_value,'audit_replay',reveal_row.id is not null
    );
  end if;
  return jsonb_build_object(
    'authorised',true,'audit_id',created_reveal,'share_id',s.id,
    'engagement_id',e.id,'sharer_user_id',s.sharer_user_id,
    'recipient_user_id',s.recipient_user_id,'method',s.method,
    'ownership_verification','user_provided',
    'authorised_at',authoritative_now,'material_kind','encrypted_url',
    'ciphertext',material.ciphertext,'nonce',material.nonce,
    'key_id',material.key_id,'audit_replay',reveal_row.id is not null
  );
end;
$$;

revoke all on function public.contact_exchange_get(uuid,uuid),
  public.contact_share_encryption_context(uuid,uuid),
  public.contact_share_create(uuid,uuid,text,text,uuid,uuid,text,text,text,text,text),
  public.contact_share_revoke(uuid,uuid,text,uuid),
  public.contact_share_reveal(uuid,uuid,text,uuid,integer,integer),
  public.engagement_contact_block(uuid,uuid,text,uuid),
  public.engagement_contact_report(uuid,uuid,text,uuid,text,text)
  from public,anon,authenticated;

grant execute on function public.contact_exchange_get(uuid,uuid),
  public.contact_share_encryption_context(uuid,uuid),
  public.contact_share_create(uuid,uuid,text,text,uuid,uuid,text,text,text,text,text),
  public.contact_share_revoke(uuid,uuid,text,uuid),
  public.contact_share_reveal(uuid,uuid,text,uuid,integer,integer),
  public.engagement_contact_block(uuid,uuid,text,uuid),
  public.engagement_contact_report(uuid,uuid,text,uuid,text,text)
  to service_role;

commit;
