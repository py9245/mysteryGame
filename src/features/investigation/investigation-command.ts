import type {
  ApiResponse,
  GameCommandResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  SubmitQuestionRequest,
  SubmitQuestionResponse,
} from "@/contracts/api";
import type { AnswerAttempt, Question } from "@/contracts/game";
import { normalizeRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import type { RoomSnapshot } from "@/contracts/api";

export interface SubmitInvestigationCommandResultBase {
  ok: boolean;
  endpoint: string;
  statusCode: number;
  snapshot: RoomSnapshot | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface SubmitQuestionCommandResult extends SubmitInvestigationCommandResultBase {
  request: SubmitQuestionRequest;
  question: Question | null;
  activeLock: SubmitQuestionResponse["activeLock"] | null;
}

export interface SubmitAnswerCommandResult extends SubmitInvestigationCommandResultBase {
  request: SubmitAnswerRequest;
  attempt: AnswerAttempt | null;
  playerState: SubmitAnswerResponse["playerState"] | null;
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

function resolveQuestionResponse(value: unknown): SubmitQuestionResponse | null {
  if (
    isRecord(value) &&
    isRecord(value.question) &&
    isRecord(value.snapshot)
  ) {
    return value as unknown as SubmitQuestionResponse;
  }

  return null;
}

function resolveAnswerResponse(value: unknown): SubmitAnswerResponse | null {
  if (
    isRecord(value) &&
    isRecord(value.attempt) &&
    isRecord(value.snapshot)
  ) {
    return value as unknown as SubmitAnswerResponse;
  }

  return null;
}

function unwrapResponse(value: unknown): unknown {
  if (isRecord(value) && "data" in value) {
    return value.data;
  }

  return value;
}

async function submitQuestionRequest(
  request: SubmitQuestionRequest,
  endpoint: string,
  fetchImpl: typeof fetch,
): Promise<SubmitQuestionCommandResult> {
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

    const resolved = resolveQuestionResponse(unwrapResponse(payload));
    const snapshot = resolved?.snapshot ? normalizeRoomSnapshot(resolved.snapshot) : null;
    const error = resolveApiError(payload);

    return {
      ok: response.ok && snapshot !== null,
      endpoint,
      statusCode: response.status,
      request,
      question: resolved?.question ?? null,
      activeLock: resolved?.activeLock ?? null,
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
      question: null,
      activeLock: null,
      snapshot: null,
      errorCode: "NETWORK_ERROR",
      errorMessage: "질문 제출 중 네트워크 오류가 발생했습니다.",
    };
  }
}

async function submitAnswerRequest(
  request: SubmitAnswerRequest,
  endpoint: string,
  fetchImpl: typeof fetch,
): Promise<SubmitAnswerCommandResult> {
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

    const resolved = resolveAnswerResponse(unwrapResponse(payload));
    const snapshot = resolved?.snapshot ? normalizeRoomSnapshot(resolved.snapshot) : null;
    const error = resolveApiError(payload);

    return {
      ok: response.ok && snapshot !== null,
      endpoint,
      statusCode: response.status,
      request,
      attempt: resolved?.attempt ?? null,
      playerState: resolved?.playerState ?? null,
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
      attempt: null,
      playerState: null,
      snapshot: null,
      errorCode: "NETWORK_ERROR",
      errorMessage: "정답 제출 중 네트워크 오류가 발생했습니다.",
    };
  }
}

export function submitInvestigationQuestion(
  request: SubmitQuestionRequest,
  endpoint?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitQuestionCommandResult> {
  return submitQuestionRequest(request, resolveEndpoint(endpoint), fetchImpl);
}

export function submitInvestigationAnswer(
  request: SubmitAnswerRequest,
  endpoint?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitAnswerCommandResult> {
  return submitAnswerRequest(request, resolveEndpoint(endpoint), fetchImpl);
}
