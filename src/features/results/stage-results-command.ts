import type { RoomSnapshot } from "@/contracts/api";
import { normalizeRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";

export interface SubmitAdvanceStageOptions {
  roomId: string;
  requestedByPlayerId: string;
  stageNumber: number;
  currentStageNumber: number;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface SubmitAdvanceStageResult {
  ok: boolean;
  endpoint: string;
  statusCode: number;
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

function resolveApiError(value: unknown): { code: string | null; message: string | null } {
  if (isRecord(value) && "error" in value && isRecord(value.error)) {
    return {
      code: typeof value.error.code === "string" ? value.error.code : null,
      message: typeof value.error.message === "string" ? value.error.message : null,
    };
  }

  return { code: null, message: null };
}

function resolveSnapshot(value: unknown): RoomSnapshot | null {
  if (isRecord(value) && "data" in value && isRecord(value.data) && "snapshot" in value.data) {
    return normalizeRoomSnapshot(value.data.snapshot);
  }

  if (isRecord(value) && "snapshot" in value) {
    return normalizeRoomSnapshot(value.snapshot);
  }

  return null;
}

export async function submitAdvanceStage(
  options: SubmitAdvanceStageOptions,
): Promise<SubmitAdvanceStageResult> {
  const endpoint = resolveEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        type: "advance_stage",
        roomId: options.roomId,
        requestedByPlayerId: options.requestedByPlayerId,
        stageNumber: options.stageNumber,
        currentStageNumber: options.currentStageNumber,
      }),
    });

    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const snapshot = resolveSnapshot(payload);

    return {
      ok: response.ok && snapshot !== null,
      endpoint,
      statusCode: response.status,
      snapshot,
      errorCode: resolveApiError(payload).code,
      errorMessage: response.ok
        ? snapshot
          ? null
          : "응답을 처리하지 못했습니다."
        : resolveApiError(payload).message ?? `HTTP ${response.status}`,
    };
  } catch {
    return {
      ok: false,
      endpoint,
      statusCode: 0,
      snapshot: null,
      errorCode: "NETWORK_ERROR",
      errorMessage: "호스트 명령 전송 중 네트워크 오류가 발생했습니다.",
    };
  }
}
