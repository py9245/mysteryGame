import type { RoomSnapshot } from "@/contracts/api";

export function MyScoreCard({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="score-card">
      <span className="metric-label">내 누적 점수</span>
      <strong className="score-value">{snapshot.me.totalScore}</strong>
      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">이번 스테이지</span>
          <span className="metric-value">{snapshot.me.stageScore}</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">정답 성공</span>
          <span className="metric-value">{snapshot.me.solvedCount}</span>
        </article>
      </div>
    </section>
  );
}
