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
    <section className="panel panel-muted" data-view-mode={viewMode} data-outcome={publicOutcome ?? "none"}>
      <h3 className="panel-title">관전 메시지</h3>
      <p className="panel-copy">
        {me ? `${me.nickname}님은 지금 결과를 지켜보는 단계입니다.` : "지금은 결과를 지켜보는 단계입니다."}
      </p>
      <p className="message-note">다음 상태: 공개 결과와 다음 진행 안내가 이어집니다.</p>
      <p className="message-note">
        {publicSummary ?? "다음 공개 설명이 들어오면 여기서 바로 보여줍니다."}
      </p>
    </section>
  );
}
