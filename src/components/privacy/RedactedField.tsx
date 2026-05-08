import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function RedactedField({ snapshot }: { snapshot: RoomSnapshot }) {
  return <div>{snapshot.redacted.otherScores.reason}</div>;
}
