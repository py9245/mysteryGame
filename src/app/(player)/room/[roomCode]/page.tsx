import { RoomShell } from "@/components/room/RoomShell";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomCode: string }>;
  searchParams?: Promise<RoomRouteSearchParams>;
}) {
  const { roomCode } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { roomId, playerId } = resolveRoomContextFromSearchParams(resolvedSearchParams);
  const snapshot = await loadRoomSnapshot({ roomId, roomCode, playerId });
  return <RoomShell snapshot={snapshot} requestedRoomCode={roomCode} />;
}
