import { ChatMessageList } from "./ChatMessageList";
import type { ChatMessageViewModel } from "./chat-message-view-model";

export function GlobalChatPanel({
  roomCode,
  stageLabel,
  messages,
}: {
  roomCode: string;
  stageLabel: string;
  messages: ChatMessageViewModel[];
}) {
  return (
    <div className="chat-panel-body">
      <p className="panel-copy">
        {roomCode} · {stageLabel}
      </p>
      <ChatMessageList emptyMessage="아직 공개 채팅이 없습니다." messages={messages} />
    </div>
  );
}
