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
  players = snapshot.players,
  nowMs,
}: {
  snapshot: RoomSnapshot;
  players?: RoomSnapshot["players"];
  nowMs?: number;
}) {
  const investigation = snapshot.stage?.investigation;
  const lockOwnerId = investigation?.lockedByPlayerId ?? null;
  const isLocked = Boolean(lockOwnerId);
  const isLockedByMe = lockOwnerId === snapshot.me.playerId;
  const queuePosition = investigation?.queuePosition ?? null;
  const waitingPlayerCount = investigation?.waitingPlayerCount ?? 0;
  const lockOwnerNickname =
    players.find((player) => player.playerId === lockOwnerId)?.nickname ??
    (isLockedByMe ? snapshot.me.nickname : "다른 플레이어");
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
        <span className="status-badge">대기열 {waitingPlayerCount}명</span>
        {queuePosition ? <span className="status-badge">내 순번 {queuePosition}번</span> : null}
        {queueCooldownSeconds > 0 ? <span className="status-badge">재진입 {queueCooldownSeconds}초</span> : null}
        {isLocked ? <span className="status-badge">남은 시간 {remainingSeconds}초</span> : null}
      </div>
      <p className="message-note">
        {isLockedByMe
          ? "지금은 내가 질문방을 점유하고 있습니다."
          : queuePosition
            ? `현재 질문방 대기열 ${queuePosition}번입니다. 차례가 오면 자동으로 입장합니다.`
          : isLocked
            ? `${lockOwnerNickname}님이 질문방을 사용 중입니다. 끝나면 다음 플레이어가 자동으로 입장합니다.`
            : queueCooldownSeconds > 0
              ? "방금 질문방에서 나왔습니다. 5초 뒤 다시 대기열에 들어갈 수 있습니다."
              : "지금 대기열에 참가하면 바로 질문방으로 넘어갈 수 있습니다."}
      </p>
    </section>
  );
}
