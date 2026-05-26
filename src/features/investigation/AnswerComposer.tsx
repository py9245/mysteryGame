import type { RoomSnapshot } from "@/contracts/api";

const MAX_ANSWER_ATTEMPTS_PER_LOCK = 1;

function toNumber(value: number | { hidden: true } | undefined) {
  return typeof value === "number" ? value : 0;
}

export function AnswerComposer({
  snapshot,
  draft = "",
  onDraftChange,
  isEditable = false,
  isSubmitting = false,
  canSubmit = false,
  feedbackMessage = null,
  feedbackTone = "note",
  onSubmit,
}: {
  snapshot: RoomSnapshot;
  draft?: string;
  onDraftChange?: (value: string) => void;
  isEditable?: boolean;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  feedbackMessage?: string | null;
  feedbackTone?: "positive" | "negative" | "note";
  onSubmit?: () => void;
}) {
  const remaining = toNumber(snapshot.stage?.investigation?.answerAttemptCountRemaining);
  const isFinal = remaining === 1;
  const isExhausted = remaining === 0;
  const charCount = draft.trim().length;

  return (
    <section
      className={`panel composer-card track-d-composer track-d-composer-answer${
        isEditable ? " is-active" : " is-locked"
      }${isFinal ? " is-final" : ""}`}
    >
      <div className="composer-header">
        <div>
          <h3 className="panel-title">정답 확정</h3>
          <p className="panel-copy">진실을 한 문장으로 정리해 보냅니다. 시도 횟수는 1회입니다.</p>
        </div>
        <span className="status-badge" data-tone={isEditable ? "live" : "alert"}>
          {isEditable ? "정답 시도 가능" : "조사실 점유 필요"}
        </span>
      </div>
      <div className="field track-d-composer-field">
        <label htmlFor="answer-preview">정답 문장</label>
        <textarea
          id="answer-preview"
          className="text-area track-d-composer-textarea"
          rows={4}
          placeholder="예: 반지는 야외 촬영 직후 신부 측 들러리의 가방 안으로 옮겨졌습니다."
          value={draft}
          onChange={(event) => onDraftChange?.(event.target.value)}
          readOnly={!isEditable}
          aria-describedby="answer-helper"
        />
        <p className="track-d-composer-meta" aria-hidden="true">
          <span>
            남은 정답 {remaining}/{MAX_ANSWER_ATTEMPTS_PER_LOCK}
          </span>
          <span>{charCount}자</span>
        </p>
      </div>
      <div className="composer-footer">
        <p
          id="answer-helper"
          className={`message-note track-d-composer-helper${isFinal ? " track-d-composer-helper-warn" : ""}`}
        >
          {!isEditable
            ? "조사실을 점유해야 입력이 풀립니다."
            : isExhausted
              ? "이번 입장에서는 정답 시도가 끝났습니다."
              : "정답 시도는 1회뿐입니다. 핵심 인물, 수단, 동기를 한 문장으로 정리하세요."}
        </p>
        <button
          className="button-primary track-d-composer-submit track-d-composer-submit-answer"
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <span className="track-d-send-loading" aria-live="polite">
              정답 제출 중
              <span className="track-d-send-dot" />
              <span className="track-d-send-dot" />
              <span className="track-d-send-dot" />
            </span>
          ) : (
            "정답 제출"
          )}
        </button>
      </div>
      {feedbackMessage ? (
        <p
          className={
            feedbackTone === "positive"
              ? "message-positive"
              : feedbackTone === "negative"
                ? "message-negative"
                : "message-note"
          }
          role="status"
          aria-live="polite"
        >
          {feedbackMessage}
        </p>
      ) : null}
    </section>
  );
}
