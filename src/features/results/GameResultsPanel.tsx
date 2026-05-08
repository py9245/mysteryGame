import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { SampleFlowNavigation } from "@/components/navigation/SampleFlowNavigation";
import { GameResultsSummary } from "@/components/results/GameResultsSummary";
import { RankingTable } from "@/components/results/RankingTable";
import { PersonalScoreBreakdown } from "@/components/results/PersonalScoreBreakdown";

export function GameResultsPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="page-shell">
      <header className="page-header">
        <p className="eyebrow">최종 정산</p>
        <h2 className="page-title">최종 결과</h2>
        <p className="page-kicker">최종 개인 랭킹과 점수만 빠르게 확인할 수 있습니다.</p>
      </header>
      <SampleFlowNavigation snapshot={snapshot} />
      <div className="results-grid">
        <section className="span-4">
          <GameResultsSummary snapshot={snapshot} />
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
