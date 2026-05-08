import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function PersonalScoreBreakdown({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="panel panel-muted">
      <h3 className="panel-title">내 점수 분석</h3>
      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">누적 점수</span>
          <strong className="metric-value">{snapshot.me.totalScore}</strong>
          <span className="metric-detail">세 스테이지 전체 기준</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">현재 스테이지</span>
          <strong className="metric-value">{snapshot.me.stageScore}</strong>
          <span className="metric-detail">이번 사건에서 반영된 값</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">정답 성공</span>
          <strong className="metric-value">{snapshot.me.solvedCount}</strong>
          <span className="metric-detail">개인 기준 누적</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">보너스 키워드</span>
          <strong className="metric-value">{snapshot.me.bonusKeywordCount}</strong>
          <span className="metric-detail">정확도 보너스 반영</span>
        </article>
      </div>
    </section>
  );
}
