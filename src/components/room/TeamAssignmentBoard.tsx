import type { RoomSnapshot } from "@/contracts/api";

// Calm, on-brand palette — sympathetic to noir/gold accents.
// Order is stable and cycles for >5 team slots.
const TEAM_COLORS = [
  "rgba(106, 168, 255, 0.78)", // info / cool blue
  "rgba(117, 192, 150, 0.78)", // success / olive-green
  "rgba(240, 195, 106, 0.85)", // gold
  "rgba(228, 87, 61, 0.78)", // accent
  "rgba(186, 124, 220, 0.78)", // muted violet
  "rgba(244, 176, 76, 0.85)", // warn / amber
] as const;

function getTeamColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length] ?? TEAM_COLORS[0];
}

export function TeamAssignmentBoard({
  snapshot,
  compact = false,
}: {
  snapshot: RoomSnapshot;
  compact?: boolean;
}) {
  const hasAssignments = snapshot.currentAssignments.length > 0;
  const assignedPlayers = snapshot.players.filter((player) => player.teamSlotId !== null).length;
  const myTeamSlotId = snapshot.me.teamSlotId;
  const myTeamAssigned = Boolean(myTeamSlotId);

  return (
    <section className={`panel panel-muted mt-team-board track-a-team-board${compact ? " panel-compact" : ""}`}>
      <div className="composer-header">
        <div>
          <h3 className="panel-title">팀 배정</h3>
          <p className="panel-copy">
            {hasAssignments
              ? myTeamAssigned
                ? "내 팀과 다른 팀 구성을 확인합니다."
                : "팀 구성이 확정되었습니다."
              : compact
                ? "시작 시 자동 배정됩니다."
                : "게임이 시작되면 팀이 자동으로 정해집니다."}
          </p>
        </div>
        <span
          className="status-badge"
          data-tone={hasAssignments ? "live" : "alert"}
          aria-label={`팀 배정 ${assignedPlayers}/${snapshot.players.length}명 완료`}
        >
          {assignedPlayers}/{snapshot.players.length}명 배정
        </span>
      </div>
      <div className={`metric-grid${compact ? " metric-grid-compact" : ""}`}>
        <article className="metric-card">
          <span className="metric-label">팀 수</span>
          <strong className="metric-value num-tabular">{snapshot.teamSlots.length}</strong>
          <span className="metric-detail">게임 설정 기준</span>
        </article>
        <article className={`metric-card${myTeamAssigned ? " metric-card-emphasis" : ""}`}>
          <span className="metric-label">내 팀</span>
          <strong className="metric-value">
            {snapshot.teamSlots.find((slot) => slot.id === myTeamSlotId)?.label ?? "미배정"}
          </strong>
          <span className="metric-detail">
            {myTeamAssigned ? "내 팀 슬롯" : "시작 시 자동 배정"}
          </span>
        </article>
      </div>
      {!hasAssignments ? (
        <div className="track-a-team-empty message-note uiux-lobby-team-empty" role="status">
          <strong>아직 팀이 배정되지 않았습니다.</strong>
          <p>모두 준비가 끝나고 게임이 시작되면, 위 슬롯에 자동으로 배치됩니다.</p>
        </div>
      ) : null}
      <div className={`assignment-grid${compact ? " assignment-grid-compact" : ""} track-a-assignment-grid`}>
        {snapshot.teamSlots.map((slot, slotIndex) => {
          const isMyTeam = slot.id === myTeamSlotId;
          const teamMembers = snapshot.players.filter((player) => player.teamSlotId === slot.id);
          const isEmpty = teamMembers.length === 0;
          const teamColor = getTeamColor(slotIndex);

          return (
            <article
              className={`assignment-card track-a-team-card uiux-lobby-team-card${isMyTeam ? " is-mine" : ""}${isEmpty ? " is-empty" : ""}`}
              key={slot.id}
              data-mine={isMyTeam ? "true" : undefined}
              data-empty={isEmpty ? "true" : undefined}
              style={{ ["--uiux-lobby-team-color" as unknown as string]: teamColor }}
              aria-label={`팀 ${slot.label}, ${teamMembers.length}명${isMyTeam ? ", 내 팀" : ""}`}
            >
              <div className="roster-top">
                <strong className="track-a-team-name">{slot.label}</strong>
                {isMyTeam ? (
                  <span className="status-badge" data-tone="live">
                    내 팀
                  </span>
                ) : myTeamAssigned ? (
                  <span className="status-badge">다른 팀</span>
                ) : (
                  <span className="status-badge">대기 슬롯</span>
                )}
              </div>
              <ul className="assignment-member-list track-a-team-members">
                {teamMembers.length > 0 ? (
                  teamMembers.map((player) => (
                    <li key={player.playerId} className={player.isMe ? "track-a-team-member-me" : undefined}>
                      {player.nickname}
                      {player.isMe ? " (나)" : ""}
                    </li>
                  ))
                ) : (
                  <li className="track-a-team-empty-slot">배정 전</li>
                )}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
