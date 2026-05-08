import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { SampleFlowNavigation } from "@/components/navigation/SampleFlowNavigation";
import { StageRuleBulletList } from "./StageRuleBulletList";
import { StageStartCountdown } from "./StageStartCountdown";

export function StageBriefingPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="page-shell">
      <header className="page-header">
        <p className="eyebrow">사건 브리핑</p>
        <h2 className="page-title">브리핑</h2>
        <p className="page-kicker">{snapshot.stage?.publicTitle ?? "사건 브리핑 대기"}</p>
      </header>
      <SampleFlowNavigation snapshot={snapshot} currentStageNumber={snapshot.stage?.stageNumber} />
      <div className="hero-grid">
        <section className="panel panel-accent hero-card">
          <h3 className="panel-title">공개 설명</h3>
          <p className="panel-copy">
            {snapshot.stage?.publicDescription ?? "아직 공개된 사건 설명이 없습니다."}
          </p>
        </section>
        <section className="hero-aside">
          <StageStartCountdown snapshot={snapshot} />
        </section>
      </div>
      <section className="panel panel-muted">
        <h3 className="panel-title">현재 공개된 힌트</h3>
        <StageRuleBulletList snapshot={snapshot} />
      </section>
    </section>
  );
}
