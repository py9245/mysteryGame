# API Scaffold Status

This directory contains API route scaffolds plus typed sample handlers.

## Implemented routes

- `POST /api/room`
- `GET /api/room/[roomId]`  - `real sample response`
- `GET /api/game` - `sample summary response`
- `POST /api/game` - `partial sample command response`
- `GET /api/game/[roomId]` - `real sample response`
- `POST /api/chat` - `sample echo response`
- `GET /api/chat/[roomId]`  - `real sample response`

## Current status

- `POST /api/room` returns a typed sample `CreateRoomResponse`.
- `GET /api/room/[roomId]` returns a typed sample `RoomSnapshot` response.
- `GET /api/game` returns a typed sample `ListGameSnapshotsResponse`.
- `POST /api/game` currently handles only `type: "set_ready"` and returns a typed sample `SetReadyResponse`.
- Unsupported game command types still return `501 NOT_IMPLEMENTED` placeholder failures with `requestedType` details.
- `GET /api/game/[roomId]` returns a typed sample `GetGameSnapshotResponse`.
- `POST /api/chat` returns a typed sample `SendChatMessageResponse`.
- `GET /api/chat/[roomId]` returns a typed sample `ListChatMessagesResponse` response.
- All handlers use root `src/contracts/*` types for response shaping.
- No player UI or admin UI code is touched here.

## Next step

- Replace each sample handler with persisted command handlers that rebuild `RoomSnapshot`, manage runtime game state, and emit realtime events.
