"use client";

import { useEffect, useState } from "react";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import {
  submitAcquireInvestigationLock,
  submitReleaseInvestigationLock,
} from "./investigation-lock-command";
import { InvestigationPanel } from "./InvestigationPanel";

function buildDraftStorageKey(snapshot: RoomSnapshot): string {
  const stageId = snapshot.stage?.stageId ?? "stage";
  return `investigation-draft:${snapshot.room.id}:${stageId}:${snapshot.me.playerId}`;
}

function getRemainingSeconds(snapshot: RoomSnapshot, nowMs: number): number {
  const investigation = snapshot.stage?.investigation;
  if (!investigation) {
    return 0;
  }

  if (typeof investigation.expiresAt === "string") {
    const expiresAtMs = Date.parse(investigation.expiresAt);
    if (Number.isFinite(expiresAtMs)) {
      return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
    }
  }

  return typeof investigation.remainingSeconds === "number"
    ? Math.max(0, investigation.remainingSeconds)
    : 0;
}

export function InvestigationClientShell({
  initialSnapshot,
}: {
  initialSnapshot: RoomSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    try {
      const storedValue = window.sessionStorage.getItem(buildDraftStorageKey(snapshot));
      if (!storedValue) {
        setQuestionDraft("");
        setAnswerDraft("");
        return;
      }

      const parsed = JSON.parse(storedValue) as {
        questionDraft?: unknown;
        answerDraft?: unknown;
      };

      setQuestionDraft(typeof parsed.questionDraft === "string" ? parsed.questionDraft : "");
      setAnswerDraft(typeof parsed.answerDraft === "string" ? parsed.answerDraft : "");
    } catch {
      setQuestionDraft("");
      setAnswerDraft("");
    }
  }, [snapshot.room.id, snapshot.stage?.stageId, snapshot.me.playerId]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        buildDraftStorageKey(snapshot),
        JSON.stringify({
          questionDraft,
          answerDraft,
        }),
      );
    } catch {
      // Storage is optional for this draft UX.
    }
  }, [snapshot, questionDraft, answerDraft]);

  const displayedSnapshot =
    snapshot.stage?.investigation
      ? {
          ...snapshot,
          stage: {
            ...snapshot.stage,
            investigation: {
              ...snapshot.stage.investigation,
              remainingSeconds: getRemainingSeconds(snapshot, nowMs),
            },
          },
        }
      : snapshot;

  const investigation = displayedSnapshot.stage?.investigation;
  const lockOwnerId = investigation?.lockedByPlayerId ?? null;
  const isLockedByMe = lockOwnerId === displayedSnapshot.me.playerId;
  const isLockedByOther = Boolean(lockOwnerId && lockOwnerId !== displayedSnapshot.me.playerId);
  const hasStageContext = Boolean(displayedSnapshot.stage?.stageId);

  async function handleAcquireLock() {
    if (isSubmitting || !displayedSnapshot.stage?.stageId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await submitAcquireInvestigationLock({
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      playerId: displayedSnapshot.me.playerId,
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      setStatusMessage("조사실에 입장했습니다. 제한 시간 안에 질문과 정답 메모를 정리하세요.");
      setIsSubmitting(false);
      return;
    }

    setErrorMessage(result.errorMessage ?? "조사실 입장에 실패했습니다.");
    setStatusMessage(null);
    setIsSubmitting(false);
  }

  async function handleReleaseLock() {
    if (isSubmitting || !displayedSnapshot.stage?.stageId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await submitReleaseInvestigationLock({
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      playerId: displayedSnapshot.me.playerId,
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      setStatusMessage("조사실을 비웠습니다. 다른 플레이어가 바로 입장할 수 있습니다.");
      setIsSubmitting(false);
      return;
    }

    setErrorMessage(result.errorMessage ?? "조사실 퇴장에 실패했습니다.");
    setStatusMessage(null);
    setIsSubmitting(false);
  }

  return (
    <InvestigationPanel
      snapshot={displayedSnapshot}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      statusMessage={statusMessage}
      onAcquireLock={handleAcquireLock}
      onReleaseLock={handleReleaseLock}
      canAcquireLock={hasStageContext && !isLockedByMe && !isLockedByOther}
      canReleaseLock={hasStageContext && isLockedByMe}
      questionDraft={questionDraft}
      onQuestionDraftChange={setQuestionDraft}
      answerDraft={answerDraft}
      onAnswerDraftChange={setAnswerDraft}
      isDraftEditable={isLockedByMe}
    />
  );
}
