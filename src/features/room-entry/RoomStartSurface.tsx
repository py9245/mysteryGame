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
    <main className="page-shell home-page-shell mt-product-home">
      <section className="page-header mt-hero-header">
        <div className="header-top-row">
          <div className="mt-hero-copy">
            <p className="eyebrow">Game Lobby</p>
            <h1 className="page-title">게임 시작</h1>
            <p className="page-kicker">코드 입장, 공개방 찾기, 방 만들기 중 하나만 고르면 됩니다.</p>
          </div>
          <div className="header-actions">
            <Link className="button-secondary button-compact" href="/">
              메인
            </Link>
            <RulebookLauncher label="룰북" compact scope="main" />
          </div>
        </div>
      </section>

      <section className="home-hero-layout mt-home-stage">
        <article className="panel panel-accent home-hero-main mt-command-card">
          <div className="mt-command-topline">
            <span className="status-badge" data-tone={accountViewer ? "live" : "alert"}>
              {accountViewer ? "계정" : "게스트"}
            </span>
            <span className="room-code-chip">{displayNickname}</span>
          </div>
          <div className="mt-command-body">
            <h2 className="mt-command-title">바로 플레이할 준비가 끝났습니다.</h2>
            <p className="panel-copy">초대받았다면 입장, 직접 진행한다면 방 만들기를 선택하세요.</p>
          </div>
          <div className="metric-grid home-identity-summary mt-command-metrics">
            <article className="metric-card metric-card-emphasis">
              <span className="metric-label">플레이어</span>
              <strong className="metric-value">{displayNickname}</strong>
              <span className="metric-detail">{accountViewer ? "전적 저장" : "즉시 플레이"}</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">내 기록</span>
              <strong className="metric-value">
                {accountViewer ? `${accountViewer.stats.wins}승 ${accountViewer.stats.losses}패` : "-"}
              </strong>
              <span className="metric-detail">
                {accountViewer ? `평균 ${formatRank(accountViewer.stats.averageRank)} · 승률 ${formatPercentage(accountViewer.stats.winRate)}` : "로그인하면 저장"}
              </span>
            </article>
          </div>
        </article>

        <aside className="home-side-stack mt-action-stack">
          <Link className="panel home-action-card mt-link-card" href="/rooms/join">
            <span className="status-badge" data-tone="live">참가</span>
            <h2 className="panel-title">방 입장</h2>
            <p className="panel-copy">코드를 입력하거나 열린 방을 선택합니다.</p>
          </Link>
          <Link className="panel panel-muted home-action-card mt-link-card" href="/rooms/create">
            <span className="status-badge">생성</span>
            <h2 className="panel-title">방 만들기</h2>
            <p className="panel-copy">방을 열고 바로 방장으로 입장합니다.</p>
          </Link>
        </aside>
      </section>
    </main>
  );
}
