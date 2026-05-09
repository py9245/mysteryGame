alter table if exists user_profiles
add column if not exists age integer not null default 0;

update user_profiles
set age = 0
where age is null;

alter table if exists user_profiles
alter column age set default 0;

alter table if exists user_profiles
drop constraint if exists user_profiles_age_check;

alter table if exists user_profiles
add constraint user_profiles_age_check check (age >= 0);

alter table if exists rooms
add column if not exists title text;

alter table if exists rooms
add column if not exists mode text not null default 'public';

alter table if exists rooms
add column if not exists password_hash text;

alter table if exists rooms
add column if not exists stage_count integer not null default 3;

update rooms
set
  title = coalesce(nullif(title, ''), code),
  mode = coalesce(mode, 'public'),
  stage_count = coalesce(stage_count, 3)
where true;

alter table if exists rooms
alter column title set default '';

alter table if exists rooms
alter column title set not null;

alter table if exists rooms
alter column mode set default 'public';

alter table if exists rooms
alter column stage_count set default 3;

alter table if exists rooms
drop constraint if exists rooms_mode_check;

alter table if exists rooms
drop constraint if exists rooms_stage_count_check;

alter table if exists rooms
drop constraint if exists rooms_max_players_check;

alter table if exists rooms
add constraint rooms_mode_check check (mode in ('public', 'secret', 'practice'));

alter table if exists rooms
add constraint rooms_stage_count_check check (stage_count >= 1 and stage_count <= 3);

alter table if exists rooms
add constraint rooms_max_players_check check (max_players >= 1 and max_players <= 6);

create index if not exists rooms_created_at_idx on rooms (created_at desc);
create index if not exists rooms_mode_idx on rooms (mode);
create index if not exists rooms_status_idx on rooms (status);
