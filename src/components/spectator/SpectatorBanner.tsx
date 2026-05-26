import type { RoomSnapshot } from "@/contracts/api";

function getOutcomeBadgeLabel(outcome: "correct" | "wrong" | "needs_review" | null) {
  switch (outcome) {
    case "correct":
      return "정답 인정";
    case "wrong":
      return "정답 미인정";
    case "needs_review":
      return "운영자 확인";
    default:
      return "대기";
  }
}

function getOutcomeBadgeTone(outcome: "correct" | "wrong" | "needs_review" | null): "live" | "alert" | undefined {
  if (outcome === "correct") return "live";
  if (outcome === "wrong" || outcome === "needs_review") return "alert";
  return undefined;
}

function formatRemaining(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "남은 시간 정보 없음";
  const minutes = Math.floor(seconds / 60);
  const rest = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${minutes}:${rest} 남음`;
}

export function SpectatorBanner({
  titleKey,
  bodyKey,
  publicOutcome,
  publicSummary,
  viewMode,
  me,
  remainingSeconds,
}: {
  titleKey: string;
  bodyKey: string;
  publicOutcome: "correct" | "wrong" | "needs_review" | null;
  publicSummary: string | null;
  viewMode: RoomSnapshot["viewMode"];
  me?: RoomSnapshot["me"];
  remainingSeconds?: number | null;
}) {
  return (
    <section
      className="panel panel-muted track-d-spectator-banner uiux-fade-up"
      data-view-mode={viewMode}
      data-outcome={publicOutcome ?? "none"}
      data-title-key={titleKey}
      data-body-key={bodyKey}
      aria-live="polite"
    >
      <div
        className="uiux-realtime-spectator-ribbon"
        role="status"
        aria-label="관전 중"
      >
        <span className="uiux-realtime-spectator-ribbon-mark">관전 중</span>
        <span className="uiux-realtime-spectator-ribbon-meta num-tabular">
          {formatRemaining(remainingSeconds)}
        </span>
      </div>
      <div className="composer-header">
        <div>
          <p className="eyebrow">관전 메시지</p>
          <h3 className="panel-title">
            {me ? `${me.nickname}님은 결과를 지켜보는 단계입니다` : "지금은 결과를 지켜보는 단계입니다"}
          </h3>
          <p className="panel-copy">다음 공개 안내가 들어오면 이 자리에서 바로 알려드립니다.</p>
        </div>
        <span className="status-badge" data-tone={getOutcomeBadgeTone(publicOutcome)}>
          {getOutcomeBadgeLabel(publicOutcome)}
        </span>
      </div>
      <div className="track-d-spectator-summary">
        <p className="metric-label">공개 요약</p>
        <p className="track-d-spectator-summary-body">
          {publicSummary ?? "아직 공개된 요약이 없습니다. 진행 상황이 정리되면 여기로 들어옵니다."}
        </p>
      </div>
    </section>
  );
}
