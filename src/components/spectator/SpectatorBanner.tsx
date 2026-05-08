import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function SpectatorBanner({
  titleKey,
  bodyKey,
  publicOutcome,
  publicSummary,
  viewMode,
  me,
}: {
  titleKey: string;
  bodyKey: string;
  publicOutcome: "correct" | "wrong" | "needs_review" | null;
  publicSummary: string | null;
  viewMode: RoomSnapshot["viewMode"];
  me?: RoomSnapshot["me"];
}) {
  return (
    <section data-view-mode={viewMode} data-outcome={publicOutcome ?? "none"}>
      <h3>{titleKey}</h3>
      <p>{bodyKey}</p>
      <p>{me ? me.nickname : "Spectator"}</p>
      <p>{publicSummary ?? "No summary yet"}</p>
    </section>
  );
}
