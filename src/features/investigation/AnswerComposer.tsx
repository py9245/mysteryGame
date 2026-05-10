import type { RoomSnapshot } from "@/contracts/api";

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
  return (
    <section className="panel composer-card">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">정답</h3>
          <p className="panel-copy">진실을 한 문장으로 정리해 보냅니다.</p>
        </div>
        <span className="status-badge" data-tone={isEditable ? "live" : "alert"}>
          {isEditable ? "정답 시도 가능" : "조사실 점유 필요"}
        </span>
      </div>
      <div className="field">
        <label htmlFor="answer-preview">정답 문장</label>
        <textarea
          id="answer-preview"
          className="text-area"
          rows={4}
          placeholder="예: 반지는 야외 촬영 직후 신부 측 들러리의 가방 안으로 옮겨졌습니다."
          value={draft}
          onChange={(event) => onDraftChange?.(event.target.value)}
          readOnly={!isEditable}
        />
      </div>
      <div className="composer-footer">
        <p className="message-note">
          {isEditable ? "정답은 제한 횟수만 가능합니다." : "조사실을 점유해야 열립니다."}
        </p>
        <button
          className="button-primary"
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? "정답 제출 중..." : "정답 제출"}
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
