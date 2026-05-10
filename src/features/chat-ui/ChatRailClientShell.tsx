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
}: {
  snapshot: ChatSnapshot;
  initialMessages: ChatMessage[];
  source: LoadedChatMessages["source"];
  endpoint: string;
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

  return (
    <aside className="chat-rail chat-shell chat-rail-layout">
      <section className="chat-main-panel chat-primary-panel">
        <div className="composer-header">
          <div>
            <h3 className="panel-title">전체 채팅</h3>
            <p className="panel-copy">지금 방 전체가 공유하는 내용만 위쪽에 모았습니다.</p>
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
              <h4>보조 채팅</h4>
              <p className="panel-copy">시스템 안내와 짧은 재공유만 아래에서 정리합니다.</p>
            </div>
            <span className="status-badge">{systemMessages.length > 0 ? "시스템" : "보조"}</span>
          </div>
          <ChatMessageList
            emptyMessage="아직 시스템 안내가 없습니다."
            messages={systemMessages.length > 0 ? systemMessages : globalMessages.slice(-3)}
          />
          <ChatComposer snapshot={snapshot} onSubmittedPreview={setSubmittedPreview} compact />
        </section>
      </section>
    </aside>
  );
}
