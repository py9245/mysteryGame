-- Enforce uniqueness on (stage_id, hint_index) for hint_reveals to close
-- the concurrency race in recordHintRevealIfAbsent (src/server/live-store.ts).
-- The application currently guards with a SELECT-then-INSERT plus a duplicate
-- error fallback, but only a DB-level UNIQUE constraint guarantees that two
-- racing INSERTs cannot both succeed.

-- 1) Cleanup: remove any pre-existing duplicates, keeping the earliest row
--    (oldest revealed_at; ties broken by id) per (stage_id, hint_index).
with ranked as (
  select
    id,
    row_number() over (
      partition by stage_id, hint_index
      order by revealed_at asc, id asc
    ) as rn
  from hint_reveals
)
delete from hint_reveals
where id in (
  select id from ranked where rn > 1
);

-- 2) Add the UNIQUE constraint idempotently. Using a DO block so the
--    migration can be re-applied without erroring if the constraint
--    already exists (mirrors the `if not exists` style used elsewhere
--    in this migrations tree).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'hint_reveals_stage_id_hint_index_key'
      and conrelid = 'public.hint_reveals'::regclass
  ) then
    alter table public.hint_reveals
      add constraint hint_reveals_stage_id_hint_index_key
      unique (stage_id, hint_index);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Rollback (run manually if needed; no separate down-migration file exists
-- in this project's Supabase migrations convention):
--
--   alter table public.hint_reveals
--     drop constraint if exists hint_reveals_stage_id_hint_index_key;
--
-- Note: rollback does NOT restore any rows removed by the cleanup step
-- above; those duplicates were redundant by definition.
-- ---------------------------------------------------------------------------
