import { StageShell } from "@/components/stage/StageShell";
import { UnavailableStatePanel } from "@/components/status/UnavailableStatePanel";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";

export default async function StagePage({
  params,
  searchParams,
}: {
  params: Promise<{ stageNumber: string }>;
  searchParams?: Promise<RoomRouteSearchParams>;
}) {
  const { stageNumber } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { roomId, roomCode, playerId } = resolveRoomContextFromSearchParams(resolvedSearchParams);
  const snapshot = await loadRoomSnapshot({
    roomId,
    roomCode: roomId ? undefined : roomCode,
    playerId,
    stageNumber: Number(stageNumber),
  });

  if (!snapshot) {
    return (
      <UnavailableStatePanel
        title="스테이지 상태를 불러오지 못했습니다"
        description="현재 스테이지의 공개 데이터가 아직 준비되지 않았습니다."
      />
    );
  }

  return <StageShell snapshot={snapshot} />;
}
