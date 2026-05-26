"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse, LeaveRoomResponse } from "@/contracts/api";
import { useEscapeShortcut } from "@/lib/keyboard-shortcuts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveApiError(value: unknown): string | null {
  if (isRecord(value) && "error" in value && isRecord(value.error)) {
    return typeof value.error.message === "string" ? value.error.message : null;
  }

  return null;
}

const CONFIRM_WINDOW_MS = 3200;

export function LeaveRoomButton({
  roomId,
  playerId,
  className = "button-secondary button-compact track-a-leave-button",
  redirectHref = "/rooms",
  label = "방 나가기",
}: {
  roomId: string;
  playerId: string;
  className?: string;
  redirectHref?: string;
  label?: string;
}) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmTimerRef = useRef<number | null>(null);

  const clearConfirmTimer = useCallback(() => {
    if (confirmTimerRef.current !== null) {
      window.clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearConfirmTimer();
    };
  }, [clearConfirmTimer]);

  const cancelConfirm = useCallback(() => {
    setIsConfirming(false);
    clearConfirmTimer();
  }, [clearConfirmTimer]);

  useEscapeShortcut(cancelConfirm, isConfirming);

  async function performLeave() {
    setIsLeaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/room/${encodeURIComponent(roomId)}/leave`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          playerId,
        }),
      });

      let payload: unknown = null;

      try {
        payload = (await response.json()) as ApiResponse<LeaveRoomResponse>;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(resolveApiError(payload) ?? "방에서 나가지 못했습니다.");
      }

      if (typeof window !== "undefined") {
        window.location.assign(redirectHref);
      } else {
        router.replace(redirectHref);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "방에서 나가지 못했습니다.");
      setIsLeaving(false);
      setIsConfirming(false);
    }
  }

  function handleClick() {
    if (isLeaving) {
      return;
    }

    if (!isConfirming) {
      setIsConfirming(true);
      setErrorMessage(null);
      clearConfirmTimer();
      confirmTimerRef.current = window.setTimeout(() => {
        setIsConfirming(false);
        confirmTimerRef.current = null;
      }, CONFIRM_WINDOW_MS);
      return;
    }

    clearConfirmTimer();
    void performLeave();
  }

  const buttonLabel = isLeaving
    ? "나가는 중..."
    : isConfirming
      ? "한 번 더 눌러 나가기"
      : label;

  return (
    <div className="leave-room-stack uiux-lobby-leave-wrap">
      <div className="uiux-lobby-leave-confirm">
        <button
          className={`${className} uiux-lobby-leave-button`}
          type="button"
          onClick={handleClick}
          disabled={isLeaving}
          data-pending={isConfirming ? "true" : undefined}
          aria-live="polite"
        >
          {buttonLabel}
        </button>
        {isConfirming ? (
          <>
            <span className="uiux-lobby-leave-confirm-text" aria-hidden="true">
              확인
            </span>
            <button
              type="button"
              className="uiux-lobby-leave-cancel"
              onClick={cancelConfirm}
              aria-label="나가기 취소"
            >
              취소
            </button>
          </>
        ) : null}
      </div>
      {errorMessage ? <p className="message-negative">{errorMessage}</p> : null}
    </div>
  );
}
