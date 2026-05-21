# Performance Diagnosis - live-store.ts hot paths

Source file: `src/server/live-store.ts` (7,891 lines, 137 internal hot-helper
call sites). The diagnosis below covers query patterns, repeated loads, and a
proposed instrumentation strategy. **No production code paths are modified by
this document.**

## 1. Top hot helpers by static call count

| Helper | Self call sites | What it does | Latency surface |
|---|---|---|---|
| `loadLobbyState` (1871) | 35 | Issues 5 parallel selects (rooms, games, players, team_slots, score_events) plus a second parallel batch of 5 stage-scoped selects (player_stage_states, investigation_locks, hint_reveals, private_chat_requests, private_chat_sessions) | 7-10 round trips per call |
| `loadCaseSummary` (2603) | 20 | Reads case_library row or local case file | Hits storage every command response |
| `loadSyncedLobbyState` (2043) | 11 | Calls `findRoomByRef`, `cleanupStalePlayersInRoom`, `syncDerivedStageState`, `loadLobbyState`; second `findRoomByRef` after presence cleanup | 3-4x the cost of `loadLobbyState` |
| `findRoomByRef` (1856) | 22 | Single select on `rooms` by id or code | Cheap but called twice in most write commands |
| `broadcastSync` (2303) | 15 | Sends one realtime broadcast | Cheap; fire-and-await |
| `syncDerivedStageState` (6405) | 4 | Re-loads lobby; can recursively call itself; may write to stages, games, investigation_locks, player_stage_states, plus persist time_tick / penalty score events | Triggers another `loadLobbyState` internally |
| `persistScoreEventsAndSyncTotals` (6690) | 4 | Inserts score events, then **reloads full lobby state**, then issues one update per affected player | N+1 update pattern |
| `getCaseFileOrThrow` (3698) | 2 | Used inside submit-question/submit-answer | Light if cached |
| `persistJudgementRecord` (6156) | 2 | One upsert into judgement_records plus optional upsert into judgement_review_queue | Sequential awaits |

## 2. Hot path top 5 (ranked by request-amplified cost)

Each rank below picks an exported function callable from an API route and
expands its true cost.

### A. `getRoomSnapshotFromStore` (line 4186)

Called from every snapshot poll (player UI, lobby UI, presence ticks). For the
non-lightweight branch it calls `loadSyncedLobbyState`, which means:

- 1 `findRoomByRef`
- 1 `cleanupStalePlayersInRoom` (extra `players` select + cascading writes if
  any stale entries exist)
- 1 second `findRoomByRef` after cleanup
- 1 `syncDerivedStageState` (re-reads lobby, possibly writes)
- 1 `loadLobbyState` (5 + 5 parallel selects)
- 1 `loadCaseSummary` (one more select against case_library)

That is approximately **15-18 round trips per snapshot read on the cold
branch.** The `lightweight: true` branch is much cheaper but still triggers
`syncDerivedStageState` whenever any timer has expired, so it can spike.

### B. `submitAnswerInStore` (line 6849)

Most amplified write. Calls in order:

1. `findRoomByRef`
2. `loadLobbyState` (10 selects)
3. `getCaseFileOrThrow` (case_library select)
4. `resolveAnswerJudgement` (AI completion - external latency >>)
5. insert into answer_attempts
6. update player_stage_states
7. conditional update on players (if solved)
8. `persistJudgementRecord` (upsert judgement_records, optional upsert
   judgement_review_queue)
9. update stages
10. update investigation_locks
11. conditional `admitNextInvestigationQueuePlayer` -> another
    `loadLobbyState` + upsert investigation_locks + update player_stage_states
12. conditional update games, update rooms
13. `persistScoreEventsAndSyncAffectedTotals` (insert score_events + one
    update per affected player)
14. `loadCaseSummary`
15. optional `saveFinishedGameResults` (upserts into account_game_results
    through `upsertAccountGameResults`)
16. `buildSnapshotFromState`
17. `broadcastSync`

Worst case the chain executes 20+ Supabase round trips plus the AI call.

### C. `syncDerivedStageState` (line 6405)

Indirectly hits every snapshot read. Issues:

- Loads full lobby state on entry.
- Recursive self-call after briefing -> in_progress transition (`return
  syncDerivedStageState(roomId)`), which means up to **two full lobby
  reloads** in a single invocation.
- Calls `persistScoreEventsAndSyncTotals` for time-tick accrual, which itself
  reloads the lobby (third reload).
- Calls `admitNextInvestigationQueuePlayer`, which reloads the lobby again
  (fourth reload).
- Stage-end branch calls `persistScoreEventsAndSyncTotals` again (fifth
  reload) plus `loadLobbyState` for `saveFinishedGameResults`.

A single timer tick can fan out to 5+ `loadLobbyState` invocations.

### D. `persistScoreEventsAndSyncTotals` (line 6690)

The post-insert flow:

```
INSERT score_events
SELECT * FROM rooms WHERE id = roomId           (via loadLobbyState)
...4 more parallel SELECTs...
...up to 5 more stage SELECTs...
UPDATE players SET total_score = ... WHERE id = p1
UPDATE players SET total_score = ... WHERE id = p2
... one UPDATE per player snapshot
```

Two issues: (1) reloads the entire lobby instead of recomputing locally;
(2) N updates instead of a single `update().in("id", [...])` or
`upsert(rows)`. `persistScoreEventsAndSyncAffectedTotals` is the better
sibling but still issues one update per affected player.

### E. `joinRoomInStore` (line 3926)

- `findRoomByRef`
- `loadLobbyState` (10 selects)
- conditional duplicate-membership cleanup (`cleanupViewerRoomMemberships` ->
  another `players` select + per-membership `findRoomByRef` +
  `removePlayerFromRoomRecord` which reads players, may delete rooms, then
  recalculates lobby status).
- insert into players (with legacy retry)
- `loadLobbyState` again to recompute room status
- update rooms
- third `loadLobbyState`
- `loadCaseSummary`
- `broadcastSync`

3 lobby reloads per join is the steady state.

## 3. Suspected query inefficiencies

### a. Repeated full lobby reloads inside one command

Every public mutation calls `loadLobbyState` at least twice (`stateBefore...`,
then refreshed state for the snapshot return value). Several call it 3-5
times. Mitigation candidates (out of scope for this PR):

- Have mutation helpers return updated row diffs and merge into the
  in-memory state rather than re-reading.
- Cache `loadCaseSummary` per request (it is purely derived from
  `case_library`).
- Allow `loadLobbyState` to accept a "stage scope" boolean so we can skip the
  second parallel batch when the caller does not need stage data (rare).

### b. `persistScoreEventsAndSyncTotals` does per-player UPDATE

Switch to `supabase.from("players").upsert(rows)` keyed on `id`, or batch via
`update().in("id", playerIds)` with the same total. Verify with EXPLAIN before
shipping.

### c. `listRoomDirectoryFromStore` (line 7789)

`select("room_id, id, last_seen_at, joined_at, role, nickname, is_ready,
connection_status, total_score, solved_count, bonus_keyword_count, created_at,
updated_at")` on the players table with no filter -> full scan whenever the
lobby list is opened. If the player table grows, this becomes O(N) over all
rooms. Add a `room_id` index (likely already exists via FK) and consider an
aggregate view, or restrict to `connection_status = 'connected'` first.
Calling `cleanupStalePlayersInRoomDirectory` after the read can trigger a
double round of the same query.

### d. N+1 deletes / updates inside `cleanupViewerRoomMemberships`

`for (const membership of memberships.values()) { ... removePlayerFromRoomRecord ... }`
- Each iteration runs `findRoomByRef`, delete player, select remaining
  players, optional update host, optional update room status. For an account
  that left several rooms uncleanly this scales linearly in round trips.

### e. `score_events` ledger replay

`buildScoreLedger` reads all events from the start of the game every time.
For a 3-stage 6-player game with question/answer ticks this can reach
hundreds of events per snapshot. Acceptable today but worth caching the
materialized total on `players.total_score` (already done) and only replaying
deltas on changes.

### f. `cleanupStalePlayersInRoomDirectory` runs **inside** the lobby listing
hot path

If even one stale player exists, both the rooms and players queries run
twice, doubling the latency for everyone refreshing the lobby until the next
cleanup window. Move presence reaping to a background job (e.g. Cloudflare
cron worker) so the read path stays read-only.

### g. `judgement_records` upserts blocking the snapshot return

`submitAnswerInStore` awaits `persistJudgementRecord` before continuing.
Could be queued (Outbox table or RT realtime job), keeping latency under the
AI call only.

## 4. Index audit candidates

Check existence (Supabase migrations live in `supabase/`):

- `score_events (room_id, stage_id, player_id)` composite for ledger reads.
- `players (room_id, last_seen_at)` for presence sweeps.
- `players (account_id)` for `cleanupViewerRoomMemberships`.
- `private_chat_requests (stage_id, status, expires_at)` for the pending
  scan.
- `investigation_locks (stage_id)` unique.
- `case_library (case_key)` unique and `case_library (is_practice_pool,
  stage_number)`.
- `player_case_history (identity_key, case_key)` unique.
- `admin_logs (action, actor_id)` for the legacy fallback in
  `listPlayerCaseHistoryRows`.

Action item (out of scope for this PR): cross-check `supabase/migrations`
against this list.

## 5. Proposed instrumentation

### a. Server-Timing header from API routes

In each route handler (e.g. `src/app/api/game/route.ts`,
`src/app/api/room/[roomId]/route.ts`) we can wrap the live-store call with
`withTimedSegment(name, fn)` from a new diagnostic helper. The handler then
emits

```
Server-Timing: db_room=12.4, build_snapshot=3.1, ai_judge=842.7
```

so the browser DevTools network tab shows the breakdown directly. No
function signatures change.

### b. Async hook in live-store internals

Provide a tiny `record(name, durationMs)` sink in `src/server/diagnostics.ts`
that buffers up to N events in memory. When the env flag `BACKEND_PERF_LOG`
is set to `1`, the helper logs the buffer at the end of each request via
`console.info`. Otherwise it no-ops.

This means the existing functions can sprinkle:

```ts
const t0 = perfMark();
await loadLobbyState(roomId);
perfMeasure("loadLobbyState", t0);
```

without behavioral change. PR ordering: instrument first, refactor second.

### c. Supabase query timer wrapper

Optional later step: introduce `withTracedQuery(label, builder)` that wraps
`supabase.from(...).select(...)` to time individual queries. Out of scope for
phase 1; mentioned for transparency.

### d. AI call timing

`createTextCompletion` and `generateImage` from `@/lib/ai` already issue
network calls. Wrap their consumers with `perfMeasure("ai.text", t0)` to
quantify AI latency vs DB latency in submit handlers.

## 6. Quick wins prioritized

| Priority | Item | Effort | Risk |
|---|---|---|---|
| P0 | Add `Server-Timing` headers to top 5 API routes | Low | Low |
| P0 | Add `src/server/diagnostics.ts` (additive, off by default) | Low | Low |
| P1 | Batch player total updates in `persistScoreEventsAndSyncTotals*` | Medium | Medium - touches scoring |
| P1 | Memoize `loadCaseSummary` per request | Low | Low |
| P2 | Stop double-loading lobby state per command (return updated state from helpers) | High | High - changes internal contracts |
| P2 | Move `cleanupStalePlayersInRoomDirectory` to cron worker | Medium | Medium |
| P3 | Outbox-style judgement persistence | High | High |

## 7. Validation plan (when split work begins)

- Run `npm run typecheck` after each module extraction.
- Compare lobby snapshot JSON before/after each PR for a recorded fixture
  room to confirm no payload regression.
- Use `BACKEND_PERF_LOG=1 npm run dev` against the integration script under
  `scripts/ai-bench.mjs` to keep latency telemetry comparable across PRs.
