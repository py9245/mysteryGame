"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse, LeaveRoomResponse } from "@/contracts/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveApiError(value: unknown): string | null {
  if (isRecord(value) && "error" in value && isRecord(value.error)) {
    return typeof value.error.message === "string" ? value.error.message : null;
  }

  return null;
}

export function LeaveRoomButton({
  roomId,
  playerId,
  className = "button-secondary button-compact",
  redirectHref = "/rooms",
}: {
  roomId: string;
  playerId: string;
  className?: string;
  redirectHref?: string;
}) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLeave() {
    if (isLeaving) {
      return;
    }

    if (!window.confirm("정말 이 방에서 나가시겠습니까?")) {
      return;
    }

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
    }
  }

  return (
    <div className="leave-room-stack">
      <button className={className} type="button" onClick={handleLeave} disabled={isLeaving}>
        {isLeaving ? "나가는 중..." : "방 나가기"}
      </button>
      {errorMessage ? <p className="message-negative">{errorMessage}</p> : null}
    </div>
  );
}
