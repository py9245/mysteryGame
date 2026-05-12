import type { RoomSnapshot } from "@/contracts/api";

function toVisibleNumber(value: number | { hidden: true } | null | undefined): number | null {
  return typeof value === "number" ? value : null;
}

function resolveOptimisticTickDelta({
  snapshot,
  nowMs,
  timerStartedAt,
}: {
  snapshot: RoomSnapshot;
  nowMs?: number;
  timerStartedAt?: string | null;
}) {
  if (
    typeof nowMs !== "number" ||
    snapshot.stage?.status !== "in_progress" ||
    snapshot.me.stageStatus !== "active"
  ) {
    return 0;
  }

  const myScore = snapshot.scores.find((score) => score.isMe);
  const lastEventAt = typeof myScore?.lastEventAt === "string" ? myScore.lastEventAt : null;
  const tickBaseMs = Date.parse(lastEventAt ?? timerStartedAt ?? "");

  if (!Number.isFinite(tickBaseMs) || nowMs <= tickBaseMs) {
    return 0;
  }

  return Math.floor((nowMs - tickBaseMs) / 1000);
}

export function MyScoreCard({
  snapshot,
  nowMs,
  timerStartedAt = null,
  className = "",
}: {
  snapshot: RoomSnapshot;
  nowMs?: number;
  timerStartedAt?: string | null;
  className?: string;
}) {
  const tickDelta = resolveOptimisticTickDelta({ snapshot, nowMs, timerStartedAt });
  const stageScore = snapshot.me.stageScore + tickDelta;
  const totalScore = snapshot.me.totalScore + tickDelta;

  return (
    <section className={`score-card ${className}`.trim()}>
      <span className="metric-label">내 누적 점수</span>
      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">이번 스테이지 점수</span>
          <span className="metric-value">{stageScore}</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">총 점수</span>
          <span className="metric-value">{toVisibleNumber(totalScore) ?? "-"}</span>
        </article>
      </div>
    </section>
  );
}
