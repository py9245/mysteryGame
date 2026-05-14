"use client";

import { useEffect, useRef } from "react";
import type { ChatMessageViewModel } from "./chat-message-view-model";

export function ChatMessageList({
  emptyMessage,
  messages,
}: {
  emptyMessage: string;
  messages: ChatMessageViewModel[];
}) {
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  if (messages.length === 0) {
    return <p className="message-note chat-empty-note">{emptyMessage}</p>;
  }

  return (
    <ul className="chat-message-list" ref={listRef}>
      {messages.map((message) => (
        <li
          className={`chat-message${message.isMine ? " chat-message-mine" : " chat-message-other"}`}
          key={message.id}
        >
          <div className="chat-message-top">
            <strong className="chat-author">{message.authorLabel}</strong>
            <span className="chat-meta">
              {[message.metaLabel, message.previewLabel].filter(Boolean).join(" · ")}
            </span>
          </div>
          <p>{message.content}</p>
        </li>
      ))}
    </ul>
  );
}
