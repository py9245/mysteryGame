import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { SampleFlowNavigation } from "@/components/navigation/SampleFlowNavigation";
import { StageResultsSummary } from "@/components/results/StageResultsSummary";
import { RankingTable } from "@/components/results/RankingTable";
import { PersonalScoreBreakdown } from "@/components/results/PersonalScoreBreakdown";

export function StageResultsPanel({
  snapshot,
  currentStageNumber,
}: {
  snapshot: RoomSnapshot;
  currentStageNumber?: number;
}) {
  return (
    <section className="page-shell">
      <header className="page-header">
        <p className="eyebrow">사건 정산</p>
        <h2 className="page-title">스테이지 결과</h2>
        <p className="page-kicker">이번 스테이지 결과만 간단히 정리했습니다.</p>
      </header>
      <SampleFlowNavigation snapshot={snapshot} currentStageNumber={currentStageNumber} />
      <div className="results-grid">
        <section className="span-4">
          <StageResultsSummary snapshot={snapshot} />
        </section>
        <section className="span-8">
          <RankingTable snapshot={snapshot} />
        </section>
        <section className="span-12">
          <PersonalScoreBreakdown snapshot={snapshot} />
        </section>
      </div>
    </section>
  );
}
