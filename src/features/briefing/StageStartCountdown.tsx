import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function StageStartCountdown({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <article className="metric-card metric-card-emphasis">
      <span className="metric-label">시작 전 카운트</span>
      <strong className="metric-value">{snapshot.stage?.remainingSeconds ?? 0}s</strong>
      <span className="metric-detail">브리핑 종료 후 조사 단계로 넘어갑니다.</span>
    </article>
  );
}
