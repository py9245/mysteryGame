import type { RoomSnapshot } from "@/contracts/api";
import { AnimatedCountUp } from "./AnimatedCountUp";

export function PersonalScoreBreakdown({ snapshot }: { snapshot: RoomSnapshot }) {
  const totalScore = snapshot.me.totalScore;
  const stageScore = snapshot.me.stageScore;
  const solvedCount = snapshot.me.solvedCount;
  const bonusCount = snapshot.me.bonusKeywordCount;
  const stagePrefix = stageScore > 0 ? "+" : "";

  return (
    <section className="panel panel-muted track-d-personal-score">
      <div className="composer-header">
        <div>
          <p className="eyebrow">내 기록 정리</p>
          <h3 className="panel-title">개인 성과 분해</h3>
          <p className="panel-copy">이번 판에서 남은 내 흔적만 정리합니다. 다른 플레이어 점수는 공개되지 않습니다.</p>
        </div>
      </div>
      <div className="metric-grid track-d-personal-grid">
        <article className="metric-card metric-card-emphasis">
          <span className="metric-label">누적 점수</span>
          <strong className="metric-value">
            <AnimatedCountUp value={totalScore} durationMs={1100} />
          </strong>
          <span className="metric-detail">세 스테이지 전체 기준</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">현재 스테이지</span>
          <strong className="metric-value">
            <AnimatedCountUp value={stageScore} prefix={stagePrefix} durationMs={900} />
          </strong>
          <span className="metric-detail">이번 사건에서 반영된 값</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">정답 성공</span>
          <strong className="metric-value">
            <AnimatedCountUp value={solvedCount} suffix="회" durationMs={700} />
          </strong>
          <span className="metric-detail">개인 기준 누적</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">보너스 키워드</span>
          <strong className="metric-value">
            <AnimatedCountUp value={bonusCount} durationMs={700} />
          </strong>
          <span className="metric-detail">정확도 보너스 반영</span>
        </article>
      </div>
    </section>
  );
}
