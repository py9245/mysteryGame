import type { RoomSnapshot } from "@/contracts/api";
import { RoomPresenceClient } from "@/components/room/RoomPresenceClient";
import { LeaveRoomButton } from "@/components/room/LeaveRoomButton";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { StageResultsSummary } from "@/components/results/StageResultsSummary";
import { StageResolutionReveal } from "@/components/results/StageResolutionReveal";
import { RankingTable } from "@/components/results/RankingTable";
import { PersonalScoreBreakdown } from "@/components/results/PersonalScoreBreakdown";
import { StageResultsAdvanceCard } from "./StageResultsAdvanceCard";

export function StageResultsPanel({
  snapshot,
  currentStageNumber,
}: {
  snapshot: RoomSnapshot;
  currentStageNumber?: number;
}) {
  return (
    <section className="page-shell">
      <RoomPresenceClient
        roomId={snapshot.room.id}
        playerId={snapshot.me.playerId}
        stageNumber={currentStageNumber ?? snapshot.stage?.stageNumber}
      />
      <header className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">현재 상태</p>
            <h2 className="page-title">스테이지 결과</h2>
            <div className="header-flow">
              <p className="header-flow-line">
                <strong>핵심 설명</strong> · 이번 스테이지 정산을 먼저 확인합니다.
              </p>
              <p className="header-flow-line" data-tone="action">
                <strong>다음 행동</strong> · 방장과 관리자는 다음 스테이지 준비를 누릅니다.
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
      <StageResultsAdvanceCard snapshot={snapshot} currentStageNumber={currentStageNumber ?? snapshot.stage?.stageNumber ?? snapshot.game?.currentStageNumber ?? 1} />
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
