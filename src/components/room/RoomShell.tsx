import Link from "next/link";
import { SampleFlowNavigation } from "@/components/navigation/SampleFlowNavigation";
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

  return (
    <section className="page-shell">
      <header className="page-header">
        <p className="eyebrow">상황실</p>
        <h2 className="page-title">방 현황</h2>
        <p className="page-kicker">방 코드, 내 자리, 팀 배치만 간결하게 확인하는 화면입니다.</p>
      </header>
      <SampleFlowNavigation snapshot={snapshot} requestedRoomCode={requestedRoomCode} />
      <div className="panel-grid">
        <section className="panel panel-accent span-5">
          <div className="composer-header">
            <div>
              <h3 className="panel-title">현재 상태</h3>
              <p className="panel-copy">방 정보를 한 줄씩만 확인하고 바로 돌아갈 수 있습니다.</p>
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
              <span className="metric-label">내 위치</span>
              <strong className="metric-value">{snapshot.me.teamSlotId ?? "팀 배정 전"}</strong>
              <span className="metric-detail">현재 배정 상태</span>
            </article>
          </div>
          <div className="action-row">
            <Link className="button-secondary" href={lobbyHref}>
              대기실로 이동
            </Link>
          </div>
        </section>
        <section className="span-7">
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
