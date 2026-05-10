import type {
  ApiResponse,
  GameCommandResponse,
  SetReadyRequest,
  SetReadyResponse,
} from "@/contracts/api";
import { normalizeRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import type { RoomSnapshot } from "@/contracts/api";

export interface SubmitSetReadyOptions {
  roomId: string;
  playerId: string;
  isReady: boolean;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface SubmitSetReadyResult {
  ok: boolean;
  endpoint: string;
  statusCode: number;
  request: SetReadyRequest;
  snapshot: RoomSnapshot | null;
  errorCode: string | null;
  errorMessage: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveEndpoint(endpoint?: string): string {
  return endpoint ?? process.env.NEXT_PUBLIC_GAME_COMMAND_ENDPOINT ?? "/api/game";
}

function normalizeSetReadyResponse(value: unknown): SetReadyResponse | null {
  if (
    isRecord(value) &&
    isRecord(value.room) &&
    Array.isArray(value.players) &&
    isRecord(value.snapshot)
  ) {
    return value as unknown as SetReadyResponse;
  }

  return null;
}

function resolveSetReadyResponse(value: unknown): SetReadyResponse | null {
  if (isRecord(value) && "data" in value) {
    return normalizeSetReadyResponse(value.data);
  }

  return normalizeSetReadyResponse(value);
}

function resolveApiError(value: unknown): { code: string | null; message: string | null } {
  if (isRecord(value) && "error" in value && isRecord(value.error)) {
    return {
      code: typeof value.error.code === "string" ? value.error.code : null,
      message: typeof value.error.message === "string" ? value.error.message : null,
    };
  }

  return { code: null, message: null };
}

export async function submitSetReady(
  options: SubmitSetReadyOptions,
): Promise<SubmitSetReadyResult> {
  const endpoint = resolveEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? fetch;
  const request: SetReadyRequest = {
    type: "set_ready",
    roomId: options.roomId,
    playerId: options.playerId,
    isReady: options.isReady,
  };

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    let payload: unknown = null;

    try {
      payload = (await response.json()) as ApiResponse<GameCommandResponse>;
    } catch {
      payload = null;
    }

    const commandResponse = resolveSetReadyResponse(payload);
    const error = resolveApiError(payload);
    const snapshot = commandResponse?.snapshot
      ? normalizeRoomSnapshot(commandResponse.snapshot)
      : null;

    if (response.ok && snapshot) {
      return {
        ok: true,
        endpoint,
        statusCode: response.status,
        request,
        snapshot,
        errorCode: null,
        errorMessage: null,
      };
    }

    return {
      ok: false,
      endpoint,
      statusCode: response.status,
      request,
      snapshot,
      errorCode: error.code,
      errorMessage: error.message ?? `HTTP ${response.status}`,
    };
  } catch {
    return {
      ok: false,
      endpoint,
      statusCode: 0,
      request,
      snapshot: null,
      errorCode: "NETWORK_ERROR",
      errorMessage: "네트워크 오류로 ready 상태 변경에 실패했습니다.",
    };
  }
}
