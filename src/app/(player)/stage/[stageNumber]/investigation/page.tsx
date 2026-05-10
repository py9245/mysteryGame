import { InvestigationClientShell } from "@/features/investigation/InvestigationClientShell";
import { UnavailableStatePanel } from "@/components/status/UnavailableStatePanel";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";

export default async function InvestigationPage({
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
        title="질문방 상태를 불러오지 못했습니다"
        description="조사실 대기열과 현재 스테이지 동기화가 준비되지 않았습니다."
      />
    );
  }

  return <InvestigationClientShell initialSnapshot={snapshot} />;
}
