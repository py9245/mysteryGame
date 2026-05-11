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

const PRACTICE_GENERATED_CASE_SENTINEL = "__practice_generated__";
const PRACTICE_LOADING_STEPS = [
  {
    message: "사건 구조를 설계하고 있습니다.",
    detail: "AI가 용의자, 동기, 핵심 단서를 연결해 이번 연습 사건의 뼈대를 짜는 중입니다.",
  },
  {
    message: "공개 설명과 정답 키워드를 정리하고 있습니다.",
    detail: "게임 화면에 바로 보일 사건 요약과 정답 판정용 키워드를 다듬고 있습니다.",
  },
  {
    message: "사건 이미지를 생성하고 있습니다.",
    detail: "사건 분위기에 맞는 이미지를 만들고 있습니다. 준비가 끝나면 바로 플레이 화면으로 들어갑니다.",
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

  function resolveCaseKey(stageNumber: number): string {
    return `case-${String(stageNumber).padStart(3, "0")}`;
  }

  useEffect(() => {
    const stageNumber = snapshot.stage?.stageNumber ?? snapshot.game?.currentStageNumber ?? 1;

    if (
      snapshot.viewMode === "stage_briefing" ||
      snapshot.viewMode === "stage_playing" ||
      snapshot.viewMode === "investigation_active" ||
      snapshot.viewMode === "solved_spectator"
    ) {
      router.replace(appendRoomContextToHref(`/stage/${stageNumber}/gameplay`, snapshot));
      return;
    }

    if (snapshot.viewMode === "stage_results") {
      router.replace(appendRoomContextToHref(`/stage/${stageNumber}/results`, snapshot));
      return;
    }

    if (snapshot.viewMode === "game_results") {
      router.replace(appendRoomContextToHref(`/game/results`, snapshot));
    }
  }, [router, snapshot]);

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
    setStatusMessage(null);

    const stageNumber = snapshot.game?.currentStageNumber ?? 1;
    const isPracticeMode = snapshot.room.maxPlayers === 1 && snapshot.teamSlots.length === 1;
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

    let loadingInterval: ReturnType<typeof window.setInterval> | null = null;
    if (isPracticeMode && typeof window !== "undefined") {
      setPracticeLoadingStepIndex(0);
      loadingInterval = window.setInterval(() => {
        setPracticeLoadingStepIndex((current) => {
          if (current === null) {
            return 0;
          }

          return Math.min(current + 1, PRACTICE_LOADING_STEPS.length - 1);
        });
      }, 2600);
    }

    const result = await submitStartStage({
      roomId: nextSnapshot.room.id,
      requestedByPlayerId: nextSnapshot.me.playerId,
      caseKey: isPracticeMode ? PRACTICE_GENERATED_CASE_SENTINEL : resolveCaseKey(stageNumber),
      durationSeconds: 15 * 60,
    });

    if (loadingInterval) {
      window.clearInterval(loadingInterval);
    }
    setPracticeLoadingStepIndex(null);

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      setStatusMessage(
        isPracticeMode
          ? "AI가 사건 준비를 마쳤습니다. 게임 화면으로 이동합니다."
          : "스테이지 브리핑이 시작되었습니다.",
      );
      setIsHostActionSubmitting(false);
      router.push(
        appendRoomContextToHref(`/stage/${stageNumber}/gameplay`, result.snapshot),
      );
      return;
    }

    setErrorMessage(result.errorMessage ?? "브리핑 시작에 실패했습니다.");
    setStatusMessage(null);
    setPracticeLoadingStepIndex(null);
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
