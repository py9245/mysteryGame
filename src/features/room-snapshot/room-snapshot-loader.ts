import type { RoomSnapshot } from "@/contracts/api";

export interface RoomSnapshotLoaderOptions {
  roomId?: string;
  roomCode?: string;
  playerId?: string;
  stageNumber?: number;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveRoomId(options: RoomSnapshotLoaderOptions): string {
  return options.roomId ?? options.roomCode ?? "";
}

function resolveEndpoint(options: RoomSnapshotLoaderOptions): string {
  const base =
    options.endpoint ??
    process.env.ROOM_SNAPSHOT_ENDPOINT ??
    process.env.NEXT_PUBLIC_ROOM_SNAPSHOT_ENDPOINT ??
    `/api/room/${encodeURIComponent(resolveRoomId(options))}`;

  try {
    const url = new URL(base, "http://localhost");
    if (typeof options.playerId === "string" && options.playerId.length > 0 && !url.searchParams.has("playerId")) {
      url.searchParams.set("playerId", options.playerId);
    }
    if (typeof options.stageNumber === "number" && !url.searchParams.has("stageNumber")) {
      url.searchParams.set("stageNumber", String(options.stageNumber));
    }

    const resolved = url.toString();
    return resolved.startsWith("http://localhost") ? resolved.replace("http://localhost", "") : resolved;
  } catch {
    return `/api/room/${encodeURIComponent(resolveRoomId(options))}`;
  }
}

export function normalizeRoomSnapshot(value: unknown): RoomSnapshot | null {
  if (
    isRecord(value) &&
    isRecord(value.room) &&
    isRecord(value.me) &&
    Array.isArray(value.players) &&
    Array.isArray(value.teamSlots) &&
    Array.isArray(value.scores) &&
    Array.isArray(value.visibleHints) &&
    Array.isArray(value.playerStates)
  ) {
    return value as RoomSnapshot;
  }

  return null;
}

export async function loadRoomSnapshot(
  options: RoomSnapshotLoaderOptions = {},
): Promise<RoomSnapshot | null> {
  const endpoint = resolveEndpoint(options);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(endpoint, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as RoomSnapshot | { ok?: boolean; data?: unknown; snapshot?: unknown };
    const roomSnapshot =
      isRecord(payload) && "data" in payload
        ? payload.data
        : isRecord(payload) && "snapshot" in payload
          ? payload.snapshot
          : payload;

    return normalizeRoomSnapshot(roomSnapshot);
  } catch {
    return null;
  }
}
