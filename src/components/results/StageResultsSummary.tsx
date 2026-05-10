import type { RoomSnapshot } from "@/contracts/api";

function getEndReasonLabel(endReason: RoomSnapshot["stage"]["endReason"] | null | undefined) {
  switch (endReason) {
    case "two_players_solved":
      return "두 명의 정답 성공으로 종료";
    case "timer_expired":
      return "시간 종료";
    case "admin_closed":
      return "운영자 종료";
    case "cancelled":
      return "취소됨";
    default:
      return "결과 집계 완료";
  }
}

export function StageResultsSummary({ snapshot }: { snapshot: RoomSnapshot }) {
  const solvedCount = snapshot.stage?.solvedPlayerIds.length ?? 0;
  const endReasonLabel = getEndReasonLabel(snapshot.stage?.endReason);

  return (
    <section className="panel panel-accent">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">스테이지 요약</h3>
          <p className="panel-copy">{snapshot.stage?.publicTitle ?? "결과 집계 전"}</p>
          <p className="message-note">{endReasonLabel}</p>
        </div>
        <span className="status-badge" data-tone="live">
          스테이지 종료
        </span>
      </div>
      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">성공 인원</span>
          <strong className="metric-value">{solvedCount}명</strong>
          <span className="metric-detail">정답 확정 기준</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">내 단계 점수</span>
          <strong className="metric-value">{snapshot.me.stageScore}</strong>
          <span className="metric-detail">이번 스테이지 반영값</span>
        </article>
      </div>
    </section>
  );
}
