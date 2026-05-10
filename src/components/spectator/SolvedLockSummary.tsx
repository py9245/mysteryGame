import type { RoomSnapshot } from "@/contracts/api";

export function SolvedLockSummary({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="panel panel-accent">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">{snapshot.me.solvedLocked ? "관전 상태" : "입력 가능"}</h3>
          <p className="panel-copy">
            {snapshot.me.solvedLocked
              ? "정답을 맞혀서 지금은 결과를 지켜보는 단계입니다."
              : "아직 질문과 정답을 이어갈 수 있습니다."}
          </p>
          <p className="message-note">
            다음 상태: {snapshot.me.solvedLocked ? "공개 흐름만 관전" : "조사실 입력 가능"}
          </p>
        </div>
        <span className="status-badge" data-tone={snapshot.me.solvedLocked ? "live" : "alert"}>
          {snapshot.me.solvedLocked ? "관전" : "진행"}
        </span>
      </div>
    </section>
  );
}
