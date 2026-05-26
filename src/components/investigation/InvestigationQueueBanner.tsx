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

  const lockOwnerNickname = lockOwnerId
    ? snapshot.players.find((player) => player.playerId === lockOwnerId)?.nickname ?? null
    : null;

  const isUpcomingTurn =
    !isLockedByMe && queuePosition !== null && queuePosition <= 2;

  const statusBadgeTone: "live" | "alert" | undefined = isBriefing
    ? "alert"
    : isLockedByMe
      ? "live"
      : !isLocked
        ? "live"
        : "alert";

  const statusBadgeLabel = isBriefing
    ? `준비 중 ${snapshot.stage?.remainingSeconds ?? 0}초`
    : isLockedByMe
      ? "내가 사용 중"
      : isLocked
        ? "다른 플레이어 사용 중"
        : "바로 입장 가능";

  const headline = isLockedByMe
    ? "내가 질문방 점유 중"
    : queuePosition
      ? `내 순번 ${queuePosition}번`
      : queueCooldownSeconds > 0
        ? "잠시 후 다시 줄설 수 있어요"
        : isLocked
          ? "다른 플레이어가 사용 중"
          : "지금 바로 입장 가능";

  const subline = isLockedByMe
    ? "질문방을 열어 질문 또는 정답을 보내세요."
    : queuePosition
      ? isUpcomingTurn
        ? "곧 자동 입장합니다. 준비해 두세요."
        : "앞 플레이어가 비우면 자동으로 들어갑니다."
      : queueCooldownSeconds > 0
        ? `재진입까지 ${queueCooldownSeconds}초 남았습니다.`
        : isLocked
          ? lockOwnerNickname
            ? `${lockOwnerNickname}님이 점유 중`
            : "잠시 후 자동 안내가 표시됩니다."
          : isInProgress
            ? "줄서기를 누르면 곧바로 점유 상태로 넘어갑니다."
            : "스테이지가 시작되면 줄설 수 있습니다.";

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
            label: queueCooldownSeconds > 0 ? `재진입 ${queueCooldownSeconds}초` : "질문방 줄서기 (J)",
            onClick: onJoinQueue,
            disabled: isBriefing || !isInProgress || queueCooldownSeconds > 0,
          };

  return (
    <section
      className={`panel panel-muted utility-card investigation-status-card track-d-queue-banner${
        isLockedByMe ? " track-d-queue-banner-mine" : ""
      }${queuePosition ? " track-d-queue-banner-queued" : ""}${
        isUpcomingTurn ? " uiux-investigation-queue-soon" : ""
      }`}
      aria-live="polite"
    >
      <div className="composer-header">
        <div>
          <h3 className="panel-title">질문방 상태</h3>
          <p className="panel-copy track-d-queue-headline">{headline}</p>
          <p className="message-note track-d-queue-subline">{subline}</p>
          {isUpcomingTurn ? (
            <span className="uiux-investigation-queue-soon-tag" aria-hidden="true">
              곧 차례
            </span>
          ) : null}
        </div>
        <span className="status-badge" data-tone={statusBadgeTone}>
          {statusBadgeLabel}
        </span>
      </div>
      <div className="utility-chip-row track-d-queue-chip-row">
        <span className="status-badge num-tabular">대기열 {waitingPlayerCount}명</span>
        {queuePosition ? (
          <span
            className={`status-badge num-tabular${isUpcomingTurn ? " uiux-investigation-queue-chip-fresh" : ""}`}
            data-tone="live"
          >
            내 순번 {queuePosition}번
          </span>
        ) : null}
        {isLocked ? (
          <span className="status-badge num-tabular">남은 시간 {remainingSeconds}초</span>
        ) : null}
        {queueCooldownSeconds > 0 ? (
          <span className="status-badge num-tabular" data-tone="alert">
            재진입 {queueCooldownSeconds}초
          </span>
        ) : null}
      </div>
      <button
        className="button-primary investigation-queue-action track-d-queue-action"
        type="button"
        onClick={action.onClick}
        disabled={isSubmitting || action.disabled || !action.onClick}
        aria-keyshortcuts={!isLockedByMe ? "J" : undefined}
      >
        {isSubmitting ? "처리 중..." : action.label}
      </button>
    </section>
  );
}
