import Link from "next/link";
import { SampleFlowNavigation } from "@/components/navigation/SampleFlowNavigation";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { PlayerRoster } from "@/components/room/PlayerRoster";
import { TeamAssignmentBoard } from "@/components/room/TeamAssignmentBoard";

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
  const lobbyHref = `/lobby?roomId=${encodeURIComponent(snapshot.room.id)}&roomCode=${encodeURIComponent(
    requestedRoomCode ?? snapshot.room.code,
  )}`;

  return (
    <section className="page-shell">
      <header className="page-header">
        <p className="eyebrow">상황실</p>
        <h2 className="page-title">방 현황</h2>
        <p className="page-kicker">
          지금 이 방에 누가 들어와 있고, 어떤 팀 배치가 가능한지 한눈에 파악하는 공간입니다.
        </p>
      </header>
      <SampleFlowNavigation snapshot={snapshot} requestedRoomCode={requestedRoomCode} />
      <div className="panel-grid">
        <section className="panel panel-accent span-5">
          <h3 className="panel-title">현재 상태</h3>
          <p className="panel-copy">
            입장 코드와 현재 상태를 확인한 뒤 대기실이나 스테이지 화면으로 이동할 수 있습니다.
          </p>
          <ul className="surface-list">
            <li className="assignment-card">
              <strong>입장 코드</strong>: {requestedRoomCode ?? snapshot.room.code}
            </li>
            <li className="assignment-card">
              <strong>현재 상태</strong>: {getRoomStatusLabel(snapshot.room.status)}
            </li>
            <li className="assignment-card">
              <strong>참가 인원</strong>: {snapshot.players.length}명
            </li>
            <li className="assignment-card">
              <strong>내 위치</strong>: {snapshot.me.teamSlotId ?? "팀 배정 전"}
            </li>
          </ul>
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
