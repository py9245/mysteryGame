"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { StageCaseResolutionView } from "@/contracts/view";

const TYPE_INTERVAL_MS = 20;
const KEYWORD_STAGGER_MS = 110;
const KEYWORD_START_DELAY_MS = 220;

function normalizeRevealText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

/**
 * Try to extract keyword-like tokens from the public accepted-answer summary.
 * The summary is a free-form 한국어 sentence so we pull the first meaningful
 * chunk separated by common punctuation. We keep this best-effort — the chips
 * are decorative emphasis on top of the typewriter, never the source of truth.
 */
function extractKeywords(summary: string): string[] {
  if (!summary) return [];
  const tokens = summary
    .split(/[,，·•·;；·\n]+|\s\/\s/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && token.length <= 22);
  // de-dupe while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    unique.push(token);
  }
  return unique.slice(0, 6);
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
  const keywords = useMemo(() => extractKeywords(summaryText), [summaryText]);
  const [visibleLength, setVisibleLength] = useState(0);
  const [keywordsRevealed, setKeywordsRevealed] = useState(false);
  const isComplete = visibleLength >= revealText.length;

  useEffect(() => {
    setVisibleLength(0);
    setKeywordsRevealed(false);

    if (revealText.length === 0) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisibleLength(revealText.length);
      setKeywordsRevealed(true);
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

  // Stagger keyword chips once the typewriter finishes.
  useEffect(() => {
    if (!isComplete || keywordsRevealed) return;
    const timeoutId = window.setTimeout(() => {
      setKeywordsRevealed(true);
    }, KEYWORD_START_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isComplete, keywordsRevealed]);

  const handleSkip = () => {
    setVisibleLength(revealText.length);
    setKeywordsRevealed(true);
  };

  const progressPercent =
    revealText.length === 0
      ? 100
      : Math.round((visibleLength / revealText.length) * 100);

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
        <span
          className="uiux-stage-live-region"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {isComplete ? "사건 전말 공개 완료" : `사건 전말 공개 중 ${progressPercent}퍼센트`}
        </span>
        {!isComplete ? (
          <span className="uiux-results-reveal-progress num-tabular" aria-hidden="true">
            {progressPercent}%
          </span>
        ) : null}
      </div>

      {keywords.length > 0 && keywordsRevealed ? (
        <div
          className="uiux-results-reveal-keywords"
          role="list"
          aria-label="공개된 정답 키워드"
        >
          {keywords.map((keyword, index) => (
            <span
              key={`${keyword}-${index}`}
              role="listitem"
              className="uiux-results-keyword-chip"
              style={{
                "--uiux-keyword-delay": `${index * KEYWORD_STAGGER_MS}ms`,
              } as CSSProperties}
            >
              {keyword}
            </span>
          ))}
        </div>
      ) : null}

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
          onClick={handleSkip}
          disabled={isComplete && keywordsRevealed}
        >
          빠르게 보기
        </button>
      </div>
    </section>
  );
}
