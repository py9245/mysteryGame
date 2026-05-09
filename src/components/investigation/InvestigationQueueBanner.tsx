import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function InvestigationQueueBanner({ snapshot }: { snapshot: RoomSnapshot }) {
  const investigation = snapshot.stage?.investigation;
  const lockOwnerId = investigation?.lockedByPlayerId ?? null;
  const isLocked = Boolean(lockOwnerId);
  const isLockedByMe = lockOwnerId === snapshot.me.playerId;

  return (
    <section className="panel panel-muted utility-card">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">질문방 상태</h3>
          <p className="panel-copy">대기열에 들어가면 비는 즉시 자동 입장합니다.</p>
        </div>
        <span className="status-badge" data-tone={!isLocked || isLockedByMe ? "live" : "alert"}>
          {isLockedByMe ? "내가 사용 중" : isLocked ? "다른 플레이어 사용 중" : "바로 입장 가능"}
        </span>
      </div>
      <div className="utility-chip-row">
        <span className="status-badge">질문 {investigation?.questionCountRemaining ?? 0}회 남음</span>
        <span className="status-badge">정답 {investigation?.answerAttemptCountRemaining ?? 0}회 남음</span>
      </div>
      <p className="message-note">
        {isLockedByMe
          ? "지금은 내가 질문방을 점유하고 있습니다."
          : isLocked
            ? "다른 플레이어가 사용 중입니다. 대기열 상태만 먼저 확인하면 됩니다."
            : "지금 들어가 질문이나 정답 시도를 바로 진행할 수 있습니다."}
      </p>
    </section>
  );
}
