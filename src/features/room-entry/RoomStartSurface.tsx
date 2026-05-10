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
  const playerStateLabel = accountViewer ? "전적 저장 중" : "게스트 즉시 플레이";

  return (
    <main className="page-shell home-page-shell mt-product-home">
      <section className="page-header mt-hero-header">
        <div className="header-top-row">
          <div className="mt-hero-copy">
            <p className="eyebrow">Game Lobby</p>
            <h1 className="page-title">게임 시작</h1>
            <p className="page-kicker">이 페이지에서는 딱 세 가지만 고르면 됩니다. 코드로 들어가기, 열린 방 선택, 새 방 만들기.</p>
          </div>
          <div className="header-actions">
            <Link className="button-secondary button-compact" href="/">
              메인
            </Link>
            <RulebookLauncher label="룰북" compact scope="main" />
          </div>
        </div>
      </section>

      <section className="panel panel-accent">
        <div className="composer-header">
          <div>
            <h2 className="panel-title">현재 플레이어</h2>
            <p className="panel-copy">누구로 플레이하는지 먼저 확인하고, 아래 세 가지 경로 중 하나를 선택하세요.</p>
          </div>
          <span className="room-code-chip">{displayNickname}</span>
        </div>
        <div className="metric-grid">
          <article className="metric-card metric-card-emphasis">
            <span className="metric-label">이름</span>
            <strong className="metric-value">{displayNickname}</strong>
            <span className="metric-detail">{playerStateLabel}</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">승패</span>
            <strong className="metric-value">
              {accountViewer ? `${accountViewer.stats.wins}승 ${accountViewer.stats.losses}패` : "-"}
            </strong>
            <span className="metric-detail">
              {accountViewer ? `평균 ${formatRank(accountViewer.stats.averageRank)} · 승률 ${formatPercentage(accountViewer.stats.winRate)}` : "로그인하면 누적"}
            </span>
          </article>
        </div>
      </section>

      <section className="panel-grid">
        <article className="panel panel-accent span-4">
          <div className="composer-header">
            <div>
              <h2 className="panel-title">1. 코드로 입장</h2>
              <p className="panel-copy">초대 코드가 있다면 가장 빠른 경로입니다.</p>
            </div>
            <span className="status-badge" data-tone="live">빠름</span>
          </div>
          <p className="panel-copy">입장 코드를 직접 입력하고, 비밀방이라면 비밀번호도 함께 넣어 바로 대기방으로 이동합니다.</p>
          <div className="action-row">
            <Link className="button-primary" href="/rooms/join#quick-join">
              코드 입력
            </Link>
          </div>
        </article>

        <article className="panel span-4">
          <div className="composer-header">
            <div>
              <h2 className="panel-title">2. 열린 방 선택</h2>
              <p className="panel-copy">공개방 목록에서 빈자리가 있는 방을 고릅니다.</p>
            </div>
            <span className="status-badge">공개방</span>
          </div>
          <p className="panel-copy">정원이 남은 방은 바로 입장할 수 있고, 비밀방이면 비밀번호 확인 모달이 열립니다.</p>
          <div className="action-row">
            <Link className="button-secondary" href="/rooms/join#open-rooms">
              열린 방 보기
            </Link>
          </div>
        </article>

        <article className="panel panel-muted span-4">
          <div className="composer-header">
            <div>
              <h2 className="panel-title">3. 새 방 만들기</h2>
              <p className="panel-copy">직접 사건방을 열고 바로 방장으로 들어갑니다.</p>
            </div>
            <span className="status-badge">호스트</span>
          </div>
          <p className="panel-copy">공개방, 비밀방, 연습방 중 하나를 열고 생성 성공 즉시 자동으로 대기방에 입장합니다.</p>
          <div className="action-row">
            <Link className="button-primary" href="/rooms/create#create-room">
              방 만들기
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
