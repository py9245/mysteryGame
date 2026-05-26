"use client";

import { useEffect, useRef } from "react";
import type { RoomSnapshot } from "@/contracts/api";
import { useEscapeShortcut, useKeyboardShortcut } from "@/lib/keyboard-shortcuts";

const MAX_QUESTIONS_PER_LOCK = 3;
const MAX_ANSWER_ATTEMPTS_PER_LOCK = 1;

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

  useEscapeShortcut(onClose, isOpen);

  // Q/A mode-switch shortcuts (outside the textarea only).
  useKeyboardShortcut(
    "q",
    () => {
      if (!isOpen || !isDraftEditable) return false;
      onInvestigationModeChange?.("question");
    },
    { enabled: isOpen && isDraftEditable, allowInInput: false },
  );

  useKeyboardShortcut(
    "a",
    () => {
      if (!isOpen || !isDraftEditable) return false;
      onInvestigationModeChange?.("answer");
    },
    { enabled: isOpen && isDraftEditable, allowInInput: false },
  );

  // Lock body scroll while modal is open (focus mode).
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isAnySubmitting = isQuestionSubmitting || isAnswerSubmitting;
  const remainingSeconds = snapshot.stage?.investigation?.remainingSeconds ?? 0;
  const remainingQuestions = toCount(snapshot.stage?.investigation?.questionCountRemaining);
  const remainingAnswers = toCount(snapshot.stage?.investigation?.answerAttemptCountRemaining);
  const isAnswerMode = investigationMode === "answer";
  const isFinalQuestion = remainingQuestions === 1;
  const isFinalAnswer = remainingAnswers === 1;
  const isModeLimitedOut = isAnswerMode ? remainingAnswers === 0 : remainingQuestions === 0;
  const canSend = isDraftEditable && investigationDraft.trim().length > 0 && !isAnySubmitting &&
    (isAnswerMode ? remainingAnswers > 0 : remainingQuestions > 0);
  const timerCritical = remainingSeconds <= 10;
  const timerExtreme = remainingSeconds <= 5 && remainingSeconds > 0;

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
    ? "정답을 입력하세요. (예: 범인은 조카이고 와인잔에 독을 넣었습니다)"
    : "예/아니오로 답할 수 있는 질문을 입력하세요.";

  return (
    <div
      className="modal-backdrop investigation-modal-backdrop track-d-investigation-backdrop uiux-gameplay-case-modal-backdrop-enter"
      role="presentation"
      onClick={onClose}
    >
      <section
        className={`modal-shell gameplay-investigation-modal gameplay-investigation-chat-modal track-d-investigation-shell uiux-investigation-modal-mode uiux-gameplay-case-modal-enter`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gameplay-investigation-title"
        aria-label="질문방 단독 면담"
        data-mode={investigationMode}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="gameplay-investigation-chat-header track-d-investigation-header">
          <div className="gameplay-investigation-heading">
            <p className="eyebrow">AI 수사관 단독 면담</p>
            <h2 className="gameplay-investigation-title" id="gameplay-investigation-title">
              질문방
            </h2>
            <p className="track-d-investigation-subtitle">
              {isDraftEditable
                ? "지금 이 시간만 단서를 좁힐 수 있습니다."
                : "차례가 오면 자동으로 입력이 열립니다."}
            </p>
          </div>
          <div
            className="gameplay-investigation-meter-strip track-d-investigation-meter-strip"
            aria-label="질문방 남은 자원"
          >
            <span
              className={`investigation-meter num-tabular${timerCritical ? " is-critical" : ""}${timerExtreme ? " uiux-investigation-meter-extreme" : ""}`}
              data-meter="timer"
              aria-live={timerCritical ? "polite" : "off"}
            >
              <span className="investigation-meter-label">남은 시간</span>
              <span className="investigation-meter-value">{remainingSeconds}s</span>
            </span>
            <span
              className={`investigation-meter track-d-meter-question${isFinalQuestion ? " track-d-meter-final" : ""}`}
              data-meter="question"
            >
              <span className="investigation-meter-label">질문</span>
              <span className="investigation-meter-value num-tabular">
                {remainingQuestions}
                <span className="track-d-meter-divider">/{MAX_QUESTIONS_PER_LOCK}</span>
              </span>
            </span>
            <span
              className={`investigation-meter track-d-meter-answer${isFinalAnswer ? " track-d-meter-final" : ""}`}
              data-meter="answer"
            >
              <span className="investigation-meter-label">정답</span>
              <span className="investigation-meter-value num-tabular">
                {remainingAnswers}
                <span className="track-d-meter-divider">/{MAX_ANSWER_ATTEMPTS_PER_LOCK}</span>
              </span>
            </span>
          </div>
          <button
            className="button-secondary investigation-exit-button track-d-investigation-exit"
            type="button"
            onClick={onReleaseLock}
            disabled={!isDraftEditable || isAnySubmitting}
            aria-label="질문방 나가기"
          >
            나가기
          </button>
        </header>

        {isAnswerMode && isDraftEditable && !isModeLimitedOut ? (
          <div className="uiux-investigation-mode-warning" role="status" aria-live="polite">
            <span className="uiux-investigation-mode-warning-icon" aria-hidden="true">!</span>
            <span>
              정답 모드입니다. 시도는 {" "}
              <span className="uiux-investigation-mode-warning-attempts num-tabular">
                {remainingAnswers}/{MAX_ANSWER_ATTEMPTS_PER_LOCK}회
              </span>
              {" "}남았습니다. 한 문장으로 핵심을 정리해 제출하세요.
            </span>
          </div>
        ) : null}

        <div className="gameplay-investigation-chat-body" ref={scrollRef}>
          {investigationHistory.length === 0 ? (
            <div className="gameplay-investigation-empty uiux-fade-up">
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
                  <article
                    className="chat-message chat-message-mine investigation-bubble-mine uiux-investigation-bubble-enter"
                    data-kind={item.type}
                  >
                    <div className="chat-message-top">
                      <span className={`investigation-kind-tag investigation-kind-${item.type}`}>
                        {item.type === "answer" ? "정답 제출" : "질문"}
                      </span>
                      <strong className="chat-author">{snapshot.me.nickname}</strong>
                    </div>
                    <p>{item.content}</p>
                  </article>
                  {item.isPending ? (
                    <article className="chat-message chat-message-system investigation-bubble-ai is-pending uiux-investigation-bubble-ai-enter">
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
                      className={`chat-message chat-message-system investigation-bubble-ai is-${item.tone} uiux-investigation-bubble-ai-enter${
                        item.tone === "positive" ? " uiux-investigation-bubble-ai-positive" : ""
                      }${item.tone === "negative" ? " uiux-investigation-bubble-ai-negative" : ""}`}
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

        <footer className="gameplay-investigation-chat-composer track-d-investigation-composer">
          <div
            className="investigation-mode-switch"
            role="tablist"
            aria-label="질문방 모드"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isAnswerMode}
              aria-keyshortcuts="Q"
              className={!isAnswerMode ? "is-active" : ""}
              onClick={() => onInvestigationModeChange?.("question")}
              disabled={isAnySubmitting}
              title="질문 모드 (Q)"
            >
              <span className="investigation-mode-label">질문</span>
              <span className="investigation-mode-count num-tabular">{remainingQuestions}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isAnswerMode}
              aria-keyshortcuts="A"
              className={isAnswerMode ? "is-active" : ""}
              onClick={() => onInvestigationModeChange?.("answer")}
              disabled={isAnySubmitting}
              title="정답 모드 (A)"
            >
              <span className="investigation-mode-label">정답</span>
              <span className="investigation-mode-count num-tabular">{remainingAnswers}</span>
            </button>
            <span className="uiux-investigation-mode-switch-helper" aria-hidden="true">
              <kbd>Q</kbd>
              질문
              <kbd>A</kbd>
              정답
            </span>
          </div>
          <p
            className={`track-d-composer-helper${isModeLimitedOut ? " track-d-composer-helper-warn" : ""}`}
            role="status"
            aria-live="polite"
          >
            {!isDraftEditable
              ? "차례가 오면 입력이 풀립니다."
              : isModeLimitedOut
                ? isAnswerMode
                  ? "이번 입장에서는 정답 시도가 모두 끝났습니다."
                  : "이번 입장에서는 질문 기회가 모두 끝났습니다."
                : isAnswerMode
                  ? isFinalAnswer
                    ? "마지막 정답 시도입니다. 신중히 한 문장으로 정리하세요."
                    : "한 문장으로 진실을 정리해 제출하세요."
                  : isFinalQuestion
                    ? "마지막 질문입니다. 예/아니오로 답할 수 있는 형태가 좋습니다."
                    : "예/아니오로 답할 수 있는 짧은 질문을 던지세요."}
            <span className="track-d-composer-shortcut">Enter 전송 · Shift+Enter 줄바꿈 · Esc 닫기 · Q/A 모드</span>
          </p>
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
              aria-label={isAnswerMode ? "정답 입력" : "질문 입력"}
            />
            <button
              className={`button-primary investigation-send-button${isAnswerMode ? " is-answer" : ""}`}
              type="button"
              onClick={handleSend}
              disabled={!canSend}
            >
              {isAnySubmitting ? (
                <span className="track-d-send-loading" aria-live="polite">
                  전송 중
                  <span className="track-d-send-dot" />
                  <span className="track-d-send-dot" />
                  <span className="track-d-send-dot" />
                </span>
              ) : isAnswerMode ? (
                "정답 제출"
              ) : (
                "질문 보내기"
              )}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
