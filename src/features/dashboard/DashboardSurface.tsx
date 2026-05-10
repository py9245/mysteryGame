import Link from "next/link";
import type { CurrentViewer } from "@/contracts/account";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";

function formatRank(rank: number | null): string {
  return rank === null ? "-" : `${rank}위`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function DashboardSurface({ viewer }: { viewer: CurrentViewer | null }) {
  const accountViewer = viewer?.kind === "account" ? viewer.account : null;
  const displayNickname = viewer?.nickname ?? "Guest";

  return (
    <main className="page-shell home-page-shell">
      <section className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">메인 대시보드</p>
            <h1 className="page-title">환영합니다, {displayNickname}</h1>
            <p className="page-kicker">
              현재 기록을 확인한 뒤 게임을 시작하면, 방 입장 또는 방 만들기 페이지로 바로 넘어갑니다.
            </p>
          </div>
          <div className="header-actions">
            <Link className="button-primary button-compact" href="/rooms">
              게임 시작하기
            </Link>
            <RulebookLauncher label="룰북" compact scope="main" />
          </div>
        </div>
      </section>

      <section className="home-hero-layout">
        <article className="panel panel-accent home-hero-main">
          <div className="composer-header">
            <div>
              <h2 className="panel-title">지금 바로 한 판 시작할 수 있습니다</h2>
              <p className="panel-copy">
                게임 시작 버튼을 누르면 방 입장과 방 만들기 중 하나를 고르고, 성공 즉시 대기방으로 이동합니다.
              </p>
            </div>
            <span className="status-badge" data-tone={accountViewer ? "live" : "alert"}>
              {accountViewer ? "계정 연결됨" : "게스트 플레이"}
            </span>
          </div>

          <div className="metric-grid home-identity-summary">
            <article className="metric-card metric-card-emphasis">
              <span className="metric-label">현재 플레이어</span>
              <strong className="metric-value">{displayNickname}</strong>
              <span className="metric-detail">
                {accountViewer
                  ? "로그인된 계정 기준으로 전적과 최근 기록이 이어집니다."
                  : "게스트 상태로 바로 플레이할 수 있습니다."}
              </span>
            </article>
            <article className="metric-card">
              <span className="metric-label">게임 시작 흐름</span>
              <strong className="metric-value">입장 · 만들기 · 대기방</strong>
              <span className="metric-detail">대시보드 다음 단계는 게임 시작 페이지입니다.</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">{accountViewer ? "내 전적" : "로그인 혜택"}</span>
              <strong className="metric-value">
                {accountViewer ? `${accountViewer.stats.wins}승 ${accountViewer.stats.losses}패` : "기록 저장 가능"}
              </strong>
              <span className="metric-detail">
                {accountViewer
                  ? `평균 ${formatRank(accountViewer.stats.averageRank)} · 승률 ${formatPercentage(accountViewer.stats.winRate)}`
                  : "로그인하면 승패와 최근 기록이 같은 계정에 누적됩니다."}
              </span>
            </article>
          </div>

          <div className="home-hero-actions">
            <Link className="button-primary" href="/rooms">
              게임 시작하기
            </Link>
            <a className="button-secondary" href="#dashboard-records">
              내 기록 보기
            </a>
          </div>
        </article>

        <aside className="home-side-stack">
          <article className="panel home-action-card">
            <div className="composer-header">
              <div>
                <h2 className="panel-title">페이지 구조</h2>
                <p className="panel-copy">메인, 방 페이지, 대기방, 게임중 화면을 분리했습니다.</p>
              </div>
            </div>
            <ul className="surface-list">
              <li className="history-item">
                <strong>메인 대시보드</strong>
                <p className="roster-meta">현재 계정 상태와 최근 기록, 주요 이동 버튼</p>
              </li>
              <li className="history-item">
                <strong>게임 시작</strong>
                <p className="roster-meta">방 입장과 방 만들기 중 하나를 선택</p>
              </li>
              <li className="history-item">
                <strong>대기방 / 게임중</strong>
                <p className="roster-meta">참가자 확인, 채팅, 준비 완료, 팀 배정, 진행</p>
              </li>
            </ul>
          </article>
        </aside>
      </section>

      <section className="panel panel-muted" id="dashboard-records">
        <div className="composer-header">
          <div>
            <h2 className="panel-title">내 기록</h2>
            <p className="panel-copy">
              {accountViewer
                ? `${accountViewer.email} 계정으로 저장된 기록입니다.`
                : "로그인하면 이 영역에 최근 기록과 전적이 표시됩니다."}
            </p>
          </div>
          <span className="status-badge" data-tone={accountViewer ? "live" : "alert"}>
            {accountViewer ? "기록 연결됨" : "게스트"}
          </span>
        </div>

        {accountViewer ? (
          <>
            <div className="metric-grid">
              <article className="metric-card metric-card-emphasis">
                <span className="metric-label">승패</span>
                <strong className="metric-value">
                  {accountViewer.stats.wins}승 {accountViewer.stats.losses}패
                </strong>
                <span className="metric-detail">승률 {formatPercentage(accountViewer.stats.winRate)}</span>
              </article>
              <article className="metric-card">
                <span className="metric-label">평균 순위</span>
                <strong className="metric-value">{formatRank(accountViewer.stats.averageRank)}</strong>
                <span className="metric-detail">최고 {formatRank(accountViewer.stats.bestRank)}</span>
              </article>
              <article className="metric-card">
                <span className="metric-label">참여 판수</span>
                <strong className="metric-value">{accountViewer.stats.gamesPlayed}</strong>
                <span className="metric-detail">정답 {accountViewer.stats.solvedCount}회</span>
              </article>
            </div>

            {accountViewer.recentResults.length > 0 ? (
              <ul className="surface-list history-list">
                {accountViewer.recentResults.slice(0, 3).map((result) => (
                  <li key={result.id} className="history-item">
                    <div className="history-top">
                      <strong>{result.roomCode ?? "기록"}</strong>
                      <span className="status-badge" data-tone={result.isWinner ? "live" : "alert"}>
                        {result.isWinner ? "승리" : "패배"}
                      </span>
                    </div>
                    <div className="meta-row">
                      <span>순위 {formatRank(result.finalRank)}</span>
                      <span>총점 {result.totalScore ?? "-"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="message-note">아직 누적된 경기 기록이 없습니다.</p>
            )}
          </>
        ) : (
          <div className="action-row">
            <Link className="button-primary" href="/rooms">
              게임 시작하기
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
