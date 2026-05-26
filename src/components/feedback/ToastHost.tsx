"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  subscribeToToastDismiss,
  subscribeToToasts,
  type ToastPayload,
  type ToastTone,
} from "./toast-bus";

type ActiveToast = ToastPayload & {
  id: string;
  tone: ToastTone;
  durationMs: number;
  leaving?: boolean;
};

const MAX_VISIBLE = 4;
const DEFAULT_DURATION_MS = 3800;
const LEAVE_DURATION_MS = 200;

function toneIcon(tone: ToastTone): string {
  switch (tone) {
    case "success":
      return "✓";
    case "warn":
      return "!";
    case "error":
      return "×";
    case "info":
    default:
      return "i";
  }
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const startLeaving = useCallback(
    (id: string) => {
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
      );
      const removeTimer = setTimeout(() => removeToast(id), LEAVE_DURATION_MS);
      timersRef.current.set(`${id}:remove`, removeTimer);
    },
    [removeToast],
  );

  useEffect(() => {
    const offAdd = subscribeToToasts((payload) => {
      const durationMs = Math.max(1200, payload.durationMs ?? DEFAULT_DURATION_MS);
      const next: ActiveToast = {
        id: payload.id,
        tone: payload.tone ?? "info",
        title: payload.title,
        detail: payload.detail,
        durationMs,
      };

      setToasts((current) => {
        const filtered = current.filter((toast) => toast.id !== next.id);
        const merged = [...filtered, next];
        if (merged.length <= MAX_VISIBLE) return merged;
        const overflow = merged.length - MAX_VISIBLE;
        return merged.slice(overflow);
      });

      const dismissTimer = setTimeout(() => startLeaving(next.id), durationMs);
      timersRef.current.set(next.id, dismissTimer);
    });

    const offDismiss = subscribeToToastDismiss((id) => startLeaving(id));

    return () => {
      offAdd();
      offDismiss();
      const timers = timersRef.current;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [startLeaving]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="uiux-toast-host"
      role="region"
      aria-label="알림 영역"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="uiux-toast"
          data-tone={toast.tone}
          data-leaving={toast.leaving ? "true" : "false"}
          role="status"
          style={{ ["--uiux-toast-duration" as string]: `${toast.durationMs}ms` }}
        >
          <span className="uiux-toast-icon" aria-hidden>
            {toneIcon(toast.tone)}
          </span>
          <div className="uiux-toast-body">
            <p className="uiux-toast-title">{toast.title}</p>
            {toast.detail ? <p className="uiux-toast-detail">{toast.detail}</p> : null}
          </div>
          <button
            type="button"
            className="uiux-toast-close"
            aria-label="알림 닫기"
            onClick={() => startLeaving(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
