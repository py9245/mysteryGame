import type { RoomSnapshot } from "@/contracts/api";

function getViewModeLabel(viewMode: RoomSnapshot["viewMode"]) {
  switch (viewMode) {
    case "ready_confirmed":
      return "준비 완료";
    case "team_assigned":
      return "팀 배정 완료";
    case "stage_briefing":
      return "브리핑 중";
    case "stage_playing":
    case "investigation_active":
      return "플레이 중";
    case "stage_results":
      return "스테이지 결과";
    case "game_results":
      return "최종 결과";
    default:
      return "대기실";
  }
}

export function ReadyPanel({
  me,
  teamSlots,
  viewMode,
  isHost = false,
  isPracticeMode = false,
  compact = false,
  isSubmitting = false,
  errorMessage = null,
  statusMessage = null,
  onToggleReady,
}: Pick<RoomSnapshot, "me" | "viewMode" | "teamSlots"> & {
  isHost?: boolean;
  isPracticeMode?: boolean;
  compact?: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  statusMessage?: string | null;
  onToggleReady?: () => void;
}) {
  const myTeamLabel = teamSlots.find((teamSlot) => teamSlot.id === me.teamSlotId)?.label ?? "팀 배정 전";

  return (
    <section className={`panel panel-muted ready-panel mt-ready-panel${compact ? " panel-compact" : ""}`}>
      <div className="composer-header">
        <div>
          <h3 className="panel-title">내 준비</h3>
          <p className="panel-copy">
            {isHost
              ? isPracticeMode
                ? "연습방은 바로 시작할 수 있습니다."
                : "참가자 준비가 끝나면 시작할 수 있습니다."
              : "준비 완료를 누르면 방장이 게임을 시작할 수 있습니다."}
          </p>
        </div>
        <span className="status-badge" data-tone={isHost ? "live" : me.isReady ? "live" : "alert"}>
          {isHost ? "방장" : me.isReady ? "준비 완료" : "대기 중"}
        </span>
      </div>
      <div className={`metric-grid${compact ? " metric-grid-compact" : ""}`}>
        <article className="metric-card">
          <span className="metric-label">상태</span>
          <strong className="metric-value">{getViewModeLabel(viewMode)}</strong>
          <span className="metric-detail">현재 진행 단계</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">내 팀</span>
          <strong className="metric-value">{myTeamLabel}</strong>
          <span className="metric-detail">게임 시작 전 배정됩니다.</span>
        </article>
      </div>
      {isHost ? null : (
        <div className="action-row">
          <button className="button-primary" type="button" onClick={onToggleReady} disabled={isSubmitting}>
            {isSubmitting ? "저장 중" : me.isReady ? "준비 해제" : "준비 완료"}
          </button>
        </div>
      )}
      {statusMessage ? <p className="message-positive">{statusMessage}</p> : null}
      {errorMessage ? <p className="message-negative">{errorMessage}</p> : null}
    </section>
  );
}
