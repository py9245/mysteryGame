import type { GameRuntimeSnapshot, GetGameSnapshotResponse } from "@/contracts/api";

export interface GameRuntimeLoaderOptions {
  roomId: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface LoadedGameRuntimeSnapshot {
  snapshot: GameRuntimeSnapshot | null;
  source: "api" | "fallback";
  endpoint: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveEndpoint(options: GameRuntimeLoaderOptions): string {
  const base =
    options.endpoint ??
    process.env.GAME_RUNTIME_ENDPOINT ??
    process.env.NEXT_PUBLIC_GAME_RUNTIME_ENDPOINT ??
    `/api/game/${encodeURIComponent(options.roomId)}`;

  try {
    const resolved = new URL(base, "http://localhost").toString();
    return resolved.startsWith("http://localhost") ? resolved.replace("http://localhost", "") : resolved;
  } catch {
    return `/api/game/${encodeURIComponent(options.roomId)}`;
  }
}

function normalizeGameRuntimeSnapshot(value: unknown): GameRuntimeSnapshot | null {
  if (
    isRecord(value) &&
    typeof value.roomId === "string" &&
    typeof value.roomCode === "string" &&
    isRecord(value.game) &&
    Array.isArray(value.teamSlots) &&
    Array.isArray(value.currentAssignments) &&
    Array.isArray(value.playerStates) &&
    Array.isArray(value.scores) &&
    Array.isArray(value.visibleHints)
  ) {
    return value as unknown as GameRuntimeSnapshot;
  }

  return null;
}

export async function loadGameRuntimeSnapshot(
  options: GameRuntimeLoaderOptions,
): Promise<LoadedGameRuntimeSnapshot> {
  const endpoint = resolveEndpoint(options);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(endpoint, { cache: "no-store" });
    if (!response.ok) {
      return { snapshot: null, source: "fallback", endpoint };
    }

    const payload = (await response.json()) as
      | GetGameSnapshotResponse
      | { ok?: boolean; data?: unknown; snapshot?: unknown };
    const gameSnapshot =
      isRecord(payload) && "data" in payload && isRecord(payload.data) && "snapshot" in payload.data
        ? payload.data.snapshot
        : isRecord(payload) && "snapshot" in payload
          ? payload.snapshot
          : payload;

    const normalizedSnapshot = normalizeGameRuntimeSnapshot(gameSnapshot);
    if (!normalizedSnapshot) {
      return { snapshot: null, source: "fallback", endpoint };
    }

    return { snapshot: normalizedSnapshot, source: "api", endpoint };
  } catch {
    return { snapshot: null, source: "fallback", endpoint };
  }
}
