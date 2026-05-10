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
  isSubmitting = false,
  errorMessage = null,
  statusMessage = null,
  onToggleReady,
}: Pick<RoomSnapshot, "me" | "viewMode" | "teamSlots"> & {
  isSubmitting?: boolean;
  errorMessage?: string | null;
  statusMessage?: string | null;
  onToggleReady?: () => void;
}) {
  const myTeamLabel = teamSlots.find((teamSlot) => teamSlot.id === me.teamSlotId)?.label ?? "팀 배정 전";

  return (
    <section className="panel panel-muted ready-panel">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">준비 상태</h3>
          <p className="panel-copy">{me.nickname}님의 준비 여부를 여기서 바로 바꿉니다.</p>
        </div>
        <span className="status-badge" data-tone={me.isReady ? "live" : "alert"}>
          {me.isReady ? "준비 완료" : "대기 중"}
        </span>
      </div>
      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">현재 상태</span>
          <strong className="metric-value">{getViewModeLabel(viewMode)}</strong>
          <span className="metric-detail">대기실에서 내 위치를 표시합니다.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">내 팀</span>
          <strong className="metric-value">{myTeamLabel}</strong>
          <span className="metric-detail">팀 배정 전에는 아직 비어 있습니다.</span>
        </article>
      </div>
      <div className="action-row">
        <button className="button-primary" type="button" onClick={onToggleReady} disabled={isSubmitting}>
          {isSubmitting ? "상태 갱신 중..." : me.isReady ? "준비 해제" : "준비 완료"}
        </button>
      </div>
      {statusMessage ? <p className="message-positive">{statusMessage}</p> : null}
      {errorMessage ? <p className="message-negative">{errorMessage}</p> : null}
    </section>
  );
}
