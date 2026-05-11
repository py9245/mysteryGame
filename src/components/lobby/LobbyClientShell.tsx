"use client";

import { useEffect, useState } from "react";
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

const AUTO_CASE_SELECTION_SENTINEL = "__auto_case__";
const PRACTICE_LOADING_STEPS = [
  {
    message: "사건과 스테이지를 준비하고 있습니다.",
    detail: "연습모드는 준비된 사건 풀에서 바로 고르고, 일반방은 아직 안 해본 사건을 우선 골라 게임 화면으로 넘깁니다.",
  },
] as const;

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
  const [practiceLoadingStepIndex, setPracticeLoadingStepIndex] = useState<number | null>(null);

  function navigateToHref(href: string) {
    if (typeof window !== "undefined") {
      window.location.assign(href);
      return;
    }

    router.replace(href);
  }

  useEffect(() => {
    const stageNumber = snapshot.stage?.stageNumber ?? snapshot.game?.currentStageNumber ?? 1;

    if (
      snapshot.viewMode === "stage_briefing" ||
      snapshot.viewMode === "stage_playing" ||
      snapshot.viewMode === "investigation_active" ||
      snapshot.viewMode === "solved_spectator"
    ) {
      navigateToHref(appendRoomContextToHref(`/stage/${stageNumber}/gameplay`, snapshot));
      return;
    }

    if (snapshot.viewMode === "stage_results") {
      navigateToHref(appendRoomContextToHref(`/stage/${stageNumber}/results`, snapshot));
      return;
    }

    if (snapshot.viewMode === "game_results") {
      navigateToHref(appendRoomContextToHref(`/game/results`, snapshot));
    }
  }, [snapshot]);

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

    const stageNumber =
      snapshot.stage?.stageNumber ?? snapshot.game?.currentStageNumber ?? 1;
    setIsHostActionSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const isPracticeMode = snapshot.room.maxPlayers === 1 && snapshot.teamSlots.length === 1;
    let nextSnapshot = snapshot;

    if (isPracticeMode) {
      setPracticeLoadingStepIndex(0);
    }

    try {
      if (
        snapshot.currentAssignments.length !== snapshot.players.length ||
        snapshot.currentAssignments.length === 0
      ) {
        const assignResult = await submitAssignTeams({
          roomId: snapshot.room.id,
          requestedByPlayerId: snapshot.me.playerId,
          stageNumber,
        });

        if (!assignResult.ok || !assignResult.snapshot) {
          setErrorMessage(assignResult.errorMessage ?? "팀 배정에 실패했습니다.");
          setStatusMessage(null);
          return;
        }

        nextSnapshot = assignResult.snapshot;
        setSnapshot(assignResult.snapshot);
      }

      const result = await submitStartStage({
        roomId: nextSnapshot.room.id,
        requestedByPlayerId: nextSnapshot.me.playerId,
        caseKey: AUTO_CASE_SELECTION_SENTINEL,
        durationSeconds: 15 * 60,
      });

      if (result.ok && result.snapshot) {
        const nextStageNumber =
          result.snapshot.stage?.stageNumber ??
          result.snapshot.game?.currentStageNumber ??
          stageNumber;
        setSnapshot(result.snapshot);
        setStatusMessage(
          isPracticeMode
            ? "사건 준비를 마쳤습니다. 게임 화면으로 이동합니다."
            : "스테이지가 시작되었습니다. 게임 화면으로 이동합니다.",
        );
        navigateToHref(
          appendRoomContextToHref(`/stage/${nextStageNumber}/gameplay`, result.snapshot),
        );
        return;
      }

      setErrorMessage(result.errorMessage ?? "브리핑 시작에 실패했습니다.");
      setStatusMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "게임 시작 처리 중 오류가 발생했습니다.",
      );
      setStatusMessage(null);
    } finally {
      setPracticeLoadingStepIndex(null);
      setIsHostActionSubmitting(false);
    }
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
      practiceLoadingMessage={
        practiceLoadingStepIndex !== null ? PRACTICE_LOADING_STEPS[practiceLoadingStepIndex]?.message ?? null : null
      }
      practiceLoadingDetail={
        practiceLoadingStepIndex !== null ? PRACTICE_LOADING_STEPS[practiceLoadingStepIndex]?.detail ?? null : null
      }
      onToggleReady={handleToggleReady}
      onStartGame={handleStartGame}
    />
  );
}
