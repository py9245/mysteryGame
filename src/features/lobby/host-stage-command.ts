import type {
  ApiResponse,
  AssignTeamsRequest,
  AssignTeamsResponse,
  GameCommandResponse,
  StartStageRequest,
  StartStageResponse,
} from "@/contracts/api";
import { normalizeRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export interface SubmitHostStageResult {
  ok: boolean;
  endpoint: string;
  statusCode: number;
  snapshot: RoomSnapshot | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface SubmitAssignTeamsOptions {
  roomId: string;
  requestedByPlayerId: string;
  stageNumber: number;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface SubmitStartStageOptions {
  roomId: string;
  requestedByPlayerId: string;
  caseKey: string;
  durationSeconds: number;
  endpoint?: string;
  fetchImpl?: typeof fetch;
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

function normalizeAssignTeamsResponse(value: unknown): AssignTeamsResponse | null {
  if (
    isRecord(value) &&
    Array.isArray(value.teamSlots) &&
    Array.isArray(value.assignments) &&
    isRecord(value.snapshot)
  ) {
    return value as unknown as AssignTeamsResponse;
  }

  return null;
}

function normalizeStartStageResponse(value: unknown): StartStageResponse | null {
  if (
    isRecord(value) &&
    isRecord(value.game) &&
    isRecord(value.stage) &&
    Array.isArray(value.playerStates) &&
    isRecord(value.snapshot)
  ) {
    return value as unknown as StartStageResponse;
  }

  return null;
}

function resolveAssignTeamsResponse(value: unknown): AssignTeamsResponse | null {
  if (isRecord(value) && "data" in value) {
    return normalizeAssignTeamsResponse(value.data);
  }

  return normalizeAssignTeamsResponse(value);
}

function resolveStartStageResponse(value: unknown): StartStageResponse | null {
  if (isRecord(value) && "data" in value) {
    return normalizeStartStageResponse(value.data);
  }

  return normalizeStartStageResponse(value);
}

async function submitHostCommand(
  request: AssignTeamsRequest | StartStageRequest,
  endpoint: string,
  fetchImpl: typeof fetch,
): Promise<SubmitHostStageResult> {
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
      request.type === "assign_teams"
        ? resolveAssignTeamsResponse(payload)
        : resolveStartStageResponse(payload);
    const error = resolveApiError(payload);
    const snapshot = commandResponse?.snapshot
      ? normalizeRoomSnapshot(commandResponse.snapshot)
      : null;

    return {
      ok: response.ok && snapshot !== null,
      endpoint,
      statusCode: response.status,
      snapshot,
      errorCode: error.code,
      errorMessage: response.ok ? null : error.message ?? `HTTP ${response.status}`,
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

export function submitAssignTeams(
  options: SubmitAssignTeamsOptions,
): Promise<SubmitHostStageResult> {
  const endpoint = resolveEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? fetch;

  return submitHostCommand(
    {
      type: "assign_teams",
      roomId: options.roomId,
      requestedByPlayerId: options.requestedByPlayerId,
      stageNumber: options.stageNumber,
    },
    endpoint,
    fetchImpl,
  );
}

export function submitStartStage(
  options: SubmitStartStageOptions,
): Promise<SubmitHostStageResult> {
  const endpoint = resolveEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? fetch;

  return submitHostCommand(
    {
      type: "start_stage",
      roomId: options.roomId,
      requestedByPlayerId: options.requestedByPlayerId,
      caseKey: options.caseKey,
      durationSeconds: options.durationSeconds,
    },
    endpoint,
    fetchImpl,
  );
}
