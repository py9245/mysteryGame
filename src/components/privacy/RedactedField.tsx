import type { RoomSnapshot } from "@/contracts/api";

export function RedactedField({ snapshot }: { snapshot: RoomSnapshot }) {
  return <div>{snapshot.redacted.otherScores.reason}</div>;
}
