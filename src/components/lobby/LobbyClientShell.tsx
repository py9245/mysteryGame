"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoomSnapshot } from "@/contracts/api";
import { appendRoomContextToHref } from "@/features/room-context/room-context";
import {
  submitAssignTeams,
  submitStartStage,
} from "@/features/lobby/host-stage-command";
import { submitSetReady } from "@/features/lobby/set-ready-command";
import { LobbyShell } from "./LobbyShell";

export function LobbyClientShell({ initialSnapshot }: { initialSnapshot: RoomSnapshot }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
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

  async function handleAssignTeams() {
    if (isHostActionSubmitting) {
      return;
    }

    setIsHostActionSubmitting(true);
    setErrorMessage(null);

    const stageNumber = snapshot.game?.currentStageNumber ?? 1;
    const result = await submitAssignTeams({
      roomId: snapshot.room.id,
      requestedByPlayerId: snapshot.me.playerId,
      stageNumber,
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      setStatusMessage("팀 배정이 완료되었습니다. 이제 브리핑을 시작할 수 있습니다.");
      setIsHostActionSubmitting(false);
      return;
    }

    setErrorMessage(result.errorMessage ?? "팀 배정에 실패했습니다.");
    setStatusMessage(null);
    setIsHostActionSubmitting(false);
  }

  async function handleStartStage() {
    if (isHostActionSubmitting) {
      return;
    }

    setIsHostActionSubmitting(true);
    setErrorMessage(null);

    const stageNumber = snapshot.game?.currentStageNumber ?? 1;
    const result = await submitStartStage({
      roomId: snapshot.room.id,
      requestedByPlayerId: snapshot.me.playerId,
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
      isSubmitting={isSubmitting}
      isHostActionSubmitting={isHostActionSubmitting}
      errorMessage={errorMessage}
      statusMessage={statusMessage}
      onToggleReady={handleToggleReady}
      onAssignTeams={handleAssignTeams}
      onStartStage={handleStartStage}
    />
  );
}
