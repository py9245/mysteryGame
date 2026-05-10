import { GameResultsPanel } from "@/features/results/GameResultsPanel";
import { UnavailableStatePanel } from "@/components/status/UnavailableStatePanel";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import { getRoomSnapshotFromStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";

export default async function GameResultsPage({
  searchParams,
}: {
  searchParams?: Promise<RoomRouteSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { roomId, roomCode, playerId } = resolveRoomContextFromSearchParams(resolvedSearchParams);
  const snapshot =
    isSupabaseEnabled() && (roomId ?? roomCode)
      ? await getRoomSnapshotFromStore(roomId ?? roomCode ?? "", playerId)
      : await loadRoomSnapshot({
          roomId,
          roomCode: roomId ? undefined : roomCode,
          playerId,
        });

  if (!snapshot) {
    return (
      <UnavailableStatePanel
        title="최종 결과를 불러오지 못했습니다"
        description="게임 결과 데이터가 아직 준비되지 않았거나 현재 방에 접근할 수 없습니다."
      />
    );
  }

  return <GameResultsPanel snapshot={snapshot} />;
}
