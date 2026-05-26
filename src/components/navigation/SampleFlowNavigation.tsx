"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RoomSnapshot } from "@/contracts/api";
import { appendRoomContextToHref } from "@/features/room-context/room-context";

function resolveStageNumber(snapshot: RoomSnapshot, currentStageNumber?: number): number {
  return snapshot.stage?.stageNumber ?? currentStageNumber ?? snapshot.game?.currentStageNumber ?? 1;
}

function resolveRoomCode(snapshot: RoomSnapshot, requestedRoomCode?: string): string {
  return requestedRoomCode ?? snapshot.room.code;
}

type FlowLink = {
  href: string;
  label: string;
  matcher: (pathname: string) => boolean;
};

function startsWith(prefix: string) {
  return (pathname: string) => pathname.startsWith(prefix);
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
  const pathname = usePathname() ?? "";
  const roomCode = resolveRoomCode(snapshot, requestedRoomCode);
  const stageNumber = resolveStageNumber(snapshot, currentStageNumber);
  const lobbyHref = `/lobby?roomId=${encodeURIComponent(snapshot.room.id)}&roomCode=${encodeURIComponent(roomCode)}`;
  const roomHref = `/room/${encodeURIComponent(roomCode)}`;
  const briefingHref = appendRoomContextToHref(`/stage/${stageNumber}/briefing`, snapshot, roomCode);
  const gameplayHref = appendRoomContextToHref(`/stage/${stageNumber}/gameplay`, snapshot, roomCode);
  const investigationHref = appendRoomContextToHref(`/stage/${stageNumber}/investigation`, snapshot, roomCode);
  const stageResultsHref = appendRoomContextToHref(`/stage/${stageNumber}/results`, snapshot, roomCode);
  const gameResultsHref = appendRoomContextToHref("/game/results", snapshot, roomCode);

  const links: FlowLink[] = [
    { href: "/", label: "메인", matcher: (p) => p === "/" },
    { href: "/rooms", label: "게임 시작", matcher: (p) => p === "/rooms" },
    { href: "/rooms/join", label: "방 입장", matcher: startsWith("/rooms/join") },
    { href: "/rooms/create", label: "방 만들기", matcher: startsWith("/rooms/create") },
    { href: roomHref, label: "방 현황", matcher: startsWith("/room/") },
    { href: lobbyHref, label: "대기방", matcher: startsWith("/lobby") },
    { href: briefingHref, label: "브리핑", matcher: (p) => p.includes("/briefing") },
    { href: gameplayHref, label: "게임중", matcher: (p) => p.includes("/gameplay") },
    { href: investigationHref, label: "조사실", matcher: (p) => p.includes("/investigation") },
    { href: stageResultsHref, label: "스테이지 결과", matcher: (p) => /\/stage\/\d+\/results/.test(p) },
    { href: gameResultsHref, label: "최종 결과", matcher: startsWith("/game/results") },
  ];

  return (
    <nav aria-label="Game flow navigation" className="nav-strip">
      <ul className="nav-links">
        {links.map((link) => {
          const isActive = link.matcher(pathname);
          return (
            <li key={link.label}>
              <Link
                className="nav-link uiux-realtime-flow-step"
                href={link.href}
                data-active={isActive || undefined}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
