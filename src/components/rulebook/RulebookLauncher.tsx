"use client";

import { useCallback, useState } from "react";
import { RulebookModal } from "./RulebookModal";
import { useKeyboardShortcut } from "@/lib/keyboard-shortcuts";

const SCOPE_HINT: Record<"main" | "lobby" | "game", string> = {
  main: "메인 화면 룰북 열기",
  lobby: "대기실 룰북 열기",
  game: "게임 진행 룰북 열기",
};

export function RulebookLauncher({
  label = "룰북",
  compact = false,
  scope = "main",
}: {
  label?: string;
  compact?: boolean;
  scope?: "main" | "lobby" | "game";
}) {
  const [open, setOpen] = useState(false);

  const className = [
    "button-secondary",
    compact ? "button-compact" : "",
    "track-b-rulebook-launcher",
  ]
    .filter(Boolean)
    .join(" ");

  // Global `?` (= shift+/) shortcut to open the rulebook from anywhere.
  // `/` alone is reserved for input focus (home code field / chat composer).
  const openHandler = useCallback(() => {
    setOpen(true);
  }, []);
  useKeyboardShortcut(["?", "shift+/"], openHandler, {
    enabled: !open,
    preventDefault: true,
    description: "룰북 열기",
  });

  return (
    <>
      <button
        className={className}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={SCOPE_HINT[scope]}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="?"
        title={`${SCOPE_HINT[scope]} (? 키)`}
        data-scope={scope}
      >
        <span className="track-b-rulebook-launcher-icon" aria-hidden="true">?</span>
        <span className="track-b-rulebook-launcher-label">{label}</span>
        {!compact && (
          <span className="uiux-rulebook-launcher-hint" aria-hidden="true">?</span>
        )}
      </button>
      <RulebookModal open={open} scope={scope} onClose={() => setOpen(false)} />
    </>
  );
}
