"use client";

import { useEffect, useRef, useState } from "react";
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

function resolveScoreEventRecency(snapshot: RoomSnapshot, nowMs?: number) {
  if (typeof nowMs !== "number") {
    return { isFresh: false, secondsSince: null as number | null };
  }

  const myScore = snapshot.scores.find((score) => score.isMe);
  const lastEventAt = typeof myScore?.lastEventAt === "string" ? myScore.lastEventAt : null;
  if (!lastEventAt) {
    return { isFresh: false, secondsSince: null as number | null };
  }

  const lastMs = Date.parse(lastEventAt);
  if (!Number.isFinite(lastMs)) {
    return { isFresh: false, secondsSince: null as number | null };
  }

  const secondsSince = Math.max(0, Math.floor((nowMs - lastMs) / 1000));
  return { isFresh: secondsSince <= 8, secondsSince };
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
  const totalScoreRaw = snapshot.me.totalScore + tickDelta;
  const totalScore = toVisibleNumber(totalScoreRaw);
  const { isFresh, secondsSince } = resolveScoreEventRecency(snapshot, nowMs);

  // Burst animation on score increase.
  const previousStageScoreRef = useRef<number>(snapshot.me.stageScore);
  const [burstKey, setBurstKey] = useState<number>(0);
  const [deltaLabel, setDeltaLabel] = useState<string | null>(null);

  useEffect(() => {
    const prev = previousStageScoreRef.current;
    if (snapshot.me.stageScore > prev) {
      const diff = snapshot.me.stageScore - prev;
      setBurstKey((k) => k + 1);
      setDeltaLabel(`+${diff}`);
      const timeoutId = window.setTimeout(() => setDeltaLabel(null), 2400);
      previousStageScoreRef.current = snapshot.me.stageScore;
      return () => window.clearTimeout(timeoutId);
    }
    previousStageScoreRef.current = snapshot.me.stageScore;
  }, [snapshot.me.stageScore]);

  return (
    <section
      key={`score-${burstKey}`}
      className={`score-card track-c-score-card${isFresh ? " track-c-score-card--pulse" : ""}${
        burstKey > 0 && deltaLabel ? " uiux-gameplay-score-burst" : ""
      } ${className}`.trim()}
      aria-label="내 점수 카드"
      aria-live="polite"
    >
      <header className="track-c-score-card__head">
        <span className="track-c-score-card__eyebrow">사건 파일 · 내 점수</span>
        {deltaLabel ? (
          <span className="uiux-gameplay-score-delta-pill num-tabular" aria-hidden="true">
            {deltaLabel}
          </span>
        ) : isFresh ? (
          <span className="status-badge track-c-score-card__delta" data-tone="live">
            방금 갱신
          </span>
        ) : secondsSince !== null && secondsSince < 60 ? (
          <span className="status-badge track-c-score-card__delta num-tabular">{secondsSince}초 전 갱신</span>
        ) : null}
      </header>
      <div className="track-c-score-card__grid">
        <article className="track-c-score-card__metric track-c-score-card__metric--stage">
          <span className="track-c-score-card__metric-label">이번 스테이지</span>
          <strong className="track-c-score-card__metric-value num-tabular">{stageScore}</strong>
        </article>
        <article className="track-c-score-card__metric track-c-score-card__metric--total">
          <span className="track-c-score-card__metric-label">총 누적</span>
          <strong className="track-c-score-card__metric-value num-tabular">{totalScore ?? "-"}</strong>
        </article>
      </div>
    </section>
  );
}
