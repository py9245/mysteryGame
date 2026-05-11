import { ChatMessageList } from "./ChatMessageList";
import type { ChatMessageViewModel } from "./chat-message-view-model";

export function TeamChatPanel({
  teamLabel,
  messages,
}: {
  teamLabel: string | null;
  messages: ChatMessageViewModel[];
}) {
  return (
    <section className="chat-section">
      <h4>{teamLabel ?? "미배정"} 팀 채팅</h4>
      <p className="panel-copy">{teamLabel ? "같은 팀만 보는 대화입니다." : "팀이 배정되면 팀 대화가 열립니다."}</p>
      <ChatMessageList emptyMessage="아직 팀 채팅이 없습니다." messages={messages} />
    </section>
  );
}
