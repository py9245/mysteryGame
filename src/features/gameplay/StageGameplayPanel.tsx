import Link from "next/link";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { SampleFlowNavigation } from "@/components/navigation/SampleFlowNavigation";
import { CaseImageFrame } from "@/components/stage/CaseImageFrame";
import { StageHUD } from "@/components/stage/StageHUD";
import { appendRoomContextToHref } from "@/features/room-context/room-context";
import { HintRail } from "./HintRail";
import { ChatRail } from "../chat-ui/ChatRail";
import type { LoadedGameRuntimeSnapshot } from "./game-runtime-loader";

export function StageGameplayPanel({
  snapshot,
  runtime,
  currentStageNumber,
}: {
  snapshot: RoomSnapshot;
  runtime: LoadedGameRuntimeSnapshot;
  currentStageNumber?: number;
}) {
  const stageNumber = snapshot.stage?.stageNumber ?? currentStageNumber ?? snapshot.game?.currentStageNumber ?? 1;
  const investigationHref = appendRoomContextToHref(`/stage/${stageNumber}/investigation`, snapshot);
  const lockOwnerId = snapshot.stage?.investigation?.lockedByPlayerId ?? null;
  const lockOwnerNickname =
    snapshot.players.find((player) => player.playerId === lockOwnerId)?.nickname ??
    (lockOwnerId === snapshot.me.playerId ? snapshot.me.nickname : null);
  const isInvestigationOpen = !lockOwnerId;
  const isLockedByMe = lockOwnerId === snapshot.me.playerId;
  const investigationStatus = isLockedByMe
    ? `${snapshot.me.nickname}님이 조사실을 점유 중입니다.`
    : lockOwnerNickname
      ? `${lockOwnerNickname}님이 조사실을 사용 중입니다.`
      : "지금 바로 조사실에 입장할 수 있습니다.";
  const hasCaseImage = typeof snapshot.stage?.imageUrl === "string" && snapshot.stage.imageUrl.length > 0;

  return (
    <section className="page-shell">
      <header className="page-header">
        <p className="eyebrow">실시간 추리전</p>
        <h2 className="page-title">추리 진행</h2>
        <p className="page-kicker">지금 필요한 정보만 남기고 정리한 진행 화면입니다.</p>
      </header>
      <SampleFlowNavigation snapshot={snapshot} currentStageNumber={currentStageNumber} />
      <div className="hero-grid">
        <section className="hero-card">
          <StageHUD snapshot={snapshot} />
        </section>
        <section className="panel panel-muted hero-aside">
          <div className="field">
            <h3 className="panel-title">조사실 진입</h3>
            <p className="panel-copy">
              {investigationStatus} 질문과 정답 정리는 조사실 안에서만 이어집니다.
            </p>
          </div>
          <div className="chip-row">
            <span className="status-badge" data-tone={isInvestigationOpen ? "live" : undefined}>
              {isLockedByMe ? "내가 점유 중" : isInvestigationOpen ? "입장 가능" : "사용 중"}
            </span>
            <Link className="button-primary" href={investigationHref}>
              {isLockedByMe ? "조사실로 복귀" : "조사실로 이동"}
            </Link>
          </div>
        </section>
      </div>
      <div className="split-layout">
        <section className="field">
          <HintRail snapshot={snapshot} />
          {hasCaseImage ? <CaseImageFrame snapshot={snapshot} /> : null}
        </section>
        <section>
          <ChatRail snapshot={snapshot} />
        </section>
      </div>
    </section>
  );
}
