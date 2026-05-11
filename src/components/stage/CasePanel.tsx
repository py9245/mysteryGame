import type { RoomSnapshot } from "@/contracts/api";

export function CasePanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const stage = snapshot.stage;
  return (
    <section className="case-summary-panel">
      <div className="case-summary-header">
        <span className="status-badge" data-tone="live">
          {stage?.stageNumber ? `S${stage.stageNumber}` : "대기"}
        </span>
        <h3 className="panel-title">사건 공개 정보</h3>
      </div>
      <div className="case-summary-body">
        <p className="case-summary-title">{stage?.publicTitle ?? "브리핑 대기"}</p>
        <p className="panel-copy case-summary-description">
          {stage?.publicDescription ?? "아직 사건 설명이 열리지 않았습니다."}
        </p>
      </div>
    </section>
  );
}
