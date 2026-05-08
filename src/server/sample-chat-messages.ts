import type {
  ListChatMessagesResponse,
  SendChatMessageRequest,
  SendChatMessageResponse,
} from "@/contracts/api";
import type { ChatChannel, ChatMessage } from "@/contracts/game";
import { nowUtcIso } from "@/server/time";

export const SAMPLE_CHAT_STAGE_ID = "stage-01";

const SENDABLE_CHAT_CHANNELS = ["global", "team", "private"] as const;

export function isSendableChatChannel(
  channel: string,
): channel is (typeof SENDABLE_CHAT_CHANNELS)[number] {
  return SENDABLE_CHAT_CHANNELS.includes(channel as (typeof SENDABLE_CHAT_CHANNELS)[number]);
}

function buildSampleChatMessageList(roomId: string): ChatMessage[] {
  return [
    {
      id: "chat-001",
      roomId,
      stageId: SAMPLE_CHAT_STAGE_ID,
      playerId: "player-01",
      teamSlotId: "team-red",
      channel: "global",
      content: "조사실 먼저 들어가볼게.",
      createdAt: "2026-05-07T00:00:00.000Z",
    },
    {
      id: "chat-002",
      roomId,
      stageId: SAMPLE_CHAT_STAGE_ID,
      playerId: "player-02",
      teamSlotId: "team-blue",
      channel: "team",
      content: "힌트가 하나 더 있으면 좋겠다.",
      createdAt: "2026-05-07T00:01:00.000Z",
    },
  ];
}

function buildEchoMessageId(playerId: string, createdAt: string): string {
  const compactTimestamp = createdAt.replace(/[^\d]/g, "").slice(0, 17);
  return `chat-echo-${playerId}-${compactTimestamp}`;
}

function normalizeStageId(stageId: string | null | undefined): string | null {
  if (typeof stageId === "string" && stageId.length > 0) {
    return stageId;
  }

  return SAMPLE_CHAT_STAGE_ID;
}

function normalizeTeamSlotId(teamSlotId: string | null | undefined): string | null {
  if (typeof teamSlotId === "string" && teamSlotId.length > 0) {
    return teamSlotId;
  }

  return null;
}

function normalizeChannel(channel: SendChatMessageRequest["channel"]): ChatChannel {
  return channel;
}

export function buildSampleChatMessages(roomId: string): ListChatMessagesResponse {
  return {
    messages: buildSampleChatMessageList(roomId),
  };
}

export function buildSampleSentChatMessage(
  input: SendChatMessageRequest,
): SendChatMessageResponse {
  const createdAt = nowUtcIso();
  const message: ChatMessage = {
    id: buildEchoMessageId(input.playerId, createdAt),
    roomId: input.roomId,
    stageId: normalizeStageId(input.stageId),
    playerId: input.playerId,
    teamSlotId: normalizeTeamSlotId(input.teamSlotId),
    channel: normalizeChannel(input.channel),
    content: input.content,
    createdAt,
  };

  return { message };
}
