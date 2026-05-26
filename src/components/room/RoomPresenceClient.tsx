"use client";

import { useEffect, useRef } from "react";

function buildPresenceEndpoint(roomId: string): string {
  return `/api/room/${encodeURIComponent(roomId)}/presence`;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function RoomPresenceClient({
  roomId,
  playerId,
  stageNumber,
  intervalMs = 10_000,
}: {
  roomId: string;
  playerId: string;
  stageNumber?: number;
  intervalMs?: number;
}) {
  const stageNumberRef = useRef(stageNumber);

  useEffect(() => {
    stageNumberRef.current = stageNumber;
  }, [stageNumber]);

  useEffect(() => {
    if (!isUuidLike(playerId)) {
      return;
    }

    let stopped = false;

    async function ping() {
      try {
        await fetch(buildPresenceEndpoint(roomId), {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            playerId,
            stageNumber: stageNumberRef.current,
          }),
          cache: "no-store",
        });
      } catch {
        // Presence sync is best effort only.
      }
    }

    void ping();

    const intervalId = window.setInterval(() => {
      if (!stopped) {
        void ping();
      }
    }, intervalMs);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [intervalMs, playerId, roomId]);

  return null;
}
