import type { RoomSnapshot } from "@/contracts/api";

export function StageRuleBulletList({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <ul className="hint-list uiux-stage-hint-list">
      {(snapshot.stage?.visibleHints ?? []).map((hint) => (
        <li className="hint-card" key={hint.id}>{hint.player}</li>
      ))}
    </ul>
  );
}
