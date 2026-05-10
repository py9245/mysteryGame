import type { RoomSnapshot } from "@/contracts/api";

export function TeamAssignmentBoard({ snapshot }: { snapshot: RoomSnapshot }) {
  const hasAssignments = snapshot.currentAssignments.length > 0;

  return (
    <section className="panel panel-muted">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">랜덤 팀 배정</h3>
          <p className="panel-copy">
            {hasAssignments
              ? "현재 배정된 팀을 바로 확인할 수 있습니다."
              : "방장이 배정을 누르면 여기서 팀이 정해집니다."}
          </p>
        </div>
        <span className="status-badge">{snapshot.teamSlots.length}개 슬롯</span>
      </div>
      <div className="assignment-grid">
        {snapshot.teamSlots.map((slot) => (
          <article className="assignment-card" key={slot.id}>
            <strong>{slot.label}</strong>
            <p className="roster-meta">{snapshot.me.teamSlotId === slot.id ? "내 팀" : "다른 팀"}</p>
            <ul className="assignment-member-list">
              {snapshot.players.filter((player) => player.teamSlotId === slot.id).length > 0 ? (
                snapshot.players
                  .filter((player) => player.teamSlotId === slot.id)
                  .map((player) => (
                    <li key={player.playerId}>
                      {player.nickname}
                      {player.isMe ? " (나)" : ""}
                    </li>
                  ))
              ) : (
                <li>아직 배정 전</li>
              )}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
