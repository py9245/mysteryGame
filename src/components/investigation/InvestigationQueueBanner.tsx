import type { RoomSnapshot } from "@/contracts/api";

function resolveRemainingSeconds(expiresAt: string | null | undefined, fallback: number | undefined, nowMs?: number) {
  if (expiresAt && typeof nowMs === "number") {
    const expiresAtMs = Date.parse(expiresAt);
    if (Number.isFinite(expiresAtMs)) {
      return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
    }
  }

  return typeof fallback === "number" ? Math.max(0, fallback) : 0;
}

export function InvestigationQueueBanner({
  snapshot,
  nowMs,
  isSubmitting = false,
  onOpenInvestigationModal,
  onJoinQueue,
  onLeaveQueue,
}: {
  snapshot: RoomSnapshot;
  nowMs?: number;
  isSubmitting?: boolean;
  onOpenInvestigationModal?: () => void;
  onJoinQueue?: () => void;
  onLeaveQueue?: () => void;
}) {
  const isBriefing = snapshot.stage?.status === "briefing";
  const isInProgress = snapshot.stage?.status === "in_progress";
  const investigation = snapshot.stage?.investigation;
  const lockOwnerId = investigation?.lockedByPlayerId ?? null;
  const isLocked = Boolean(lockOwnerId);
  const isLockedByMe = lockOwnerId === snapshot.me.playerId;
  const queuePosition = investigation?.queuePosition ?? null;
  const waitingPlayerCount = investigation?.waitingPlayerCount ?? 0;
  const remainingSeconds = resolveRemainingSeconds(
    investigation?.expiresAt ?? null,
    investigation?.remainingSeconds,
    nowMs,
  );
  const queueCooldownSeconds = resolveRemainingSeconds(
    investigation?.reentryCooldownEndsAt ?? null,
    undefined,
    nowMs,
  );
  const action =
    isLockedByMe
      ? {
          label: "질문방 열기",
          onClick: onOpenInvestigationModal,
          disabled: false,
        }
      : queuePosition
        ? {
            label: "대기열 취소",
            onClick: onLeaveQueue,
            disabled: false,
          }
        : {
            label: queueCooldownSeconds > 0 ? `재진입 ${queueCooldownSeconds}초` : "질문방 줄서기",
            onClick: onJoinQueue,
            disabled: isBriefing || !isInProgress || queueCooldownSeconds > 0,
          };

  return (
    <section className="panel panel-muted utility-card investigation-status-card">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">질문방 상태</h3>
        </div>
        <span className="status-badge" data-tone={isBriefing ? "alert" : !isLocked || isLockedByMe ? "live" : "alert"}>
          {isBriefing
            ? `준비 중 ${snapshot.stage?.remainingSeconds ?? 0}초`
            : isLockedByMe
              ? "내가 사용 중"
              : isLocked
                ? "다른 플레이어 사용 중"
                : "바로 입장 가능"}
        </span>
      </div>
      <div className="utility-chip-row">
        <span className="status-badge">대기열 {waitingPlayerCount}명</span>
        {queuePosition ? <span className="status-badge">내 순번 {queuePosition}번</span> : null}
        {isLocked ? <span className="status-badge">남은 시간 {remainingSeconds}초</span> : null}
      </div>
      <button
        className="button-primary investigation-queue-action"
        type="button"
        onClick={action.onClick}
        disabled={isSubmitting || action.disabled || !action.onClick}
      >
        {isSubmitting ? "처리 중..." : action.label}
      </button>
    </section>
  );
}
