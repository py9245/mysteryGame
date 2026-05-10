"use client";

import { useEffect, useState } from "react";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { normalizeRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import { StageGameplayPanel } from "./StageGameplayPanel";
import type { LoadedGameRuntimeSnapshot } from "./game-runtime-loader";
import {
  submitPrivateChatEnd,
  submitPrivateChatRequest,
  submitPrivateChatResponse,
} from "./private-chat-command";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildSnapshotEndpoint(snapshot: RoomSnapshot): string {
  const stageNumber = snapshot.stage?.stageNumber ?? snapshot.game?.currentStageNumber ?? 1;
  const params = new URLSearchParams({
    playerId: snapshot.me.playerId,
    stageNumber: String(stageNumber),
  });

  return `/api/room/${encodeURIComponent(snapshot.room.id)}?${params.toString()}`;
}

export function GameplayClientShell({
  initialSnapshot,
  runtime,
  currentStageNumber,
}: {
  initialSnapshot: RoomSnapshot;
  runtime: LoadedGameRuntimeSnapshot;
  currentStageNumber?: number;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [nowMs, setNowMs] = useState(Date.now());
  const [isSubmittingPrivateChat, setIsSubmittingPrivateChat] = useState(false);
  const [privateChatStatusMessage, setPrivateChatStatusMessage] = useState<string | null>(null);
  const [privateChatErrorMessage, setPrivateChatErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function refreshSnapshot() {
      try {
        const response = await fetch(buildSnapshotEndpoint(snapshot), {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as unknown;
        const nextSnapshot =
          isRecord(payload) && "data" in payload
            ? normalizeRoomSnapshot(payload.data)
            : normalizeRoomSnapshot(payload);

        if (mounted) {
          setSnapshot(nextSnapshot);
        }
      } catch {
        // Polling is best effort only.
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshSnapshot();
    }, 4000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [snapshot.room.id, snapshot.me.playerId, snapshot.stage?.stageNumber]);

  async function handleRequestPrivateChat(targetPlayerId: string) {
    if (isSubmittingPrivateChat || !snapshot.stage?.stageId) {
      return;
    }

    setIsSubmittingPrivateChat(true);
    setPrivateChatStatusMessage(null);
    setPrivateChatErrorMessage(null);

    const result = await submitPrivateChatRequest({
      type: "request_private_chat",
      roomId: snapshot.room.id,
      stageId: snapshot.stage.stageId,
      requesterPlayerId: snapshot.me.playerId,
      targetPlayerId,
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
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
      roomId: snapshot.room.id,
      requestId,
      responderPlayerId: snapshot.me.playerId,
      accept,
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
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
    if (isSubmittingPrivateChat || !snapshot.stage?.stageId) {
      return;
    }

    setIsSubmittingPrivateChat(true);
    setPrivateChatStatusMessage(null);
    setPrivateChatErrorMessage(null);

    const result = await submitPrivateChatEnd({
      type: "end_private_chat",
      roomId: snapshot.room.id,
      stageId: snapshot.stage.stageId,
      sessionId,
      playerId: snapshot.me.playerId,
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      setPrivateChatStatusMessage("1:1 대화를 종료했습니다. 이후 10초 동안은 새 요청을 보낼 수 없습니다.");
    } else {
      setPrivateChatErrorMessage(result.errorMessage ?? "1:1 대화를 종료하지 못했습니다.");
    }

    setIsSubmittingPrivateChat(false);
  }

  return (
    <StageGameplayPanel
      snapshot={snapshot}
      runtime={runtime}
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
