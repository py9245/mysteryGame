import type { RoomSnapshot } from "@/contracts/api";

export function HintRail({ snapshot }: { snapshot: RoomSnapshot }) {
  const hints = snapshot.stage?.visibleHints ?? [];
  return (
    <aside className="panel panel-muted">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">공개 힌트</h3>
          <p className="panel-copy">브리핑과 진행 중 공개되는 힌트만 모았습니다.</p>
        </div>
        <span className="status-badge">{hints.length}개</span>
      </div>
      {hints.length ? (
        <ul className="hint-list">
          {hints.map((hint) => (
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
