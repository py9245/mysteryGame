import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { PrivacyMask } from "@/components/privacy/PrivacyMask";
import { RoomStatusBadge } from "@/components/lobby/RoomStatusBadge";
import { ReadyPanel } from "@/components/lobby/ReadyPanel";

export function LobbyShell({
  snapshot,
  isSubmitting = false,
  isHostActionSubmitting = false,
  errorMessage = null,
  statusMessage = null,
  onToggleReady,
  onAssignTeams,
  onStartStage,
}: {
  snapshot: RoomSnapshot;
  isSubmitting?: boolean;
  isHostActionSubmitting?: boolean;
  errorMessage?: string | null;
  statusMessage?: string | null;
  onToggleReady?: () => void;
  onAssignTeams?: () => void;
  onStartStage?: () => void;
}) {
  const isHost = snapshot.me.role === "host" || snapshot.me.role === "admin";
  const playerCount = snapshot.players.length;
  const readyCount = snapshot.players.filter((player) => player.isReady).length;
  const isRoomFull = playerCount >= snapshot.room.maxPlayers;
  const canAssignTeams =
    isHost &&
    snapshot.room.status === "ready" &&
    isRoomFull &&
    snapshot.currentAssignments.length === 0;
  const canStartStage =
    isHost &&
    snapshot.room.status === "assigning" &&
    snapshot.currentAssignments.length === snapshot.room.maxPlayers;

  return (
    <section className="page-shell">
      <header className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">현재 상태</p>
            <h2 className="page-title">대기실</h2>
            <div className="header-flow">
              <p className="header-flow-line">
                <strong>핵심 설명</strong> · 준비 상태와 방장 진행만 먼저 확인합니다.
              </p>
              <p className="header-flow-line" data-tone="action">
                <strong>다음 행동</strong> · 준비 완료 후 방장이 팀 배정과 브리핑을 엽니다.
              </p>
            </div>
          </div>
          <div className="header-actions">
            <RulebookLauncher label="룰북" compact scope="lobby" />
          </div>
        </div>
      </header>
      <div className="panel-grid">
        <section className="panel panel-accent span-7">
          <RoomStatusBadge viewMode={snapshot.viewMode} />
          <ReadyPanel
            me={snapshot.me}
            viewMode={snapshot.viewMode}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            statusMessage={statusMessage}
            onToggleReady={onToggleReady}
          />
          {isHost ? (
            <section className="panel panel-muted lobby-host-panel">
              <div className="composer-header">
                <div>
                  <h3 className="panel-title">방장 진행 제어</h3>
                  <p className="panel-copy">전원 준비 후 팀을 나누고 바로 브리핑으로 넘어갑니다.</p>
                </div>
                <span className="status-badge">방장</span>
              </div>
              <div className="metric-grid">
                <article className="metric-card">
                  <span className="metric-label">참가 인원</span>
                  <strong className="metric-value">
                    {playerCount}/{snapshot.room.maxPlayers}
                  </strong>
                  <span className="metric-detail">정원이 모두 차야 팀 배정을 시작할 수 있습니다.</span>
                </article>
                <article className="metric-card">
                  <span className="metric-label">준비 완료</span>
                  <strong className="metric-value">
                    {readyCount}/{snapshot.room.maxPlayers}
                  </strong>
                  <span className="metric-detail">전원이 준비되어야 다음 단계로 넘어갑니다.</span>
                </article>
              </div>
              <div className="action-row">
                <button
                  className="button-primary"
                  type="button"
                  onClick={onAssignTeams}
                  disabled={!canAssignTeams || isHostActionSubmitting}
                >
                  {isHostActionSubmitting && canAssignTeams ? "팀 배정 중..." : "팀 배정 시작"}
                </button>
                <button
                  className="button-secondary"
                  type="button"
                  onClick={onStartStage}
                  disabled={!canStartStage || isHostActionSubmitting}
                >
                  {isHostActionSubmitting && canStartStage ? "브리핑 준비 중..." : "브리핑 시작"}
                </button>
              </div>
            </section>
          ) : null}
        </section>
        <section className="span-5">
          <PrivacyMask snapshot={snapshot} />
        </section>
      </div>
    </section>
  );
}
