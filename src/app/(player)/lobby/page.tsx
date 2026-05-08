import { LobbyClientShell } from "@/components/lobby/LobbyClientShell";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";

export default async function LobbyPage({
  searchParams,
}: {
  searchParams?: Promise<RoomRouteSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { roomId, roomCode, playerId } = resolveRoomContextFromSearchParams(resolvedSearchParams);
  const snapshot = await loadRoomSnapshot({
    roomId,
    roomCode: roomId ? undefined : roomCode,
    playerId,
  });

  return <LobbyClientShell initialSnapshot={snapshot} />;
}
