import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

function getStatusCopy({
  isLockedByMe,
  lockOwnerNickname,
}: {
  isLockedByMe: boolean;
  lockOwnerNickname: string | null;
}) {
  if (isLockedByMe) {
    return {
      tone: "live" as const,
      label: "내가 점유 중",
      detail: "이 시간 동안만 질문 메모와 정답 정리가 열립니다.",
    };
  }

  if (lockOwnerNickname) {
    return {
      tone: "alert" as const,
      label: `${lockOwnerNickname} 사용 중`,
      detail: "다른 플레이어가 나가면 바로 입장할 수 있습니다.",
    };
  }

  return {
    tone: undefined,
    label: "입장 가능",
    detail: "조사실을 먼저 점유한 플레이어만 내부 행동을 이어갈 수 있습니다.",
  };
}

export function InvestigationDrawer({
  snapshot,
  isSubmitting = false,
  isLockedByMe = false,
  lockOwnerNickname = null,
  canAcquireLock = false,
  canReleaseLock = false,
  onAcquireLock,
  onReleaseLock,
  statusMessage = null,
  errorMessage = null,
}: {
  snapshot: RoomSnapshot;
  isSubmitting?: boolean;
  isLockedByMe?: boolean;
  lockOwnerNickname?: string | null;
  canAcquireLock?: boolean;
  canReleaseLock?: boolean;
  onAcquireLock?: () => void;
  onReleaseLock?: () => void;
  statusMessage?: string | null;
  errorMessage?: string | null;
}) {
  const statusCopy = getStatusCopy({ isLockedByMe, lockOwnerNickname });

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
      </div>
      <div className="composer-footer">
        <button
          className="button-primary"
          type="button"
          onClick={onAcquireLock}
          disabled={!canAcquireLock || isSubmitting}
        >
          {isSubmitting && canAcquireLock ? "입장 연결 중..." : "조사실 입장"}
        </button>
        <button
          className="button-secondary"
          type="button"
          onClick={onReleaseLock}
          disabled={!canReleaseLock || isSubmitting}
        >
          {isSubmitting && canReleaseLock ? "정리 중..." : "조사실 나가기"}
        </button>
      </div>
      {statusMessage ? <p className="message-positive">{statusMessage}</p> : null}
      {errorMessage ? <p className="message-negative">{errorMessage}</p> : null}
    </aside>
  );
}
