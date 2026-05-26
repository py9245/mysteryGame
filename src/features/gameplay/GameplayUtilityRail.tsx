import type { RoomSnapshot } from "@/contracts/api";
import { PrivateChatBanner } from "@/components/chat-ui/PrivateChatBanner";
import { InvestigationQueueBanner } from "@/components/investigation/InvestigationQueueBanner";
import { MyScoreCard } from "./MyScoreCard";
import type { LoadedGameRuntimeSnapshot } from "./game-runtime-loader";

export function GameplayUtilityRail({
  snapshot,
  runtime,
  nowMs,
  isSubmittingPrivateChat = false,
  privateChatStatusMessage = null,
  privateChatErrorMessage = null,
  onRequestPrivateChat,
  onRespondPrivateChat,
  onEndPrivateChat,
  onOpenInvestigationModal,
  onJoinInvestigationQueue,
  onLeaveInvestigationQueue,
  isSubmittingInvestigation = false,
}: {
  snapshot: RoomSnapshot;
  runtime: LoadedGameRuntimeSnapshot;
  nowMs?: number;
  isSubmittingPrivateChat?: boolean;
  privateChatStatusMessage?: string | null;
  privateChatErrorMessage?: string | null;
  onRequestPrivateChat?: (targetPlayerId: string) => void;
  onRespondPrivateChat?: (requestId: string, accept: boolean) => void;
  onEndPrivateChat?: (sessionId: string) => void;
  onOpenInvestigationModal?: () => void;
  onJoinInvestigationQueue?: () => void;
  onLeaveInvestigationQueue?: () => void;
  isSubmittingInvestigation?: boolean;
}) {
  const hasStage = Boolean(snapshot.stage?.stageId);

  return (
    <aside
      className="gameplay-utility-rail mt-utility-rail track-c-utility-rail"
      aria-label="유틸리티 영역"
    >
      <section className="track-c-utility-section" data-section="score" aria-label="내 점수">
        <header className="track-c-utility-section__head">
          <span className="track-c-utility-section__eyebrow">SCORE</span>
          <h3 className="track-c-utility-section__title">내 점수</h3>
        </header>
        <MyScoreCard snapshot={snapshot} nowMs={nowMs} />
      </section>

      <section className="track-c-utility-section" data-section="investigation" aria-label="질문방 상태">
        <header className="track-c-utility-section__head">
          <span className="track-c-utility-section__eyebrow">INVESTIGATION</span>
          <h3 className="track-c-utility-section__title">질문방</h3>
        </header>
        {hasStage ? (
          <InvestigationQueueBanner
            snapshot={snapshot}
            nowMs={nowMs}
            isSubmitting={isSubmittingInvestigation}
            onOpenInvestigationModal={onOpenInvestigationModal}
            onJoinQueue={onJoinInvestigationQueue}
            onLeaveQueue={onLeaveInvestigationQueue}
          />
        ) : (
          <div className="uiux-gameplay-skeleton-card" aria-hidden="true">
            <span className="uiux-skeleton" />
            <span className="uiux-skeleton" />
            <span className="uiux-skeleton" />
          </div>
        )}
      </section>

      <section className="track-c-utility-section" data-section="private-chat" aria-label="1:1 채팅">
        <header className="track-c-utility-section__head">
          <span className="track-c-utility-section__eyebrow">1:1 CHAT</span>
          <h3 className="track-c-utility-section__title">1:1 대화</h3>
        </header>
        <PrivateChatBanner
          snapshot={snapshot}
          nowMs={nowMs}
          isSubmitting={isSubmittingPrivateChat}
          statusMessage={privateChatStatusMessage}
          errorMessage={privateChatErrorMessage}
          onRequestPrivateChat={onRequestPrivateChat}
          onRespondPrivateChat={onRespondPrivateChat}
          onEndPrivateChat={onEndPrivateChat}
        />
      </section>

      {runtime.source !== "api" ? (
        <section
          className="panel panel-muted utility-card gameplay-runtime-note track-c-utility-section track-c-utility-section--note"
          data-section="status"
          aria-label="연결 상태"
        >
          <div className="composer-header">
            <div>
              <h3 className="panel-title">오프라인 데이터</h3>
              <p className="panel-copy">실시간 정보를 불러오지 못했습니다.</p>
            </div>
            <span className="status-badge" data-tone="alert">안내</span>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
