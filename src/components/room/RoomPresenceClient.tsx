"use client";

import { useEffect } from "react";

function buildPresenceEndpoint(roomId: string): string {
  return `/api/room/${encodeURIComponent(roomId)}/presence`;
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
  useEffect(() => {
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
            stageNumber,
          }),
          cache: "no-store",
        });
      } catch {
        // Presence sync is best effort only.
      }
    }

    const intervalId = window.setInterval(() => {
      if (!stopped) {
        void ping();
      }
    }, intervalMs);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [intervalMs, playerId, roomId, stageNumber]);

  return null;
}
