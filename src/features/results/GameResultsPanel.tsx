import type { RoomSnapshot } from "@/contracts/api";
import { SampleFlowNavigation } from "@/components/navigation/SampleFlowNavigation";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { GameResultsSummary } from "@/components/results/GameResultsSummary";
import { RankingTable } from "@/components/results/RankingTable";
import { PersonalScoreBreakdown } from "@/components/results/PersonalScoreBreakdown";

export function GameResultsPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="page-shell">
      <header className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">현재 상태</p>
            <h2 className="page-title">최종 결과</h2>
            <div className="header-flow">
              <p className="header-flow-line">
                <strong>핵심 설명</strong> · 이번 판의 결말과 내 전적을 확인합니다.
              </p>
              <p className="header-flow-line" data-tone="action">
                <strong>다음 행동</strong> · 홈으로 돌아가 전적을 봅니다.
              </p>
            </div>
          </div>
          <div className="header-actions">
            <RulebookLauncher label="룰북" compact scope="game" />
          </div>
        </div>
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
