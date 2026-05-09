import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { SampleFlowNavigation } from "@/components/navigation/SampleFlowNavigation";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { StageRuleBulletList } from "./StageRuleBulletList";
import { StageStartCountdown } from "./StageStartCountdown";

export function StageBriefingPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="page-shell">
      <header className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">현재 상태</p>
            <h2 className="page-title">브리핑</h2>
            <div className="header-flow">
              <p className="header-flow-line">
                <strong>핵심 설명</strong> · {snapshot.stage?.publicTitle ?? "사건 브리핑 대기"}를 읽는 구간입니다.
              </p>
              <p className="header-flow-line" data-tone="action">
                <strong>다음 행동</strong> · 내용을 공유하고 바로 추리 진행으로 넘어갑니다.
              </p>
            </div>
          </div>
          <div className="header-actions">
            <RulebookLauncher label="룰북" compact scope="game" />
          </div>
        </div>
      </header>
      <SampleFlowNavigation snapshot={snapshot} currentStageNumber={snapshot.stage?.stageNumber} />
      <div className="hero-grid">
        <section className="panel panel-accent hero-card briefing-main">
          <div className="briefing-hero-cta">
            <h3 className="panel-title">사건 공개 설명</h3>
            <p className="panel-copy">{snapshot.stage?.publicDescription ?? "아직 공개된 사건 설명이 없습니다."}</p>
          </div>
          <div className="composer-header">
            <span className="status-badge" data-tone="live">
              브리핑 중
            </span>
          </div>
          <div className="briefing-countdown-card">
            <StageStartCountdown snapshot={snapshot} />
          </div>
        </section>
      </div>
      <section className="panel panel-muted briefing-hints">
        <h3 className="panel-title">현재 공개된 힌트</h3>
        <StageRuleBulletList snapshot={snapshot} />
      </section>
    </section>
  );
}
