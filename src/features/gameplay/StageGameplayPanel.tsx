import type { RoomSnapshot } from "@/contracts/api";
import { RoomPresenceClient } from "@/components/room/RoomPresenceClient";
import { LeaveRoomButton } from "@/components/room/LeaveRoomButton";
import { CaseImageFrame } from "@/components/stage/CaseImageFrame";
import { CasePanel } from "@/components/stage/CasePanel";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { ChatRail } from "../chat-ui/ChatRail";
import { GameplayUtilityRail } from "./GameplayUtilityRail";
import type { LoadedGameRuntimeSnapshot } from "./game-runtime-loader";

export function StageGameplayPanel({
  snapshot,
  runtime,
  currentStageNumber,
  nowMs,
  isSubmittingPrivateChat = false,
  privateChatStatusMessage = null,
  privateChatErrorMessage = null,
  onRequestPrivateChat,
  onRespondPrivateChat,
  onEndPrivateChat,
}: {
  snapshot: RoomSnapshot;
  runtime: LoadedGameRuntimeSnapshot;
  currentStageNumber?: number;
  nowMs?: number;
  isSubmittingPrivateChat?: boolean;
  privateChatStatusMessage?: string | null;
  privateChatErrorMessage?: string | null;
  onRequestPrivateChat?: (targetPlayerId: string) => void;
  onRespondPrivateChat?: (requestId: string, accept: boolean) => void;
  onEndPrivateChat?: (sessionId: string) => void;
}) {
  const stageNumber = snapshot.stage?.stageNumber ?? currentStageNumber ?? snapshot.game?.currentStageNumber ?? 1;

  return (
    <section className="page-shell">
      <RoomPresenceClient
        roomId={snapshot.room.id}
        playerId={snapshot.me.playerId}
        stageNumber={stageNumber}
      />
      <header className="page-header mt-game-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">Investigation</p>
            <h2 className="page-title">스테이지 {stageNumber}</h2>
            <div className="header-flow">
              <p className="header-flow-line">사건 이미지와 단서를 확인한 뒤 채팅과 행동 패널을 사용하세요.</p>
              <p className="header-flow-line" data-tone="action">현재 스테이지 · {stageNumber}</p>
            </div>
          </div>
          <div className="header-actions">
            <LeaveRoomButton
              roomId={snapshot.room.id}
              playerId={snapshot.me.playerId}
              redirectHref="/"
              label="게임 나가기"
            />
            <RulebookLauncher label="룰북" compact scope="game" />
          </div>
        </div>
      </header>
      <div className="gameplay-layout mt-gameplay-layout">
        <section className="gameplay-column gameplay-column-left gameplay-left-layout">
          <div className="gameplay-case-image-slot">
            <CaseImageFrame snapshot={snapshot} />
          </div>
          <div className="gameplay-case-summary-slot">
            <CasePanel snapshot={snapshot} />
          </div>
        </section>

        <section className="gameplay-column gameplay-column-center">
          <ChatRail snapshot={snapshot} />
        </section>

        <section className="gameplay-column gameplay-column-right">
          <GameplayUtilityRail
            snapshot={snapshot}
            runtime={runtime}
            nowMs={nowMs}
            isSubmittingPrivateChat={isSubmittingPrivateChat}
            privateChatStatusMessage={privateChatStatusMessage}
            privateChatErrorMessage={privateChatErrorMessage}
            onRequestPrivateChat={onRequestPrivateChat}
            onRespondPrivateChat={onRespondPrivateChat}
            onEndPrivateChat={onEndPrivateChat}
          />
        </section>
      </div>
    </section>
  );
}
