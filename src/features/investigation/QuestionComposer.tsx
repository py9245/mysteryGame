import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function QuestionComposer({
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
      <h3 className="panel-title">질문 메모</h3>
      <p className="panel-copy">
        {snapshot.me.nickname}님이 사건을 흔들 수 있는 예/아니오형 질문을 정리하는 공간입니다.
      </p>
      <div className="field">
        <label htmlFor="question-preview">질문 문장</label>
        <textarea
          id="question-preview"
          className="text-area"
          rows={3}
          placeholder="예: 범인은 행사장 내부 동선을 미리 알고 있었나요?"
          value={draft}
          onChange={(event) => onDraftChange?.(event.target.value)}
          readOnly={!isEditable}
        />
      </div>
      <p className="message-note">
        {isEditable
          ? "조사실을 점유한 동안 문장을 다듬어 두면 판단 속도를 올릴 수 있습니다."
          : "조사실에 입장하면 이 칸이 열리고, 질문 문장을 바로 정리할 수 있습니다."}
      </p>
    </section>
  );
}
