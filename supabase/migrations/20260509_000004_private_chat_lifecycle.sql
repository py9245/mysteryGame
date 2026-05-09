alter type private_chat_request_status add value if not exists 'busy';

alter table private_chat_requests
  add column if not exists expires_at timestamptz not null default (now() + interval '15 seconds'),
  add column if not exists responded_at timestamptz,
  add column if not exists response_reason text,
  add column if not exists updated_at timestamptz not null default now();

update private_chat_requests
set expires_at = coalesce(expires_at, created_at + interval '15 seconds'),
    updated_at = coalesce(updated_at, created_at)
where expires_at is null
   or updated_at is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'private_chat_sessions'
      and column_name = 'ends_at'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'private_chat_sessions'
      and column_name = 'release_allowed_at'
  ) then
    alter table private_chat_sessions rename column ends_at to release_allowed_at;
  end if;
end
$$;

alter table private_chat_sessions
  add column if not exists ended_at timestamptz,
  add column if not exists closed_by_player_id uuid references players(id) on delete set null;

create index if not exists private_chat_requests_target_status_idx
  on private_chat_requests (target_player_id, status, expires_at desc);

create index if not exists private_chat_requests_requester_status_idx
  on private_chat_requests (requester_player_id, status, created_at desc);

create index if not exists private_chat_sessions_stage_active_idx
  on private_chat_sessions (stage_id, release_allowed_at desc, ended_at);
