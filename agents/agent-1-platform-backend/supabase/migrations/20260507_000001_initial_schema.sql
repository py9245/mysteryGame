create extension if not exists pgcrypto;

create type room_status as enum ('waiting', 'ready', 'assigning', 'in_game', 'closed');
create type game_status as enum ('lobby', 'briefing', 'in_progress', 'stage_result', 'finished', 'cancelled');
create type stage_status as enum ('pending', 'briefing', 'in_progress', 'ended', 'revealed');
create type player_role as enum ('host', 'player', 'admin', 'observer');
create type connection_status as enum ('connected', 'disconnected');
create type player_stage_status as enum (
  'active',
  'solved_locked',
  'inactive_penalized',
  'timed_out',
  'disconnected'
);
create type question_judgement as enum ('YES', 'NO', 'MAYBE', 'IRRELEVANT');
create type answer_result as enum ('correct', 'incorrect', 'ambiguous');
create type score_event_type as enum (
  'time_tick',
  'question_cost',
  'wrong_answer_cost',
  'bonus_keyword_reward',
  'inactivity_penalty',
  'unsolved_penalty',
  'macro_penalty'
);
create type stage_end_reason as enum ('two_players_solved', 'timer_expired', 'admin_closed', 'cancelled');
create type chat_channel as enum ('global', 'team', 'private', 'system');
create type private_chat_request_status as enum ('pending', 'accepted', 'rejected', 'expired', 'cancelled');
create type judgement_record_kind as enum ('question', 'answer');
create type judgement_review_status as enum ('pending', 'approved', 'rejected', 'merged');
create type judgement_public_source as enum ('ai', 'operator');
create type judgement_persistence_state as enum ('stored', 'queued_for_review', 'reviewed', 'overridden');

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status room_status not null default 'waiting',
  max_players integer not null default 6 check (max_players = 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  nickname text not null,
  role player_role not null default 'player',
  is_ready boolean not null default false,
  connection_status connection_status not null default 'connected',
  total_score integer not null default 0,
  solved_count integer not null default 0,
  bonus_keyword_count integer not null default 0,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, nickname)
);

create table if not exists team_slots (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, label)
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references rooms(id) on delete cascade,
  status game_status not null default 'lobby',
  current_stage_number integer not null default 1 check (current_stage_number >= 1),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  stage_number integer not null check (stage_number >= 1),
  case_key text not null,
  status stage_status not null default 'pending',
  briefing_started_at timestamptz,
  started_at timestamptz,
  ends_at timestamptz,
  ended_at timestamptz,
  solved_player_ids uuid[] not null default '{}',
  end_reason stage_end_reason,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, stage_number)
);

create table if not exists stage_team_assignments (
  stage_id uuid not null references stages(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team_slot_id uuid not null references team_slots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (stage_id, player_id)
);

create table if not exists player_stage_states (
  stage_id uuid not null references stages(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team_slot_id uuid references team_slots(id) on delete set null,
  status player_stage_status not null default 'active',
  question_count integer not null default 0 check (question_count >= 0),
  answer_attempt_count integer not null default 0 check (answer_attempt_count >= 0),
  has_received_inactivity_penalty boolean not null default false,
  solved_at timestamptz,
  locked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (stage_id, player_id)
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team_slot_id uuid not null references team_slots(id) on delete cascade,
  content text not null,
  judgement question_judgement,
  reason_code text,
  judged_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists answer_attempts (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team_slot_id uuid not null references team_slots(id) on delete cascade,
  content text not null,
  result answer_result not null,
  matched_bonus_keywords text[] not null default '{}',
  missing_required_keywords text[] not null default '{}',
  reason_code text not null,
  needs_manual_review boolean not null default false,
  should_lock_player boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists score_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  stage_id uuid references stages(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  type score_event_type not null,
  delta integer not null,
  quantity integer not null default 1 check (quantity >= 1),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  stage_id uuid references stages(id) on delete set null,
  player_id uuid not null references players(id) on delete cascade,
  team_slot_id uuid references team_slots(id) on delete set null,
  channel chat_channel not null default 'global',
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists investigation_locks (
  stage_id uuid primary key references stages(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  locked_by_player_id uuid references players(id) on delete set null,
  locked_at timestamptz,
  expires_at timestamptz,
  question_count integer not null default 0 check (question_count >= 0 and question_count <= 3),
  answer_attempt_count integer not null default 0 check (answer_attempt_count >= 0 and answer_attempt_count <= 1),
  last_released_by_player_id uuid references players(id) on delete set null,
  last_released_at timestamptz,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private_chat_requests (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages(id) on delete cascade,
  requester_player_id uuid not null references players(id) on delete cascade,
  target_player_id uuid not null references players(id) on delete cascade,
  status private_chat_request_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists private_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages(id) on delete cascade,
  request_id uuid not null unique references private_chat_requests(id) on delete cascade,
  player_a_id uuid not null references players(id) on delete cascade,
  player_b_id uuid not null references players(id) on delete cascade,
  started_at timestamptz not null,
  ends_at timestamptz not null
);

create table if not exists hint_reveals (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages(id) on delete cascade,
  hint_index integer not null check (hint_index >= 0),
  trigger_type text not null,
  revealed_at timestamptz not null default now()
);

create table if not exists admin_logs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  game_id uuid references games(id) on delete set null,
  stage_id uuid references stages(id) on delete set null,
  actor_type text not null,
  actor_id text not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists judgement_records (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  game_id uuid references games(id) on delete set null,
  stage_id uuid not null references stages(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  kind judgement_record_kind not null,
  case_id text not null,
  stage_number integer not null check (stage_number >= 1),
  request jsonb not null,
  response jsonb not null,
  public_outcome text not null,
  public_summary text not null,
  internal_payload jsonb not null default '{}'::jsonb,
  manual_review_required boolean not null default false,
  needs_operator_override boolean not null default false,
  persistence_state judgement_persistence_state not null default 'stored',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists judgement_review_queue (
  review_id uuid primary key default gen_random_uuid(),
  judgement_id uuid not null unique references judgement_records(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  stage_id uuid not null references stages(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  kind judgement_record_kind not null,
  public_outcome text not null,
  review_status judgement_review_status not null default 'pending',
  review_summary text not null default '',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists judgement_overrides (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references judgement_review_queue(review_id) on delete cascade,
  judgement_id uuid not null references judgement_records(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  stage_id uuid not null references stages(id) on delete cascade,
  operator_id uuid not null references players(id) on delete cascade,
  previous_public_outcome text not null,
  new_public_outcome text not null,
  override_reason text not null,
  applied_by judgement_public_source not null default 'operator',
  created_at timestamptz not null default now()
);

create index if not exists players_room_id_idx on players (room_id);
create index if not exists team_slots_room_id_idx on team_slots (room_id);
create index if not exists stages_room_id_status_idx on stages (room_id, status);
create index if not exists stages_game_id_stage_number_idx on stages (game_id, stage_number);
create index if not exists stage_team_assignments_stage_id_idx on stage_team_assignments (stage_id);
create index if not exists player_stage_states_stage_id_idx on player_stage_states (stage_id);
create index if not exists questions_stage_id_created_at_idx on questions (stage_id, created_at);
create index if not exists answer_attempts_stage_id_created_at_idx on answer_attempts (stage_id, created_at);
create index if not exists score_events_player_id_created_at_idx on score_events (player_id, created_at);
create index if not exists score_events_stage_id_created_at_idx on score_events (stage_id, created_at);
create index if not exists score_events_room_id_created_at_idx on score_events (room_id, created_at);
create index if not exists score_events_game_id_created_at_idx on score_events (game_id, created_at);
create index if not exists chat_messages_room_id_created_at_idx on chat_messages (room_id, created_at);
create index if not exists investigation_locks_room_id_idx on investigation_locks (room_id);
create index if not exists private_chat_requests_stage_id_idx on private_chat_requests (stage_id);
create index if not exists hint_reveals_stage_id_idx on hint_reveals (stage_id);
create index if not exists admin_logs_room_id_created_at_idx on admin_logs (room_id, created_at);
create index if not exists judgement_records_room_id_created_at_idx on judgement_records (room_id, created_at);
create index if not exists judgement_records_stage_id_created_at_idx on judgement_records (stage_id, created_at);
create index if not exists judgement_records_player_id_created_at_idx on judgement_records (player_id, created_at);
create index if not exists judgement_review_queue_status_idx on judgement_review_queue (review_status, created_at);
create index if not exists judgement_review_queue_room_id_idx on judgement_review_queue (room_id);
create index if not exists judgement_overrides_review_id_created_at_idx on judgement_overrides (review_id, created_at);

create trigger rooms_set_updated_at
before update on rooms
for each row execute function set_updated_at();

create trigger players_set_updated_at
before update on players
for each row execute function set_updated_at();

create trigger team_slots_set_updated_at
before update on team_slots
for each row execute function set_updated_at();

create trigger games_set_updated_at
before update on games
for each row execute function set_updated_at();

create trigger stages_set_updated_at
before update on stages
for each row execute function set_updated_at();

create trigger player_stage_states_set_updated_at
before update on player_stage_states
for each row execute function set_updated_at();

create trigger investigation_locks_set_updated_at
before update on investigation_locks
for each row execute function set_updated_at();

create trigger judgement_records_set_updated_at
before update on judgement_records
for each row execute function set_updated_at();

create trigger judgement_review_queue_set_updated_at
before update on judgement_review_queue
for each row execute function set_updated_at();

comment on table score_events is 'Score truth source. Player totals should be replayed from these rows.';
comment on table investigation_locks is 'One row per stage. Lock ownership, per-entry limits, and cooldown are enforced by server logic.';
comment on table judgement_records is 'Raw AI judgement plus public outcome and internal audit payload. This is the truth source for review and replay.';
comment on table judgement_review_queue is 'Operator-facing queue of judgement records that need manual review.';
comment on table judgement_overrides is 'Auditable operator override trail. Overrides never mutate the original AI response row.';
