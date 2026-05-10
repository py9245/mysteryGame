import type { RoomSnapshot } from "@/contracts/api";

function formatTeamLabel(teamSlotId: string | null) {
  return teamSlotId ?? "팀 배정 전";
}

function formatConnectionStatus(status: RoomSnapshot["players"][number]["connectionStatus"]) {
  return status === "connected" ? "접속 중" : "이탈";
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
}: Pick<RoomSnapshot, "players" | "visibility" | "redacted">) {
  return (
    <section className="panel">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">참가자</h3>
          <p className="panel-copy">누가 들어와 있고 누가 준비됐는지만 빠르게 봅니다.</p>
        </div>
        <span className="status-badge">{players.length}명</span>
      </div>
      <ul className="roster-list">
        {players.map((player) => (
          <li className={`roster-item${player.isMe ? " is-me" : ""}`} key={player.playerId}>
            <div className="roster-top">
              <span className="roster-name">{player.nickname}</span>
              <span
                className="status-badge"
                data-tone={player.connectionStatus === "connected" ? "live" : "alert"}
              >
                {formatConnectionStatus(player.connectionStatus)}
              </span>
            </div>
            <p className="roster-meta">
              {formatTeamLabel(player.teamSlotId)} · {formatStageStatus(player.stageStatus)} ·{" "}
              {player.isReady ? "준비 완료" : "대기 중"}
            </p>
            <p className="roster-meta">{player.isMe ? "내 상태" : visibility.players === "redacted" ? "공개 범위만 표시" : "공개 정보"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
