import type { PrivateChatRequest, PrivateChatSession } from "@/contracts/game";
import { normalizeRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

type MutationPayload =
  | {
      type: "request_private_chat";
      roomId: string;
      stageId: string;
      requesterPlayerId: string;
      targetPlayerId: string;
    }
  | {
      type: "respond_private_chat";
      roomId: string;
      requestId: string;
      responderPlayerId: string;
      accept: boolean;
    }
  | {
      type: "end_private_chat";
      roomId: string;
      stageId: string;
      sessionId: string;
      playerId: string;
    };

interface MutationResultShape {
  request?: PrivateChatRequest | null;
  session?: PrivateChatSession | null;
  snapshot?: unknown;
}

export interface PrivateChatMutationResult {
  ok: boolean;
  statusCode: number;
  snapshot: RoomSnapshot | null;
  request: PrivateChatRequest | null;
  session: PrivateChatSession | null;
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

function resolveResultShape(value: unknown): MutationResultShape {
  if (isRecord(value) && "data" in value && isRecord(value.data)) {
    return value.data as MutationResultShape;
  }

  if (isRecord(value)) {
    return value as MutationResultShape;
  }

  return {};
}

async function submitPrivateChatMutation(
  payload: MutationPayload,
  endpoint?: string,
  fetchImpl?: typeof fetch,
): Promise<PrivateChatMutationResult> {
  const resolvedEndpoint = resolveEndpoint(endpoint);
  const resolvedFetch = fetchImpl ?? fetch;

  try {
    const response = await resolvedFetch(resolvedEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let rawPayload: unknown = null;
    try {
      rawPayload = await response.json();
    } catch {
      rawPayload = null;
    }

    const result = resolveResultShape(rawPayload);
    const error = resolveApiError(rawPayload);

    return {
      ok: response.ok && result.snapshot !== undefined,
      statusCode: response.status,
      snapshot: result.snapshot ? normalizeRoomSnapshot(result.snapshot) : null,
      request: result.request ?? null,
      session: result.session ?? null,
      errorCode: error.code,
      errorMessage: response.ok ? null : error.message ?? `HTTP ${response.status}`,
    };
  } catch {
    return {
      ok: false,
      statusCode: 0,
      snapshot: null,
      request: null,
      session: null,
      errorCode: "NETWORK_ERROR",
      errorMessage: "1:1 채팅 요청 중 네트워크 오류가 발생했습니다.",
    };
  }
}

export function submitPrivateChatRequest(
  payload: Extract<MutationPayload, { type: "request_private_chat" }>,
  endpoint?: string,
  fetchImpl?: typeof fetch,
) {
  return submitPrivateChatMutation(payload, endpoint, fetchImpl);
}

export function submitPrivateChatResponse(
  payload: Extract<MutationPayload, { type: "respond_private_chat" }>,
  endpoint?: string,
  fetchImpl?: typeof fetch,
) {
  return submitPrivateChatMutation(payload, endpoint, fetchImpl);
}

export function submitPrivateChatEnd(
  payload: Extract<MutationPayload, { type: "end_private_chat" }>,
  endpoint?: string,
  fetchImpl?: typeof fetch,
) {
  return submitPrivateChatMutation(payload, endpoint, fetchImpl);
}
