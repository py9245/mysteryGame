import type { RoomSnapshot } from "@/contracts/api";

export function RedactedField({ snapshot }: { snapshot: RoomSnapshot }) {
  const reason = snapshot.redacted.otherScores.reason;
  return (
    <div
      className="uiux-realtime-redacted"
      role="note"
      aria-label="가려진 정보"
      title={`보호된 정보: ${reason}`}
    >
      <span className="uiux-realtime-redacted-icon" aria-hidden="true">
        L
      </span>
      <span>다른 플레이어 점수 — {reason}</span>
    </div>
  );
}
