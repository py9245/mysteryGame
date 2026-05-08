import type { ListChatMessagesResponse } from "@/contracts/api";
import type { ChatMessage } from "@/contracts/game";
import { SAMPLE_ROOM_ID } from "@/server/sample-room-snapshot";

export interface ChatMessagesLoaderOptions {
  roomId?: string;
  stageId?: string | null;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  fallback?: ChatMessage[];
}

export interface LoadedChatMessages {
  messages: ChatMessage[];
  source: "api" | "fallback";
  endpoint: string;
}

function buildFallbackMessages(roomId: string, stageId: string | null): ChatMessage[] {
  const resolvedStageId = stageId ?? "stage-01";

  return [
    {
      id: "chat-fallback-001",
      roomId,
      stageId: resolvedStageId,
      playerId: "system",
      teamSlotId: null,
      channel: "system",
      content: "채널이 잠시 정리되는 동안 최근 대화를 먼저 불러왔습니다.",
      createdAt: "2026-05-07T00:01:00.000Z",
    },
    {
      id: "chat-fallback-002",
      roomId,
      stageId: resolvedStageId,
      playerId: "player-01",
      teamSlotId: "team-red",
      channel: "global",
      content: "조사실은 내가 먼저 확인할게. 반지 동선부터 좁혀 보자.",
      createdAt: "2026-05-07T00:02:00.000Z",
    },
    {
      id: "chat-fallback-003",
      roomId,
      stageId: resolvedStageId,
      playerId: "player-03",
      teamSlotId: "team-green",
      channel: "global",
      content: "현장 사진에 물기 흔적이 있어서 실외 이동이 있었던 것 같아.",
      createdAt: "2026-05-07T00:03:00.000Z",
    },
    {
      id: "chat-fallback-004",
      roomId,
      stageId: resolvedStageId,
      playerId: "player-02",
      teamSlotId: "team-blue",
      channel: "team",
      content: "Blue 팀은 우산과 신발 자국 단서부터 연결해서 보자.",
      createdAt: "2026-05-07T00:04:00.000Z",
    },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveRoomId(options: ChatMessagesLoaderOptions): string {
  return options.roomId ?? SAMPLE_ROOM_ID;
}

function resolveEndpoint(options: ChatMessagesLoaderOptions): string {
  const base =
    options.endpoint ??
    process.env.CHAT_MESSAGES_ENDPOINT ??
    process.env.NEXT_PUBLIC_CHAT_MESSAGES_ENDPOINT ??
    `/api/chat/${encodeURIComponent(resolveRoomId(options))}`;

  try {
    const url = new URL(base, "http://localhost");
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
  const roomId = resolveRoomId(options);
  const fallback = options.fallback ?? buildFallbackMessages(roomId, options.stageId ?? null);
  const endpoint = resolveEndpoint(options);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(endpoint, { cache: "no-store" });
    if (!response.ok) {
      return { messages: fallback, source: "fallback", endpoint };
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
      return { messages: fallback, source: "fallback", endpoint };
    }

    return { messages: normalizedMessages, source: "api", endpoint };
  } catch {
    return { messages: fallback, source: "fallback", endpoint };
  }
}
