import type { RoomSnapshot } from "@/contracts/api";

const LOCK_TOTAL_SECONDS = 60;

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = String(safe % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function SolvedLockSummary({ snapshot }: { snapshot: RoomSnapshot }) {
  const isSolvedLocked = Boolean(snapshot.me.solvedLocked);
  const totalSolved = snapshot.stage?.solvedPlayerIds?.length ?? 0;
  const otherSolvedCount = Math.max(0, totalSolved - (isSolvedLocked ? 1 : 0));
  const investigation = snapshot.stage?.investigation;
  const lockedByPlayerId = investigation?.lockedByPlayerId ?? null;
  const lockedPlayer = lockedByPlayerId
    ? snapshot.players.find((player) => player.playerId === lockedByPlayerId) ?? null
    : null;
  const remainingLockSeconds = investigation?.remainingSeconds ?? 0;
  const waitingCount = investigation?.waitingPlayerCount ?? 0;
  const lockProgressPct = lockedByPlayerId
    ? Math.min(100, Math.max(0, (remainingLockSeconds / LOCK_TOTAL_SECONDS) * 100))
    : 0;
  const isMyLock = lockedByPlayerId === snapshot.me.playerId;

  return (
    <section
      className={`panel panel-accent track-d-solved-lock uiux-fade-up${
        isSolvedLocked ? " track-d-solved-lock-mine" : ""
      }`}
    >
      <div className="composer-header">
        <div>
          <p className="eyebrow">{isSolvedLocked ? "본인 정답 인정" : "내 상태"}</p>
          <h3 className="panel-title">
            {isSolvedLocked ? "정답에 성공해서 빠졌습니다" : "아직 진행 중"}
          </h3>
          <p className="panel-copy">
            {isSolvedLocked
              ? "이 스테이지에서는 더 이상 질문과 정답을 보낼 수 없습니다. 다른 플레이어의 공개 흐름만 따라갑니다."
              : "아직 질문과 정답을 이어갈 수 있습니다."}
          </p>
          <p className="message-note">
            다음 상태: {isSolvedLocked ? "공개 흐름만 관전" : "조사실 입력 가능"}
          </p>
        </div>
        <span className="status-badge" data-tone={isSolvedLocked ? "live" : "alert"}>
          {isSolvedLocked ? "관전" : "진행"}
        </span>
      </div>
      {isSolvedLocked ? (
        <div className="metric-grid metric-grid-compact track-d-solved-metrics">
          <article className="metric-card">
            <span className="metric-label">내 스테이지 점수</span>
            <strong className="metric-value num-tabular">{snapshot.me.stageScore}</strong>
            <span className="metric-detail">이번 사건에서 받은 값</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">함께 성공한 인원</span>
            <strong className="metric-value num-tabular">{otherSolvedCount}명</strong>
            <span className="metric-detail">나를 제외한 정답 성공자</span>
          </article>
        </div>
      ) : null}
      {lockedPlayer ? (
        <div
          className="uiux-realtime-lock-grid"
          aria-label="조사실 락 보유자"
        >
          <article
            className="uiux-realtime-lock-card"
            data-holder={isMyLock ? "self" : "other"}
          >
            <span className="uiux-realtime-lock-card-label">조사실 사용 중</span>
            <strong className="uiux-realtime-lock-card-value">
              {isMyLock ? `${lockedPlayer.nickname} (나)` : lockedPlayer.nickname}
            </strong>
            <span className="uiux-realtime-lock-card-detail">
              잔여 {formatClock(remainingLockSeconds)}
            </span>
            <div
              className="uiux-realtime-lock-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(lockProgressPct)}
              aria-label="락 잔여 시간"
            >
              <div
                className="uiux-realtime-lock-progress-fill"
                style={{ width: `${lockProgressPct}%` }}
              />
            </div>
          </article>
          <article className="uiux-realtime-lock-card">
            <span className="uiux-realtime-lock-card-label">대기열</span>
            <strong className="uiux-realtime-lock-card-value num-tabular">
              {waitingCount}명
            </strong>
            <span className="uiux-realtime-lock-card-detail">
              {waitingCount > 0 ? "조사실 진입 대기 중" : "비어 있음"}
            </span>
          </article>
        </div>
      ) : null}
    </section>
  );
}
