import type { RoomSnapshot } from "@/contracts/api";
import type { ChatMessage } from "@/contracts/game";
import { RoomPresenceClient } from "@/components/room/RoomPresenceClient";
import { LeaveRoomButton } from "@/components/room/LeaveRoomButton";
import { CaseImageFrame } from "@/components/stage/CaseImageFrame";
import { CasePanel } from "@/components/stage/CasePanel";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import type { LoadedChatMessages } from "@/features/chat-ui/chat-messages-loader";
import { ChatRailClientShell } from "@/features/chat-ui/ChatRailClientShell";
import { GameplayUtilityRail } from "./GameplayUtilityRail";
import type { LoadedGameRuntimeSnapshot } from "./game-runtime-loader";

export function StageGameplayPanel({
  snapshot,
  initialChatMessages,
  initialChatSource,
  chatEndpoint,
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
  initialChatMessages: ChatMessage[];
  initialChatSource: LoadedChatMessages["source"];
  chatEndpoint: string;
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
  const stageTitle = snapshot.stage?.publicTitle ?? `스테이지 ${stageNumber}`;
  const briefingCopy =
    snapshot.stage?.status === "briefing"
      ? `브리핑 ${snapshot.stage?.remainingSeconds ?? 0}초 · 지금은 채팅만 가능하고, 0초가 되면 질문방이 열립니다.`
      : "채팅과 행동 패널을 한 화면에서 바로 이어서 진행하세요.";

  return (
    <section className="page-shell">
      <RoomPresenceClient
        roomId={snapshot.room.id}
        playerId={snapshot.me.playerId}
        stageNumber={stageNumber}
      />
      <header className="gameplay-topbar">
        <div className="gameplay-stage-copy">
          <div className="gameplay-stage-meta">
            <span className="status-badge" data-tone="live">S{stageNumber}</span>
            <span className="status-badge">{snapshot.room.code}</span>
            <span className="status-badge">{snapshot.me.teamSlotId ? snapshot.teamSlots.find((team) => team.id === snapshot.me.teamSlotId)?.label ?? "팀 미정" : "팀 미정"}</span>
          </div>
          <h1 className="gameplay-stage-title">{stageTitle}</h1>
          <p className="gameplay-stage-subtitle">{briefingCopy}</p>
        </div>
        <div className="header-actions gameplay-topbar-actions">
            <LeaveRoomButton
              roomId={snapshot.room.id}
              playerId={snapshot.me.playerId}
              redirectHref="/"
              label="게임 나가기"
            />
            <RulebookLauncher label="룰북" compact scope="game" />
        </div>
      </header>
      <div className="gameplay-layout mt-gameplay-layout">
        <section className="gameplay-column gameplay-column-left">
          <section className="panel panel-muted gameplay-story-card">
            <div className="gameplay-story-media">
              <CaseImageFrame snapshot={snapshot} />
            </div>
            <div className="gameplay-story-summary">
              <CasePanel snapshot={snapshot} />
            </div>
          </section>
        </section>

        <section className="gameplay-column gameplay-column-center gameplay-column-actions">
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

        <section className="gameplay-column gameplay-column-right gameplay-column-chat">
          <ChatRailClientShell
            snapshot={snapshot}
            initialMessages={initialChatMessages}
            source={initialChatSource}
            endpoint={chatEndpoint}
          />
        </section>
      </div>
    </section>
  );
}
