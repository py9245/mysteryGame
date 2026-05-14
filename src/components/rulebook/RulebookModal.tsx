"use client";

import { useEffect } from "react";
import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide";
import { RulebookSections } from "./RulebookSections";
import { RULEBOOK_META, type RulebookScope } from "./rulebook-content";

export function RulebookModal({
  open,
  scope,
  onClose,
}: {
  open: boolean;
  scope: RulebookScope;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const meta = RULEBOOK_META[scope];

  return (
    <div className="modal-backdrop rulebook-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-shell rulebook-modal-shell"
        role="dialog"
        aria-modal="true"
        aria-label={meta.title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="rulebook-modal-header">
          <div>
            <p className="eyebrow">룰북</p>
            <h3 className="panel-title">{meta.title}</h3>
            <p className="panel-copy">{meta.intro}</p>
          </div>
          <button
            className="button-secondary rulebook-modal-close"
            type="button"
            onClick={onClose}
            aria-label="룰북 닫기"
          >
            닫기
          </button>
        </header>
        <div className="rulebook-modal-body">
          <RulebookSections scope={scope} />
          <OnboardingGuide scope={scope} variant="inline" />
        </div>
      </section>
    </div>
  );
}
