import { ChatMessageList } from "./ChatMessageList";
import type { ChatMessageViewModel } from "./chat-message-view-model";

export function TeamChatPanel({
  myNickname,
  teamLabel,
  messages,
}: {
  myNickname: string;
  teamLabel: string | null;
  messages: ChatMessageViewModel[];
}) {
  return (
    <section className="chat-section">
      <h4>{teamLabel ?? "미배정"} 팀 채팅</h4>
      <p className="panel-copy">
        {teamLabel
          ? `${myNickname}님이 현재 보는 팀 전용 대화입니다.`
          : "팀이 배정되면 팀 내부 메시지가 여기에 나타납니다."}
      </p>
      <ChatMessageList emptyMessage="아직 팀 채팅이 없습니다." messages={messages} />
    </section>
  );
}
