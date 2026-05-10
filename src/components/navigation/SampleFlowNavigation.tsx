import Link from "next/link";
import type { RoomSnapshot } from "@/contracts/api";
import { appendRoomContextToHref } from "@/features/room-context/room-context";

function resolveStageNumber(snapshot: RoomSnapshot, currentStageNumber?: number): number {
  return snapshot.stage?.stageNumber ?? currentStageNumber ?? snapshot.game?.currentStageNumber ?? 1;
}

function resolveRoomCode(snapshot: RoomSnapshot, requestedRoomCode?: string): string {
  return requestedRoomCode ?? snapshot.room.code;
}

export function SampleFlowNavigation({
  snapshot,
  currentStageNumber,
  requestedRoomCode,
}: {
  snapshot: RoomSnapshot;
  currentStageNumber?: number;
  requestedRoomCode?: string;
}) {
  const roomCode = resolveRoomCode(snapshot, requestedRoomCode);
  const stageNumber = resolveStageNumber(snapshot, currentStageNumber);
  const lobbyHref = `/lobby?roomId=${encodeURIComponent(snapshot.room.id)}&roomCode=${encodeURIComponent(roomCode)}`;
  const roomHref = `/room/${encodeURIComponent(roomCode)}`;
  const briefingHref = appendRoomContextToHref(`/stage/${stageNumber}/briefing`, snapshot, roomCode);
  const gameplayHref = appendRoomContextToHref(`/stage/${stageNumber}/gameplay`, snapshot, roomCode);
  const investigationHref = appendRoomContextToHref(`/stage/${stageNumber}/investigation`, snapshot, roomCode);
  const stageResultsHref = appendRoomContextToHref(`/stage/${stageNumber}/results`, snapshot, roomCode);
  const gameResultsHref = appendRoomContextToHref("/game/results", snapshot, roomCode);

  return (
    <nav aria-label="Game flow navigation" className="nav-strip">
      <ul className="nav-links">
        <li>
          <Link className="nav-link" href="/">메인</Link>
        </li>
        <li>
          <Link className="nav-link" href="/rooms">게임 시작</Link>
        </li>
        <li>
          <Link className="nav-link" href="/rooms/join">방 입장</Link>
        </li>
        <li>
          <Link className="nav-link" href="/rooms/create">방 만들기</Link>
        </li>
        <li>
          <Link className="nav-link" href={roomHref}>방 현황</Link>
        </li>
        <li>
          <Link className="nav-link" href={lobbyHref}>대기방</Link>
        </li>
        <li>
          <Link className="nav-link" href={briefingHref}>브리핑</Link>
        </li>
        <li>
          <Link className="nav-link" href={gameplayHref}>게임중</Link>
        </li>
        <li>
          <Link className="nav-link" href={investigationHref}>조사실</Link>
        </li>
        <li>
          <Link className="nav-link" href={stageResultsHref}>스테이지 결과</Link>
        </li>
        <li>
          <Link className="nav-link" href={gameResultsHref}>최종 결과</Link>
        </li>
      </ul>
    </nav>
  );
}
