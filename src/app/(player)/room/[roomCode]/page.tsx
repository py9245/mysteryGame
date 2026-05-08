import { RoomShell } from "@/components/room/RoomShell";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";

export default async function RoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  const snapshot = await loadRoomSnapshot({ roomCode });
  return <RoomShell snapshot={snapshot} requestedRoomCode={roomCode} />;
}
