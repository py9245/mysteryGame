import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function TeamAssignmentBoard({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="panel panel-muted">
      <h3 className="panel-title">팀 배치</h3>
      <p className="panel-copy">현재 팀 슬롯과 내 배정 상태를 한 번에 보는 보드입니다.</p>
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
