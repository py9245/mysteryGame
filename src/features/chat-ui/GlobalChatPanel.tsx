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
    <section className="chat-section">
      <h4>전체 채널</h4>
      <p className="panel-copy">
        입장 코드 {roomCode} · {stageLabel}
      </p>
      <ChatMessageList emptyMessage="아직 공개 채팅이 없습니다." messages={messages} />
    </section>
  );
}
