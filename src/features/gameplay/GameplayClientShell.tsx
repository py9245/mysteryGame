"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomSnapshot } from "@/contracts/api";
import type { ChatMessage } from "@/contracts/game";
import type { LoadedChatMessages } from "@/features/chat-ui/chat-messages-loader";
import { normalizeRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import { useRoomRealtimeSnapshot } from "@/features/room-snapshot/use-room-realtime-snapshot";
import { StageGameplayPanel } from "./StageGameplayPanel";
import type { LoadedGameRuntimeSnapshot } from "./game-runtime-loader";
import {
  submitPrivateChatEnd,
  submitPrivateChatRequest,
  submitPrivateChatResponse,
} from "./private-chat-command";

export function GameplayClientShell({
  initialSnapshot,
  initialChatMessages,
  initialChatSource,
  chatEndpoint,
  runtime,
  currentStageNumber,
}: {
  initialSnapshot: RoomSnapshot;
  initialChatMessages: ChatMessage[];
  initialChatSource: LoadedChatMessages["source"];
  chatEndpoint: string;
  runtime: LoadedGameRuntimeSnapshot;
  currentStageNumber?: number;
}) {
  const [runtimeSnapshot] = useState(runtime);
  const [snapshot, setSnapshot] = useRoomRealtimeSnapshot(initialSnapshot, {
    fallbackIntervalMs: 18_000,
  });
  const [nowMs, setNowMs] = useState(Date.now());
  const [isSubmittingPrivateChat, setIsSubmittingPrivateChat] = useState(false);
  const [privateChatStatusMessage, setPrivateChatStatusMessage] = useState<string | null>(null);
  const [privateChatErrorMessage, setPrivateChatErrorMessage] = useState<string | null>(null);
  const [countdownSeed, setCountdownSeed] = useState(() => ({
    stageId: initialSnapshot.stage?.stageId ?? null,
    stageStatus: initialSnapshot.stage?.status ?? null,
    remainingSeconds: initialSnapshot.stage?.remainingSeconds ?? 0,
    capturedAtMs: Date.now(),
  }));
  const lastBoundaryRefreshAtMsRef = useRef(0);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    setCountdownSeed({
      stageId: snapshot.stage?.stageId ?? null,
      stageStatus: snapshot.stage?.status ?? null,
      remainingSeconds: snapshot.stage?.remainingSeconds ?? 0,
      capturedAtMs: Date.now(),
    });
  }, [snapshot.stage?.stageId, snapshot.stage?.status, snapshot.stage?.remainingSeconds]);

  const displayedSnapshot = useMemo(() => {
    if (!snapshot.stage) {
      return snapshot;
    }

    if (snapshot.stage.status !== "briefing" && snapshot.stage.status !== "in_progress") {
      return snapshot;
    }

    if (
      countdownSeed.stageId !== snapshot.stage.stageId ||
      countdownSeed.stageStatus !== snapshot.stage.status
    ) {
      return snapshot;
    }

    const elapsedSeconds = Math.max(0, Math.floor((nowMs - countdownSeed.capturedAtMs) / 1000));
    const remainingSeconds = Math.max(0, countdownSeed.remainingSeconds - elapsedSeconds);

    return {
      ...snapshot,
      stage: {
        ...snapshot.stage,
        remainingSeconds,
      },
    };
  }, [countdownSeed, nowMs, snapshot]);

  useEffect(() => {
    async function refreshStageBoundarySnapshot() {
      const stageNumber =
        snapshot.stage?.stageNumber ?? currentStageNumber ?? snapshot.game?.currentStageNumber ?? 1;
      const params = new URLSearchParams({
        playerId: snapshot.me.playerId,
        stageNumber: String(stageNumber),
      });

      const response = await fetch(
        `/api/room/${encodeURIComponent(snapshot.room.id)}?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as unknown;
      const nextSnapshot =
        typeof payload === "object" && payload !== null && "data" in payload
          ? normalizeRoomSnapshot((payload as { data: unknown }).data)
          : normalizeRoomSnapshot(payload);

      setSnapshot(nextSnapshot);
    }

    if (
      !displayedSnapshot.stage ||
      displayedSnapshot.stage.status !== "briefing" ||
      displayedSnapshot.stage.remainingSeconds > 0
    ) {
      return;
    }

    if (nowMs - lastBoundaryRefreshAtMsRef.current < 1_500) {
      return;
    }

    lastBoundaryRefreshAtMsRef.current = nowMs;
    void refreshStageBoundarySnapshot();
  }, [
    currentStageNumber,
    displayedSnapshot.stage,
    nowMs,
    setSnapshot,
    snapshot.game?.currentStageNumber,
    snapshot.me.playerId,
    snapshot.room.id,
    snapshot.stage?.stageNumber,
  ]);

  async function handleRequestPrivateChat(targetPlayerId: string) {
    if (isSubmittingPrivateChat || !displayedSnapshot.stage?.stageId) {
      return;
    }

    setIsSubmittingPrivateChat(true);
    setPrivateChatStatusMessage(null);
    setPrivateChatErrorMessage(null);

    const result = await submitPrivateChatRequest({
      type: "request_private_chat",
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      requesterPlayerId: displayedSnapshot.me.playerId,
      targetPlayerId,
    });

    if (result.ok && result.snapshot) {
      setPrivateChatStatusMessage("1:1 요청을 보냈습니다. 상대가 15초 안에 수락 또는 거절할 수 있습니다.");
    } else {
      setPrivateChatErrorMessage(result.errorMessage ?? "1:1 요청을 보내지 못했습니다.");
    }

    setIsSubmittingPrivateChat(false);
  }

  async function handleRespondPrivateChat(requestId: string, accept: boolean) {
    if (isSubmittingPrivateChat) {
      return;
    }

    setIsSubmittingPrivateChat(true);
    setPrivateChatStatusMessage(null);
    setPrivateChatErrorMessage(null);

    const result = await submitPrivateChatResponse({
      type: "respond_private_chat",
      roomId: displayedSnapshot.room.id,
      requestId,
      responderPlayerId: displayedSnapshot.me.playerId,
      accept,
    });

    if (result.ok && result.snapshot) {
      setPrivateChatStatusMessage(
        accept
          ? "1:1 대화가 연결되었습니다. 최소 유지 시간이 지나야 종료할 수 있습니다."
          : "요청을 거절했습니다. 상대는 잠시 후 다시 신청할 수 있습니다.",
      );
    } else {
      setPrivateChatErrorMessage(result.errorMessage ?? "요청 응답을 처리하지 못했습니다.");
    }

    setIsSubmittingPrivateChat(false);
  }

  async function handleEndPrivateChat(sessionId: string) {
    if (isSubmittingPrivateChat || !displayedSnapshot.stage?.stageId) {
      return;
    }

    setIsSubmittingPrivateChat(true);
    setPrivateChatStatusMessage(null);
    setPrivateChatErrorMessage(null);

    const result = await submitPrivateChatEnd({
      type: "end_private_chat",
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      sessionId,
      playerId: displayedSnapshot.me.playerId,
    });

    if (result.ok && result.snapshot) {
      setPrivateChatStatusMessage("1:1 대화를 종료했습니다. 이후 10초 동안은 새 요청을 보낼 수 없습니다.");
    } else {
      setPrivateChatErrorMessage(result.errorMessage ?? "1:1 대화를 종료하지 못했습니다.");
    }

    setIsSubmittingPrivateChat(false);
  }

  return (
    <StageGameplayPanel
      snapshot={displayedSnapshot}
      initialChatMessages={initialChatMessages}
      initialChatSource={initialChatSource}
      chatEndpoint={chatEndpoint}
      runtime={runtimeSnapshot}
      currentStageNumber={currentStageNumber}
      nowMs={nowMs}
      isSubmittingPrivateChat={isSubmittingPrivateChat}
      privateChatStatusMessage={privateChatStatusMessage}
      privateChatErrorMessage={privateChatErrorMessage}
      onRequestPrivateChat={handleRequestPrivateChat}
      onRespondPrivateChat={handleRespondPrivateChat}
      onEndPrivateChat={handleEndPrivateChat}
    />
  );
}
