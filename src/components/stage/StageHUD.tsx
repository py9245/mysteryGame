import type { RoomSnapshot } from "@/contracts/api";

export function StageHUD({ snapshot }: { snapshot: RoomSnapshot }) {
  const stage = snapshot.stage;
  if (!stage) {
    return (
      <section className="panel panel-accent">
        <h3 className="panel-title">스테이지 대기</h3>
        <p className="panel-copy">아직 사건이 열리지 않았습니다. 브리핑이 시작되면 여기에 핵심 정보가 들어옵니다.</p>
      </section>
    );
  }

  return (
    <section className="panel panel-accent stage-hud">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">{stage.publicTitle}</h3>
          <p className="panel-copy">{stage.publicDescription}</p>
        </div>
        <div className="chip-row">
          <span className="status-badge" data-tone="live">스테이지 {stage.stageNumber}</span>
          <span className="status-badge">공용 타이머</span>
        </div>
      </div>
      <div className="metric-grid stage-hud-grid">
        <article className="metric-card metric-card-emphasis">
          <span className="metric-label">남은 시간</span>
          <strong className="metric-value">{stage.remainingSeconds}s</strong>
          <span className="metric-detail">시간이 끝나면 스테이지가 종료됩니다.</span>
        </article>
        <article className="metric-card metric-card-emphasis">
          <span className="metric-label">내 점수</span>
          <strong className="metric-value">{snapshot.me.stageScore}</strong>
          <span className="metric-detail">스테이지 내 개인 누적</span>
        </article>
        <article className="metric-card metric-card-emphasis">
          <span className="metric-label">정답 성공</span>
          <strong className="metric-value">{snapshot.me.solvedCount}</strong>
          <span className="metric-detail">개인 누적 기준</span>
        </article>
      </div>
      <p className="message-note">지금 필요한 행동은 조사실 진입, 질문 정리, 정답 확인입니다.</p>
    </section>
  );
}
