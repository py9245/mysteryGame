import type { RoomSnapshot } from "@/contracts/api";
import type { RoomRealtimeSyncMeta } from "@/features/room-snapshot/use-room-realtime-snapshot";

type RealtimeStatusStripVariant = "lobby" | "gameplay";

function formatElapsed(lastSyncedAt: number | null, nowMs: number): string {
  if (!lastSyncedAt) {
    return "동기화 대기";
  }

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - lastSyncedAt) / 1000));

  if (elapsedSeconds < 3) {
    return "방금 동기화";
  }

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}초 전 동기화`;
  }

  return `${Math.floor(elapsedSeconds / 60)}분 전 동기화`;
}

function formatTimer(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const restSeconds = String(seconds % 60).padStart(2, "0");

  return `${minutes}:${restSeconds}`;
}

function getSyncLabel(syncMeta: RoomRealtimeSyncMeta): string {
  switch (syncMeta.status) {
    case "live":
      return "실시간 연결";
    case "polling":
      return "폴링 백업";
    case "stale":
      return "동기화 지연";
    case "error":
      return "연결 확인 필요";
    default:
      return "연결 중";
  }
}

function getSyncTone(syncMeta: RoomRealtimeSyncMeta): "live" | "alert" | undefined {
  if (syncMeta.status === "live") {
    return "live";
  }

  if (syncMeta.status === "stale" || syncMeta.status === "error") {
    return "alert";
  }

  return undefined;
}

function getInvestigationLabel(snapshot: RoomSnapshot): string {
  const investigation = snapshot.stage?.investigation;

  if (!snapshot.stage || !investigation) {
    return "대기";
  }

  if (investigation.lockedByPlayerId === snapshot.me.playerId) {
    return "내 차례";
  }

  if (typeof investigation.queuePosition === "number") {
    return `${investigation.queuePosition}번 대기`;
  }

  if (investigation.lockedByPlayerId) {
    return investigation.waitingPlayerCount > 0
      ? `사용 중 · ${investigation.waitingPlayerCount}명`
      : "사용 중";
  }

  return snapshot.stage.status === "in_progress" ? "비어 있음" : "준비 중";
}

function getRoomStatusLabel(status: RoomSnapshot["room"]["status"]): string {
  switch (status) {
    case "ready":
      return "시작 가능";
    case "assigning":
      return "팀 편성";
    case "in_game":
      return "진행 중";
    case "closed":
      return "종료";
    default:
      return "대기 중";
  }
}

export function RealtimeStatusStrip({
  snapshot,
  syncMeta,
  variant,
  nowMs,
}: {
  snapshot: RoomSnapshot;
  syncMeta: RoomRealtimeSyncMeta;
  variant: RealtimeStatusStripVariant;
  nowMs?: number;
}) {
  const displayNowMs = nowMs ?? Date.now();
  const connectedCount = snapshot.players.filter((player) => player.connectionStatus === "connected").length;
  const readyCount = snapshot.players.filter((player) => player.isReady).length;
  const solvedCount = snapshot.stage?.solvedPlayerIds.length ?? 0;
  const syncTone = getSyncTone(syncMeta);
  const syncDetail = syncMeta.isRealtimeAvailable
    ? formatElapsed(syncMeta.lastSyncedAt, displayNowMs)
    : `${formatElapsed(syncMeta.lastSyncedAt, displayNowMs)} · 실시간 키 미설정`;
  const stageMetricLabel = snapshot.stage ? "남은 시간" : "방 상태";
  const stageMetricValue = snapshot.stage
    ? formatTimer(snapshot.stage.remainingSeconds)
    : getRoomStatusLabel(snapshot.room.status);
  const readinessLabel = variant === "lobby" ? "준비" : "정답";
  const readinessValue = variant === "lobby"
    ? `${readyCount}/${snapshot.players.length}`
    : `${solvedCount}/2`;
  const actionLabel = variant === "lobby" ? "내 상태" : "조사실";
  const actionValue = variant === "lobby"
    ? snapshot.me.isReady
      ? "준비 완료"
      : "준비 전"
    : getInvestigationLabel(snapshot);

  return (
    <section className={`realtime-strip realtime-strip-${variant}`} aria-label="실시간 진행 상태">
      <div className="realtime-strip-main">
        <span className="status-badge" data-tone={syncTone}>
          {getSyncLabel(syncMeta)}
        </span>
        <div>
          <strong>라이브 상황</strong>
          <span>{syncDetail}</span>
        </div>
      </div>
      <div className="realtime-strip-metrics">
        <span>
          <strong>{connectedCount}/{snapshot.players.length}</strong>
          <small>접속</small>
        </span>
        <span>
          <strong>{stageMetricValue}</strong>
          <small>{stageMetricLabel}</small>
        </span>
        <span>
          <strong>{readinessValue}</strong>
          <small>{readinessLabel}</small>
        </span>
        <span>
          <strong>{actionValue}</strong>
          <small>{actionLabel}</small>
        </span>
      </div>
    </section>
  );
}
