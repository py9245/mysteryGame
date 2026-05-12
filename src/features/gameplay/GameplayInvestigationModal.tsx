"use client";

import { useEffect, useRef } from "react";
import type { RoomSnapshot } from "@/contracts/api";

function toCount(value: number | { hidden: true } | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

type InvestigationChatItem = {
  id: string;
  type: "question" | "answer";
  content: string;
  response: string | null;
  tone: "positive" | "negative" | "note";
  createdAt: number;
};

export function GameplayInvestigationModal({
  snapshot,
  isOpen,
  onClose,
  onReleaseLock,
  onSubmitQuestion,
  onSubmitAnswer,
  isQuestionSubmitting = false,
  isAnswerSubmitting = false,
  investigationDraft = "",
  onInvestigationDraftChange,
  investigationHistory = [],
  isDraftEditable = false,
}: {
  snapshot: RoomSnapshot;
  isOpen: boolean;
  onClose: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  statusMessage?: string | null;
  onAcquireLock?: () => void;
  onReleaseLock?: () => void;
  onJoinQueue?: () => void;
  onLeaveQueue?: () => void;
  canAcquireLock?: boolean;
  canReleaseLock?: boolean;
  canJoinQueue?: boolean;
  canLeaveQueue?: boolean;
  isQueued?: boolean;
  queuePosition?: number | null;
  waitingPlayerCount?: number;
  queueCooldownSeconds?: number;
  onSubmitQuestion?: (content?: string) => void;
  onSubmitAnswer?: (content?: string) => void;
  questionFeedbackMessage?: string | null;
  questionFeedbackTone?: "positive" | "negative" | "note";
  answerFeedbackMessage?: string | null;
  answerFeedbackTone?: "positive" | "negative" | "note";
  isQuestionSubmitting?: boolean;
  isAnswerSubmitting?: boolean;
  investigationDraft?: string;
  onInvestigationDraftChange?: (value: string) => void;
  investigationHistory?: InvestigationChatItem[];
  isDraftEditable?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [investigationHistory, isOpen]);

  if (!isOpen) {
    return null;
  }

  const isAnySubmitting = isQuestionSubmitting || isAnswerSubmitting;
  const remainingSeconds = snapshot.stage?.investigation?.remainingSeconds ?? 0;
  const remainingQuestions = toCount(snapshot.stage?.investigation?.questionCountRemaining);
  const remainingAnswers = toCount(snapshot.stage?.investigation?.answerAttemptCountRemaining);
  const canSend = isDraftEditable && investigationDraft.trim().length > 0 && !isAnySubmitting;

  function handleSend() {
    if (!canSend) {
      return;
    }

    const trimmed = investigationDraft.trim();
    if (trimmed.startsWith("/정답 ")) {
      onSubmitAnswer?.(trimmed.slice(4).trim());
      return;
    }

    if (trimmed.startsWith("/질문 ")) {
      onSubmitQuestion?.(trimmed.slice(4).trim());
      return;
    }

    onSubmitQuestion?.(trimmed);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-shell gameplay-investigation-modal gameplay-investigation-chat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gameplay-investigation-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="gameplay-investigation-chat-header">
          <div>
            <p className="eyebrow">질문방</p>
            <h2 className="gameplay-investigation-title" id="gameplay-investigation-title">
              AI 수사관에게 묻기
            </h2>
          </div>
          <div className="gameplay-investigation-meter-strip" aria-label="질문방 남은 자원">
            <span className="status-badge">시간 {remainingSeconds}s</span>
            <span className="status-badge">질문 {remainingQuestions}</span>
            <span className="status-badge">정답 {remainingAnswers}</span>
          </div>
          <button
            className="button-secondary"
            type="button"
            onClick={onReleaseLock}
            disabled={!isDraftEditable || isAnySubmitting}
          >
            질문방 나가기
          </button>
        </header>

        <div className="gameplay-investigation-chat-body" ref={scrollRef}>
          {investigationHistory.length === 0 ? (
            <div className="gameplay-investigation-empty">
              <p className="message-note">입력하면 AI가 바로 응답합니다.</p>
              <code>/질문 피해자는 독살인가요?</code>
              <code>/정답 범인은 조카이고 와인잔에 독을 넣었습니다.</code>
            </div>
          ) : (
            <ul className="gameplay-investigation-chat-list">
              {investigationHistory.map((item) => (
                <li key={item.id} className="gameplay-investigation-chat-turn">
                  <article className="chat-message chat-message-mine">
                    <div className="chat-message-top">
                      <strong className="chat-author">{snapshot.me.nickname}</strong>
                      <span className="chat-meta">{item.type === "answer" ? "정답" : "질문"}</span>
                    </div>
                    <p>{item.content}</p>
                  </article>
                  {item.response ? (
                    <article className="chat-message chat-message-system">
                      <div className="chat-message-top">
                        <strong className="chat-author">AI 수사관</strong>
                        <span className="chat-meta">응답</span>
                      </div>
                      <p className={`message-${item.tone}`}>{item.response}</p>
                    </article>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="gameplay-investigation-chat-composer">
          <textarea
            className="text-area gameplay-investigation-chat-input"
            rows={2}
            placeholder="/질문 ... 또는 /정답 ..."
            value={investigationDraft}
            onChange={(event) => onInvestigationDraftChange?.(event.target.value)}
            readOnly={!isDraftEditable || isAnySubmitting}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          <button className="button-primary" type="button" onClick={handleSend} disabled={!canSend}>
            {isAnySubmitting ? "응답 대기..." : "전송"}
          </button>
        </footer>
      </section>
    </div>
  );
}
