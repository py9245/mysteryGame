import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function HintRail({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <aside className="panel panel-muted">
      <h3 className="panel-title">공개 힌트</h3>
      {snapshot.stage?.visibleHints.length ? (
        <ul className="hint-list">
          {snapshot.stage.visibleHints.map((hint) => (
            <li className="hint-card" key={hint.id}>
              <strong>{hint.player}</strong>
              {hint.admin ? <p className="roster-meta">{hint.admin}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="message-note">아직 공개된 힌트가 없습니다.</p>
      )}
    </aside>
  );
}
