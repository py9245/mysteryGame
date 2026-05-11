import { ChatMessageList } from "./ChatMessageList";
import type { ChatMessageViewModel } from "./chat-message-view-model";

export function GlobalChatPanel({
  messages,
}: {
  messages: ChatMessageViewModel[];
}) {
  return (
    <div className="chat-panel-body">
      <ChatMessageList emptyMessage="아직 공개 채팅이 없습니다." messages={messages} />
    </div>
  );
}
