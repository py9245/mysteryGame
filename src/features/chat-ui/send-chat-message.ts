import type {
  ApiResponse,
  SendChatMessageRequest,
  SendChatMessageResponse,
} from "@/contracts/api";
import type { ChatMessage } from "@/contracts/game";
import type { ChatSnapshot } from "./chat-ui-types";

export type ComposerChannel = Extract<SendChatMessageRequest["channel"], "global" | "team">;

export interface SubmitChatMessageOptions {
  request: SendChatMessageRequest;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface SubmitChatMessageResult {
  ok: boolean;
  endpoint: string;
  statusCode: number;
  request: SendChatMessageRequest;
  message: ChatMessage | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface SubmittedChatPreview {
  status: "success" | "error";
  notice: string;
  detail: string;
  endpoint: string;
  message: ChatMessage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveEndpoint(endpoint?: string): string {
  return endpoint ?? process.env.NEXT_PUBLIC_CHAT_COMMAND_ENDPOINT ?? "/api/chat";
}

function normalizeChatMessage(value: unknown): ChatMessage | null {
  if (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.roomId === "string" &&
    typeof value.playerId === "string" &&
    typeof value.channel === "string" &&
    typeof value.content === "string" &&
    typeof value.createdAt === "string"
  ) {
    return value as unknown as ChatMessage;
  }

  return null;
}

function resolveResponseMessage(value: unknown): ChatMessage | null {
  if (isRecord(value) && "data" in value && isRecord(value.data) && "message" in value.data) {
    return normalizeChatMessage(value.data.message);
  }

  if (isRecord(value) && "message" in value) {
    return normalizeChatMessage(value.message);
  }

  return null;
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

export function buildSendChatMessageRequest({
  snapshot,
  channel,
  content,
}: {
  snapshot: ChatSnapshot;
  channel: ComposerChannel;
  content: string;
}): SendChatMessageRequest {
  return {
    roomId: snapshot.room.id,
    stageId: snapshot.stage?.stageId ?? null,
    playerId: snapshot.me.playerId,
    teamSlotId: snapshot.me.teamSlotId ?? null,
    channel,
    content: content.trim(),
  };
}

export function buildLocalChatPreview(request: SendChatMessageRequest): ChatMessage {
  return {
    id: `chat-local-preview-${Date.now()}`,
    roomId: request.roomId,
    stageId: request.stageId ?? null,
    playerId: request.playerId,
    teamSlotId: request.teamSlotId ?? null,
    channel: request.channel,
    content: request.content,
    createdAt: new Date().toISOString(),
  };
}

export function buildSubmittedChatPreview(
  result: SubmitChatMessageResult,
): SubmittedChatPreview {
  const message = result.message ?? buildLocalChatPreview(result.request);

  if (result.ok) {
    return {
      status: "success",
      notice: "메시지를 전송했습니다.",
      detail: "방금 보낸 내용은 아래 채널 패널에 즉시 반영됩니다.",
      endpoint: result.endpoint,
      message,
    };
  }

  return {
    status: "error",
    notice: result.errorMessage ?? "채팅 전송에 실패했습니다.",
    detail:
      result.errorCode === "NOT_IMPLEMENTED"
        ? "현재는 미리보기 상태로만 남기고, 실제 반영은 뒤이어 연결됩니다."
        : "전송에 실패해도 마지막 시도 내용은 사라지지 않도록 아래에 유지됩니다.",
    endpoint: result.endpoint,
    message,
  };
}

export async function submitChatMessage(
  options: SubmitChatMessageOptions,
): Promise<SubmitChatMessageResult> {
  const endpoint = resolveEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(options.request),
    });

    let payload: unknown = null;

    try {
      payload = (await response.json()) as ApiResponse<SendChatMessageResponse>;
    } catch {
      payload = null;
    }

    const message = resolveResponseMessage(payload);
    const error = resolveApiError(payload);

    if (response.ok && message) {
      return {
        ok: true,
        endpoint,
        statusCode: response.status,
        request: options.request,
        message,
        errorCode: null,
        errorMessage: null,
      };
    }

    return {
      ok: false,
      endpoint,
      statusCode: response.status,
      request: options.request,
      message,
      errorCode: error.code,
      errorMessage: error.message ?? `HTTP ${response.status}`,
    };
  } catch {
    return {
      ok: false,
      endpoint,
      statusCode: 0,
      request: options.request,
      message: null,
      errorCode: "NETWORK_ERROR",
      errorMessage: "네트워크 오류로 채팅 전송에 실패했습니다.",
    };
  }
}
