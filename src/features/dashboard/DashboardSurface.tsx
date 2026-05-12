import Link from "next/link";
import type { CurrentViewer } from "@/contracts/account";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";

function formatRank(rank: number | null): string {
  return rank === null ? "-" : `${rank}위`;
}

export function DashboardSurface({ viewer }: { viewer: CurrentViewer | null }) {
  const accountViewer = viewer?.kind === "account" ? viewer.account : null;
  const displayNickname = viewer?.nickname ?? "게스트";
  const hasStats = accountViewer && accountViewer.stats.gamesPlayed > 0;

  return (
    <main className="mt-splash-root">
      <div className="mt-splash-inner">
        <header className="mt-splash-header">
          <p className="mt-splash-eyebrow">MYSTERY TIME · 탐정국</p>
          <h1 className="mt-splash-title">
            사건을<br />해결하라.
          </h1>
          <p className="mt-splash-sub">
            <span className="mt-splash-player">{displayNickname}</span>
            <span className="mt-splash-divider">·</span>
            {accountViewer ? (
              <span className="mt-splash-stats">
                {accountViewer.stats.wins}승 {accountViewer.stats.losses}패 · {accountViewer.stats.gamesPlayed}판 참여
              </span>
            ) : (
              <span className="mt-splash-stats">게스트 플레이</span>
            )}
          </p>
        </header>

        <div className="mt-splash-actions">
          <Link className="button-primary mt-splash-primary" href="/rooms">
            사건 시작
          </Link>
          <Link className="button-secondary" href="/rooms/join">
            코드 입장
          </Link>
          <Link className="button-secondary" href="/rooms/create">
            방 만들기
          </Link>
        </div>

        <div className="mt-splash-utility">
          <RulebookLauncher label="룰북" compact scope="main" />
          {accountViewer ? (
            <span className="status-badge" data-tone="live">계정 연결됨</span>
          ) : (
            <span className="status-badge" data-tone="alert">게스트 모드</span>
          )}
        </div>

        {hasStats && (
          <div className="mt-splash-metrics">
            <div className="metric-card mt-splash-metric">
              <span className="metric-label">승패</span>
              <strong className="metric-value">{accountViewer.stats.wins}W · {accountViewer.stats.losses}L</strong>
            </div>
            <div className="metric-card mt-splash-metric">
              <span className="metric-label">승률</span>
              <strong className="metric-value">{accountViewer.stats.winRate.toFixed(0)}%</strong>
            </div>
            <div className="metric-card mt-splash-metric">
              <span className="metric-label">최고 순위</span>
              <strong className="metric-value">{formatRank(accountViewer.stats.bestRank)}</strong>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
