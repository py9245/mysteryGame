import type { RoomSnapshot } from "@/contracts/api";

export function ProgressLogFeed({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="panel panel-muted">
      <h3 className="panel-title">진행 요약</h3>
      <p className="panel-copy">
        스테이지 {snapshot.stage?.stageNumber ?? 0}의 공개 흐름만 따라가고 있습니다.
      </p>
      <p className="message-note">다음 상태: 결과 공개가 끝날 때까지 관전만 유지합니다.</p>
    </section>
  );
}
