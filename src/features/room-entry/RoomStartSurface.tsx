import Link from "next/link";
import type { CurrentViewer } from "@/contracts/account";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";

function formatRank(rank: number | null): string {
  return rank === null ? "-" : `${rank}위`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function RoomStartSurface({ viewer }: { viewer: CurrentViewer | null }) {
  const accountViewer = viewer?.kind === "account" ? viewer.account : null;
  const displayNickname = viewer?.nickname ?? "게스트";

  return (
    <main className="page-shell home-page-shell">
      <section className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">게임 시작</p>
            <h1 className="page-title">어떻게 들어갈지 먼저 고릅니다</h1>
            <p className="page-kicker">
              초대 코드를 알고 있으면 바로 입장하고, 아니면 공개방을 찾거나 직접 방을 만들어 대기방으로 들어갑니다.
            </p>
          </div>
          <div className="header-actions">
            <Link className="button-secondary button-compact" href="/">
              메인
            </Link>
            <RulebookLauncher label="룰북" compact scope="main" />
          </div>
        </div>
      </section>

      <section className="home-hero-layout">
        <article className="panel panel-accent home-hero-main">
          <div className="composer-header">
            <div>
              <h2 className="panel-title">현재 플레이어</h2>
              <p className="panel-copy">방을 만들거나 입장하면 성공 즉시 대기방으로 이동합니다.</p>
            </div>
            <span className="status-badge" data-tone={accountViewer ? "live" : "alert"}>
              {accountViewer ? "계정 연결됨" : "게스트 플레이"}
            </span>
          </div>

          <div className="metric-grid home-identity-summary">
            <article className="metric-card metric-card-emphasis">
              <span className="metric-label">플레이어</span>
              <strong className="metric-value">{displayNickname}</strong>
              <span className="metric-detail">
                {accountViewer
                  ? "전적과 최근 기록이 이 계정에 누적됩니다."
                  : "게스트는 이 브라우저 기준으로 바로 플레이합니다."}
              </span>
            </article>
            <article className="metric-card">
              <span className="metric-label">방 입장</span>
              <strong className="metric-value">코드 입력 · 공개방 선택</strong>
              <span className="metric-detail">이미 열려 있는 방에 합류해서 바로 대기방으로 들어갑니다.</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">방 만들기</span>
              <strong className="metric-value">공개방 · 비밀방 · 연습방</strong>
              <span className="metric-detail">방을 열자마자 방장으로 자동 입장합니다.</span>
            </article>
          </div>
        </article>

        <aside className="home-side-stack">
          <article className="panel home-action-card">
            <div className="composer-header">
              <div>
                <h2 className="panel-title">방 입장</h2>
                <p className="panel-copy">입장 코드 입력이나 공개방 선택으로 바로 대기방으로 갑니다.</p>
              </div>
            </div>
            <div className="action-row">
              <Link className="button-primary" href="/rooms/join">
                방 입장하기
              </Link>
            </div>
          </article>

          <article className="panel panel-muted home-action-card">
            <div className="composer-header">
              <div>
                <h2 className="panel-title">방 만들기</h2>
                <p className="panel-copy">방 종류와 제목을 정하고 바로 대기방을 엽니다.</p>
              </div>
            </div>
            <div className="action-row">
              <Link className="button-primary" href="/rooms/create">
                새 방 만들기
              </Link>
            </div>
          </article>
        </aside>
      </section>

      <section className="panel panel-muted">
        <div className="composer-header">
          <div>
            <h2 className="panel-title">내 대시보드 요약</h2>
            <p className="panel-copy">
              {accountViewer
                ? `${accountViewer.email} 계정 기준 상태입니다.`
                : "게스트 상태라 전적은 저장되지 않지만 바로 플레이는 가능합니다."}
            </p>
          </div>
        </div>

        <div className="metric-grid">
          <article className="metric-card">
            <span className="metric-label">승패</span>
            <strong className="metric-value">
              {accountViewer ? `${accountViewer.stats.wins}승 ${accountViewer.stats.losses}패` : "-"}
            </strong>
            <span className="metric-detail">
              {accountViewer ? `승률 ${formatPercentage(accountViewer.stats.winRate)}` : "로그인하면 전적이 저장됩니다."}
            </span>
          </article>
          <article className="metric-card">
            <span className="metric-label">평균 순위</span>
            <strong className="metric-value">{accountViewer ? formatRank(accountViewer.stats.averageRank) : "-"}</strong>
            <span className="metric-detail">
              {accountViewer ? `최고 ${formatRank(accountViewer.stats.bestRank)}` : "최근 기록은 메인 대시보드에서 확인할 수 있습니다."}
            </span>
          </article>
          <article className="metric-card">
            <span className="metric-label">참여 판수</span>
            <strong className="metric-value">{accountViewer ? accountViewer.stats.gamesPlayed : 0}</strong>
            <span className="metric-detail">
              {accountViewer ? `정답 ${accountViewer.stats.solvedCount}회` : "첫 판을 시작해 보세요."}
            </span>
          </article>
        </div>
      </section>
    </main>
  );
}
