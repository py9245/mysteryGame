import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function RedactedPlayerRow({ snapshot }: { snapshot: RoomSnapshot }) {
  return <div>{snapshot.redacted.otherPlayers.reason}</div>;
}
