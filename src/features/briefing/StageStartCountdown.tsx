import type { RoomSnapshot } from "@/contracts/api";

export function StageStartCountdown({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <article className="metric-card metric-card-emphasis">
      <span className="metric-label">질문방 열림까지</span>
      <strong className="metric-value">{snapshot.stage?.remainingSeconds ?? 0}s</strong>
      <span className="metric-detail">1분 브리핑이 끝나면 질문방과 시간 점수가 시작됩니다.</span>
    </article>
  );
}
