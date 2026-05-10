"use client";

import { useState } from "react";
import type { ChatMessage } from "@/contracts/game";
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
  const [submittedPreview, setSubmittedPreview] = useState<SubmittedChatPreview | null>(null);
  const messages = mergeMessagesWithSubmittedPreview(initialMessages, submittedPreview);
  const globalMessages = buildChatMessageViewModels(
    messages.filter((message) => message.channel === "global"),
    snapshot,
    { submittedPreview },
  );
  const systemMessages = buildChatMessageViewModels(
    messages.filter((message) => message.channel === "system"),
    snapshot,
    { submittedPreview },
  );
  const teamMessages = buildChatMessageViewModels(
    messages.filter(
      (message) => message.channel === "team" && message.teamSlotId === snapshot.me.teamSlotId,
    ),
    snapshot,
    { submittedPreview },
  );
  const myTeamLabel = resolveChatTeamLabel(snapshot.me.teamSlotId, snapshot.teamSlots);
  const stageLabel = snapshot.stage
    ? `스테이지 ${snapshot.stage.stageNumber} · ${snapshot.stage.publicTitle}`
    : "대기 브리핑";
  const syncLabel = source === "api" ? "연결됨" : "불러오지 못함";
  const isLobby = variant === "lobby";

  return (
    <aside className={`chat-rail chat-shell chat-rail-layout${isLobby ? " lobby-chat-layout" : ""}`}>
      <section className="chat-main-panel chat-primary-panel">
        <div className="composer-header">
          <div>
            <h3 className="panel-title">전체 채팅</h3>
            <p className="panel-copy">
              {isLobby ? "방 전체 대화입니다." : "방 전체가 함께 보는 대화입니다. 시작 전 논의와 게임 중 공개 발언이 여기에 쌓입니다."}
            </p>
          </div>
          <span className="status-badge" data-tone={source === "api" ? "live" : "alert"}>
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
              <h4>{isLobby ? "메시지 입력" : "보조 채팅"}</h4>
              <p className="panel-copy">
                {isLobby ? "채널을 고르고 바로 메시지를 보냅니다." : "시스템 안내와 최근 공개 대화를 빠르게 다시 확인합니다."}
              </p>
            </div>
            <span className="status-badge">{isLobby ? "입력" : systemMessages.length > 0 ? "시스템" : "보조"}</span>
          </div>
          {isLobby ? null : (
            <ChatMessageList
              emptyMessage="아직 시스템 안내가 없습니다."
              messages={systemMessages.length > 0 ? systemMessages : globalMessages.slice(-3)}
            />
          )}
          <ChatComposer snapshot={snapshot} onSubmittedPreview={setSubmittedPreview} compact />
        </section>
      </section>
    </aside>
  );
}
