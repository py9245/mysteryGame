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
  isPending: boolean;
  createdAt: number;
};

type InvestigationMode = "question" | "answer";

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
  investigationMode = "question",
  onInvestigationModeChange,
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
  investigationMode?: InvestigationMode;
  onInvestigationModeChange?: (mode: InvestigationMode) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [investigationHistory, isOpen]);

  useEffect(() => {
    if (isOpen && isDraftEditable) {
      const id = window.setTimeout(() => textareaRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [isOpen, isDraftEditable, investigationMode]);

  if (!isOpen) {
    return null;
  }

  const isAnySubmitting = isQuestionSubmitting || isAnswerSubmitting;
  const remainingSeconds = snapshot.stage?.investigation?.remainingSeconds ?? 0;
  const remainingQuestions = toCount(snapshot.stage?.investigation?.questionCountRemaining);
  const remainingAnswers = toCount(snapshot.stage?.investigation?.answerAttemptCountRemaining);
  const isAnswerMode = investigationMode === "answer";
  const canSend = isDraftEditable && investigationDraft.trim().length > 0 && !isAnySubmitting &&
    (isAnswerMode ? remainingAnswers > 0 : remainingQuestions > 0);
  const timerCritical = remainingSeconds <= 10;

  function handleSend() {
    if (!canSend) {
      return;
    }

    const trimmed = investigationDraft.trim();

    // Slash-command shortcuts still work
    if (trimmed.startsWith("/정답 ")) {
      onSubmitAnswer?.(trimmed.slice(4).trim());
      return;
    }
    if (trimmed.startsWith("/질문 ")) {
      onSubmitQuestion?.(trimmed.slice(4).trim());
      return;
    }

    if (isAnswerMode) {
      onSubmitAnswer?.(trimmed);
    } else {
      onSubmitQuestion?.(trimmed);
    }
  }

  const placeholder = isAnswerMode
    ? "정답을 확정해서 입력하세요. (예: 범인은 조카이고 와인잔에 독을 넣었습니다)"
    : "AI 수사관에게 예/아니오로 답할 수 있는 질문을 던지세요.";

  return (
    <div className="modal-backdrop investigation-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-shell gameplay-investigation-modal gameplay-investigation-chat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gameplay-investigation-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="gameplay-investigation-chat-header">
          <div className="gameplay-investigation-heading">
            <p className="eyebrow">AI 수사관</p>
            <h2 className="gameplay-investigation-title" id="gameplay-investigation-title">
              질문방
            </h2>
          </div>
          <div className="gameplay-investigation-meter-strip" aria-label="질문방 남은 자원">
            <span
              className={`investigation-meter${timerCritical ? " is-critical" : ""}`}
              data-meter="timer"
            >
              <span className="investigation-meter-label">시간</span>
              <span className="investigation-meter-value">{remainingSeconds}s</span>
            </span>
            <span className="investigation-meter" data-meter="question">
              <span className="investigation-meter-label">질문</span>
              <span className="investigation-meter-value">{remainingQuestions}</span>
            </span>
            <span className="investigation-meter" data-meter="answer">
              <span className="investigation-meter-label">정답</span>
              <span className="investigation-meter-value">{remainingAnswers}</span>
            </span>
          </div>
          <button
            className="button-secondary investigation-exit-button"
            type="button"
            onClick={onReleaseLock}
            disabled={!isDraftEditable || isAnySubmitting}
          >
            나가기
          </button>
        </header>

        <div className="gameplay-investigation-chat-body" ref={scrollRef}>
          {investigationHistory.length === 0 ? (
            <div className="gameplay-investigation-empty">
              <div className="investigation-empty-icon" aria-hidden="true">?</div>
              <p className="investigation-empty-title">단서를 좁혀보세요</p>
              <p className="investigation-empty-copy">
                예/아니오로 답할 수 있는 질문을 던지거나, 확신이 들면 정답 모드로 추리를 제출하세요.
              </p>
              <div className="investigation-empty-examples">
                <span className="investigation-empty-tag">질문</span>
                <code>피해자는 독살인가요?</code>
                <span className="investigation-empty-tag">정답</span>
                <code>범인은 조카이고 와인잔에 독을 넣었습니다</code>
              </div>
            </div>
          ) : (
            <ul className="gameplay-investigation-chat-list">
              {investigationHistory.map((item) => (
                <li key={item.id} className="gameplay-investigation-chat-turn">
                  <article className="chat-message chat-message-mine investigation-bubble-mine" data-kind={item.type}>
                    <div className="chat-message-top">
                      <span className={`investigation-kind-tag investigation-kind-${item.type}`}>
                        {item.type === "answer" ? "정답 제출" : "질문"}
                      </span>
                      <strong className="chat-author">{snapshot.me.nickname}</strong>
                    </div>
                    <p>{item.content}</p>
                  </article>
                  {item.isPending ? (
                    <article className="chat-message chat-message-system investigation-bubble-ai is-pending">
                      <div className="chat-message-top">
                        <strong className="chat-author">AI 수사관</strong>
                        <span className="chat-meta">분석 중</span>
                      </div>
                      <div className="investigation-typing" aria-label="AI 수사관이 분석 중입니다">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </article>
                  ) : item.response ? (
                    <article
                      className={`chat-message chat-message-system investigation-bubble-ai is-${item.tone}`}
                    >
                      <div className="chat-message-top">
                        <strong className="chat-author">AI 수사관</strong>
                        <span className="chat-meta">
                          {item.type === "answer" ? "정답 판정" : "응답"}
                        </span>
                      </div>
                      <p className="investigation-bubble-response">{item.response}</p>
                    </article>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="gameplay-investigation-chat-composer">
          <div
            className="investigation-mode-switch"
            role="tablist"
            aria-label="질문방 모드"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isAnswerMode}
              className={!isAnswerMode ? "is-active" : ""}
              onClick={() => onInvestigationModeChange?.("question")}
              disabled={isAnySubmitting}
            >
              <span className="investigation-mode-label">질문</span>
              <span className="investigation-mode-count">{remainingQuestions}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isAnswerMode}
              className={isAnswerMode ? "is-active" : ""}
              onClick={() => onInvestigationModeChange?.("answer")}
              disabled={isAnySubmitting}
            >
              <span className="investigation-mode-label">정답</span>
              <span className="investigation-mode-count">{remainingAnswers}</span>
            </button>
          </div>
          <div className="investigation-composer-input">
            <textarea
              ref={textareaRef}
              className="text-area gameplay-investigation-chat-input"
              rows={2}
              placeholder={placeholder}
              value={investigationDraft}
              onChange={(event) => onInvestigationDraftChange?.(event.target.value)}
              readOnly={!isDraftEditable || isAnySubmitting}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              className={`button-primary investigation-send-button${isAnswerMode ? " is-answer" : ""}`}
              type="button"
              onClick={handleSend}
              disabled={!canSend}
            >
              {isAnySubmitting ? "전송 중" : isAnswerMode ? "정답 제출" : "질문 보내기"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
