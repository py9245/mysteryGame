import type { RoomSnapshot } from "@/contracts/api";

export function RedactedPlayerRow({ snapshot }: { snapshot: RoomSnapshot }) {
  const reason = snapshot.redacted.otherPlayers.reason;
  return (
    <div
      className="uiux-realtime-redacted-row"
      role="note"
      aria-label="가려진 플레이어 정보"
      title={`다른 플레이어 정보 — ${reason}`}
    >
      <span>다른 플레이어 정보 — {reason}</span>
    </div>
  );
}
