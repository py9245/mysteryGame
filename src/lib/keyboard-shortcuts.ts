"use client";

import { useEffect } from "react";

export type ShortcutKey = string;

export type ShortcutHandler = (event: KeyboardEvent) => void | boolean;

type Options = {
  enabled?: boolean;
  allowInInput?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  description?: string;
};

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (EDITABLE_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

function normalizeBinding(binding: ShortcutKey): {
  key: string;
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
} {
  const parts = binding.toLowerCase().split("+").map((part) => part.trim());
  const key = parts.pop() ?? "";
  return {
    key,
    meta: parts.includes("meta") || parts.includes("cmd"),
    ctrl: parts.includes("ctrl") || parts.includes("control"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt") || parts.includes("option"),
  };
}

function matchesBinding(event: KeyboardEvent, binding: ShortcutKey): boolean {
  const normalized = normalizeBinding(binding);
  const eventKey = event.key.toLowerCase();
  if (eventKey !== normalized.key) return false;
  if (event.metaKey !== normalized.meta) return false;
  if (event.ctrlKey !== normalized.ctrl) return false;
  if (event.shiftKey !== normalized.shift) return false;
  if (event.altKey !== normalized.alt) return false;
  return true;
}

/**
 * Bind a single shortcut for the lifetime of the calling component.
 * Default behavior ignores key presses while the focus is inside an
 * editable element unless `allowInInput` is set.
 */
export function useKeyboardShortcut(
  binding: ShortcutKey | ShortcutKey[],
  handler: ShortcutHandler,
  options: Options = {},
) {
  const {
    enabled = true,
    allowInInput = false,
    preventDefault = true,
    stopPropagation = false,
  } = options;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const bindings = Array.isArray(binding) ? binding : [binding];

    function listener(event: KeyboardEvent) {
      if (!allowInInput && isEditableTarget(event.target)) {
        return;
      }
      const matched = bindings.some((entry) => matchesBinding(event, entry));
      if (!matched) return;
      const result = handler(event);
      if (result === false) return;
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
    }

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [allowInInput, binding, enabled, handler, preventDefault, stopPropagation]);
}

/**
 * Convenience for the common "press Escape to close" pattern.
 */
export function useEscapeShortcut(handler: () => void, enabled = true) {
  useKeyboardShortcut(
    "escape",
    () => {
      handler();
    },
    { enabled, allowInInput: true, preventDefault: false },
  );
}
