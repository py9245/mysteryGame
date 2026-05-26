"use client";

import { useEffect, useState } from "react";
import type { RoomSnapshot } from "@/contracts/api";

function clampSeconds(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function resolveTone(seconds: number): {
  modifier: string;
  hint: string;
  ariaLevel: "polite" | "assertive";
} {
  if (seconds <= 0) {
    return {
      modifier: "uiux-stage-countdown--zero",
      hint: "질문방이 열립니다.",
      ariaLevel: "assertive",
    };
  }
  if (seconds <= 3) {
    return {
      modifier: "uiux-stage-countdown--critical",
      hint: "곧 질문방이 열립니다.",
      ariaLevel: "assertive",
    };
  }
  if (seconds <= 5) {
    return {
      modifier: "uiux-stage-countdown--urgent",
      hint: "잠시 후 질문방이 열립니다.",
      ariaLevel: "polite",
    };
  }
  return {
    modifier: "",
    hint: "1분 브리핑이 끝나면 질문방과 시간 점수가 시작됩니다.",
    ariaLevel: "polite",
  };
}

export function StageStartCountdown({ snapshot }: { snapshot: RoomSnapshot }) {
  const seconds = clampSeconds(snapshot.stage?.remainingSeconds);
  const tone = resolveTone(seconds);
  const [announced, setAnnounced] = useState<number | null>(null);

  // Broadcast big number changes for screen-reader users only on the
  // urgent window (final 5 seconds) to avoid chatter every tick.
  useEffect(() => {
    if (seconds <= 5) {
      setAnnounced(seconds);
    } else if (announced !== null) {
      setAnnounced(null);
    }
  }, [seconds, announced]);

  return (
    <article
      className={`metric-card metric-card-emphasis uiux-stage-countdown ${tone.modifier}`.trim()}
    >
      <span className="metric-label">질문방 열림까지</span>
      <strong className="metric-value uiux-stage-countdown-row">
        <span className="uiux-stage-countdown-big num-tabular" aria-hidden="true">
          {seconds}
          <span className="uiux-stage-countdown-unit">초</span>
        </span>
        <span className="sr-only">{seconds}초 남음</span>
      </strong>
      <span className="metric-detail uiux-stage-countdown-hint">{tone.hint}</span>
      <span
        className="uiux-stage-live-region"
        role="status"
        aria-live={tone.ariaLevel}
        aria-atomic="true"
      >
        {announced !== null
          ? announced === 0
            ? "질문방이 곧 열립니다"
            : `${announced}초 남음`
          : ""}
      </span>
    </article>
  );
}
