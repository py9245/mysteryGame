import type { RoomSnapshot } from "@/contracts/api";

export function CasePanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const stage = snapshot.stage;
  const requiredKeywordCount = stage?.requiredKeywordCount ?? 0;
  const bonusKeywordCount = stage?.bonusKeywordCount ?? 0;
  const hasStage = Boolean(stage);

  return (
    <section
      className="case-summary-panel track-c-case-panel"
      data-stage-ready={hasStage ? "true" : "false"}
      aria-label="사건 공개 정보"
    >
      <div className="case-summary-header track-c-case-panel__header">
        <div className="case-summary-header-main track-c-case-panel__heading">
          <span className="status-badge track-c-case-panel__badge" data-tone="live">
            {stage?.stageNumber ? `S${stage.stageNumber}` : "대기"}
          </span>
          <h3 className="panel-title track-c-case-panel__title-label">사건 파일</h3>
        </div>
        <div className="case-keyword-counts track-c-case-panel__keywords" aria-label="정답 키워드 개수">
          <span className="case-keyword-count num-tabular" data-tone="required">필수 {requiredKeywordCount}개</span>
          <span className="case-keyword-count num-tabular" data-tone="bonus">추가 {bonusKeywordCount}개</span>
        </div>
      </div>
      <div className="case-summary-body track-c-case-panel__body">
        <p className="case-summary-title track-c-case-panel__case-title">
          {stage?.publicTitle ?? "브리핑 대기"}
        </p>
        <p className="panel-copy case-summary-description track-c-case-panel__case-description">
          {stage?.publicDescription ?? "아직 사건 설명이 열리지 않았습니다."}
        </p>
      </div>
    </section>
  );
}
