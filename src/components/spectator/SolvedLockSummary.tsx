import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function SolvedLockSummary({ snapshot }: { snapshot: RoomSnapshot }) {
  return <div>Solved: {snapshot.me.solvedLocked ? "yes" : "no"}</div>;
}
