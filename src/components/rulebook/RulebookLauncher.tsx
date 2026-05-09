"use client";

import { useState } from "react";
import { RulebookModal } from "./RulebookModal";

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

  return (
    <>
      <button className={compact ? "button-secondary button-compact" : "button-secondary"} type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
      <RulebookModal open={open} scope={scope} onClose={() => setOpen(false)} />
    </>
  );
}
