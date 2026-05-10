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
  onStartGame,
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
  onStartGame?: () => void;
}) {
  const isHost = snapshot.me.role === "host" || snapshot.me.role === "admin";
  const isPracticeMode = snapshot.room.maxPlayers === 1 && snapshot.teamSlots.length === 1;
  const playerCount = snapshot.players.length;
  const participantPlayers = snapshot.players.filter(
    (player) => player.role !== "host" && player.role !== "admin",
  );
  const readyCount = participantPlayers.filter((player) => player.isReady).length;
  const readyTargetCount = isPracticeMode ? 0 : participantPlayers.length;
  const isRoomFull = playerCount >= snapshot.room.maxPlayers;
  const everyoneElseReady = isPracticeMode || (readyTargetCount > 0 && readyCount === readyTargetCount);
  const canStartGame =
    isHost &&
    ((isPracticeMode && playerCount >= 1) || (!isPracticeMode && isRoomFull && everyoneElseReady));
  const roomHref = appendRoomContextToHref(`/room/${encodeURIComponent(snapshot.room.code)}`, snapshot);
  const myTeamLabel =
    snapshot.teamSlots.find((slot) => slot.id === snapshot.me.teamSlotId)?.label ?? "팀 배정 전";
  const nextStepMessage = isHost
    ? isPracticeMode
      ? "연습방은 혼자 바로 플레이할 수 있습니다. 게임 시작을 누르면 즉시 브리핑으로 넘어갑니다."
      : canStartGame
        ? "모든 참가자가 준비를 마쳤습니다. 게임 시작을 누르면 팀 배정 후 바로 브리핑으로 넘어갑니다."
        : "본인을 제외한 모든 참가자가 준비 완료가 되면 게임 시작 버튼이 활성화됩니다."
    : snapshot.me.isReady
      ? "내 준비는 끝났습니다. 방장이 게임 시작을 누를 때까지 기다립니다."
      : "준비 완료를 눌러야 방장이 게임을 시작할 수 있습니다.";
  const actionBadgeTone = isHost ? (canStartGame ? "live" : "alert") : snapshot.me.isReady ? "live" : "alert";
  const actionBadgeLabel = isHost ? (canStartGame ? "시작 가능" : "대기 중") : snapshot.me.isReady ? "준비 완료" : "준비 필요";
  const readyMetricLabel = isPracticeMode ? "준비 절차" : "준비 완료";
  const readyMetricValue = isPracticeMode ? "없음" : `${readyCount}/${readyTargetCount}`;
  const readyMetricDetail = isPracticeMode
    ? "연습방은 방장이 혼자 바로 시작합니다."
    : "방장을 제외한 참가자가 모두 준비해야 합니다.";

  return (
    <section className="page-shell">
      <header className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">대기실</p>
            <h2 className="page-title">방 코드 {snapshot.room.code}</h2>
            <p className="page-kicker">참가자 확인, 채팅, 준비 상태, 게임 시작만 여기서 처리합니다.</p>
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
          <span className="status-badge" data-tone={actionBadgeTone}>
            {actionBadgeLabel}
          </span>
        </div>
        <div className="metric-grid">
          <article className="metric-card metric-card-emphasis">
            <span className="metric-label">참가 인원</span>
            <strong className="metric-value">
              {playerCount}/{snapshot.room.maxPlayers}
            </strong>
            <span className="metric-detail">
              {isPracticeMode ? "연습방은 본인만 입장합니다." : "정원이 차야 게임을 시작할 수 있습니다."}
            </span>
          </article>
          <article className="metric-card">
            <span className="metric-label">{readyMetricLabel}</span>
            <strong className="metric-value">{readyMetricValue}</strong>
            <span className="metric-detail">{readyMetricDetail}</span>
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
                <span className="metric-label">{readyMetricLabel}</span>
                <strong className="metric-value">{readyMetricValue}</strong>
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
            isHost={isHost}
            isPracticeMode={isPracticeMode}
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
                  <p className="panel-copy">
                    {isPracticeMode
                      ? "연습방은 혼자 바로 시작할 수 있습니다."
                      : "본인을 제외한 모든 참가자가 준비되면 게임 시작이 활성화됩니다."}
                  </p>
                </div>
                <span className="status-badge">방장</span>
              </div>
              <div className="action-row">
                <button
                  className="button-primary"
                  type="button"
                  onClick={onStartGame}
                  disabled={!canStartGame || isHostActionSubmitting}
                >
                  {isHostActionSubmitting ? "게임 시작 중..." : "게임 시작"}
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
