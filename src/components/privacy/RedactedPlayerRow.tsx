import type { RoomSnapshot } from "@/contracts/api";

export function RedactedPlayerRow({ snapshot }: { snapshot: RoomSnapshot }) {
  return <div>{snapshot.redacted.otherPlayers.reason}</div>;
}
