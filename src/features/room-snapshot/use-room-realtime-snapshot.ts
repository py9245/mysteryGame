"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RoomSnapshot } from "@/contracts/api";
import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from "@/lib/supabase-browser";
import { normalizeRoomSnapshot } from "./room-snapshot-loader";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function shouldRefreshRoomSnapshot(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function buildSnapshotEndpoint(snapshot: RoomSnapshot): string {
  const stageNumber = snapshot.stage?.stageNumber ?? snapshot.game?.currentStageNumber ?? 1;
  const params = new URLSearchParams({
    playerId: snapshot.me.playerId,
    stageNumber: String(stageNumber),
  });

  return `/api/room/${encodeURIComponent(snapshot.room.id)}?${params.toString()}`;
}

export function useRoomRealtimeSnapshot(
  initialSnapshot: RoomSnapshot,
  options: {
    fallbackIntervalMs?: number;
  } = {},
): [RoomSnapshot, Dispatch<SetStateAction<RoomSnapshot>>] {
  const fallbackIntervalMs = options.fallbackIntervalMs ?? 20_000;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const snapshotRef = useRef(initialSnapshot);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const subscriptionKey = useMemo(
    () => ({
      roomId: snapshot.room.id,
      stageId: snapshot.stage?.stageId ?? null,
    }),
    [snapshot.room.id, snapshot.stage?.stageId],
  );

  useEffect(() => {
    let mounted = true;
    let scheduledRefreshId: number | null = null;
    let fallbackRefreshId: number | null = null;
    let roomChannel: RealtimeChannel | null = null;
    let stageChannel: RealtimeChannel | null = null;

    async function refreshSnapshot() {
      scheduledRefreshId = null;

      if (!shouldRefreshRoomSnapshot()) {
        return;
      }

      try {
        const response = await fetch(buildSnapshotEndpoint(snapshotRef.current), {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as unknown;
        const nextSnapshot =
          isRecord(payload) && "data" in payload
            ? normalizeRoomSnapshot(payload.data)
            : normalizeRoomSnapshot(payload);

        if (mounted && nextSnapshot) {
          setSnapshot(nextSnapshot);
        }
      } catch {
        // Realtime refresh is best effort only.
      }
    }

    function scheduleRefresh() {
      if (scheduledRefreshId !== null) {
        return;
      }

      scheduledRefreshId = window.setTimeout(() => {
        void refreshSnapshot();
      }, 180);
    }

    fallbackRefreshId = window.setInterval(() => {
      void refreshSnapshot();
    }, fallbackIntervalMs);

    if (hasSupabaseBrowserEnv()) {
      const supabase = getSupabaseBrowserClient();

      if (supabase) {
        roomChannel = supabase
          .channel(`room-snapshot:${subscriptionKey.roomId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "rooms", filter: `id=eq.${subscriptionKey.roomId}` },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "players", filter: `room_id=eq.${subscriptionKey.roomId}` },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "games", filter: `room_id=eq.${subscriptionKey.roomId}` },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "team_slots", filter: `room_id=eq.${subscriptionKey.roomId}` },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "stages", filter: `room_id=eq.${subscriptionKey.roomId}` },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "investigation_locks", filter: `room_id=eq.${subscriptionKey.roomId}` },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "score_events", filter: `room_id=eq.${subscriptionKey.roomId}` },
            scheduleRefresh,
          )
          .subscribe();

        if (subscriptionKey.stageId) {
          stageChannel = supabase
            .channel(`room-snapshot-stage:${subscriptionKey.stageId}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "stage_team_assignments", filter: `stage_id=eq.${subscriptionKey.stageId}` },
              scheduleRefresh,
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "player_stage_states", filter: `stage_id=eq.${subscriptionKey.stageId}` },
              scheduleRefresh,
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "hint_reveals", filter: `stage_id=eq.${subscriptionKey.stageId}` },
              scheduleRefresh,
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "private_chat_requests", filter: `stage_id=eq.${subscriptionKey.stageId}` },
              scheduleRefresh,
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "private_chat_sessions", filter: `stage_id=eq.${subscriptionKey.stageId}` },
              scheduleRefresh,
            )
            .subscribe();
        }
      }
    }

    return () => {
      mounted = false;
      if (scheduledRefreshId !== null) {
        window.clearTimeout(scheduledRefreshId);
      }
      if (fallbackRefreshId !== null) {
        window.clearInterval(fallbackRefreshId);
      }
      const supabase = getSupabaseBrowserClient();
      if (supabase && roomChannel) {
        void supabase.removeChannel(roomChannel);
      }
      if (supabase && stageChannel) {
        void supabase.removeChannel(stageChannel);
      }
    };
  }, [fallbackIntervalMs, subscriptionKey.roomId, subscriptionKey.stageId]);

  return [snapshot, setSnapshot];
}
