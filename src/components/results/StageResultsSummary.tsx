import type { RoomSnapshot } from "@/contracts/api";
import { AnimatedCountUp } from "./AnimatedCountUp";

function getEndReasonLabel(
  endReason: RoomSnapshot["stage"]["endReason"] | null | undefined,
  solvedCount: number,
) {
  switch (endReason) {
    case "two_players_solved":
      return solvedCount <= 1 ? "한 명의 정답 성공으로 종료" : "두 명의 정답 성공으로 종료";
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
  const endReasonLabel = getEndReasonLabel(snapshot.stage?.endReason, solvedCount);
  const mySolved = snapshot.me.solvedLocked;
  const stageScore = snapshot.me.stageScore;
  const stageScoreSign = stageScore > 0 ? "+" : "";

  return (
    <section className="panel panel-accent track-d-stage-summary">
      <div className="composer-header">
        <div>
          <p className="eyebrow">스테이지 요약</p>
          <h3 className="panel-title">{snapshot.stage?.publicTitle ?? "결과 집계 전"}</h3>
          <p className="panel-copy">이번 스테이지에서 무슨 일이 있었는지 먼저 정리합니다.</p>
          <p className="message-note">{endReasonLabel}</p>
        </div>
        <span className="status-badge" data-tone="live">
          스테이지 종료
        </span>
      </div>
      <div className="metric-grid track-d-stage-summary-grid">
        <article className="metric-card metric-card-emphasis">
          <span className="metric-label">성공 인원</span>
          <strong className="metric-value">
            <AnimatedCountUp value={solvedCount} suffix="명" durationMs={800} />
          </strong>
          <span className="metric-detail">정답 확정 기준</span>
        </article>
        <article className="metric-card metric-card-emphasis">
          <span className="metric-label">내 단계 점수</span>
          <strong className="metric-value">
            <span className="track-d-stage-score">
              <AnimatedCountUp
                value={stageScore}
                prefix={stageScoreSign}
                durationMs={1100}
              />
            </span>
          </strong>
          <span className="metric-detail">이번 스테이지 반영값</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">내 결과</span>
          <strong className="metric-value track-d-stage-mine">
            {mySolved ? "정답" : "미해결"}
          </strong>
          <span className="metric-detail">본인 기준</span>
        </article>
      </div>
    </section>
  );
}
