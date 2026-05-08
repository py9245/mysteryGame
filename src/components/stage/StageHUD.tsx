import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function StageHUD({ snapshot }: { snapshot: RoomSnapshot }) {
  const stage = snapshot.stage;
  if (!stage) {
    return <div className="panel">아직 스테이지가 열리지 않았습니다.</div>;
  }

  return (
    <section className="panel panel-accent">
      <div className="chip-row">
        <span className="status-badge" data-tone="live">스테이지 {stage.stageNumber}</span>
        <span className="status-badge">공용 타이머 진행 중</span>
      </div>
      <h3 className="panel-title">{stage.publicTitle}</h3>
      <p className="panel-copy">{stage.publicDescription}</p>
      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">남은 시간</span>
          <strong className="metric-value">{stage.remainingSeconds}s</strong>
          <span className="metric-detail">공용 타이머 기준</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">내 현재 점수</span>
          <strong className="metric-value">{snapshot.me.stageScore}</strong>
          <span className="metric-detail">낮을수록 유리</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">정답 성공</span>
          <strong className="metric-value">{snapshot.me.solvedCount}</strong>
          <span className="metric-detail">개인 누적 기준</span>
        </article>
      </div>
    </section>
  );
}
