import { GameplayClientShell } from "@/features/gameplay/GameplayClientShell";
import { UnavailableStatePanel } from "@/components/status/UnavailableStatePanel";
import { loadGameRuntimeSnapshot } from "@/features/gameplay/game-runtime-loader";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import { getGameRuntimeSnapshotFromStore, getRoomSnapshotFromStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";

export default async function GameplayPage({
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
        title="게임 화면을 불러오지 못했습니다"
        description="현재 방 상태를 가져오지 못해 실시간 플레이 화면을 열 수 없습니다."
      />
    );
  }

  const runtime =
    isSupabaseEnabled()
      ? {
          snapshot: await getGameRuntimeSnapshotFromStore(snapshot.room.id),
          source: "api" as const,
          endpoint: `/api/game/${encodeURIComponent(snapshot.room.id)}`,
        }
      : await loadGameRuntimeSnapshot({ roomId: snapshot.room.id });

  return (
    <GameplayClientShell
      initialSnapshot={snapshot}
      runtime={runtime}
      currentStageNumber={resolvedStageNumber}
    />
  );
}
