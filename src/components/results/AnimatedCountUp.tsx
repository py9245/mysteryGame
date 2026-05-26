"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Target numeric value to animate to. Non-finite values render as 0. */
  value: number;
  /** Total animation duration in ms. Clamped to 200..1400. */
  durationMs?: number;
  /** Optional prefix (e.g., "+"). Applied only when value !== 0. */
  prefix?: string;
  /** Optional suffix (e.g., "회"). */
  suffix?: string;
  /** Additional class names for the inner span. */
  className?: string;
};

const MIN_DURATION = 200;
const MAX_DURATION = 1400;

/**
 * Smoothly counts up (or down) from the previous value to the next using
 * requestAnimationFrame with an ease-out curve. Honors prefers-reduced-motion
 * by snapping immediately. Designed for the large score numerics shown on the
 * stage/game result panels.
 */
export function AnimatedCountUp({
  value,
  durationMs = 900,
  prefix = "",
  suffix = "",
  className,
}: Props) {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = useState<number>(safeTarget);
  const [phase, setPhase] = useState<"idle" | "running" | "settled">("idle");
  const previousTargetRef = useRef<number>(safeTarget);
  const frameRef = useRef<number | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const from = previousTargetRef.current;
    const to = safeTarget;
    previousTargetRef.current = to;

    if (from === to) {
      setDisplay(to);
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplay(to);
      return;
    }

    const duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, durationMs));
    const start = performance.now();
    setPhase("running");

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      const rendered = progress >= 1 ? to : Math.round(current);
      setDisplay(rendered);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      frameRef.current = null;
      setPhase("settled");
      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current);
      }
      settleTimeoutRef.current = window.setTimeout(() => {
        setPhase("idle");
        settleTimeoutRef.current = null;
      }, 420);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
      }
    };
  }, [safeTarget, durationMs]);

  const showPrefix = prefix && display !== 0;
  const phaseClass =
    phase === "running"
      ? "uiux-results-count--active"
      : phase === "settled"
        ? "uiux-results-count--done"
        : "";
  const combinedClass = `uiux-results-count num-tabular ${phaseClass} ${className ?? ""}`
    .trim()
    .replace(/\s+/g, " ");

  return (
    <span className={combinedClass}>
      {showPrefix ? prefix : null}
      {display}
      {suffix}
    </span>
  );
}
