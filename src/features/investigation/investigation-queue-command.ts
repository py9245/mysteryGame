import type {
  ApiResponse,
  GameCommandResponse,
  JoinInvestigationQueueRequest,
  JoinInvestigationQueueResponse,
  LeaveInvestigationQueueRequest,
  LeaveInvestigationQueueResponse,
} from "@/contracts/api";
import { normalizeRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export interface SubmitInvestigationQueueOptions {
  roomId: string;
  stageId: string;
  playerId: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface SubmitInvestigationQueueResult {
  ok: boolean;
  endpoint: string;
  statusCode: number;
  request: JoinInvestigationQueueRequest | LeaveInvestigationQueueRequest;
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

function resolveResponseSnapshot(value: unknown): RoomSnapshot | null {
  if (isRecord(value) && "data" in value && isRecord(value.data) && "snapshot" in value.data) {
    return normalizeRoomSnapshot(value.data.snapshot);
  }

  if (isRecord(value) && "snapshot" in value) {
    return normalizeRoomSnapshot(value.snapshot);
  }

  return null;
}

async function submitQueueRequest(
  request: JoinInvestigationQueueRequest | LeaveInvestigationQueueRequest,
  endpoint: string,
  fetchImpl: typeof fetch,
): Promise<SubmitInvestigationQueueResult> {
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
      payload = (await response.json()) as ApiResponse<
        GameCommandResponse | JoinInvestigationQueueResponse | LeaveInvestigationQueueResponse
      >;
    } catch {
      payload = null;
    }

    const snapshot = resolveResponseSnapshot(payload);
    const error = resolveApiError(payload);

    return {
      ok: response.ok && snapshot !== null,
      endpoint,
      statusCode: response.status,
      request,
      snapshot,
      errorCode: error.code,
      errorMessage: response.ok ? null : error.message ?? `HTTP ${response.status}`,
    };
  } catch {
    return {
      ok: false,
      endpoint,
      statusCode: 0,
      request,
      snapshot: null,
      errorCode: "NETWORK_ERROR",
      errorMessage: "질문방 대기열 요청 중 네트워크 오류가 발생했습니다.",
    };
  }
}

export function submitJoinInvestigationQueue(
  options: SubmitInvestigationQueueOptions,
): Promise<SubmitInvestigationQueueResult> {
  const endpoint = resolveEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? fetch;

  return submitQueueRequest(
    {
      type: "join_lock_queue",
      roomId: options.roomId,
      stageId: options.stageId,
      playerId: options.playerId,
    },
    endpoint,
    fetchImpl,
  );
}

export function submitLeaveInvestigationQueue(
  options: SubmitInvestigationQueueOptions,
): Promise<SubmitInvestigationQueueResult> {
  const endpoint = resolveEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? fetch;

  return submitQueueRequest(
    {
      type: "leave_lock_queue",
      roomId: options.roomId,
      stageId: options.stageId,
      playerId: options.playerId,
    },
    endpoint,
    fetchImpl,
  );
}
