import { StageResultsPanel } from "@/features/results/StageResultsPanel";
import { UnavailableStatePanel } from "@/components/status/UnavailableStatePanel";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import { getRoomSnapshotFromStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";

export default async function StageResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ stageNumber: string }>;
  searchParams?: Promise<RoomRouteSearchParams>;
}) {
  const { stageNumber } = await params;
  const resolvedStageNumber = Number(stageNumber);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { roomId, roomCode, playerId } = resolveRoomContextFromSearchParams(resolvedSearchParams);
  const snapshot =
    isSupabaseEnabled() && (roomId ?? roomCode)
      ? await getRoomSnapshotFromStore(roomId ?? roomCode ?? "", playerId)
      : await loadRoomSnapshot({
          roomId,
          roomCode: roomId ? undefined : roomCode,
          playerId,
          stageNumber: resolvedStageNumber,
        });

  if (!snapshot) {
    return (
      <UnavailableStatePanel
        title="스테이지 결과를 불러오지 못했습니다"
        description="결과 정산 데이터가 아직 준비되지 않았거나 접근할 수 없습니다."
      />
    );
  }

  return <StageResultsPanel snapshot={snapshot} currentStageNumber={resolvedStageNumber} />;
}
