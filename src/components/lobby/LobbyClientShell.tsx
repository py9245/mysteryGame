"use client";

import { useState } from "react";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { submitSetReady } from "@/features/lobby/set-ready-command";
import { LobbyShell } from "./LobbyShell";

export function LobbyClientShell({ initialSnapshot }: { initialSnapshot: RoomSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  return (
    <LobbyShell
      snapshot={snapshot}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      statusMessage={statusMessage}
      onToggleReady={handleToggleReady}
    />
  );
}
