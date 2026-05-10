alter table if exists player_stage_states
  add column if not exists queue_joined_at timestamptz,
  add column if not exists queue_cooldown_ends_at timestamptz;

create index if not exists player_stage_states_stage_queue_joined_idx
  on player_stage_states (stage_id, queue_joined_at);
