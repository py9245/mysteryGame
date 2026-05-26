import Link from "next/link";
import type { RoomSnapshot } from "@/contracts/api";
import { LeaveRoomButton } from "@/components/room/LeaveRoomButton";
import { RoomPresenceClient } from "@/components/room/RoomPresenceClient";
import { PlayerRoster } from "@/components/room/PlayerRoster";
import { TeamAssignmentBoard } from "@/components/room/TeamAssignmentBoard";
import { appendRoomContextToHref } from "@/features/room-context/room-context";

function getRoomStatusLabel(status: string) {
  switch (status) {
    case "ready":
      return "시작 가능";
    case "assigning":
      return "팀 편성 중";
    case "in_game":
      return "게임 진행 중";
    case "closed":
      return "종료";
    default:
      return "입장 대기";
  }
}

function getRoomStatusTone(status: string): "live" | "alert" | "default" {
  switch (status) {
    case "ready":
    case "in_game":
      return "live";
    case "closed":
      return "alert";
    default:
      return "default";
  }
}

export function RoomShell({
  snapshot,
  requestedRoomCode,
}: {
  snapshot: RoomSnapshot;
  requestedRoomCode?: string;
}) {
  const lobbyHref = appendRoomContextToHref("/lobby", snapshot, requestedRoomCode);
  const gameStartHref = "/rooms";
  const myTeamLabel =
    snapshot.teamSlots.find((slot) => slot.id === snapshot.me.teamSlotId)?.label ?? "팀 배정 전";
  const readyCount = snapshot.players.filter((player) => player.isReady).length;
  const displayCode = requestedRoomCode ?? snapshot.room.code;
  const statusTone = getRoomStatusTone(snapshot.room.status);
  const statusLabel = getRoomStatusLabel(snapshot.room.status);
  const allReady = readyCount === snapshot.players.length && snapshot.players.length > 0;

  return (
    <section className="page-shell track-a-room-shell">
      <RoomPresenceClient roomId={snapshot.room.id} playerId={snapshot.me.playerId} />
      <header className="page-header mt-room-header track-a-room-header">
        <div className="header-top-row">
          <div className="track-a-room-header-copy">
            <p className="eyebrow">Case File</p>
            <div className="track-a-room-code-line">
              <h2 className="page-title track-a-room-code">{displayCode}</h2>
              <div className="track-a-room-tags">
                <span className="status-badge" data-tone={statusTone}>
                  {statusLabel}
                </span>
                <span className="status-badge">
                  {snapshot.players.length}/{snapshot.room.maxPlayers}명
                </span>
              </div>
            </div>
            <p className="page-kicker">인원, 준비 상태, 팀 배정을 확인하고 대기실로 이동하세요.</p>
          </div>
          <div className="header-actions">
            <Link className="button-secondary button-compact" href={gameStartHref}>
              방 목록
            </Link>
            <LeaveRoomButton roomId={snapshot.room.id} playerId={snapshot.me.playerId} />
            <Link className="button-primary button-compact" href={lobbyHref}>
              대기실
            </Link>
          </div>
        </div>
      </header>

      <div className="panel-grid">
        <section className="panel panel-accent span-4 track-a-room-status-card">
          <div className="composer-header">
            <div>
              <p className="eyebrow">Room Brief</p>
              <h3 className="panel-title">방 정보</h3>
              <p className="panel-copy">방 코드와 인원, 준비 상태를 한눈에 봅니다.</p>
            </div>
            <span className="status-badge" data-tone={statusTone}>
              {statusLabel}
            </span>
          </div>
          <div className="metric-grid">
            <article className="metric-card metric-card-emphasis">
              <span className="metric-label">방 코드</span>
              <strong className="metric-value track-a-stat-code">{displayCode}</strong>
              <span className="metric-detail">초대 코드</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">인원</span>
              <strong className="metric-value">{snapshot.players.length}명</strong>
              <span className="metric-detail">정원 {snapshot.room.maxPlayers}명</span>
            </article>
            <article className={`metric-card${allReady ? " metric-card-emphasis" : ""}`}>
              <span className="metric-label">준비</span>
              <strong className="metric-value">
                {readyCount}/{snapshot.players.length}명
              </strong>
              <span className="metric-detail">{allReady ? "모두 준비 완료" : "준비 대기 중"}</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">내 팀</span>
              <strong className="metric-value">{myTeamLabel}</strong>
              <span className="metric-detail">배정 상태</span>
            </article>
          </div>
          <div className="action-row track-a-room-sticky-actions">
            <Link className="button-primary" href={lobbyHref}>
              대기실로 이동
            </Link>
          </div>
        </section>
        <section className="span-8">
          <PlayerRoster
            players={snapshot.players}
            visibility={snapshot.visibility}
            redacted={snapshot.redacted}
          />
        </section>
        <section className="span-12">
          <TeamAssignmentBoard snapshot={snapshot} />
        </section>
      </div>
    </section>
  );
}
