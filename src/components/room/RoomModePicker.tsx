type RoomMode = "public" | "secret" | "practice";

const ROOM_MODE_COPY: Record<
  RoomMode,
  {
    title: string;
    body: string;
  }
> = {
  public: {
    title: "공개방",
    body: "입장 코드만 공유하면 누구나 바로 합류할 수 있습니다.",
  },
  secret: {
    title: "비밀방",
    body: "입장 코드와 비밀번호를 함께 맞춰야 들어올 수 있습니다.",
  },
  practice: {
    title: "연습방",
    body: "1인, 1스테이지로만 열리고 외부 참가가 닫혀 있습니다.",
  },
};

export function RoomModePicker({
  value,
  onChange,
}: {
  value: RoomMode;
  onChange: (value: RoomMode) => void;
}) {
  return (
    <div className="room-mode-picker">
      {(["public", "secret", "practice"] as RoomMode[]).map((mode) => (
        <button
          key={mode}
          className={value === mode ? "mode-card is-active" : "mode-card"}
          type="button"
          onClick={() => onChange(mode)}
        >
          <strong className="mode-card-title">{ROOM_MODE_COPY[mode].title}</strong>
          <span className="mode-card-copy">{ROOM_MODE_COPY[mode].body}</span>
        </button>
      ))}
    </div>
  );
}
