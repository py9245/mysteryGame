"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatMessage } from "@/contracts/game";
import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from "@/lib/supabase-browser";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { buildChatMessageViewModels, resolveChatTeamLabel } from "./chat-message-view-model";
import type { LoadedChatMessages } from "./chat-messages-loader";
import type { SubmittedChatPreview } from "./send-chat-message";
import type { ChatSnapshot } from "./chat-ui-types";

function mergeMessagesWithSubmittedPreview(
  messages: ChatMessage[],
  submittedPreview: SubmittedChatPreview | null,
): ChatMessage[] {
  if (!submittedPreview) {
    return messages;
  }

  return [
    ...messages.filter((message) => message.id !== submittedPreview.message.id),
    submittedPreview.message,
  ];
}

function normalizeRealtimeChatMessage(value: Record<string, unknown>): ChatMessage | null {
  if (
    typeof value.id !== "string" ||
    typeof value.room_id !== "string" ||
    typeof value.player_id !== "string" ||
    typeof value.channel !== "string" ||
    typeof value.content !== "string" ||
    typeof value.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    roomId: value.room_id,
    stageId: typeof value.stage_id === "string" ? value.stage_id : null,
    playerId: value.player_id,
    teamSlotId: typeof value.team_slot_id === "string" ? value.team_slot_id : null,
    channel: value.channel as ChatMessage["channel"],
    content: value.content,
    createdAt: value.created_at,
  };
}

function mergeIncomingMessage(messages: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  const nextMessages = [...messages.filter((message) => message.id !== incoming.id), incoming];
  nextMessages.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  return nextMessages;
}

function isRedactedValue(value: unknown): value is { hidden: true } {
  return typeof value === "object" && value !== null && "hidden" in value;
}

function resolvePrivateChatParticipantIds(snapshot: ChatSnapshot): string[] {
  const privateChat = snapshot.privateChat;
  if (!privateChat || isRedactedValue(privateChat)) {
    return [];
  }

  if (Array.isArray(privateChat.participants) && !isRedactedValue(privateChat.participants)) {
    return privateChat.participants.filter((value): value is string => typeof value === "string");
  }

  return [];
}

function hasActivePrivateChatSession(snapshot: ChatSnapshot): boolean {
  const privateChat = snapshot.privateChat;
  if (!privateChat || isRedactedValue(privateChat)) {
    return false;
  }

  return Boolean(privateChat.session && !isRedactedValue(privateChat.session));
}

export function ChatRailClientShell({
  snapshot,
  initialMessages,
  source,
  variant = "default",
}: {
  snapshot: ChatSnapshot;
  initialMessages: ChatMessage[];
  source: LoadedChatMessages["source"];
  endpoint: string;
  variant?: "default" | "lobby";
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [submittedPreview, setSubmittedPreview] = useState<SubmittedChatPreview | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const visibleMessages = useMemo(() => {
    const merged = mergeMessagesWithSubmittedPreview(messages, submittedPreview);

    if (variant === "lobby") {
      return merged.filter((message) => message.stageId === null);
    }

    return merged;
  }, [messages, submittedPreview, variant]);
  const globalMessages = buildChatMessageViewModels(
    visibleMessages.filter((message) => message.channel === "global"),
    snapshot,
    { submittedPreview },
  );
  const teamMessages = buildChatMessageViewModels(
    visibleMessages.filter(
      (message) => message.channel === "team" && message.teamSlotId === snapshot.me.teamSlotId,
    ),
    snapshot,
    { submittedPreview },
  );
  const privateParticipantIds = resolvePrivateChatParticipantIds(snapshot);
  const privateMessages = buildChatMessageViewModels(
    visibleMessages.filter(
      (message) =>
        message.channel === "private" &&
        privateParticipantIds.includes(message.playerId),
    ),
    snapshot,
    { submittedPreview },
  );
  const myTeamLabel = resolveChatTeamLabel(snapshot.me.teamSlotId, snapshot.teamSlots);
  const canUsePrivateChat = hasActivePrivateChatSession(snapshot);
  const syncLabel =
    source === "api"
      ? isRealtimeConnected
        ? "실시간 연결"
        : "불러오는 중"
      : "불러오지 못함";
  const isLobby = variant === "lobby";

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!hasSupabaseBrowserEnv()) {
      setIsRealtimeConnected(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setIsRealtimeConnected(false);
      return;
    }

    const channel = supabase
      .channel(`chat-room-${snapshot.room.id}-${snapshot.stage?.stageId ?? "lobby"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${snapshot.room.id}`,
        },
        (payload) => {
          const nextMessage = normalizeRealtimeChatMessage(
            (payload.new ?? {}) as Record<string, unknown>,
          );

          if (!nextMessage) {
            return;
          }

          setMessages((currentMessages) => mergeIncomingMessage(currentMessages, nextMessage));
        },
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      setIsRealtimeConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [snapshot.room.id, snapshot.stage?.stageId]);

  return (
    <aside className={`chat-rail chat-shell chat-rail-layout mt-chat-rail${isLobby ? " lobby-chat-layout" : ""}`}>
      <section className="chat-main-panel chat-primary-panel">
        <div className="composer-header">
          <div>
            <h3 className="panel-title">{isLobby ? "대기 채팅" : "전체 채팅"}</h3>
          </div>
          <span
            className="status-badge"
            data-tone={source === "api" && isRealtimeConnected ? "live" : source === "api" ? undefined : "alert"}
          >
            {syncLabel}
          </span>
        </div>
        <ChatMessageList emptyMessage="아직 공개 채팅이 없습니다." messages={globalMessages} />
        <ChatComposer
          snapshot={snapshot}
          onSubmittedPreview={setSubmittedPreview}
          compact
          forcedChannel="global"
          title="전체 채팅 보내기"
          description=""
          submitLabel="전체 전송"
        />
      </section>

      <section className="chat-secondary-grid gameplay-chat-bottom-grid">
        <section className="chat-section chat-support-panel">
          <div className="composer-header">
            <div>
              <h4>{myTeamLabel ?? "미배정"} 팀 채팅</h4>
            </div>
            <span className="status-badge">팀</span>
          </div>
          <ChatMessageList emptyMessage="아직 팀 채팅이 없습니다." messages={teamMessages} />
          <ChatComposer
            snapshot={snapshot}
            onSubmittedPreview={setSubmittedPreview}
            compact
            forcedChannel="team"
            title="팀 채팅 보내기"
            description=""
            submitLabel="팀 채팅 전송"
            disabled={!snapshot.me.teamSlotId}
            disabledMessage="팀이 배정되면 팀 채팅 입력이 열립니다."
          />
        </section>
        <section className="chat-section chat-support-panel">
          <div className="composer-header">
            <div>
              <h4>1:1 대화</h4>
            </div>
            <span className="status-badge">{canUsePrivateChat ? "연결됨" : "미연결"}</span>
          </div>
          <ChatMessageList
            emptyMessage={canUsePrivateChat ? "아직 1:1 대화가 없습니다." : "아직 연결된 1:1 대화가 없습니다."}
            messages={privateMessages}
          />
          <ChatComposer
            snapshot={snapshot}
            onSubmittedPreview={setSubmittedPreview}
            compact
            forcedChannel="private"
            title="1:1 대화 보내기"
            description=""
            submitLabel="1:1 전송"
            disabled={!canUsePrivateChat}
            disabledMessage="1:1 대화가 연결되면 이 입력창이 열립니다."
          />
        </section>
      </section>
    </aside>
  );
}
