import type { RoomSnapshot } from "@/contracts/api";
import { PrivateChatBanner } from "@/components/chat-ui/PrivateChatBanner";
import { InvestigationQueueBanner } from "@/components/investigation/InvestigationQueueBanner";
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
  return (
    <aside className="gameplay-utility-rail mt-utility-rail">
      <InvestigationQueueBanner
        snapshot={snapshot}
        nowMs={nowMs}
        isSubmitting={isSubmittingInvestigation}
        onOpenInvestigationModal={onOpenInvestigationModal}
        onJoinQueue={onJoinInvestigationQueue}
        onLeaveQueue={onLeaveInvestigationQueue}
      />
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
      {runtime.source !== "api" ? (
        <section className="panel panel-muted utility-card gameplay-runtime-note">
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
