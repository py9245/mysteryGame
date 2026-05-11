alter table if exists players
add column if not exists guest_identity text;

create index if not exists players_guest_identity_idx
on players (guest_identity);

comment on column players.guest_identity is 'Stable guest cookie identity used to track replay history across rooms without a full account.';
