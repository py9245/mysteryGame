import type { RoomSnapshot } from "@/contracts/api";

function getStatusCopy({
  isLockedByMe,
  lockOwnerNickname,
  isQueued,
  queuePosition,
  queueCooldownSeconds,
}: {
  isLockedByMe: boolean;
  lockOwnerNickname: string | null;
  isQueued: boolean;
  queuePosition: number | null;
  queueCooldownSeconds: number;
}) {
  if (isLockedByMe) {
    return {
      tone: "live" as const,
      label: "내가 점유 중",
      detail: "이 시간 동안만 질문 메모와 정답 정리가 열립니다.",
    };
  }

  if (isQueued) {
    return {
      tone: "alert" as const,
      label: `대기열 ${queuePosition ?? "-"}번`,
      detail: "앞사람이 나오면 자동으로 질문방이 열립니다.",
    };
  }

  if (queueCooldownSeconds > 0) {
    return {
      tone: "alert" as const,
      label: `재진입 대기 ${queueCooldownSeconds}초`,
      detail: "질문방에서 나온 직후에는 5초가 지나야 다시 대기열에 들어갈 수 있습니다.",
    };
  }

  if (lockOwnerNickname) {
    return {
      tone: "alert" as const,
      label: `${lockOwnerNickname} 사용 중`,
      detail: "다른 플레이어가 나가면 대기열 순서대로 자동 입장합니다.",
    };
  }

  return {
    tone: undefined,
    label: "대기열 바로 입장",
    detail: "지금 대기열에 들어가면 곧바로 질문방 점유 상태로 넘어갑니다.",
  };
}

export function InvestigationDrawer({
  snapshot,
  isSubmitting = false,
  isLockedByMe = false,
  lockOwnerNickname = null,
  canAcquireLock = false,
  canReleaseLock = false,
  canJoinQueue = false,
  canLeaveQueue = false,
  isQueued = false,
  queuePosition = null,
  waitingPlayerCount = 0,
  queueCooldownSeconds = 0,
  onAcquireLock,
  onReleaseLock,
  onJoinQueue,
  onLeaveQueue,
  statusMessage = null,
  errorMessage = null,
}: {
  snapshot: RoomSnapshot;
  isSubmitting?: boolean;
  isLockedByMe?: boolean;
  lockOwnerNickname?: string | null;
  canAcquireLock?: boolean;
  canReleaseLock?: boolean;
  canJoinQueue?: boolean;
  canLeaveQueue?: boolean;
  isQueued?: boolean;
  queuePosition?: number | null;
  waitingPlayerCount?: number;
  queueCooldownSeconds?: number;
  onAcquireLock?: () => void;
  onReleaseLock?: () => void;
  onJoinQueue?: () => void;
  onLeaveQueue?: () => void;
  statusMessage?: string | null;
  errorMessage?: string | null;
}) {
  const statusCopy = getStatusCopy({
    isLockedByMe,
    lockOwnerNickname,
    isQueued,
    queuePosition,
    queueCooldownSeconds,
  });

  return (
    <aside className="panel panel-accent investigation-lock-panel">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">조사실 점유 상태</h3>
          <p className="panel-copy">지금 누가 쓰는지와 남은 시간만 보여줍니다.</p>
        </div>
        <span className="status-badge" data-tone={statusCopy.tone}>
          {statusCopy.label}
        </span>
      </div>
      <p className="panel-copy">{statusCopy.detail}</p>
      <div className="metric-grid investigation-meter-grid">
        <article className="metric-card metric-card-emphasis">
          <span className="metric-label">남은 점유 시간</span>
          <strong className="metric-value">{snapshot.stage?.investigation?.remainingSeconds ?? 0}s</strong>
          <span className="metric-detail">시간 안에 질문과 정답 시도를 끝내야 합니다.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">현재 대기열</span>
          <strong className="metric-value">{waitingPlayerCount}명</strong>
          <span className="metric-detail">
            {isQueued ? `내 순번 ${queuePosition ?? "-"}번` : "대기열 참가 전"}
          </span>
        </article>
      </div>
      <div className="composer-footer">
        {isLockedByMe ? null : (
          <button
            className="button-primary"
            type="button"
            onClick={isQueued ? onLeaveQueue : canJoinQueue ? onJoinQueue : onAcquireLock}
            disabled={isQueued ? !canLeaveQueue || isSubmitting : !canJoinQueue || isSubmitting}
          >
            {isQueued
              ? isSubmitting
                ? "대기 취소 중..."
                : "대기열 취소"
              : isSubmitting
                ? "대기열 진입 중..."
                : queueCooldownSeconds > 0
                  ? `재진입 대기 ${queueCooldownSeconds}초`
                  : "질문방 줄서기"}
          </button>
        )}
        <button
          className="button-secondary"
          type="button"
          onClick={onReleaseLock}
          disabled={!canReleaseLock || isSubmitting}
        >
          {isSubmitting && canReleaseLock ? "정리 중..." : isLockedByMe ? "질문방 나가기" : "점유 중일 때만 가능"}
        </button>
      </div>
      {statusMessage ? <p className="message-positive">{statusMessage}</p> : null}
      {errorMessage ? <p className="message-negative">{errorMessage}</p> : null}
    </aside>
  );
}
