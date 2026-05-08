import type { ChatMessage, EntityId, TeamSlot } from "@/contracts/game";
import type { ChatSnapshot } from "./chat-ui-types";
import type { SubmittedChatPreview } from "./send-chat-message";

export interface ChatMessageViewModel {
  id: string;
  authorLabel: string;
  metaLabel: string;
  content: string;
  isMine: boolean;
  previewLabel: string | null;
}

export interface BuildChatMessageViewModelOptions {
  submittedPreview?: SubmittedChatPreview | null;
}

function formatChatTimestamp(createdAt: string): string {
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) {
    return createdAt;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function resolveChatTeamLabel(teamSlotId: EntityId | null, teamSlots: TeamSlot[]): string | null {
  if (!teamSlotId) {
    return null;
  }

  return teamSlots.find((teamSlot) => teamSlot.id === teamSlotId)?.label ?? null;
}

function resolveChatAuthorLabel(message: ChatMessage, snapshot: ChatSnapshot): string {
  if (message.channel === "system") {
    return "시스템";
  }

  if (message.playerId === snapshot.me.playerId) {
    return `${snapshot.me.nickname} (나)`;
  }

  return snapshot.players.find((player) => player.playerId === message.playerId)?.nickname ?? message.playerId;
}

function resolveChatScopeLabel(message: ChatMessage, snapshot: ChatSnapshot): string {
  switch (message.channel) {
    case "team": {
      const teamLabel = resolveChatTeamLabel(message.teamSlotId, snapshot.teamSlots);
      return teamLabel ? `${teamLabel} 팀` : "팀";
    }
    case "private":
      return "비공개";
    case "system":
      return "시스템";
    default:
      return "전체";
  }
}

function resolvePreviewLabel(
  message: ChatMessage,
  submittedPreview: SubmittedChatPreview | null | undefined,
): string | null {
  if (!submittedPreview || submittedPreview.message.id !== message.id) {
    return null;
  }

  return submittedPreview.status === "success" ? "방금 전송" : "임시 보관";
}

export function buildChatMessageViewModels(
  messages: ChatMessage[],
  snapshot: ChatSnapshot,
  options: BuildChatMessageViewModelOptions = {},
): ChatMessageViewModel[] {
  return [...messages]
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .map((message) => ({
      id: message.id,
      authorLabel: resolveChatAuthorLabel(message, snapshot),
      metaLabel: `${resolveChatScopeLabel(message, snapshot)} · ${formatChatTimestamp(message.createdAt)}`,
      content: message.content,
      isMine: message.playerId === snapshot.me.playerId,
      previewLabel: resolvePreviewLabel(message, options.submittedPreview),
    }));
}
