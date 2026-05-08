import type {
  AcquireInvestigationLockRequest,
  AcquireInvestigationLockResponse,
  ApiResponse,
  GameCommandResponse,
  ReleaseInvestigationLockRequest,
  ReleaseInvestigationLockResponse,
} from "@/contracts/api";
import { normalizeRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export interface SubmitInvestigationLockOptions {
  roomId: string;
  stageId: string;
  playerId: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface SubmitInvestigationLockResult {
  ok: boolean;
  endpoint: string;
  statusCode: number;
  request: AcquireInvestigationLockRequest | ReleaseInvestigationLockRequest;
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

function normalizeAcquireLockResponse(
  value: unknown,
): AcquireInvestigationLockResponse | null {
  if (
    isRecord(value) &&
    isRecord(value.lock) &&
    isRecord(value.snapshot)
  ) {
    return value as unknown as AcquireInvestigationLockResponse;
  }

  return null;
}

function normalizeReleaseLockResponse(
  value: unknown,
): ReleaseInvestigationLockResponse | null {
  if (
    isRecord(value) &&
    isRecord(value.lock) &&
    isRecord(value.snapshot)
  ) {
    return value as unknown as ReleaseInvestigationLockResponse;
  }

  return null;
}

function resolveAcquireLockResponse(
  value: unknown,
): AcquireInvestigationLockResponse | null {
  if (isRecord(value) && "data" in value) {
    return normalizeAcquireLockResponse(value.data);
  }

  return normalizeAcquireLockResponse(value);
}

function resolveReleaseLockResponse(
  value: unknown,
): ReleaseInvestigationLockResponse | null {
  if (isRecord(value) && "data" in value) {
    return normalizeReleaseLockResponse(value.data);
  }

  return normalizeReleaseLockResponse(value);
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

async function submitInvestigationLockRequest(
  request: AcquireInvestigationLockRequest | ReleaseInvestigationLockRequest,
  endpoint: string,
  fetchImpl: typeof fetch,
): Promise<SubmitInvestigationLockResult> {
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

    const commandResponse =
      request.type === "acquire_lock"
        ? resolveAcquireLockResponse(payload)
        : resolveReleaseLockResponse(payload);
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
      errorMessage: "조사실 연결 중 네트워크 오류가 발생했습니다.",
    };
  }
}

export async function submitAcquireInvestigationLock(
  options: SubmitInvestigationLockOptions,
): Promise<SubmitInvestigationLockResult> {
  const endpoint = resolveEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? fetch;
  const request: AcquireInvestigationLockRequest = {
    type: "acquire_lock",
    roomId: options.roomId,
    stageId: options.stageId,
    playerId: options.playerId,
  };

  return submitInvestigationLockRequest(request, endpoint, fetchImpl);
}

export async function submitReleaseInvestigationLock(
  options: SubmitInvestigationLockOptions,
): Promise<SubmitInvestigationLockResult> {
  const endpoint = resolveEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? fetch;
  const request: ReleaseInvestigationLockRequest = {
    type: "release_lock",
    roomId: options.roomId,
    stageId: options.stageId,
    playerId: options.playerId,
  };

  return submitInvestigationLockRequest(request, endpoint, fetchImpl);
}
