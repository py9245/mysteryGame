import { SpectatorPanel } from "@/features/spectator/SpectatorPanel";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";

export default async function SpectatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ stageNumber: string }>;
  searchParams?: Promise<RoomRouteSearchParams>;
}) {
  const { stageNumber } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { roomId, roomCode } = resolveRoomContextFromSearchParams(resolvedSearchParams);
  const snapshot = await loadRoomSnapshot({
    roomId,
    roomCode: roomId ? undefined : roomCode,
    stageNumber: Number(stageNumber),
  });
  return <SpectatorPanel snapshot={snapshot} />;
}
