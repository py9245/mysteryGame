import type { RoomSnapshot } from "@/contracts/api";

const MAX_QUESTIONS_PER_LOCK = 3;

function toNumber(value: number | { hidden: true } | undefined) {
  return typeof value === "number" ? value : 0;
}

export function QuestionComposer({
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
  const remaining = toNumber(snapshot.stage?.investigation?.questionCountRemaining);
  const isFinal = remaining === 1;
  const isExhausted = remaining === 0;
  const charCount = draft.trim().length;

  return (
    <section
      className={`panel composer-card track-d-composer track-d-composer-question${
        isEditable ? " is-active" : " is-locked"
      }${isFinal ? " is-final" : ""}`}
    >
      <div className="composer-header">
        <div>
          <h3 className="panel-title">질문 던지기</h3>
          <p className="panel-copy">
            예/아니오로 답할 수 있는 단서를 한 번에 하나씩 좁힙니다.
          </p>
        </div>
        <span className="status-badge" data-tone={isEditable ? "live" : "alert"}>
          {isEditable ? "조사실 입력 가능" : "조사실 점유 필요"}
        </span>
      </div>
      <div className="field track-d-composer-field">
        <label htmlFor="question-preview">질문 문장</label>
        <textarea
          id="question-preview"
          className="text-area track-d-composer-textarea"
          rows={4}
          placeholder="예: 범인은 행사장 내부 동선을 미리 알고 있었나요?"
          value={draft}
          onChange={(event) => onDraftChange?.(event.target.value)}
          readOnly={!isEditable}
          aria-describedby="question-helper"
        />
        <p className="track-d-composer-meta" aria-hidden="true">
          <span>
            남은 질문 {remaining}/{MAX_QUESTIONS_PER_LOCK}
          </span>
          <span>{charCount}자</span>
        </p>
      </div>
      <div className="composer-footer">
        <p
          id="question-helper"
          className={`message-note track-d-composer-helper${isFinal ? " track-d-composer-helper-warn" : ""}`}
        >
          {!isEditable
            ? "조사실을 점유해야 입력이 풀립니다."
            : isExhausted
              ? "이번 입장에서는 질문 기회가 모두 끝났습니다."
              : isFinal
                ? "마지막 질문입니다. 가장 좁히고 싶은 단서를 한 문장으로 던지세요."
                : "질문은 즉시 판정됩니다. 짧고 분명하게 보내세요."}
        </p>
        <button
          className="button-primary track-d-composer-submit"
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <span className="track-d-send-loading" aria-live="polite">
              질문 제출 중
              <span className="track-d-send-dot" />
              <span className="track-d-send-dot" />
              <span className="track-d-send-dot" />
            </span>
          ) : (
            "질문 제출"
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
