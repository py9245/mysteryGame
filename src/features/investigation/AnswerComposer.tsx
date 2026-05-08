import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function AnswerComposer({
  snapshot,
  draft = "",
  onDraftChange,
  isEditable = false,
}: {
  snapshot: RoomSnapshot;
  draft?: string;
  onDraftChange?: (value: string) => void;
  isEditable?: boolean;
}) {
  return (
    <section className="panel">
      <h3 className="panel-title">정답 정리</h3>
      <p className="panel-copy">
        {snapshot.me.nickname}님이 떠올린 진실을 한 문장으로 압축해 정리하는 공간입니다.
      </p>
      <div className="field">
        <label htmlFor="answer-preview">정답 문장</label>
        <textarea
          id="answer-preview"
          className="text-area"
          rows={3}
          placeholder="예: 반지는 야외 촬영 직후 신부 측 들러리의 가방 안으로 옮겨졌습니다."
          value={draft}
          onChange={(event) => onDraftChange?.(event.target.value)}
          readOnly={!isEditable}
        />
      </div>
      <p className="message-note">
        {isEditable
          ? "핵심 키워드와 맥락이 맞아야 인정됩니다. 남은 시도 횟수도 함께 확인하세요."
          : "조사실을 점유해야 정답 문장을 정리할 수 있습니다."}
      </p>
    </section>
  );
}
