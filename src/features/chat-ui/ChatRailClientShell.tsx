"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatMessage } from "@/contracts/game";
import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from "@/lib/supabase-browser";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { GlobalChatPanel } from "./GlobalChatPanel";
import { TeamChatPanel } from "./TeamChatPanel";
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
  const stageScopedMessages = useMemo(() => {
    const activeStageId = snapshot.stage?.stageId ?? null;

    return messages.filter((message) => {
      if (activeStageId) {
        return message.stageId === activeStageId;
      }

      return message.stageId === null;
    });
  }, [messages, snapshot.stage?.stageId]);
  const visibleMessages = mergeMessagesWithSubmittedPreview(stageScopedMessages, submittedPreview);
  const globalMessages = buildChatMessageViewModels(
    visibleMessages.filter((message) => message.channel === "global"),
    snapshot,
    { submittedPreview },
  );
  const systemMessages = buildChatMessageViewModels(
    visibleMessages.filter((message) => message.channel === "system"),
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
  const myTeamLabel = resolveChatTeamLabel(snapshot.me.teamSlotId, snapshot.teamSlots);
  const stageLabel = snapshot.stage
    ? `스테이지 ${snapshot.stage.stageNumber} · ${snapshot.stage.publicTitle}`
    : "대기 브리핑";
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
            <h3 className="panel-title">채팅</h3>
            <p className="panel-copy">
              {isLobby ? "대기실 전체 대화" : "공개 대화"}
            </p>
          </div>
          <span
            className="status-badge"
            data-tone={source === "api" && isRealtimeConnected ? "live" : source === "api" ? undefined : "alert"}
          >
            {syncLabel}
          </span>
        </div>
        <GlobalChatPanel roomCode={snapshot.room.code} stageLabel={stageLabel} messages={globalMessages} />
      </section>

      <section className="chat-secondary-grid gameplay-chat-bottom-grid">
        <TeamChatPanel myNickname={snapshot.me.nickname} teamLabel={myTeamLabel} messages={teamMessages} />
        <section className="chat-section chat-support-panel">
          <div className="composer-header">
            <div>
              <h4>{isLobby ? "메시지" : "시스템"}</h4>
              <p className="panel-copy">
                {isLobby ? "채널 선택 후 전송" : "최근 안내"}
              </p>
            </div>
            <span className="status-badge">{isLobby ? "입력" : systemMessages.length > 0 ? "시스템" : "보조"}</span>
          </div>
          {isLobby ? null : (
            <ChatMessageList
              emptyMessage="아직 안내가 없습니다."
              messages={systemMessages.length > 0 ? systemMessages : globalMessages.slice(-3)}
            />
          )}
          <ChatComposer snapshot={snapshot} onSubmittedPreview={setSubmittedPreview} compact />
        </section>
      </section>
    </aside>
  );
}
