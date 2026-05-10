import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
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
      <header className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">현재 상태</p>
            <h2 className="page-title">추리 진행</h2>
            <div className="header-flow">
              <p className="header-flow-line">
                <strong>읽는 순서</strong> · 사건을 보고, 채팅을 정리하고, 오른쪽에서 지금 할 일 하나만 확인합니다.
              </p>
              <p className="header-flow-line" data-tone="action">
                <strong>현재 스테이지</strong> · {stageNumber}단계 진행 중
              </p>
            </div>
          </div>
          <div className="header-actions">
            <RulebookLauncher label="룰북" compact scope="game" />
          </div>
        </div>
      </header>
      <div className="gameplay-layout">
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
