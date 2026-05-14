import Link from "next/link";
import type { ChatMessage } from "@/contracts/game";
import type { RoomSnapshot } from "@/contracts/api";
import type { LoadedChatMessages } from "@/features/chat-ui/chat-messages-loader";
import type { RoomRealtimeSyncMeta } from "@/features/room-snapshot/use-room-realtime-snapshot";
import { ChatRailClientShell } from "@/features/chat-ui/ChatRailClientShell";
import { appendRoomContextToHref } from "@/features/room-context/room-context";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { ReadyPanel } from "@/components/lobby/ReadyPanel";
import { LeaveRoomButton } from "@/components/room/LeaveRoomButton";
import { TeamAssignmentBoard } from "@/components/room/TeamAssignmentBoard";
import { PlayerRoster } from "@/components/room/PlayerRoster";
import { RealtimeStatusStrip } from "@/components/status/RealtimeStatusStrip";

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
  syncMeta,
  initialChatMessages,
  initialChatSource,
  chatEndpoint,
  isSubmitting = false,
  isHostActionSubmitting = false,
  errorMessage = null,
  statusMessage = null,
  practiceLoadingMessage = null,
  practiceLoadingDetail = null,
  onToggleReady,
  onStartGame,
}: {
  snapshot: RoomSnapshot;
  syncMeta: RoomRealtimeSyncMeta;
  initialChatMessages: ChatMessage[];
  initialChatSource: LoadedChatMessages["source"];
  chatEndpoint: string;
  isSubmitting?: boolean;
  isHostActionSubmitting?: boolean;
  errorMessage?: string | null;
  statusMessage?: string | null;
  practiceLoadingMessage?: string | null;
  practiceLoadingDetail?: string | null;
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
      ? "연습방은 혼자 바로 플레이할 수 있습니다. 시작을 누르면 AI가 사건과 이미지를 준비한 뒤 바로 게임 화면으로 넘어갑니다."
      : canStartGame
        ? "모든 참가자가 준비를 마쳤습니다. 시작을 누르면 팀 배정 후 바로 브리핑으로 넘어갑니다."
        : "본인을 제외한 모든 참가자가 준비가 되면 시작 버튼이 활성화됩니다."
    : snapshot.me.isReady
      ? "내 준비는 끝났습니다. 방장이 시작을 누를 때까지 기다립니다."
      : "준비를 눌러야 방장이 게임을 시작할 수 있습니다.";
  const actionBadgeTone = isHost ? (canStartGame ? "live" : "alert") : snapshot.me.isReady ? "live" : "alert";
  const actionBadgeLabel = isHost ? (canStartGame ? "시작 가능" : "대기 중") : snapshot.me.isReady ? "준비" : "준비 필요";
  const readyMetricLabel = isPracticeMode ? "준비 절차" : "준비";
  const readyMetricValue = isPracticeMode ? "없음" : `${readyCount}/${readyTargetCount}`;
  const readyMetricDetail = isPracticeMode
    ? "연습방은 방장이 혼자 바로 시작합니다."
    : "참가자 준비가 필요합니다.";
  const startButtonLabel = isPracticeMode ? "혼자 시작" : "시작";

  return (
    <section className="page-shell lobby-screen">
      {practiceLoadingMessage ? (
        <div className="fullscreen-loading-overlay" role="status" aria-live="polite">
          <div className="loading-card">
            <span className="status-badge" data-tone="live">
              연습 사건 준비 중
            </span>
            <h3 className="loading-title">{practiceLoadingMessage}</h3>
            <p className="loading-copy">
              {practiceLoadingDetail ?? "AI가 사건 설명과 이미지를 준비하는 동안 잠시만 기다려주세요."}
            </p>
            <div className="loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      ) : null}
      <section className="nav-strip lobby-summary-strip mt-lobby-summary">
        <div className="lobby-summary-main">
          <div>
            <p className="eyebrow">대기실</p>
            <h2 className="lobby-room-title">방 코드 {snapshot.room.code}</h2>
            <p className="page-kicker lobby-kicker">{nextStepMessage}</p>
          </div>
          <div className="lobby-summary-badges">
            <span className="status-badge" data-tone="live">
              {getRoomStatusLabel(snapshot.room.status)}
            </span>
            <span className="status-badge" data-tone={actionBadgeTone}>
              {actionBadgeLabel}
            </span>
          </div>
        </div>

        <div className="lobby-summary-metrics">
          <article className="metric-card metric-card-compact">
            <span className="metric-label">인원</span>
            <strong className="metric-value">{playerCount}/{snapshot.room.maxPlayers}</strong>
          </article>
          <article className="metric-card metric-card-compact">
            <span className="metric-label">{readyMetricLabel}</span>
            <strong className="metric-value">{readyMetricValue}</strong>
          </article>
          <article className="metric-card metric-card-compact">
            <span className="metric-label">역할</span>
            <strong className="metric-value">{isHost ? "방장" : "참가자"}</strong>
          </article>
          <article className="metric-card metric-card-compact">
            <span className="metric-label">팀</span>
            <strong className="metric-value">{myTeamLabel}</strong>
          </article>
        </div>

        <div className="lobby-summary-actions">
          {isHost ? (
            <button
              className="button-primary"
              type="button"
              onClick={onStartGame}
              disabled={!canStartGame || isHostActionSubmitting}
            >
              {isHostActionSubmitting ? "시작 중" : startButtonLabel}
            </button>
          ) : null}
          <Link className="button-secondary button-compact" href={roomHref}>
            상태
          </Link>
          <LeaveRoomButton roomId={snapshot.room.id} playerId={snapshot.me.playerId} />
          <RulebookLauncher label="룰북" compact scope="lobby" />
        </div>
      </section>

      <RealtimeStatusStrip snapshot={snapshot} syncMeta={syncMeta} variant="lobby" />

      <section className="lobby-main-grid mt-lobby-grid">
        <div className="lobby-main-column">
          <PlayerRoster
            players={snapshot.players}
            visibility={snapshot.visibility}
            redacted={snapshot.redacted}
            compact
          />
        </div>

        <div className="lobby-main-column lobby-chat-column">
          <ChatRailClientShell
            snapshot={snapshot}
            initialMessages={initialChatMessages}
            source={initialChatSource}
            endpoint={chatEndpoint}
            variant="lobby"
          />
        </div>

        <div className="lobby-main-column lobby-sidebar-column">
          <ReadyPanel
            me={snapshot.me}
            teamSlots={snapshot.teamSlots}
            viewMode={snapshot.viewMode}
            isHost={isHost}
            isPracticeMode={isPracticeMode}
            compact
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            statusMessage={statusMessage}
            onToggleReady={onToggleReady}
          />

          {isHost ? (
            <section className="panel panel-accent panel-compact lobby-host-card mt-host-card">
              <div className="composer-header">
                <div>
                  <h3 className="panel-title">시작</h3>
                  <p className="panel-copy">
                    {isPracticeMode ? "바로 시작할 수 있습니다." : readyMetricDetail}
                  </p>
                </div>
                <span className="status-badge">{isPracticeMode ? "연습" : "방장"}</span>
              </div>
              <button
                className="button-primary"
                type="button"
                onClick={onStartGame}
                disabled={!canStartGame || isHostActionSubmitting}
              >
                {isHostActionSubmitting ? "시작 중" : startButtonLabel}
              </button>
            </section>
          ) : null}

          <TeamAssignmentBoard snapshot={snapshot} compact />
        </div>
      </section>
    </section>
  );
}
