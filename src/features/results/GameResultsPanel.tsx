import type { RoomSnapshot } from "@/contracts/api";
import { RoomPresenceClient } from "@/components/room/RoomPresenceClient";
import { LeaveRoomButton } from "@/components/room/LeaveRoomButton";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { GameResultsSummary } from "@/components/results/GameResultsSummary";
import { StageResolutionReveal } from "@/components/results/StageResolutionReveal";
import { RankingTable } from "@/components/results/RankingTable";
import { PersonalScoreBreakdown } from "@/components/results/PersonalScoreBreakdown";

export function GameResultsPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="page-shell">
      <RoomPresenceClient roomId={snapshot.room.id} playerId={snapshot.me.playerId} />
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
            <LeaveRoomButton
              roomId={snapshot.room.id}
              playerId={snapshot.me.playerId}
              redirectHref="/"
              label="게임 나가기"
            />
            <RulebookLauncher label="룰북" compact scope="game" />
          </div>
        </div>
      </header>
      <div className="results-grid">
        {snapshot.stage?.caseResolution ? (
          <section className="span-12">
            <StageResolutionReveal
              title={snapshot.stage.publicTitle}
              resolution={snapshot.stage.caseResolution}
              requiredKeywordCount={snapshot.stage.requiredKeywordCount}
              bonusKeywordCount={snapshot.stage.bonusKeywordCount}
            />
          </section>
        ) : null}
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
