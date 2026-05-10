import Link from "next/link";
import type { RoomSnapshot } from "@/contracts/api";
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

  return (
    <section className="page-shell">
      <header className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">방 현황</p>
            <h2 className="page-title">{requestedRoomCode ?? snapshot.room.code}</h2>
            <p className="page-kicker">이 방의 상태만 빠르게 확인하고 다시 대기방이나 게임 시작 화면으로 이동합니다.</p>
          </div>
          <div className="header-actions">
            <span className="status-badge" data-tone="live">
              {getRoomStatusLabel(snapshot.room.status)}
            </span>
            <Link className="button-secondary button-compact" href={gameStartHref}>
              게임 시작
            </Link>
            <Link className="button-primary button-compact" href={lobbyHref}>
              대기방으로 이동
            </Link>
          </div>
        </div>
      </header>

      <div className="panel-grid">
        <section className="panel panel-accent span-4">
          <div className="composer-header">
            <div>
              <h3 className="panel-title">현재 상태</h3>
              <p className="panel-copy">대기방에 들어가기 전에 필요한 정보만 요약합니다.</p>
            </div>
            <span className="status-badge" data-tone="live">
              {getRoomStatusLabel(snapshot.room.status)}
            </span>
          </div>
          <div className="metric-grid">
            <article className="metric-card">
              <span className="metric-label">입장 코드</span>
              <strong className="metric-value">{requestedRoomCode ?? snapshot.room.code}</strong>
              <span className="metric-detail">방 입장에 사용됩니다.</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">참가 인원</span>
              <strong className="metric-value">{snapshot.players.length}명</strong>
              <span className="metric-detail">정원 {snapshot.room.maxPlayers}명</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">준비 완료</span>
              <strong className="metric-value">{readyCount}명</strong>
              <span className="metric-detail">전원 준비 후 팀 배정이 가능합니다.</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">내 위치</span>
              <strong className="metric-value">{myTeamLabel}</strong>
              <span className="metric-detail">현재 배정 상태</span>
            </article>
          </div>
          <div className="action-row">
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
