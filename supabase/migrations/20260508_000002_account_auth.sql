create table if not exists user_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_profiles (
  account_id uuid primary key references user_accounts(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references user_accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table players
add column if not exists account_id uuid references user_accounts(id) on delete set null;

create table if not exists account_game_results (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references user_accounts(id) on delete cascade,
  game_id uuid references games(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  final_rank integer check (final_rank is null or final_rank >= 1),
  is_winner boolean not null default false,
  total_score integer,
  solved_count integer not null default 0,
  bonus_keyword_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (account_id, game_id)
);

create index if not exists players_account_id_idx on players (account_id);
create index if not exists user_sessions_account_id_idx on user_sessions (account_id);
create index if not exists user_sessions_expires_at_idx on user_sessions (expires_at);
create index if not exists account_game_results_account_id_created_at_idx on account_game_results (account_id, created_at desc);
create index if not exists account_game_results_game_id_idx on account_game_results (game_id);

create trigger user_accounts_set_updated_at
before update on user_accounts
for each row execute function set_updated_at();

create trigger user_profiles_set_updated_at
before update on user_profiles
for each row execute function set_updated_at();
