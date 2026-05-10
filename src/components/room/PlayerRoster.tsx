import type { RoomSnapshot } from "@/contracts/api";

function formatTeamLabel(teamSlotId: string | null) {
  return teamSlotId ?? "팀 배정 전";
}

function formatRoleLabel(role: RoomSnapshot["players"][number]["role"]) {
  switch (role) {
    case "host":
      return "방장";
    case "admin":
      return "관리자";
    case "observer":
      return "관전자";
    default:
      return "참가자";
  }
}

function formatConnectionStatus(status: RoomSnapshot["players"][number]["connectionStatus"]) {
  return status === "connected" ? "접속" : "이탈";
}

function formatStageStatus(status: RoomSnapshot["players"][number]["stageStatus"]) {
  switch (status) {
    case "active":
      return "행동 가능";
    case "solved_locked":
      return "정답 확정";
    case "inactive_penalized":
      return "행동 제한";
    case "timed_out":
      return "시간 종료";
    case "disconnected":
      return "연결 이탈";
    default:
      return "대기";
  }
}

export function PlayerRoster({
  players,
  visibility,
  redacted: _redacted,
  compact = false,
}: Pick<RoomSnapshot, "players" | "visibility" | "redacted"> & {
  compact?: boolean;
}) {
  const orderedPlayers = [...players].sort((left, right) => {
    if (left.isMe !== right.isMe) {
      return left.isMe ? -1 : 1;
    }

    if (left.role !== right.role) {
      return left.role === "host" ? -1 : 1;
    }

    if (left.isReady !== right.isReady) {
      return left.isReady ? -1 : 1;
    }

    return left.nickname.localeCompare(right.nickname, "ko");
  });

  return (
    <section className={`panel mt-roster-panel${compact ? " panel-compact" : ""}`}>
      <div className="composer-header">
        <div>
          <h3 className="panel-title">참가자</h3>
          <p className="panel-copy">준비와 접속 상태를 확인합니다.</p>
        </div>
        <span className="status-badge">{players.length}명</span>
      </div>
      <div className={`metric-grid${compact ? " metric-grid-compact" : ""}`}>
        <article className="metric-card">
          <span className="metric-label">준비</span>
          <strong className="metric-value">{players.filter((player) => player.isReady).length}명</strong>
          <span className="metric-detail">
            {compact ? "참가자 기준" : "준비 후 시작 가능"}
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-label">접속</span>
          <strong className="metric-value">{players.filter((player) => player.connectionStatus === "connected").length}명</strong>
          <span className="metric-detail">실시간 접속 상태</span>
        </article>
      </div>
      <ul className={`roster-list${compact ? " roster-list-compact" : ""}`}>
        {orderedPlayers.map((player) => (
          <li className={`roster-item${player.isMe ? " is-me" : ""}`} key={player.playerId}>
            <div className="roster-top">
              <span className="roster-name">{player.nickname}</span>
              <div className="chip-row">
                <span className="status-badge">
                  {formatRoleLabel(player.role)}
                </span>
                <span
                  className="status-badge"
                  data-tone={player.connectionStatus === "connected" ? "live" : "alert"}
                >
                  {formatConnectionStatus(player.connectionStatus)}
                </span>
              </div>
            </div>
            <p className="roster-meta">
              {formatTeamLabel(player.teamSlotId)} · {formatStageStatus(player.stageStatus)} ·{" "}
              {player.isReady ? "준비" : "대기 중"}
            </p>
            <p className="roster-meta">{player.isMe ? "나" : visibility.players === "redacted" ? "일부 공개" : "공개"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
