import Link from "next/link";
import type { RoomSnapshot } from "@/contracts/api";
import { AnimatedCountUp } from "./AnimatedCountUp";

export function GameResultsSummary({ snapshot }: { snapshot: RoomSnapshot }) {
  const ranking = snapshot.results?.finalRanking ?? [];
  const myRankIndex = ranking.findIndex((entry) => entry.playerId === snapshot.me.playerId);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  const totalPlayers = ranking.length;
  const totalSolved = snapshot.me.solvedCount;
  const champion = ranking[0] ?? null;
  const championPlayer =
    champion != null
      ? snapshot.players.find((player) => player.playerId === champion.playerId)
      : null;
  const championName = championPlayer?.nickname ?? "익명 탐정";
  const championIsMe = champion?.playerId === snapshot.me.playerId;
  const championScore =
    typeof champion?.total === "number" ? champion.total : null;

  return (
    <section className="panel panel-accent track-d-game-summary">
      <div className="composer-header">
        <div>
          <p className="eyebrow">최종 결과</p>
          <h3 className="panel-title">이번 판 내 성적</h3>
          <p className="panel-copy">이번 판에서 받은 점수와 순위를 먼저 정리합니다.</p>
          <p className="message-note">다음 상태: 홈에서 전적과 기록을 확인합니다.</p>
        </div>
        <span className="status-badge" data-tone="live">
          게임 종료
        </span>
      </div>

      {champion ? (
        <article className="uiux-results-champion" aria-label="이번 판 최고 탐정">
          <div className="uiux-results-champion-body">
            <span className="uiux-results-champion-eyebrow">이번 판 최고 탐정</span>
            <strong className="uiux-results-champion-name">
              {championName}
              {championIsMe ? (
                <span className="track-d-ranking-mine-badge" style={{ marginLeft: 10 }}>
                  나
                </span>
              ) : null}
            </strong>
            <span className="uiux-results-champion-detail">
              {championScore != null
                ? `최종 ${championScore}점 · 누적 1위 달성`
                : "누적 1위 달성"}
            </span>
          </div>
          <span className="uiux-results-champion-trophy" aria-hidden="true">
            1
          </span>
        </article>
      ) : null}

      <div className="metric-grid track-d-game-summary-grid">
        <article className="metric-card metric-card-emphasis">
          <span className="metric-label">내 순위</span>
          <strong className="metric-value num-tabular">
            {myRank ? `${myRank}위` : "-"}
            {totalPlayers > 0 && myRank ? (
              <span className="track-d-rank-suffix">/{totalPlayers}</span>
            ) : null}
          </strong>
          <span className="metric-detail">최종 누적 점수 기준</span>
        </article>
        <article className="metric-card metric-card-emphasis">
          <span className="metric-label">내 점수</span>
          <strong className="metric-value">
            <AnimatedCountUp value={snapshot.me.totalScore} durationMs={1200} />
          </strong>
          <span className="metric-detail">전체 스테이지 합산</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">정답 성공</span>
          <strong className="metric-value">
            <AnimatedCountUp value={totalSolved} durationMs={800} />
          </strong>
          <span className="metric-detail">이번 판 누적</span>
        </article>
      </div>
      <div className="action-row track-d-game-summary-actions">
        <Link className="button-primary" href="/">
          홈으로 돌아가기
        </Link>
        <Link className="button-secondary" href="/#my-records">
          전적 보기
        </Link>
      </div>
    </section>
  );
}
