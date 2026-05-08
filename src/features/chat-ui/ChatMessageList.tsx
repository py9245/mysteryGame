import type { ChatMessageViewModel } from "./chat-message-view-model";

export function ChatMessageList({
  emptyMessage,
  messages,
}: {
  emptyMessage: string;
  messages: ChatMessageViewModel[];
}) {
  if (messages.length === 0) {
    return <p className="message-note">{emptyMessage}</p>;
  }

  return (
    <ul className="chat-message-list">
      {messages.map((message) => (
        <li className="chat-message" key={message.id}>
          <div className="chat-message-top">
            <strong className="chat-author">{message.authorLabel}</strong>{" "}
            <span className="chat-meta">
              {[
                message.metaLabel,
                message.isMine ? "내 메시지" : null,
                message.previewLabel,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          <p>{message.content}</p>
        </li>
      ))}
    </ul>
  );
}
