import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
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
  return (
    <section>
      <h2>Spectator</h2>
      <SolvedLockSummary snapshot={snapshot} />
      <SpectatorBanner
        titleKey="stage.spectator.title"
        bodyKey="stage.spectator.body"
        publicOutcome={getPublicOutcome(snapshot)}
        publicSummary={getPublicSummary(snapshot)}
        viewMode={snapshot.viewMode}
        me={snapshot.me}
      />
      <ProgressLogFeed snapshot={snapshot} />
    </section>
  );
}
