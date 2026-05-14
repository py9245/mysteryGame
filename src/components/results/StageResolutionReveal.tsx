"use client";

import { useEffect, useMemo, useState } from "react";
import type { StageCaseResolutionView } from "@/contracts/view";

const TYPE_INTERVAL_MS = 20;

function normalizeRevealText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function StageResolutionReveal({
  title,
  resolution,
  requiredKeywordCount,
  bonusKeywordCount,
}: {
  title: string;
  resolution: StageCaseResolutionView;
  requiredKeywordCount: number;
  bonusKeywordCount: number;
}) {
  const revealText = useMemo(
    () =>
      normalizeRevealText(resolution.truth) ||
      normalizeRevealText(resolution.acceptedAnswerSummary) ||
      "아직 공개할 사건의 전말이 없습니다.",
    [resolution.acceptedAnswerSummary, resolution.truth],
  );
  const summaryText = normalizeRevealText(resolution.acceptedAnswerSummary);
  const [visibleLength, setVisibleLength] = useState(0);
  const isComplete = visibleLength >= revealText.length;

  useEffect(() => {
    setVisibleLength(0);

    if (revealText.length === 0) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleLength(revealText.length);
      return;
    }

    const step = revealText.length > 220 ? 2 : 1;
    const intervalId = window.setInterval(() => {
      setVisibleLength((current) => {
        const next = Math.min(revealText.length, current + step);
        if (next >= revealText.length) {
          window.clearInterval(intervalId);
        }
        return next;
      });
    }, TYPE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [revealText]);

  return (
    <section className="panel panel-accent stage-resolution-reveal">
      <div className="composer-header stage-resolution-header">
        <div>
          <h3 className="panel-title">사건의 전말</h3>
          <p className="panel-copy">{title}</p>
        </div>
        <div className="case-keyword-counts stage-resolution-keywords" aria-label="정답 키워드 기준">
          <span className="case-keyword-count" data-tone="required">필수 {requiredKeywordCount}개</span>
          <span className="case-keyword-count" data-tone="bonus">추가 {bonusKeywordCount}개</span>
        </div>
      </div>

      <div className="stage-resolution-typewriter" aria-label={revealText}>
        <p>
          {revealText.slice(0, visibleLength)}
          {!isComplete ? <span className="stage-resolution-cursor" aria-hidden="true" /> : null}
        </p>
      </div>

      <div className="stage-resolution-footer">
        {summaryText ? (
          <p className="stage-resolution-summary">
            <span>정답 요약</span>
            <strong>{summaryText}</strong>
          </p>
        ) : null}
        <button
          className="button-secondary stage-resolution-skip"
          type="button"
          onClick={() => setVisibleLength(revealText.length)}
          disabled={isComplete}
        >
          빠르게 보기
        </button>
      </div>
    </section>
  );
}
