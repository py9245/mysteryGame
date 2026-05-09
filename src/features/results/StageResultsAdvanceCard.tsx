"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { appendRoomContextToHref } from "@/features/room-context/room-context";
import { submitAdvanceStage } from "./stage-results-command";

function isHostOrAdmin(role: RoomSnapshot["me"]["role"]): boolean {
  return role === "host" || role === "admin";
}

export function StageResultsAdvanceCard({
  snapshot,
  currentStageNumber,
}: {
  snapshot: RoomSnapshot;
  currentStageNumber: number;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canAdvance = isHostOrAdmin(snapshot.me.role) && snapshot.game?.status !== "finished";

  async function handleAdvanceStage() {
    if (!canAdvance || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await submitAdvanceStage({
      roomId: snapshot.room.id,
      requestedByPlayerId: snapshot.me.playerId,
      stageNumber: currentStageNumber,
      currentStageNumber,
    });

    if (result.ok && result.snapshot) {
      const targetHref =
        result.snapshot.game?.status === "finished"
          ? appendRoomContextToHref("/game/results", result.snapshot)
          : appendRoomContextToHref("/lobby", result.snapshot);

      setStatusMessage("다음 스테이지 준비가 완료되었습니다.");
      setIsSubmitting(false);
      router.push(targetHref);
      return;
    }

    setErrorMessage(result.errorMessage ?? "다음 스테이지 준비에 실패했습니다.");
    setIsSubmitting(false);
  }

  return (
    <section className="panel panel-accent span-12">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">다음 단계</h3>
          {canAdvance ? (
            <p className="panel-copy">다음 스테이지를 열 준비가 되었습니다. 준비가 끝나면 대기실로 돌아가 바로 팀 배정을 이어갑니다.</p>
          ) : (
            <p className="panel-copy">방장이 다음 단계를 열 때까지 대기합니다.</p>
          )}
          <p className="message-note">
            다음 상태: {canAdvance ? "대기실 복귀 후 다음 스테이지 준비" : "방장의 다음 단계 대기"}
          </p>
        </div>
        <span className="status-badge" data-tone={canAdvance ? "live" : "alert"}>
          {canAdvance ? "준비 가능" : "대기"}
        </span>
      </div>

      {canAdvance ? (
        <div className="action-row">
          <button className="button-primary" type="button" onClick={handleAdvanceStage} disabled={isSubmitting}>
            {isSubmitting ? "준비 중..." : "다음 스테이지 준비"}
          </button>
        </div>
      ) : null}

      {statusMessage ? <p className="message-positive">{statusMessage}</p> : null}
      {errorMessage ? <p className="message-negative">{errorMessage}</p> : null}
    </section>
  );
}
