"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChatMessageViewModel } from "./chat-message-view-model";

const NEAR_BOTTOM_THRESHOLD_PX = 64;

function isListNearBottom(list: HTMLElement): boolean {
  const distance = list.scrollHeight - list.scrollTop - list.clientHeight;
  return distance <= NEAR_BOTTOM_THRESHOLD_PX;
}

function scrollListToBottom(list: HTMLElement, smooth = true) {
  if (smooth) {
    try {
      list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
      return;
    } catch {
      // fall through to instant scroll
    }
  }
  list.scrollTop = list.scrollHeight;
}

export function ChatMessageList({
  emptyMessage,
  emptyHint,
  messages,
}: {
  emptyMessage: string;
  emptyHint?: string;
  messages: ChatMessageViewModel[];
}) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const wasNearBottomRef = useRef(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  const jumpToBottom = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    scrollListToBottom(list, true);
    setHasNewBelow(false);
  }, []);

  // Detect new messages and decide whether to auto-scroll.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const latest = messages[messages.length - 1];
    const latestId = latest?.id ?? null;
    const previousId = lastMessageIdRef.current;
    const isNewMessage = latestId !== null && latestId !== previousId;

    if (previousId === null) {
      // First render with messages: snap to bottom without smooth scroll.
      scrollListToBottom(list, false);
      lastMessageIdRef.current = latestId;
      wasNearBottomRef.current = true;
      return;
    }

    if (isNewMessage) {
      const isMine = Boolean(latest?.isMine);
      if (wasNearBottomRef.current || isMine) {
        scrollListToBottom(list, true);
        setHasNewBelow(false);
      } else {
        setHasNewBelow(true);
      }
    }

    lastMessageIdRef.current = latestId;
  }, [messages]);

  // Track scroll position so we know whether to auto-scroll next time.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function handleScroll() {
      if (!list) return;
      const near = isListNearBottom(list);
      wasNearBottomRef.current = near;
      if (near && hasNewBelow) {
        setHasNewBelow(false);
      }
    }

    list.addEventListener("scroll", handleScroll, { passive: true });
    return () => list.removeEventListener("scroll", handleScroll);
  }, [hasNewBelow]);

  if (messages.length === 0) {
    return (
      <div className="chat-empty-note uiux-chat-empty" role="status">
        <span className="uiux-chat-empty-icon" aria-hidden="true">?</span>
        <span className="uiux-chat-empty-text">{emptyMessage}</span>
        {emptyHint ? <span className="uiux-chat-empty-hint">{emptyHint}</span> : null}
      </div>
    );
  }

  return (
    <div className="uiux-chat-list-wrap" ref={wrapRef}>
      <ul
        className="chat-message-list"
        ref={listRef}
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          return (
            <li
              className={`chat-message${message.isMine ? " chat-message-mine" : " chat-message-other"}${isLast ? " uiux-chat-message-enter" : ""}`}
              key={message.id}
            >
              <div className="chat-message-top">
                <strong className="chat-author">{message.authorLabel}</strong>
                <span className="chat-meta">
                  {[message.metaLabel, message.previewLabel].filter(Boolean).join(" · ")}
                </span>
              </div>
              <p>{message.content}</p>
              <span className="sr-only">{message.authorLabel} 메시지</span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="uiux-chat-jump-button"
        data-visible={hasNewBelow ? "true" : "false"}
        aria-hidden={!hasNewBelow}
        tabIndex={hasNewBelow ? 0 : -1}
        onClick={jumpToBottom}
      >
        <span className="uiux-chat-jump-dot" aria-hidden="true" />
        새 메시지
        <span aria-hidden="true">↓</span>
      </button>
    </div>
  );
}
