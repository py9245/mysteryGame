import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export interface RoomRouteSearchParams {
  roomId?: string | string[];
  roomCode?: string | string[];
  playerId?: string | string[];
}

export interface ResolvedRoomContext {
  roomId?: string;
  roomCode?: string;
  playerId?: string;
}

export function normalizeOptionalQueryParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" && value[0].trim().length > 0
      ? value[0].trim()
      : undefined;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
}

export function resolveRoomContextFromSearchParams(
  searchParams?: RoomRouteSearchParams,
): ResolvedRoomContext {
  return {
    roomId: normalizeOptionalQueryParam(searchParams?.roomId),
    roomCode: normalizeOptionalQueryParam(searchParams?.roomCode),
    playerId: normalizeOptionalQueryParam(searchParams?.playerId),
  };
}

export function buildRoomContextQuery(
  snapshot: Pick<RoomSnapshot, "room" | "me">,
  requestedRoomCode?: string,
): string {
  const params = new URLSearchParams();
  params.set("roomId", snapshot.room.id);
  params.set("roomCode", requestedRoomCode ?? snapshot.room.code);
  params.set("playerId", snapshot.me.playerId);

  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

export function appendRoomContextToHref(
  href: string,
  snapshot: Pick<RoomSnapshot, "room" | "me">,
  requestedRoomCode?: string,
): string {
  const query = buildRoomContextQuery(snapshot, requestedRoomCode);
  if (query.length === 0) {
    return href;
  }

  const hashIndex = href.indexOf("#");
  const baseHref = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const separator = baseHref.includes("?") ? "&" : "?";
  const normalizedQuery = query.slice(1);

  return `${baseHref}${separator}${normalizedQuery}${hash}`;
}
