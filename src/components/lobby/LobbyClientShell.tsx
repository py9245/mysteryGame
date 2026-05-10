"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoomSnapshot } from "@/contracts/api";
import type { ChatMessage } from "@/contracts/game";
import { appendRoomContextToHref } from "@/features/room-context/room-context";
import { useRoomRealtimeSnapshot } from "@/features/room-snapshot/use-room-realtime-snapshot";
import type { LoadedChatMessages } from "@/features/chat-ui/chat-messages-loader";
import {
  submitAssignTeams,
  submitStartStage,
} from "@/features/lobby/host-stage-command";
import { submitSetReady } from "@/features/lobby/set-ready-command";
import { LobbyShell } from "./LobbyShell";

export function LobbyClientShell({
  initialSnapshot,
  initialChatMessages,
  initialChatSource,
  chatEndpoint,
}: {
  initialSnapshot: RoomSnapshot;
  initialChatMessages: ChatMessage[];
  initialChatSource: LoadedChatMessages["source"];
  chatEndpoint: string;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useRoomRealtimeSnapshot(initialSnapshot, {
    fallbackIntervalMs: 24_000,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHostActionSubmitting, setIsHostActionSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function resolveCaseKey(stageNumber: number): string {
    return `case-${String(stageNumber).padStart(3, "0")}`;
  }

  async function handleToggleReady() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await submitSetReady({
      roomId: snapshot.room.id,
      playerId: snapshot.me.playerId,
      isReady: !snapshot.me.isReady,
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      setStatusMessage(
        result.snapshot.me.isReady
          ? "준비 완료. 방장이 팀 편성을 시작하면 다음 단계로 넘어갑니다."
          : "준비를 해제했습니다. 시작 전까지 다시 상태를 바꿀 수 있습니다.",
      );
      setIsSubmitting(false);
      return;
    }

    setErrorMessage(result.errorMessage ?? "ready 상태 변경에 실패했습니다.");
    setStatusMessage(null);
    setIsSubmitting(false);
  }

  async function handleStartGame() {
    if (isHostActionSubmitting) {
      return;
    }

    setIsHostActionSubmitting(true);
    setErrorMessage(null);

    const stageNumber = snapshot.game?.currentStageNumber ?? 1;
    let nextSnapshot = snapshot;

    if (snapshot.currentAssignments.length !== snapshot.players.length || snapshot.currentAssignments.length === 0) {
      const assignResult = await submitAssignTeams({
        roomId: snapshot.room.id,
        requestedByPlayerId: snapshot.me.playerId,
        stageNumber,
      });

      if (!assignResult.ok || !assignResult.snapshot) {
        setErrorMessage(assignResult.errorMessage ?? "팀 배정에 실패했습니다.");
        setStatusMessage(null);
        setIsHostActionSubmitting(false);
        return;
      }

      nextSnapshot = assignResult.snapshot;
      setSnapshot(assignResult.snapshot);
    }

    const result = await submitStartStage({
      roomId: nextSnapshot.room.id,
      requestedByPlayerId: nextSnapshot.me.playerId,
      caseKey: resolveCaseKey(stageNumber),
      durationSeconds: 15 * 60,
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      setStatusMessage("스테이지 브리핑이 시작되었습니다.");
      setIsHostActionSubmitting(false);
      router.push(
        appendRoomContextToHref(`/stage/${stageNumber}/briefing`, result.snapshot),
      );
      return;
    }

    setErrorMessage(result.errorMessage ?? "브리핑 시작에 실패했습니다.");
    setStatusMessage(null);
    setIsHostActionSubmitting(false);
  }

  return (
    <LobbyShell
      snapshot={snapshot}
      initialChatMessages={initialChatMessages}
      initialChatSource={initialChatSource}
      chatEndpoint={chatEndpoint}
      isSubmitting={isSubmitting}
      isHostActionSubmitting={isHostActionSubmitting}
      errorMessage={errorMessage}
      statusMessage={statusMessage}
      onToggleReady={handleToggleReady}
      onStartGame={handleStartGame}
    />
  );
}
