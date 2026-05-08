import type {
  ApiResponse,
  GameCommandRequest,
  GameCommandResponse,
  RoomSnapshot,
} from "../../../contracts/api";

export const GAME_ROUTE_CONTRACT = {
  command: {
    method: "POST",
    path: "/api/game",
  },
  snapshot: {
    method: "GET",
    path: "/api/game/[roomId]",
  },
} as const;

export type GameCommandRouteRequest = GameCommandRequest;
export type GameCommandRouteResponse = ApiResponse<GameCommandResponse>;
export type GetGameSnapshotRouteResponse = ApiResponse<RoomSnapshot>;
