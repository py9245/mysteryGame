type RoomMode = "public" | "secret" | "practice";

type RoomModeCopy = {
  title: string;
  body: string;
  helper: string;
  icon: string;
  tone: "public" | "secret" | "practice";
};

const ROOM_MODE_COPY: Record<RoomMode, RoomModeCopy> = {
  public: {
    title: "공개방",
    body: "입장 코드만 공유하면 누구나 바로 합류할 수 있습니다.",
    helper: "빠르게 인원 모집",
    icon: "OPEN",
    tone: "public",
  },
  secret: {
    title: "비밀방",
    body: "입장 코드와 비밀번호를 함께 맞춰야 들어올 수 있습니다.",
    helper: "비밀번호 4자 이상",
    icon: "LOCK",
    tone: "secret",
  },
  practice: {
    title: "연습방",
    body: "1인, 1스테이지로만 열리고 외부 참가가 닫혀 있습니다.",
    helper: "혼자 감 잡기",
    icon: "SOLO",
    tone: "practice",
  },
};

const MODE_ORDER: RoomMode[] = ["public", "secret", "practice"];

export function RoomModePicker({
  value,
  onChange,
}: {
  value: RoomMode;
  onChange: (value: RoomMode) => void;
}) {
  return (
    <div className="room-mode-picker track-a-mode-picker" role="radiogroup" aria-label="방 종류 선택">
      {MODE_ORDER.map((mode) => {
        const copy = ROOM_MODE_COPY[mode];
        const isActive = value === mode;

        return (
          <button
            key={mode}
            className={
              isActive
                ? "mode-card track-a-mode-card uiux-home-mode-card is-active"
                : "mode-card track-a-mode-card uiux-home-mode-card"
            }
            type="button"
            role="radio"
            aria-checked={isActive}
            data-tone={copy.tone}
            onClick={() => onChange(mode)}
            aria-label={`${copy.title} — ${copy.helper}`}
          >
            <span className="track-a-mode-card-head">
              <span className="track-a-mode-icon" aria-hidden="true">{copy.icon}</span>
              <strong className="mode-card-title">{copy.title}</strong>
              {isActive ? <span className="track-a-mode-check" aria-hidden="true">선택</span> : null}
            </span>
            <span className="mode-card-copy">{copy.body}</span>
            <span className="track-a-mode-helper">{copy.helper}</span>
          </button>
        );
      })}
    </div>
  );
}
