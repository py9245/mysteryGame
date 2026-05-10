import Link from "next/link";
import type { ChatMessage } from "@/contracts/game";
import type { RoomSnapshot } from "@/contracts/api";
import type { LoadedChatMessages } from "@/features/chat-ui/chat-messages-loader";
import { ChatRailClientShell } from "@/features/chat-ui/ChatRailClientShell";
import { appendRoomContextToHref } from "@/features/room-context/room-context";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { ReadyPanel } from "@/components/lobby/ReadyPanel";
import { LeaveRoomButton } from "@/components/room/LeaveRoomButton";
import { TeamAssignmentBoard } from "@/components/room/TeamAssignmentBoard";
import { PlayerRoster } from "@/components/room/PlayerRoster";

function getRoomStatusLabel(status: string) {
  switch (status) {
    case "ready":
      return "시작 가능";
    case "assigning":
      return "팀 배정 완료";
    case "in_game":
      return "게임 진행 중";
    case "closed":
      return "종료";
    default:
      return "참가자 대기";
  }
}

export function LobbyShell({
  snapshot,
  initialChatMessages,
  initialChatSource,
  chatEndpoint,
  isSubmitting = false,
  isHostActionSubmitting = false,
  errorMessage = null,
  statusMessage = null,
  onToggleReady,
  onAssignTeams,
  onStartStage,
}: {
  snapshot: RoomSnapshot;
  initialChatMessages: ChatMessage[];
  initialChatSource: LoadedChatMessages["source"];
  chatEndpoint: string;
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
  const roomHref = appendRoomContextToHref(`/room/${encodeURIComponent(snapshot.room.code)}`, snapshot);
  const myTeamLabel =
    snapshot.teamSlots.find((slot) => slot.id === snapshot.me.teamSlotId)?.label ?? "팀 배정 전";
  const nextStepMessage = canStartStage
    ? "팀 배정이 끝났습니다. 방장이 시작하기를 누르면 브리핑으로 넘어갑니다."
    : canAssignTeams
      ? "전원이 준비되면 방장이 팀 랜덤 배정을 진행할 수 있습니다."
      : snapshot.me.isReady
        ? "내 준비는 끝났습니다. 다른 참가자의 준비를 기다립니다."
        : "준비 완료를 눌러야 방장이 다음 단계로 넘어갈 수 있습니다.";

  return (
    <section className="page-shell">
      <header className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">대기실</p>
            <h2 className="page-title">방 코드 {snapshot.room.code}</h2>
            <p className="page-kicker">참가자 확인, 채팅, 준비 완료, 팀 랜덤 배정, 시작하기만 여기서 처리합니다.</p>
          </div>
          <div className="header-actions">
            <span className="status-badge" data-tone="live">
              {getRoomStatusLabel(snapshot.room.status)}
            </span>
            <Link className="button-secondary button-compact" href={roomHref}>
              방 현황
            </Link>
            <LeaveRoomButton roomId={snapshot.room.id} playerId={snapshot.me.playerId} />
            <RulebookLauncher label="룰북" compact scope="lobby" />
          </div>
        </div>
      </header>

      <section className="panel panel-accent">
        <div className="composer-header">
          <div>
            <h3 className="panel-title">지금 해야 할 일</h3>
            <p className="panel-copy">{nextStepMessage}</p>
          </div>
          <span className="status-badge" data-tone={snapshot.me.isReady ? "live" : "alert"}>
            {snapshot.me.isReady ? "준비 완료" : "준비 필요"}
          </span>
        </div>
        <div className="metric-grid">
          <article className="metric-card metric-card-emphasis">
            <span className="metric-label">참가 인원</span>
            <strong className="metric-value">
              {playerCount}/{snapshot.room.maxPlayers}
            </strong>
            <span className="metric-detail">정원이 차야 팀 배정을 시작할 수 있습니다.</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">준비 완료</span>
            <strong className="metric-value">
              {readyCount}/{snapshot.room.maxPlayers}
            </strong>
            <span className="metric-detail">전원 준비 후 방장이 진행합니다.</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">내 팀</span>
            <strong className="metric-value">{myTeamLabel}</strong>
            <span className="metric-detail">랜덤 배정 전에는 팀이 비어 있습니다.</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">내 역할</span>
            <strong className="metric-value">{isHost ? "방장" : "참가자"}</strong>
            <span className="metric-detail">{isHost ? "팀 배정과 시작을 진행합니다." : "준비와 채팅으로 합류합니다."}</span>
          </article>
        </div>
      </section>

      <div className="panel-grid">
        <section className="span-8">
          <ChatRailClientShell
            snapshot={snapshot}
            initialMessages={initialChatMessages}
            source={initialChatSource}
            endpoint={chatEndpoint}
          />
        </section>

        <section className="span-4 lobby-sidebar-stack">
          <section className="panel panel-accent">
            <div className="composer-header">
              <div>
                <h3 className="panel-title">방 상태</h3>
                <p className="panel-copy">대기실에서 필요한 핵심 상태만 빠르게 확인합니다.</p>
              </div>
              <span className="status-badge">{snapshot.room.code}</span>
            </div>
            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-label">참가 인원</span>
                <strong className="metric-value">
                  {playerCount}/{snapshot.room.maxPlayers}
                </strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">준비 완료</span>
                <strong className="metric-value">
                  {readyCount}/{snapshot.room.maxPlayers}
                </strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">방 상태</span>
                <strong className="metric-value">{getRoomStatusLabel(snapshot.room.status)}</strong>
                <span className="metric-detail">팀 배정과 시작 가능 여부를 의미합니다.</span>
              </article>
            </div>
          </section>

          <ReadyPanel
            me={snapshot.me}
            teamSlots={snapshot.teamSlots}
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
                  <h3 className="panel-title">방장 진행</h3>
                  <p className="panel-copy">전원이 준비되면 팀 랜덤 배정 후 시작하기만 누르면 됩니다.</p>
                </div>
                <span className="status-badge">방장</span>
              </div>
              <div className="action-row">
                <button
                  className="button-primary"
                  type="button"
                  onClick={onAssignTeams}
                  disabled={!canAssignTeams || isHostActionSubmitting}
                >
                  {isHostActionSubmitting && canAssignTeams ? "팀 배정 중..." : "팀 랜덤 배정"}
                </button>
                <button
                  className="button-secondary"
                  type="button"
                  onClick={onStartStage}
                  disabled={!canStartStage || isHostActionSubmitting}
                >
                  {isHostActionSubmitting && canStartStage ? "시작 준비 중..." : "시작하기"}
                </button>
              </div>
            </section>
          ) : null}
        </section>

        <section className="span-6">
          <PlayerRoster
            players={snapshot.players}
            visibility={snapshot.visibility}
            redacted={snapshot.redacted}
          />
        </section>

        <section className="span-6">
          <TeamAssignmentBoard snapshot={snapshot} />
        </section>
      </div>
    </section>
  );
}
