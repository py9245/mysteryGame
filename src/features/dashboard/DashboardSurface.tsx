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
  const winLossLabel = accountViewer
    ? `${accountViewer.stats.wins}승 ${accountViewer.stats.losses}패`
    : "게스트 플레이";

  return (
    <main className="page-shell home-page-shell mt-product-home">
      <section className="page-header mt-hero-header">
        <div className="header-top-row">
          <div className="mt-hero-copy">
            <p className="eyebrow dashboard-eyebrow">Mystery Time</p>
            <h1 className="page-title dashboard-page-title">{displayNickname}님, 환영합니다.</h1>
            <p className="page-kicker dashboard-page-kicker">
              기록을 확인하고, 바로 게임을 시작하거나, 초대 코드로 합류할 수 있습니다.
            </p>
          </div>
          <div className="header-actions">
            <Link className="button-primary button-compact" href="/rooms">
              게임 시작
            </Link>
            <RulebookLauncher label="룰북" compact scope="main" />
          </div>
        </div>
      </section>

      <section className="panel-grid">
        <article className="panel panel-accent span-8">
          <div className="composer-header">
            <div>
              <h2 className="panel-title">바로 시작</h2>
              <p className="panel-copy">지금 가장 많이 쓰는 동선만 남겼습니다. 게임 시작 페이지에서 방 입장, 공개방 확인, 방 만들기를 고를 수 있습니다.</p>
            </div>
            <span className="status-badge" data-tone={accountViewer ? "live" : "alert"}>
              {accountViewer ? "계정 연결" : "게스트"}
            </span>
          </div>
          <div className="metric-grid">
            <article className="metric-card metric-card-emphasis">
              <span className="metric-label">플레이어</span>
              <strong className="metric-value">{displayNickname}</strong>
              <span className="metric-detail">{accountViewer ? "닉네임과 기록 유지" : "바로 플레이 가능"}</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">현재 상태</span>
              <strong className="metric-value">{accountViewer ? "로그인" : "게스트"}</strong>
              <span className="metric-detail">{accountViewer ? accountViewer.email : "로그인하면 전적 저장"}</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">최근 전적</span>
              <strong className="metric-value">{winLossLabel}</strong>
              <span className="metric-detail">{accountViewer ? `평균 ${formatRank(accountViewer.stats.averageRank)}` : "기록 미저장"}</span>
            </article>
          </div>
          <div className="action-row">
            <Link className="button-primary" href="/rooms">
              게임 시작하기
            </Link>
            <Link className="button-secondary" href="/rooms/join">
              코드로 입장
            </Link>
            <Link className="button-secondary" href="/rooms/create">
              방 만들기
            </Link>
          </div>
        </article>

        <article className="panel span-4">
          <div className="composer-header">
            <div>
              <h2 className="panel-title">빠른 안내</h2>
              <p className="panel-copy">첫 진입 흐름은 단순합니다.</p>
            </div>
            <span className="status-badge">3단계</span>
          </div>
          <ul className="surface-list">
            <li className="history-item">
              <strong>1. 게임 시작 페이지로 이동</strong>
              <p className="panel-copy">메인 CTA를 누르면 바로 방 관련 페이지로 들어갑니다.</p>
            </li>
            <li className="history-item">
              <strong>2. 입장 또는 생성</strong>
              <p className="panel-copy">초대 코드가 있으면 입장, 없다면 방을 만들면 됩니다.</p>
            </li>
            <li className="history-item">
              <strong>3. 대기방에서 바로 준비</strong>
              <p className="panel-copy">입장 후에는 대기방으로 자동 이동해 참가자/채팅/시작만 보게 됩니다.</p>
            </li>
          </ul>
        </article>
      </section>

      <section className="panel panel-muted mt-record-panel" id="dashboard-records">
        <div className="composer-header">
          <div>
            <h2 className="panel-title">내 대시보드</h2>
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
