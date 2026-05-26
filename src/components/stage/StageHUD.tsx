import type { RoomSnapshot } from "@/contracts/api";

const PROGRESS_THRESHOLD_SECONDS = 30;

function resolveRemainingSeconds(
  expiresAtCandidate: string | null | undefined,
  fallback: number | undefined,
  nowMs?: number,
) {
  if (expiresAtCandidate && typeof nowMs === "number") {
    const expiresAtMs = Date.parse(expiresAtCandidate);
    if (Number.isFinite(expiresAtMs)) {
      return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
    }
  }

  return typeof fallback === "number" ? Math.max(0, fallback) : 0;
}

function formatMmSs(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function resolveTimerLabel(
  status: string | null | undefined,
  remainingSeconds: number,
  isInProgress: boolean,
  isBriefing: boolean,
) {
  if (!status || status === "pending") {
    return "스테이지 대기";
  }

  if (status === "completed") {
    return "스테이지 종료";
  }

  if (isBriefing) {
    return "브리핑 남은 시간";
  }

  if (isInProgress) {
    return remainingSeconds <= PROGRESS_THRESHOLD_SECONDS ? "마감 임박" : "남은 시간";
  }

  return "남은 시간";
}

export function StageHUD({
  snapshot,
  nowMs,
}: {
  snapshot: RoomSnapshot;
  nowMs?: number;
}) {
  const stage = snapshot.stage;

  if (!stage) {
    return (
      <section
        className="panel panel-accent stage-hud track-c-stage-hud track-c-stage-hud--idle"
        aria-label="스테이지 HUD"
      >
        <div className="composer-header track-c-stage-hud__head">
          <div>
            <span className="metric-label track-c-stage-hud__eyebrow">스테이지 대기</span>
            <h3 className="panel-title track-c-stage-hud__title">곧 사건이 공개됩니다</h3>
          </div>
          <span className="status-badge">준비</span>
        </div>
        <p className="panel-copy">
          브리핑이 시작되면 남은 시간과 내 점수가 여기에 표시됩니다.
        </p>
      </section>
    );
  }

  const isInProgress = stage.status === "in_progress";
  const isBriefing = stage.status === "briefing";
  const remainingSeconds = resolveRemainingSeconds(undefined, stage.remainingSeconds, nowMs);
  const isUrgent = isInProgress && remainingSeconds <= PROGRESS_THRESHOLD_SECONDS && remainingSeconds > 0;
  const timerLabel = resolveTimerLabel(stage.status, remainingSeconds, isInProgress, isBriefing);
  const stageScore = snapshot.me.stageScore;
  const stageTitle = stage.publicTitle?.trim() || `스테이지 ${stage.stageNumber}`;
  const statusTone = isUrgent ? "alert" : isInProgress ? "live" : isBriefing ? undefined : "alert";
  const statusLabel = isInProgress
    ? isUrgent
      ? "마감 임박"
      : "진행 중"
    : isBriefing
      ? "브리핑"
      : stage.status === "completed"
        ? "스테이지 종료"
        : "대기";

  return (
    <section
      className={`panel panel-accent stage-hud track-c-stage-hud${isUrgent ? " track-c-stage-hud--urgent" : ""}`}
      aria-label="스테이지 HUD"
      data-stage-status={stage.status}
    >
      <div className="composer-header track-c-stage-hud__head">
        <div className="track-c-stage-hud__heading-group">
          <span className="metric-label track-c-stage-hud__eyebrow">스테이지 {stage.stageNumber}</span>
          <h3 className="panel-title track-c-stage-hud__title">{stageTitle}</h3>
        </div>
        <span className="status-badge" data-tone={statusTone}>
          {statusLabel}
        </span>
      </div>
      <div className="metric-grid stage-hud-grid track-c-stage-hud__metrics">
        <article className="metric-card metric-card-emphasis track-c-stage-hud__metric track-c-stage-hud__metric--timer">
          <span className="metric-label track-c-stage-hud__metric-label">{timerLabel}</span>
          <strong
            className={`metric-value track-c-stage-hud__metric-value num-tabular${
              isUrgent && remainingSeconds <= 10 ? " uiux-gameplay-hud-timer-critical" : ""
            }`}
            aria-live={isUrgent ? "polite" : "off"}
          >
            {formatMmSs(remainingSeconds)}
          </strong>
          <span className="metric-detail track-c-stage-hud__metric-detail">
            {isUrgent ? "곧 스테이지가 종료됩니다." : isInProgress ? "정답을 노리세요." : "잠시 후 시작됩니다."}
          </span>
        </article>
        <article className="metric-card metric-card-emphasis track-c-stage-hud__metric track-c-stage-hud__metric--score">
          <span className="metric-label track-c-stage-hud__metric-label">내 점수</span>
          <strong className="metric-value track-c-stage-hud__metric-value num-tabular">{stageScore}</strong>
          <span className="metric-detail track-c-stage-hud__metric-detail">이번 스테이지 누적</span>
        </article>
      </div>
    </section>
  );
}
