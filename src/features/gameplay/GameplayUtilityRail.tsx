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
    <aside className="gameplay-utility-rail">
      <section className="panel panel-muted utility-card gameplay-rail-intro">
        <div>
          <h3 className="panel-title">오른쪽 레일</h3>
          <p className="panel-copy">점수와 상태는 여기만 보면 됩니다. 맨 위 카드부터 순서대로 확인하세요.</p>
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
              <h3 className="panel-title">상태 안내</h3>
              <p className="panel-copy">실시간 연결을 준비 중이어서 일부 정보는 더미 상태로 보일 수 있습니다.</p>
            </div>
            <span className="status-badge">안내</span>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
