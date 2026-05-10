import type { RoomSnapshot } from "@/contracts/api";

export function TeamAssignmentBoard({
  snapshot,
  compact = false,
}: {
  snapshot: RoomSnapshot;
  compact?: boolean;
}) {
  const hasAssignments = snapshot.currentAssignments.length > 0;
  const assignedPlayers = snapshot.players.filter((player) => player.teamSlotId !== null).length;

  return (
    <section className={`panel panel-muted mt-team-board${compact ? " panel-compact" : ""}`}>
      <div className="composer-header">
        <div>
          <h3 className="panel-title">팀 배정</h3>
          <p className="panel-copy">
            {hasAssignments
              ? "배정된 팀을 확인하세요."
              : compact
                ? "시작 시 자동 배정됩니다."
                : "시작하면 팀이 정해집니다."}
          </p>
        </div>
        <span className="status-badge">{assignedPlayers}/{snapshot.players.length}명</span>
      </div>
      <div className={`metric-grid${compact ? " metric-grid-compact" : ""}`}>
        <article className="metric-card">
          <span className="metric-label">팀 수</span>
          <strong className="metric-value">{snapshot.teamSlots.length}</strong>
          <span className="metric-detail">게임 설정 기준</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">배정 상태</span>
          <strong className="metric-value">{hasAssignments ? "완료" : "대기"}</strong>
          <span className="metric-detail">{hasAssignments ? "팀 구성이 확정됐습니다." : "시작 전 대기 중"}</span>
        </article>
      </div>
      <div className={`assignment-grid${compact ? " assignment-grid-compact" : ""}`}>
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
                <li>배정 전</li>
              )}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
