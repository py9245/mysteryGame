import type { CSSProperties } from "react";
import type { RoomSnapshot } from "@/contracts/api";
import type { ChatMessage } from "@/contracts/game";
import type { RoomRealtimeSyncMeta } from "@/features/room-snapshot/use-room-realtime-snapshot";
import { RoomPresenceClient } from "@/components/room/RoomPresenceClient";
import { LeaveRoomButton } from "@/components/room/LeaveRoomButton";
import { CaseImageFrame } from "@/components/stage/CaseImageFrame";
import { CasePanel } from "@/components/stage/CasePanel";
import { StageHUD } from "@/components/stage/StageHUD";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { RealtimeStatusStrip } from "@/components/status/RealtimeStatusStrip";
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
  syncMeta,
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
  initialChatMessages: ChatMessage[];
  initialChatSource: LoadedChatMessages["source"];
  chatEndpoint: string;
  runtime: LoadedGameRuntimeSnapshot;
  currentStageNumber?: number;
  nowMs?: number;
  syncMeta: RoomRealtimeSyncMeta;
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
  const stageNumber = snapshot.stage?.stageNumber ?? currentStageNumber ?? snapshot.game?.currentStageNumber ?? 1;
  const teamLabel = snapshot.me.teamSlotId
    ? snapshot.teamSlots.find((team) => team.id === snapshot.me.teamSlotId)?.label ?? "팀 미정"
    : "팀 미정";
  const stageQuestion = snapshot.stage?.question?.trim() || "사건의 전말을 추리해 정답을 제출하세요.";

  return (
    <section className="page-shell gameplay-page-shell track-c-gameplay-shell">
      <RoomPresenceClient
        roomId={snapshot.room.id}
        playerId={snapshot.me.playerId}
        stageNumber={stageNumber}
      />
      <header className="gameplay-topbar track-c-gameplay-topbar uiux-gameplay-topbar-enter">
        <div className="gameplay-stage-copy track-c-gameplay-topbar__identity">
          <div className="gameplay-stage-meta">
            <span className="status-badge" data-tone="live">S{stageNumber}</span>
            <span className="status-badge">{snapshot.room.code}</span>
            <span className="status-badge">{teamLabel}</span>
          </div>
          <h1 className="gameplay-stage-title">{snapshot.stage?.publicTitle ?? `스테이지 ${stageNumber}`}</h1>
          <span className="gameplay-stage-subtitle">사건 파일과 채팅을 동시에 활용하세요.</span>
        </div>
        <section className="gameplay-objective-card track-c-gameplay-topbar__objective" aria-label="추리 목표">
          <span className="gameplay-objective-label">추리 목표</span>
          <p className="gameplay-objective-copy">
            사망 이유, 범행 도구, 범인, 장소를 연결해 사건의 전말을 맞추세요.
          </p>
          <span className="gameplay-objective-question">{stageQuestion}</span>
        </section>
        <div className="gameplay-topbar-controls track-c-gameplay-topbar__hud">
          <StageHUD snapshot={snapshot} nowMs={nowMs} />
          <div className="header-actions gameplay-topbar-actions">
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
      <RealtimeStatusStrip
        snapshot={snapshot}
        syncMeta={syncMeta}
        variant="gameplay"
        nowMs={nowMs}
      />
      <div className="gameplay-layout mt-gameplay-layout track-c-gameplay-grid">
        <section
          className="gameplay-column gameplay-column-left track-c-gameplay-grid__col track-c-gameplay-grid__col--case uiux-gameplay-col-enter"
          style={{ "--uiux-col-delay": "60ms" } as CSSProperties}
        >
          <section className="panel panel-muted gameplay-story-card track-c-case-card">
            <div className="gameplay-story-summary">
              <CasePanel snapshot={snapshot} />
            </div>
            <div className="gameplay-story-media">
              <CaseImageFrame snapshot={snapshot} />
            </div>
          </section>
        </section>

        <section
          className="gameplay-column gameplay-column-center gameplay-column-actions track-c-gameplay-grid__col track-c-gameplay-grid__col--rail uiux-gameplay-col-enter"
          style={{ "--uiux-col-delay": "140ms" } as CSSProperties}
        >
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
            onOpenInvestigationModal={onOpenInvestigationModal}
            onJoinInvestigationQueue={onJoinInvestigationQueue}
            onLeaveInvestigationQueue={onLeaveInvestigationQueue}
            isSubmittingInvestigation={isSubmittingInvestigation}
          />
        </section>

        <section
          className="gameplay-column gameplay-column-right gameplay-column-chat track-c-gameplay-grid__col track-c-gameplay-grid__col--chat uiux-gameplay-col-enter"
          style={{ "--uiux-col-delay": "220ms" } as CSSProperties}
        >
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
