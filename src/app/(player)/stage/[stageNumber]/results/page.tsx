import { StageResultsPanel } from "@/features/results/StageResultsPanel";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";

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
  const snapshot = await loadRoomSnapshot({
    roomId,
    roomCode: roomId ? undefined : roomCode,
    playerId,
    stageNumber: resolvedStageNumber,
  });
  return <StageResultsPanel snapshot={snapshot} currentStageNumber={resolvedStageNumber} />;
}
