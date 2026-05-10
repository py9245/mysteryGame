import type { ChatMessage } from "@/contracts/game";
import type { RoomSnapshot } from "@/contracts/api";
import type { LoadedChatMessages } from "@/features/chat-ui/chat-messages-loader";
import { ChatRailClientShell } from "@/features/chat-ui/ChatRailClientShell";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { ReadyPanel } from "@/components/lobby/ReadyPanel";
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

  return (
    <section className="page-shell">
      <header className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">대기실</p>
            <h2 className="page-title">방 코드 {snapshot.room.code}</h2>
            <p className="page-kicker">참가자 확인, 채팅, 준비 완료, 팀 배정, 시작만 여기서 처리합니다.</p>
          </div>
          <div className="header-actions">
            <span className="status-badge" data-tone="live">
              {getRoomStatusLabel(snapshot.room.status)}
            </span>
            <RulebookLauncher label="룰북" compact scope="lobby" />
          </div>
        </div>
      </header>

      <div className="panel-grid">
        <section className="span-7">
          <ChatRailClientShell
            snapshot={snapshot}
            initialMessages={initialChatMessages}
            source={initialChatSource}
            endpoint={chatEndpoint}
          />
        </section>

        <section className="span-5 lobby-sidebar-stack">
          <section className="panel panel-accent">
            <div className="composer-header">
              <div>
                <h3 className="panel-title">방 상태</h3>
                <p className="panel-copy">지금 몇 명이 들어왔고, 시작 준비가 어디까지 됐는지 봅니다.</p>
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
            </div>
          </section>

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
                  <h3 className="panel-title">방장 진행</h3>
                  <p className="panel-copy">전원이 준비되면 랜덤 팀 배정 후 바로 시작합니다.</p>
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

          <PlayerRoster
            players={snapshot.players}
            visibility={snapshot.visibility}
            redacted={snapshot.redacted}
          />

          <TeamAssignmentBoard snapshot={snapshot} />
        </section>
      </div>
    </section>
  );
}
