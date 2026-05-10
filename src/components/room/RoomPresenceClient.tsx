"use client";

import { useEffect } from "react";

function buildPresenceEndpoint(roomId: string, playerId: string, stageNumber?: number): string {
  const params = new URLSearchParams({
    playerId,
  });

  if (typeof stageNumber === "number" && Number.isFinite(stageNumber)) {
    params.set("stageNumber", String(stageNumber));
  }

  return `/api/room/${encodeURIComponent(roomId)}?${params.toString()}`;
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
        await fetch(buildPresenceEndpoint(roomId, playerId, stageNumber), {
          method: "GET",
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
