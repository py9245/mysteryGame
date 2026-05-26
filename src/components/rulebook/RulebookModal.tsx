"use client";

import { useEffect, useRef } from "react";
import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide";
import { RulebookSections } from "./RulebookSections";
import { RULEBOOK_META, type RulebookScope } from "./rulebook-content";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function RulebookModal({
  open,
  scope,
  onClose,
}: {
  open: boolean;
  scope: RulebookScope;
  onClose: () => void;
}) {
  const shellRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Body scroll-lock while open
  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Focus management + ESC + Tab cycling (focus trap)
  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    // Defer to next tick so the shell exists
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "Tab" && shellRef.current) {
        const nodes = shellRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
        if (nodes.length === 0) {
          event.preventDefault();
          closeButtonRef.current?.focus();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey) {
          if (active === first || !shellRef.current.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      const previous = previousFocusRef.current;
      if (previous && typeof previous.focus === "function") {
        previous.focus();
      }
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const meta = RULEBOOK_META[scope];

  return (
    <div
      className="modal-backdrop rulebook-modal-backdrop track-b-rulebook-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        ref={shellRef}
        className="modal-shell rulebook-modal-shell track-b-rulebook-shell"
        role="dialog"
        aria-modal="true"
        aria-label={meta.title}
        data-scope={scope}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="rulebook-modal-header track-b-rulebook-header">
          <div className="track-b-rulebook-header-text">
            <p className="eyebrow track-b-rulebook-eyebrow">사건 파일 · 룰북</p>
            <h3 className="panel-title track-b-rulebook-title">{meta.title}</h3>
            <p className="panel-copy track-b-rulebook-intro">{meta.intro}</p>
          </div>
          <button
            ref={closeButtonRef}
            className="button-secondary rulebook-modal-close track-b-rulebook-close"
            type="button"
            onClick={onClose}
            aria-label="룰북 닫기"
          >
            <span aria-hidden="true" className="track-b-rulebook-close-icon">×</span>
            <span className="track-b-rulebook-close-label">닫기</span>
          </button>
        </header>
        <div className="rulebook-modal-body track-b-rulebook-body">
          <RulebookSections scope={scope} />
          <OnboardingGuide scope={scope} variant="inline" />
        </div>
      </section>
    </div>
  );
}
