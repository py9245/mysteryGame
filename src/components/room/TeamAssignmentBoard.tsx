import type { RoomSnapshot } from "@/contracts/api";

export function TeamAssignmentBoard({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="panel panel-muted">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">팀 배치</h3>
          <p className="panel-copy">이번 스테이지에서 사용할 팀 슬롯만 보여줍니다.</p>
        </div>
        <span className="status-badge">{snapshot.teamSlots.length}개 슬롯</span>
      </div>
      <div className="assignment-grid">
        {snapshot.teamSlots.map((slot) => (
          <article className="assignment-card" key={slot.id}>
            <strong>{slot.label}</strong>
            <p className="roster-meta">2인 협력 슬롯</p>
            <p>{snapshot.me.teamSlotId === slot.id ? "내 현재 슬롯" : "사용 가능 슬롯"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
