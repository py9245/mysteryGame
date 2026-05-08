# API Scaffold Status

This directory contains API route scaffolds plus typed sample handlers.

## Implemented routes

- `POST /api/room`
- `POST /api/room/join`
- `GET /api/room/[roomId]`
- `GET /api/game`
- `POST /api/game`
- `GET /api/game/[roomId]`
- `POST /api/chat`
- `GET /api/chat/[roomId]`

## Current status

- `POST /api/room` creates a live Supabase room when runtime env is configured, or falls back to sample mode.
- `POST /api/room/join` joins an existing live room by code when runtime env is configured, or falls back to sample mode.
- `GET /api/room/[roomId]` returns a live `RoomSnapshot` for lobby state when runtime env is configured.
- `GET /api/game` returns live lobby-era `ListGameSnapshotsResponse` when runtime env is configured.
- `POST /api/game` currently persists only `type: "set_ready"` in live mode.
- Unsupported game command types still return `501 NOT_IMPLEMENTED` placeholder failures with `requestedType` details.
- `GET /api/game/[roomId]` returns a live lobby-era `GetGameSnapshotResponse` when runtime env is configured.
- `POST /api/chat` persists live room chat messages when runtime env is configured.
- `GET /api/chat/[roomId]` returns persisted live room chat messages when runtime env is configured.
- All handlers use root `src/contracts/*` types for response shaping.
- No player UI or admin UI code is touched here.

## Next step

- Replace remaining sample command handlers with persisted gameplay handlers for team assignment, stage start/end, investigation locks, scoring, and AI judgement storage.
