import type { RoomSnapshot } from "@/contracts/api";

function resolveRemainingSeconds(expiresAt: string | null | undefined, nowMs?: number) {
  if (!expiresAt || typeof nowMs !== "number") {
    return 0;
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return 0;
  }

  return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
}

function resolveActionCopy(snapshot: RoomSnapshot, nowMs?: number) {
  const isBriefing = snapshot.stage?.status === "briefing";
  const isInProgress = snapshot.stage?.status === "in_progress";
  const investigation = snapshot.stage?.investigation;
  const lockOwnerId = investigation?.lockedByPlayerId ?? null;
  const isLockedByMe = lockOwnerId === snapshot.me.playerId;
  const isAvailable = !lockOwnerId;
  const queuePosition = investigation?.queuePosition ?? null;
  const queueCooldownSeconds = resolveRemainingSeconds(investigation?.reentryCooldownEndsAt, nowMs);

  if (isBriefing) {
    return {
      action: "disabled" as const,
      label: "브리핑 후 줄서기 가능",
      status: `브리핑 ${snapshot.stage?.remainingSeconds ?? 0}초`,
      description: "채팅으로 사건을 정리하는 시간입니다.",
      disabled: true,
    };
  }

  if (isLockedByMe) {
    return {
      action: "open" as const,
      label: "질문방 열기",
      status: "내 차례",
      description: "질문과 정답 시도를 진행할 수 있습니다.",
      disabled: false,
    };
  }

  if (queuePosition) {
    return {
      action: "leave_queue" as const,
      label: "대기열 취소",
      status: `대기열 ${queuePosition}번`,
      description: "차례가 오면 질문방이 자동으로 열립니다.",
      disabled: false,
    };
  }

  if (!isInProgress) {
    return {
      action: "disabled" as const,
      label: "질문방 줄서기",
      status: "준비 중",
      description: "스테이지가 시작되면 줄서기가 열립니다.",
      disabled: true,
    };
  }

  if (queueCooldownSeconds > 0) {
    return {
      action: "disabled" as const,
      label: `재진입 ${queueCooldownSeconds}초`,
      status: "재진입 대기",
      description: "방금 질문방에서 나와 잠시 후 다시 줄설 수 있습니다.",
      disabled: true,
    };
  }

  if (isAvailable) {
    return {
      action: "join_queue" as const,
      label: "질문방 줄서기",
      status: "바로 입장 가능",
      description: "줄서기 요청을 보내면 비어 있는 질문방에 자동 입장합니다.",
      disabled: false,
    };
  }

  return {
    action: "join_queue" as const,
    label: "질문방 줄서기",
    status: "대기 가능",
    description: "앞사람이 끝나면 대기열 순서대로 자동 입장합니다.",
    disabled: false,
  };
}

export function PlayerActionPanel({
  snapshot,
  nowMs,
  isSubmitting = false,
  onOpenInvestigationModal,
  onJoinInvestigationQueue,
  onLeaveInvestigationQueue,
}: {
  snapshot: RoomSnapshot;
  nowMs?: number;
  isSubmitting?: boolean;
  onOpenInvestigationModal?: () => void;
  onJoinInvestigationQueue?: () => void;
  onLeaveInvestigationQueue?: () => void;
}) {
  const action = resolveActionCopy(snapshot, nowMs);
  const handleClick =
    action.action === "open"
      ? onOpenInvestigationModal
      : action.action === "leave_queue"
        ? onLeaveInvestigationQueue
        : action.action === "join_queue"
          ? onJoinInvestigationQueue
          : undefined;

  return (
    <section className="panel panel-accent utility-card gameplay-action-card">
      <div className="gameplay-action-card-head">
        <span className="status-badge" data-tone={action.status === "바로 입장 가능" || action.status === "내 차례" ? "live" : action.disabled ? "alert" : undefined}>
          {action.status}
        </span>
        <p className="panel-copy">{action.description}</p>
      </div>
      <div className="action-row">
        <button
          className={action.disabled ? "button-secondary" : "button-primary"}
          type="button"
          onClick={handleClick}
          disabled={action.disabled || isSubmitting || !handleClick}
        >
          {isSubmitting ? "처리 중..." : action.label}
        </button>
      </div>
    </section>
  );
}
