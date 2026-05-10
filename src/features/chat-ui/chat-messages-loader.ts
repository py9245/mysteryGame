import type { ListChatMessagesResponse } from "@/contracts/api";
import type { ChatMessage } from "@/contracts/game";

export interface ChatMessagesLoaderOptions {
  roomId?: string;
  playerId?: string;
  stageId?: string | null;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface LoadedChatMessages {
  messages: ChatMessage[];
  source: "api" | "unavailable";
  endpoint: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveRoomId(options: ChatMessagesLoaderOptions): string {
  return options.roomId ?? "";
}

function resolveEndpoint(options: ChatMessagesLoaderOptions): string {
  const base =
    options.endpoint ??
    process.env.CHAT_MESSAGES_ENDPOINT ??
    process.env.NEXT_PUBLIC_CHAT_MESSAGES_ENDPOINT ??
    `/api/chat/${encodeURIComponent(resolveRoomId(options))}`;

  try {
    const url = new URL(base, "http://localhost");
    if (typeof options.playerId === "string" && options.playerId.length > 0 && !url.searchParams.has("playerId")) {
      url.searchParams.set("playerId", options.playerId);
    }
    if (typeof options.stageId === "string" && options.stageId.length > 0 && !url.searchParams.has("stageId")) {
      url.searchParams.set("stageId", options.stageId);
    }

    const resolved = url.toString();
    return resolved.startsWith("http://localhost") ? resolved.replace("http://localhost", "") : resolved;
  } catch {
    return `/api/chat/${encodeURIComponent(resolveRoomId(options))}`;
  }
}

function normalizeMessages(value: unknown): ChatMessage[] | null {
  if (
    Array.isArray(value) &&
    value.every(
      (message) =>
        isRecord(message) &&
        typeof message.id === "string" &&
        typeof message.roomId === "string" &&
        typeof message.playerId === "string" &&
        typeof message.channel === "string" &&
        typeof message.content === "string",
    )
  ) {
    return value as ChatMessage[];
  }

  return null;
}

export async function loadChatMessages(
  options: ChatMessagesLoaderOptions = {},
): Promise<LoadedChatMessages> {
  const endpoint = resolveEndpoint(options);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(endpoint, { cache: "no-store" });
    if (!response.ok) {
      return { messages: [], source: "unavailable", endpoint };
    }

    const payload = (await response.json()) as
      | ListChatMessagesResponse
      | { ok?: boolean; data?: unknown; messages?: unknown };
    const messages =
      isRecord(payload) && "data" in payload && isRecord(payload.data) && "messages" in payload.data
        ? payload.data.messages
        : isRecord(payload) && "messages" in payload
          ? payload.messages
          : payload;

    const normalizedMessages = normalizeMessages(messages);
    if (!normalizedMessages) {
      return { messages: [], source: "unavailable", endpoint };
    }

    return { messages: normalizedMessages, source: "api", endpoint };
  } catch {
    return { messages: [], source: "unavailable", endpoint };
  }
}
