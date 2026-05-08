import type {
  ApiResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  GetRoomStateRequest,
  JoinRoomRequest,
  JoinRoomResponse,
  RoomSnapshot,
} from "../../../contracts/api";

export const ROOM_ROUTE_CONTRACT = {
  create: {
    method: "POST",
    path: "/api/room",
  },
  join: {
    method: "POST",
    path: "/api/room/join",
  },
  snapshot: {
    method: "GET",
    path: "/api/room/[roomId]",
  },
} as const;

export type CreateRoomRouteRequest = CreateRoomRequest;
export type CreateRoomRouteResponse = ApiResponse<CreateRoomResponse>;
export type JoinRoomRouteRequest = JoinRoomRequest;
export type JoinRoomRouteResponse = ApiResponse<JoinRoomResponse>;
export type GetRoomStateRouteRequest = GetRoomStateRequest;
export type GetRoomStateRouteResponse = ApiResponse<RoomSnapshot>;
