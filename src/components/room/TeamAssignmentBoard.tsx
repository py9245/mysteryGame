import type { RoomSnapshot } from "@/contracts/api";

export function TeamAssignmentBoard({ snapshot }: { snapshot: RoomSnapshot }) {
  const hasAssignments = snapshot.currentAssignments.length > 0;
  const assignedPlayers = snapshot.players.filter((player) => player.teamSlotId !== null).length;

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
        <span className="status-badge">{assignedPlayers}/{snapshot.players.length}명</span>
      </div>
      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">팀 수</span>
          <strong className="metric-value">{snapshot.teamSlots.length}</strong>
          <span className="metric-detail">기본은 3팀, 연습방은 1팀입니다.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">배정 상태</span>
          <strong className="metric-value">{hasAssignments ? "완료" : "대기"}</strong>
          <span className="metric-detail">{hasAssignments ? "각 팀 구성을 바로 확인할 수 있습니다." : "방장이 랜덤 배정을 시작해야 합니다."}</span>
        </article>
      </div>
      <div className="assignment-grid">
        {snapshot.teamSlots.map((slot) => (
          <article className="assignment-card" key={slot.id}>
            <div className="roster-top">
              <strong>{slot.label}</strong>
              <span className="status-badge" data-tone={snapshot.me.teamSlotId === slot.id ? "live" : "alert"}>
                {snapshot.me.teamSlotId === slot.id ? "내 팀" : "다른 팀"}
              </span>
            </div>
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
