import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function StageResultsSummary({ snapshot }: { snapshot: RoomSnapshot }) {
  const solvedCount = snapshot.stage?.solvedPlayerIds.length ?? 0;

  return (
    <section className="panel panel-accent">
      <h3 className="panel-title">스테이지 요약</h3>
      <p className="panel-copy">{snapshot.stage?.publicTitle ?? "결과 집계 전"}</p>
      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">성공 인원</span>
          <strong className="metric-value">{solvedCount}명</strong>
          <span className="metric-detail">정답 확정 기준</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">내 단계 점수</span>
          <strong className="metric-value">{snapshot.me.stageScore}</strong>
          <span className="metric-detail">이번 스테이지 반영값</span>
        </article>
      </div>
    </section>
  );
}
