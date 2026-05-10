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
  const displayNickname = viewer?.nickname ?? "게스트";

  return (
    <main className="page-shell home-page-shell mt-product-home">
      <section className="page-header mt-hero-header">
        <div className="header-top-row">
          <div className="mt-hero-copy">
            <p className="eyebrow">Mystery Time</p>
            <h1 className="page-title">{displayNickname}님, 사건이 열렸습니다.</h1>
            <p className="page-kicker">코드로 합류하거나 새 방을 열어 바로 대기실로 이동하세요.</p>
          </div>
          <div className="header-actions">
            <Link className="button-primary button-compact" href="/rooms">
              게임 시작
            </Link>
            <RulebookLauncher label="룰북" compact scope="main" />
          </div>
        </div>
      </section>

      <section className="home-hero-layout mt-home-stage">
        <article className="panel panel-accent home-hero-main mt-command-card">
          <div className="mt-command-topline">
            <span className="status-badge" data-tone={accountViewer ? "live" : "alert"}>
              {accountViewer ? "계정 연결" : "게스트"}
            </span>
            <span className="room-code-chip">{displayNickname}</span>
          </div>
          <div className="mt-command-body">
            <h2 className="mt-command-title">첫 클릭은 하나면 충분합니다.</h2>
            <p className="panel-copy">방 찾기, 코드 입장, 방 만들기를 한 화면에서 끝냅니다.</p>
          </div>
          <div className="home-hero-actions">
            <Link className="button-primary" href="/rooms">
              입장 / 만들기
            </Link>
            {accountViewer ? (
              <a className="button-secondary" href="#dashboard-records">
                내 기록
              </a>
            ) : null}
          </div>
        </article>

        <aside className="home-side-stack mt-action-stack">
          <Link className="panel home-action-card mt-link-card" href="/rooms/join">
            <span className="status-badge" data-tone="live">빠른 입장</span>
            <h2 className="panel-title">초대 코드로 합류</h2>
            <p className="panel-copy">받은 코드가 있다면 바로 대기실로 들어갑니다.</p>
          </Link>
          <Link className="panel panel-muted home-action-card mt-link-card" href="/rooms/create">
            <span className="status-badge">호스트</span>
            <h2 className="panel-title">새 방 만들기</h2>
            <p className="panel-copy">공개방, 비밀방, 연습방을 바로 엽니다.</p>
          </Link>
        </aside>
      </section>

      <section className="panel panel-muted mt-record-panel" id="dashboard-records">
        <div className="composer-header">
          <div>
            <h2 className="panel-title">내 기록</h2>
            <p className="panel-copy">
              {accountViewer ? `${accountViewer.email} 기준 기록입니다.` : "로그인하면 전적이 저장됩니다."}
            </p>
          </div>
          <span className="status-badge" data-tone={accountViewer ? "live" : "alert"}>
            {accountViewer ? "저장됨" : "게스트"}
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
              <p className="message-note">아직 경기 기록이 없습니다.</p>
            )}
          </>
        ) : (
          <div className="action-row">
            <Link className="button-primary" href="/rooms">
              게스트로 시작
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
