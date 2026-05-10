import { StageBriefingPanel } from "@/features/briefing/StageBriefingPanel";
import { UnavailableStatePanel } from "@/components/status/UnavailableStatePanel";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import { getRoomSnapshotFromStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";

export default async function BriefingPage({
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
      ? await getRoomSnapshotFromStore(roomId ?? roomCode ?? "", playerId)
      : await loadRoomSnapshot({
          roomId,
          roomCode: roomId ? undefined : roomCode,
          playerId,
          stageNumber: Number(stageNumber),
        });

  if (!snapshot) {
    return (
      <UnavailableStatePanel
        title="브리핑을 불러오지 못했습니다"
        description="현재 스테이지 정보가 준비되지 않았거나 방 접근 권한이 없습니다."
      />
    );
  }

  return <StageBriefingPanel snapshot={snapshot} />;
}
