import { SpectatorPanel } from "@/features/spectator/SpectatorPanel";
import { UnavailableStatePanel } from "@/components/status/UnavailableStatePanel";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import { getRoomSnapshotFromStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";

export default async function SpectatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ stageNumber: string }>;
  searchParams?: Promise<RoomRouteSearchParams>;
}) {
  const { stageNumber } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { roomId, roomCode, playerId } = resolveRoomContextFromSearchParams(resolvedSearchParams);
  const snapshot =
    isSupabaseEnabled() && (roomId ?? roomCode)
      ? await getRoomSnapshotFromStore(roomId ?? roomCode ?? "", playerId, { lightweight: true })
      : await loadRoomSnapshot({
          roomId,
          roomCode: roomId ? undefined : roomCode,
          playerId,
          stageNumber: Number(stageNumber),
        });

  if (!snapshot) {
    return (
      <UnavailableStatePanel
        title="관전 화면을 불러오지 못했습니다"
        description="현재 방 상태나 스테이지 공개 데이터가 아직 준비되지 않았습니다."
      />
    );
  }

  return <SpectatorPanel snapshot={snapshot} />;
}
