import type { RoomSnapshot } from "@/contracts/api";
import { SpectatorBanner } from "@/components/spectator/SpectatorBanner";
import { SolvedLockSummary } from "@/components/spectator/SolvedLockSummary";
import { ProgressLogFeed } from "@/components/spectator/ProgressLogFeed";

function getPublicOutcome(snapshot: RoomSnapshot) {
  const result = snapshot.stage?.lastAnswerResult;
  if (result && typeof result === "object" && "publicOutcome" in result) {
    return result.publicOutcome;
  }

  return null;
}

function getPublicSummary(snapshot: RoomSnapshot) {
  const result = snapshot.stage?.lastAnswerResult;
  if (result && typeof result === "object" && "publicSummary" in result) {
    return result.publicSummary;
  }

  return snapshot.results?.publicSummary ?? null;
}

export function SpectatorPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const gameStatus = snapshot.game?.status;
  const nextStateMessage = gameStatus === "finished" ? "최종 결과 공개" : "스테이지 결과 대기";
  const isSolvedLocked = Boolean(snapshot.me.solvedLocked);
  const remainingSeconds = snapshot.stage?.remainingSeconds ?? null;

  return (
    <section className="page-shell track-d-spectator-shell uiux-fade-in">
      <header className="page-header">
        <p className="eyebrow">관전 상태</p>
        <h2 className="page-title">
          {isSolvedLocked ? "정답 성공 · 관전 중" : "관전 중"}
        </h2>
        <p className="page-kicker">
          다음 상태: {nextStateMessage}. 공개 흐름만 확인하고 입력은 닫혀 있습니다.
        </p>
      </header>
      <div className="track-d-spectator-grid">
        <SolvedLockSummary snapshot={snapshot} />
        <SpectatorBanner
          titleKey="stage.spectator.title"
          bodyKey="stage.spectator.body"
          publicOutcome={getPublicOutcome(snapshot)}
          publicSummary={getPublicSummary(snapshot)}
          viewMode={snapshot.viewMode}
          me={snapshot.me}
          remainingSeconds={remainingSeconds}
        />
        <ProgressLogFeed snapshot={snapshot} />
      </div>
    </section>
  );
}
