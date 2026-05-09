import Link from "next/link";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function GameResultsSummary({ snapshot }: { snapshot: RoomSnapshot }) {
  const ranking = snapshot.results?.finalRanking ?? [];
  const myRank =
    ranking.findIndex((entry) => entry.playerId === snapshot.me.playerId) >= 0
      ? ranking.findIndex((entry) => entry.playerId === snapshot.me.playerId) + 1
      : null;

  return (
    <section className="panel panel-accent">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">최종 결과</h3>
          <p className="panel-copy">이번 판의 최종 순위와 내 점수만 먼저 확인합니다.</p>
          <p className="message-note">다음 상태: 홈에서 전적과 기록을 확인합니다.</p>
        </div>
        <span className="status-badge" data-tone="live">
          게임 종료
        </span>
      </div>
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
      <div className="action-row" style={{ marginTop: 16 }}>
        <Link className="button-primary" href="/">홈으로</Link>
        <Link className="button-secondary" href="/#my-records">전적 보기</Link>
      </div>
    </section>
  );
}
