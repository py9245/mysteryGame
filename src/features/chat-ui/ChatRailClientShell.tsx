"use client";

import { useState } from "react";
import type { ChatMessage } from "@/contracts/game";
import { ChatComposer } from "./ChatComposer";
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
  endpoint,
}: {
  snapshot: ChatSnapshot;
  initialMessages: ChatMessage[];
  source: LoadedChatMessages["source"];
  endpoint: string;
}) {
  const [submittedPreview, setSubmittedPreview] = useState<SubmittedChatPreview | null>(null);
  const messages = mergeMessagesWithSubmittedPreview(initialMessages, submittedPreview);
  const globalMessages = buildChatMessageViewModels(
    messages.filter((message) => message.channel === "global" || message.channel === "system"),
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
  const syncLabel = source === "api" ? "실시간 동기화 준비 완료" : "연결 상태 조정 중";

  return (
    <aside className="chat-rail">
      <section className="panel panel-accent">
        <h3 className="panel-title">채널</h3>
        <p className="panel-copy">
          입장 코드 {snapshot.room.code} · {stageLabel}
        </p>
        <p className="meta-row">{syncLabel}</p>
      </section>
      <GlobalChatPanel roomCode={snapshot.room.code} stageLabel={stageLabel} messages={globalMessages} />
      <TeamChatPanel myNickname={snapshot.me.nickname} teamLabel={myTeamLabel} messages={teamMessages} />
      <ChatComposer snapshot={snapshot} onSubmittedPreview={setSubmittedPreview} />
    </aside>
  );
}
