This workspace mirrors the backend-owned paths from `app/SHARED_CONTRACTS.md`.

Current interpretation:

- Teams are collaboration units, not the source of truth for scoring.
- Scores are tracked per player through `score_events`.
- Correct answers are resolved per player, and only the solving player is locked out for the stage.
- Stage membership is represented through `team_slots` plus `stage_team_assignments`.
- Investigation lock capacity is per lock session: 3 questions and 1 answer attempt, then the lock must be released or expire before re-entry.
- UI-facing snapshots now carry `viewMode`, `me`, `visibility`, and `redacted` blocks so Agent 2 can render without reading raw backend state.
- `RoomSnapshot` is the view model, not the raw storage model. The raw truth still lives in `players`, `player_stage_states`, `score_events`, `investigation_locks`, and `stages`.
- Command responses that matter to gameplay now include `snapshot` so Agent 2 can treat every server action as a render refresh.
- Question / answer judgement flow is contractually split into public payload, internal payload, and manual review / operator override records. See `docs/ai-judgement-flow.md`.
- Persistence scaffolding now includes `judgement_records`, `judgement_review_queue`, and `judgement_overrides` as the backend source of truth for AI review and operator action.
- App-root integration order and final merge blockers are documented in `docs/backend-integration-checklist.md`.

Included in this draft:

- `supabase/migrations/*`: initial schema for rooms, players, team slots, stage assignments, stages, score events, chat, private chat, hints, and investigation locks
- `src/contracts/*`: shared domain, API, realtime, and UI view-model contracts aligned to the latest planning docs
- `src/server/*`: time, bootstrap, scoring, state-machine, and lock helpers that can be reused when the shared app shell is added

The code is intentionally framework-light so the Next.js app shell can be added around it without rewriting the core game rules.
