import type { RoomSnapshot } from "@/contracts/api";

function getRoomPhaseLabel(viewMode: RoomSnapshot["viewMode"]) {
  switch (viewMode) {
    case "ready_confirmed":
      return "준비 완료";
    case "team_assigned":
      return "팀 배정";
    case "stage_briefing":
      return "브리핑";
    case "stage_playing":
    case "investigation_active":
      return "추리 진행";
    case "stage_results":
      return "스테이지 결과";
    case "game_results":
      return "최종 결과";
    default:
      return "대기 중";
  }
}

export function RoomStatusBadge({ viewMode }: Pick<RoomSnapshot, "viewMode">) {
  return (
    <div className="status-badge" data-view-mode={viewMode} data-tone="live">
      {getRoomPhaseLabel(viewMode)}
    </div>
  );
}
