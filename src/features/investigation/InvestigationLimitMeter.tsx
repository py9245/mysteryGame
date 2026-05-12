import type { RoomSnapshot } from "@/contracts/api";

function toNumber(value: number | { hidden: true } | undefined) {
  return typeof value === "number" ? value : 0;
}

export function InvestigationLimitMeter({ snapshot }: { snapshot: RoomSnapshot }) {
  const investigation = snapshot.stage?.investigation;
  return (
    <section className="metric-grid investigation-meter-grid">
      <article className="metric-card metric-card-emphasis">
        <span className="metric-label">이번 입장 질문 기회</span>
        <strong className="metric-value">{toNumber(investigation?.questionCountRemaining)}</strong>
        <span className="metric-detail">질문방에 다시 입장하면 새 기회로 시작합니다.</span>
      </article>
      <article className="metric-card metric-card-emphasis">
        <span className="metric-label">이번 입장 정답 기회</span>
        <strong className="metric-value">{toNumber(investigation?.answerAttemptCountRemaining)}</strong>
        <span className="metric-detail">무리한 시도는 점수 손실로 이어집니다.</span>
      </article>
    </section>
  );
}
