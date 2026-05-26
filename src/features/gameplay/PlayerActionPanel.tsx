import type { RoomSnapshot } from "@/contracts/api";

type ActionShape = {
  action: "open" | "leave_queue" | "join_queue" | "disabled";
  label: string;
  statusChip: string;
  statusTone: "live" | "alert" | undefined;
  description: string;
  blockedReason: string | null;
  disabled: boolean;
};

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

function resolveActionShape(snapshot: RoomSnapshot, nowMs?: number): ActionShape {
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
      action: "disabled",
      label: "브리핑 후 줄서기 가능",
      statusChip: `브리핑 ${snapshot.stage?.remainingSeconds ?? 0}초`,
      statusTone: "alert",
      description: "지금은 채팅으로 사건을 정리하는 시간입니다.",
      blockedReason: "브리핑이 끝나면 줄서기가 열립니다.",
      disabled: true,
    };
  }

  if (isLockedByMe) {
    return {
      action: "open",
      label: "질문방 열기",
      statusChip: "내 차례",
      statusTone: "live",
      description: "질문과 정답 시도를 진행할 수 있습니다.",
      blockedReason: null,
      disabled: false,
    };
  }

  if (queuePosition) {
    return {
      action: "leave_queue",
      label: "대기열 취소",
      statusChip: `대기열 ${queuePosition}번`,
      statusTone: "live",
      description: "차례가 오면 질문방이 자동으로 열립니다.",
      blockedReason: null,
      disabled: false,
    };
  }

  if (!isInProgress) {
    return {
      action: "disabled",
      label: "질문방 줄서기",
      statusChip: "준비 중",
      statusTone: "alert",
      description: "스테이지가 시작되면 줄서기가 열립니다.",
      blockedReason: "아직 진행 단계가 아닙니다.",
      disabled: true,
    };
  }

  if (queueCooldownSeconds > 0) {
    return {
      action: "disabled",
      label: `재진입 ${queueCooldownSeconds}초`,
      statusChip: "재진입 대기",
      statusTone: "alert",
      description: "방금 질문방에서 나왔습니다.",
      blockedReason: `${queueCooldownSeconds}초 후 다시 줄설 수 있습니다.`,
      disabled: true,
    };
  }

  if (isAvailable) {
    return {
      action: "join_queue",
      label: "질문방 줄서기",
      statusChip: "바로 입장 가능",
      statusTone: "live",
      description: "줄서기 요청을 보내면 비어 있는 질문방에 자동 입장합니다.",
      blockedReason: null,
      disabled: false,
    };
  }

  return {
    action: "join_queue",
    label: "질문방 줄서기",
    statusChip: "대기 가능",
    statusTone: undefined,
    description: "앞사람이 끝나면 대기열 순서대로 자동 입장합니다.",
    blockedReason: null,
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
  const action = resolveActionShape(snapshot, nowMs);
  const handleClick =
    action.action === "open"
      ? onOpenInvestigationModal
      : action.action === "leave_queue"
        ? onLeaveInvestigationQueue
        : action.action === "join_queue"
          ? onJoinInvestigationQueue
          : undefined;

  return (
    <section
      className="panel panel-accent utility-card gameplay-action-card track-c-action-card"
      data-action={action.action}
      data-disabled={action.disabled || undefined}
      aria-label="플레이어 액션 상태"
    >
      <div className="track-c-action-card__status">
        <span className="status-badge" data-tone={action.statusTone}>
          {action.statusChip}
        </span>
        <p className="panel-copy track-c-action-card__description">{action.description}</p>
      </div>
      <div className="action-row track-c-action-card__row">
        <button
          className={action.disabled ? "button-secondary" : "button-primary"}
          type="button"
          onClick={handleClick}
          disabled={action.disabled || isSubmitting || !handleClick}
        >
          {isSubmitting ? "처리 중..." : action.label}
        </button>
      </div>
      {action.blockedReason ? (
        <p className="message-note track-c-action-card__blocked" role="status">
          {action.blockedReason}
        </p>
      ) : null}
    </section>
  );
}
