"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RoomSnapshot } from "@/contracts/api";
import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from "@/lib/supabase-browser";
import { normalizeRoomSnapshot } from "./room-snapshot-loader";

export type RoomRealtimeSyncStatus = "connecting" | "live" | "polling" | "stale" | "error";

export interface RoomRealtimeSyncMeta {
  status: RoomRealtimeSyncStatus;
  isRealtimeAvailable: boolean;
  isRealtimeConnected: boolean;
  lastSyncedAt: number | null;
  lastEventAt: number | null;
  lastErrorAt: number | null;
  fallbackIntervalMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function shouldRefreshRoomSnapshot(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function buildSnapshotEndpoint(snapshot: RoomSnapshot): string {
  const stageNumber = snapshot.stage?.stageNumber ?? snapshot.game?.currentStageNumber ?? 1;
  const params = new URLSearchParams({
    stageNumber: String(stageNumber),
  });

  if (isUuidLike(snapshot.me.playerId)) {
    params.set("playerId", snapshot.me.playerId);
  }

  return `/api/room/${encodeURIComponent(snapshot.room.id)}?${params.toString()}`;
}

export function useRoomRealtimeSnapshot(
  initialSnapshot: RoomSnapshot,
  options: {
    fallbackIntervalMs?: number;
  } = {},
): [RoomSnapshot, Dispatch<SetStateAction<RoomSnapshot>>, RoomRealtimeSyncMeta] {
  const fallbackIntervalMs = options.fallbackIntervalMs ?? 20_000;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [syncMeta, setSyncMeta] = useState<RoomRealtimeSyncMeta>(() => {
    const isRealtimeAvailable = hasSupabaseBrowserEnv();

    return {
      status: isRealtimeAvailable ? "connecting" : "polling",
      isRealtimeAvailable,
      isRealtimeConnected: false,
      lastSyncedAt: Date.now(),
      lastEventAt: null,
      lastErrorAt: null,
      fallbackIntervalMs,
    };
  });
  const snapshotRef = useRef(initialSnapshot);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    setSyncMeta((current) => ({
      ...current,
      fallbackIntervalMs,
    }));
  }, [fallbackIntervalMs]);

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
      if (scheduledRefreshId !== null) {
        window.clearTimeout(scheduledRefreshId);
        scheduledRefreshId = null;
      }

      if (!isUuidLike(snapshotRef.current.me.playerId)) {
        if (mounted) {
          setSyncMeta((current) => ({
            ...current,
            status: "stale",
            lastErrorAt: Date.now(),
          }));
        }
        return;
      }

      if (!shouldRefreshRoomSnapshot()) {
        return;
      }

      try {
        const response = await fetch(buildSnapshotEndpoint(snapshotRef.current), {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          if (mounted) {
            setSyncMeta((current) => ({
              ...current,
              status: current.lastSyncedAt ? "stale" : "error",
              lastErrorAt: Date.now(),
            }));
          }
          return;
        }

        const payload = (await response.json()) as unknown;
        const nextSnapshot =
          isRecord(payload) && "data" in payload
            ? normalizeRoomSnapshot(payload.data)
            : normalizeRoomSnapshot(payload);

        if (mounted && nextSnapshot) {
          setSnapshot(nextSnapshot);
          setSyncMeta((current) => ({
            ...current,
            status: current.isRealtimeConnected ? "live" : "polling",
            lastSyncedAt: Date.now(),
            lastErrorAt: null,
          }));
        }
      } catch {
        if (mounted) {
          setSyncMeta((current) => ({
            ...current,
            status: current.lastSyncedAt ? "stale" : "error",
            lastErrorAt: Date.now(),
          }));
        }
      }
    }

    function scheduleRefresh() {
      setSyncMeta((current) => ({
        ...current,
        lastEventAt: Date.now(),
      }));

      if (scheduledRefreshId !== null) {
        return;
      }

      scheduledRefreshId = window.setTimeout(() => {
        void refreshSnapshot();
      }, 100);
    }

    const isRealtimeAvailable = hasSupabaseBrowserEnv();

    if (!isUuidLike(snapshotRef.current.me.playerId)) {
      setSyncMeta((current) => ({
        ...current,
        isRealtimeAvailable,
        isRealtimeConnected: false,
        status: "stale",
        lastErrorAt: Date.now(),
      }));
      return () => {
        mounted = false;
        if (scheduledRefreshId !== null) {
          window.clearTimeout(scheduledRefreshId);
        }
        if (fallbackRefreshId !== null) {
          window.clearInterval(fallbackRefreshId);
        }
      };
    }

    fallbackRefreshId = window.setInterval(() => {
      void refreshSnapshot();
    }, fallbackIntervalMs);

    setSyncMeta((current) => ({
      ...current,
      isRealtimeAvailable,
      status: isRealtimeAvailable
        ? current.isRealtimeConnected
          ? "live"
          : "connecting"
        : "polling",
    }));

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
            { event: "*", schema: "public", table: "stages", filter: `room_id=eq.${subscriptionKey.roomId}` },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "investigation_locks", filter: `room_id=eq.${subscriptionKey.roomId}` },
            scheduleRefresh,
          )
          .on(
            "broadcast",
            { event: "sync" },
            scheduleRefresh,
          )
          .subscribe((status) => {
            if (!mounted) {
              return;
            }

            setSyncMeta((current) => ({
              ...current,
              isRealtimeAvailable: true,
              isRealtimeConnected: status === "SUBSCRIBED",
              status: status === "SUBSCRIBED" ? "live" : current.lastSyncedAt ? "polling" : "connecting",
              lastEventAt: status === "SUBSCRIBED" ? Date.now() : current.lastEventAt,
            }));
          });

        if (subscriptionKey.stageId) {
          stageChannel = supabase
            .channel(`room-snapshot-stage:${subscriptionKey.stageId}`)
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
              "broadcast",
              { event: "sync" },
              scheduleRefresh,
            )
            .subscribe((status) => {
              if (!mounted) {
                return;
              }

              setSyncMeta((current) => ({
                ...current,
                isRealtimeAvailable: true,
                isRealtimeConnected: status === "SUBSCRIBED" || current.isRealtimeConnected,
                status: status === "SUBSCRIBED" || current.isRealtimeConnected
                  ? "live"
                  : current.lastSyncedAt
                    ? "polling"
                    : "connecting",
                lastEventAt: status === "SUBSCRIBED" ? Date.now() : current.lastEventAt,
              }));
            });
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

  return [snapshot, setSnapshot, syncMeta];
}
