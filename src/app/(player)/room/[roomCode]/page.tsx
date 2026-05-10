import { RoomShell } from "@/components/room/RoomShell";
import { UnavailableStatePanel } from "@/components/status/UnavailableStatePanel";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomCode: string }>;
  searchParams?: Promise<RoomRouteSearchParams>;
}) {
  const { roomCode } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { roomId, playerId } = resolveRoomContextFromSearchParams(resolvedSearchParams);
  const snapshot = await loadRoomSnapshot({ roomId, roomCode, playerId });

  if (!snapshot) {
    return (
      <UnavailableStatePanel
        title="방 상태를 불러오지 못했습니다"
        description="입장 코드와 현재 로그인/게스트 상태를 확인한 뒤 다시 시도해 주세요."
      />
    );
  }

  return <RoomShell snapshot={snapshot} requestedRoomCode={roomCode} />;
}
