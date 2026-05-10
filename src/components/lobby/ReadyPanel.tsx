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
  viewMode,
  isSubmitting = false,
  errorMessage = null,
  statusMessage = null,
  onToggleReady,
}: Pick<RoomSnapshot, "me" | "viewMode"> & {
  isSubmitting?: boolean;
  errorMessage?: string | null;
  statusMessage?: string | null;
  onToggleReady?: () => void;
}) {
  return (
    <section className="panel panel-muted ready-panel">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">내 준비 상태</h3>
          <p className="panel-copy">{me.nickname}님이 다음 단계로 넘어갈 준비가 됐는지 확인합니다.</p>
        </div>
        <span className="status-badge" data-tone={me.isReady ? "live" : "alert"}>
          {me.isReady ? "준비 완료" : "대기 중"}
        </span>
      </div>
      <div className="message-note">현재 단계: {getViewModeLabel(viewMode)}</div>
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
