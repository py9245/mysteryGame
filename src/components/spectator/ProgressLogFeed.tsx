import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function ProgressLogFeed({ snapshot }: { snapshot: RoomSnapshot }) {
  return <div>Progress log for stage {snapshot.stage?.stageNumber ?? 0}</div>;
}
