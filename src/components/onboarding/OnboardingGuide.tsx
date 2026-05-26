"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RULEBOOK_META,
  RULEBOOK_ONBOARDING,
  type RulebookScope,
} from "@/components/rulebook/rulebook-content";
import { useKeyboardShortcut } from "@/lib/keyboard-shortcuts";

export function OnboardingGuide({
  scope = "main",
  variant = "panel",
}: {
  scope?: RulebookScope;
  variant?: "panel" | "inline";
}) {
  const meta = RULEBOOK_META[scope];
  const steps = RULEBOOK_ONBOARDING[scope];
  const [activeStep, setActiveStep] = useState(0);

  // Reset active step when scope changes so users don't see a stale highlight
  useEffect(() => {
    setActiveStep(0);
  }, [scope]);

  const totalSteps = steps.length;
  const lastIndex = totalSteps - 1;

  // Keyboard arrow navigation: ← / → cycle through onboarding steps.
  // Skips when focus is in an editable target (handled by the hook).
  const handlePrev = useCallback(() => {
    setActiveStep((current) => (current > 0 ? current - 1 : current));
  }, []);
  const handleNext = useCallback(() => {
    setActiveStep((current) => (current < lastIndex ? current + 1 : current));
  }, [lastIndex]);

  useKeyboardShortcut("arrowleft", handlePrev, {
    enabled: totalSteps > 1,
    preventDefault: false,
    description: "이전 온보딩 단계",
  });
  useKeyboardShortcut("arrowright", handleNext, {
    enabled: totalSteps > 1,
    preventDefault: false,
    description: "다음 온보딩 단계",
  });

  const indicator = (
    <ol className="track-b-onboarding-stepper" aria-label="단계 진행">
      {steps.map((step, index) => {
        const isActive = index === activeStep;
        const isDone = index < activeStep;
        return (
          <li
            key={`${scope}-stepper-${step.step}`}
            className="track-b-onboarding-stepper-item"
            data-active={isActive || undefined}
            data-done={isDone || undefined}
          >
            <button
              type="button"
              className="track-b-onboarding-stepper-dot"
              onClick={() => setActiveStep(index)}
              aria-label={`${index + 1}단계: ${step.title}`}
              aria-current={isActive ? "step" : undefined}
            >
              {String(index + 1).padStart(2, "0")}
            </button>
            {index < lastIndex && <span className="track-b-onboarding-stepper-line" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );

  const cards = (
    <div className="track-b-onboarding-cards">
      {steps.map((step, index) => {
        const isActive = index === activeStep;
        return (
          <article
            key={`${scope}-${step.step}`}
            className="track-b-onboarding-card"
            data-active={isActive || undefined}
            onMouseEnter={() => setActiveStep(index)}
            onFocus={() => setActiveStep(index)}
            tabIndex={0}
          >
            <header className="track-b-onboarding-card-head">
              <span className="track-b-onboarding-card-step">STEP {step.step}</span>
              <strong className="track-b-onboarding-card-title">{step.title}</strong>
            </header>
            <p className="track-b-onboarding-card-body">{step.body}</p>
          </article>
        );
      })}
    </div>
  );

  const keyboardHint =
    totalSteps > 1 ? (
      <p className="uiux-realtime-onboarding-hint" aria-hidden="true">
        <kbd>←</kbd>
        <kbd>→</kbd>
        키로 단계 이동
      </p>
    ) : null;

  if (variant === "inline") {
    return (
      <section className="track-b-onboarding-inline" aria-label={meta.onboardingTitle}>
        <header className="track-b-onboarding-heading">
          <div>
            <p className="eyebrow track-b-onboarding-eyebrow">시작 가이드</p>
            <h4 className="panel-title track-b-onboarding-title">{meta.onboardingTitle}</h4>
            <p className="panel-copy track-b-onboarding-desc">{meta.onboardingDescription}</p>
            {keyboardHint}
          </div>
          {indicator}
        </header>
        {cards}
      </section>
    );
  }

  return (
    <section className="panel panel-muted track-b-onboarding-panel" aria-label={meta.onboardingTitle}>
      <div className="composer-header track-b-onboarding-heading">
        <div>
          <p className="eyebrow track-b-onboarding-eyebrow">시작 가이드</p>
          <h2 className="panel-title track-b-onboarding-title">{meta.onboardingTitle}</h2>
          <p className="panel-copy track-b-onboarding-desc">{meta.onboardingDescription}</p>
          {keyboardHint}
        </div>
        {indicator}
      </div>
      {cards}
    </section>
  );
}
