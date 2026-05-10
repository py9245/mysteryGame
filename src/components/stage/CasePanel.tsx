import type { RoomSnapshot } from "@/contracts/api";

export function CasePanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const stage = snapshot.stage;
  return (
    <section className="panel panel-muted">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">사건 파일</h3>
          <p className="panel-copy">현재 스테이지의 공개 사건 정보만 보여줍니다.</p>
        </div>
        <span className="status-badge" data-tone="live">
          {stage?.stageNumber ? `S${stage.stageNumber}` : "대기"}
        </span>
      </div>
      <p className="metric-label">사건명</p>
      <p className="panel-copy">{stage?.publicTitle ?? "브리핑 대기"}</p>
      <p className="metric-label">공개 설명</p>
      <p className="panel-copy">{stage?.publicDescription ?? "아직 사건 설명이 열리지 않았습니다."}</p>
    </section>
  );
}
