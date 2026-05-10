import type { RoomSnapshot } from "@/contracts/api";
import { MyScoreCard } from "./MyScoreCard";
import { PrivateChatBanner } from "@/components/chat-ui/PrivateChatBanner";
import { InvestigationQueueBanner } from "@/components/investigation/InvestigationQueueBanner";
import type { LoadedGameRuntimeSnapshot } from "./game-runtime-loader";
import { PlayerActionPanel } from "./PlayerActionPanel";

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
}) {
  return (
    <aside className="gameplay-utility-rail mt-utility-rail">
      <section className="panel panel-muted utility-card gameplay-rail-intro">
        <div>
          <h3 className="panel-title">내 행동</h3>
          <p className="panel-copy">점수, 질문, 1:1 요청을 여기서 처리합니다.</p>
        </div>
      </section>
      <PlayerActionPanel snapshot={snapshot} />
      <MyScoreCard snapshot={snapshot} />
      <InvestigationQueueBanner snapshot={snapshot} players={snapshot.players} nowMs={nowMs} />
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
