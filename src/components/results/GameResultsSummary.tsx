import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function GameResultsSummary({ snapshot }: { snapshot: RoomSnapshot }) {
  const ranking = snapshot.results?.finalRanking ?? [];
  const myRank =
    ranking.findIndex((entry) => entry.playerId === snapshot.me.playerId) >= 0
      ? ranking.findIndex((entry) => entry.playerId === snapshot.me.playerId) + 1
      : null;

  return (
    <section className="panel panel-accent">
      <h3 className="panel-title">최종 요약</h3>
      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">내 순위</span>
          <strong className="metric-value">{myRank ? `${myRank}위` : "-"}</strong>
          <span className="metric-detail">최종 누적 점수 기준</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">내 점수</span>
          <strong className="metric-value">{snapshot.me.totalScore}</strong>
          <span className="metric-detail">전체 스테이지 합산</span>
        </article>
      </div>
    </section>
  );
}
