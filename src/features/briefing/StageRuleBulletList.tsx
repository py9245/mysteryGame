import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function StageRuleBulletList({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <ul className="hint-list">
      {(snapshot.stage?.visibleHints ?? []).map((hint) => (
        <li className="hint-card" key={hint.id}>{hint.player}</li>
      ))}
    </ul>
  );
}
