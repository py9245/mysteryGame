import type { RoomSnapshot } from "@/contracts/api";

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
  return (
    <section className="panel composer-card">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">질문</h3>
          <p className="panel-copy">짧고 분명하게 한 번에 보냅니다.</p>
        </div>
        <span className="status-badge" data-tone={isEditable ? "live" : "alert"}>
          {isEditable ? "조사실 입력 가능" : "조사실 점유 필요"}
        </span>
      </div>
      <div className="field">
        <label htmlFor="question-preview">질문 문장</label>
        <textarea
          id="question-preview"
          className="text-area"
          rows={4}
          placeholder="예: 범인은 행사장 내부 동선을 미리 알고 있었나요?"
          value={draft}
          onChange={(event) => onDraftChange?.(event.target.value)}
          readOnly={!isEditable}
        />
      </div>
      <div className="composer-footer">
        <p className="message-note">
          {isEditable ? "질문은 즉시 판정됩니다." : "조사실을 점유해야 열립니다."}
        </p>
        <button
          className="button-primary"
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? "질문 제출 중..." : "질문 제출"}
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
        >
          {feedbackMessage}
        </p>
      ) : null}
    </section>
  );
}
