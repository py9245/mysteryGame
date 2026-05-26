export type ToastTone = "info" | "success" | "warn" | "error";

export type ToastPayload = {
  id?: string;
  tone?: ToastTone;
  title: string;
  detail?: string;
  durationMs?: number;
};

const TOAST_EVENT = "mt:toast";
const TOAST_DISMISS_EVENT = "mt:toast:dismiss";

export function emitToast(payload: ToastPayload): string {
  if (typeof window === "undefined") {
    return "";
  }

  const id = payload.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const event = new CustomEvent<ToastPayload & { id: string }>(TOAST_EVENT, {
    detail: { ...payload, id },
  });
  window.dispatchEvent(event);
  return id;
}

export function dismissToast(id: string) {
  if (typeof window === "undefined") {
    return;
  }
  const event = new CustomEvent<{ id: string }>(TOAST_DISMISS_EVENT, { detail: { id } });
  window.dispatchEvent(event);
}

export function subscribeToToasts(
  handler: (payload: ToastPayload & { id: string }) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<ToastPayload & { id: string }>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(TOAST_EVENT, listener);
  return () => window.removeEventListener(TOAST_EVENT, listener);
}

export function subscribeToToastDismiss(
  handler: (id: string) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ id: string }>).detail;
    if (detail?.id) handler(detail.id);
  };
  window.addEventListener(TOAST_DISMISS_EVENT, listener);
  return () => window.removeEventListener(TOAST_DISMISS_EVENT, listener);
}
