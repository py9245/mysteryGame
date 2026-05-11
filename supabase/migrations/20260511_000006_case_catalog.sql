create table if not exists case_library (
  case_key text primary key,
  stage_number integer not null default 1 check (stage_number >= 1),
  title text not null,
  public_description text not null,
  image_url text,
  image_data_url text,
  question text not null,
  truth text not null,
  required_keywords text[] not null default '{}',
  bonus_keywords text[] not null default '{}',
  accepted_answer_summary text not null,
  hints jsonb not null default '[]'::jsonb,
  is_practice_pool boolean not null default false,
  origin text not null default 'seeded',
  review_notes text,
  version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists player_case_history (
  id uuid primary key default gen_random_uuid(),
  identity_key text not null,
  account_id uuid references user_accounts(id) on delete set null,
  guest_identity text,
  case_key text not null references case_library(case_key) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_played_at timestamptz not null default now(),
  play_count integer not null default 1 check (play_count >= 1),
  solved_count integer not null default 0 check (solved_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identity_key, case_key)
);

create index if not exists case_library_origin_idx on case_library (origin, created_at);
create index if not exists case_library_practice_idx on case_library (is_practice_pool, created_at);
create index if not exists player_case_history_identity_idx on player_case_history (identity_key, last_played_at desc);
create index if not exists player_case_history_account_idx on player_case_history (account_id, last_played_at desc);
create index if not exists player_case_history_case_idx on player_case_history (case_key, last_played_at desc);

create trigger case_library_set_updated_at
before update on case_library
for each row execute function set_updated_at();

create trigger player_case_history_set_updated_at
before update on player_case_history
for each row execute function set_updated_at();

comment on table case_library is 'Persistent mystery case catalog for practice pool, public games, and runtime top-up generation.';
comment on table player_case_history is 'Per-identity case experience log used to avoid serving already-played cases to the same user set.';
