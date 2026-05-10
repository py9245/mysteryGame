"use client";

import { useEffect, useState } from "react";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import {
  submitAcquireInvestigationLock,
  submitReleaseInvestigationLock,
} from "./investigation-lock-command";
import {
  submitJoinInvestigationQueue,
  submitLeaveInvestigationQueue,
} from "./investigation-queue-command";
import {
  submitInvestigationAnswer,
  submitInvestigationQuestion,
} from "./investigation-command";
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

function getQueueCooldownSeconds(snapshot: RoomSnapshot, nowMs: number): number {
  const cooldownEndsAt = snapshot.stage?.investigation?.reentryCooldownEndsAt;
  if (!cooldownEndsAt) {
    return 0;
  }

  const expiresAtMs = Date.parse(cooldownEndsAt);
  if (!Number.isFinite(expiresAtMs)) {
    return 0;
  }

  return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
}

export function InvestigationClientShell({
  initialSnapshot,
}: {
  initialSnapshot: RoomSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuestionSubmitting, setIsQuestionSubmitting] = useState(false);
  const [isAnswerSubmitting, setIsAnswerSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [questionFeedbackMessage, setQuestionFeedbackMessage] = useState<string | null>(null);
  const [questionFeedbackTone, setQuestionFeedbackTone] = useState<"positive" | "negative" | "note">("note");
  const [answerFeedbackMessage, setAnswerFeedbackMessage] = useState<string | null>(null);
  const [answerFeedbackTone, setAnswerFeedbackTone] = useState<"positive" | "negative" | "note">("note");
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
  const queuePosition = investigation?.queuePosition ?? null;
  const isQueued = queuePosition !== null;
  const waitingPlayerCount = investigation?.waitingPlayerCount ?? 0;
  const queueCooldownSeconds = getQueueCooldownSeconds(displayedSnapshot, nowMs);
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

  async function handleJoinQueue() {
    if (isSubmitting || !displayedSnapshot.stage?.stageId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await submitJoinInvestigationQueue({
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      playerId: displayedSnapshot.me.playerId,
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      const admitted = result.snapshot.stage?.investigation?.lockedByPlayerId === displayedSnapshot.me.playerId;
      setStatusMessage(
        admitted
          ? "질문방이 비어 있어서 바로 입장했습니다."
          : "질문방 대기열에 참가했습니다. 차례가 오면 자동으로 입장합니다.",
      );
      setIsSubmitting(false);
      return;
    }

    setErrorMessage(result.errorMessage ?? "질문방 대기열에 참가하지 못했습니다.");
    setStatusMessage(null);
    setIsSubmitting(false);
  }

  async function handleLeaveQueue() {
    if (isSubmitting || !displayedSnapshot.stage?.stageId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await submitLeaveInvestigationQueue({
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      playerId: displayedSnapshot.me.playerId,
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      setStatusMessage("질문방 대기열에서 빠졌습니다.");
      setIsSubmitting(false);
      return;
    }

    setErrorMessage(result.errorMessage ?? "질문방 대기열 취소에 실패했습니다.");
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

  async function handleSubmitQuestion() {
    if (
      isQuestionSubmitting ||
      !displayedSnapshot.stage?.stageId ||
      !displayedSnapshot.stage?.investigation ||
      !isLockedByMe ||
      !displayedSnapshot.me.teamSlotId
    ) {
      return;
    }

    setIsQuestionSubmitting(true);
    setQuestionFeedbackMessage(null);
    setQuestionFeedbackTone("note");

    const result = await submitInvestigationQuestion({
      type: "submit_question",
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      playerId: displayedSnapshot.me.playerId,
      teamSlotId: displayedSnapshot.me.teamSlotId,
      content: questionDraft.trim(),
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      setQuestionFeedbackTone("positive");
      setQuestionFeedbackMessage(
        result.question?.judgement
          ? `질문이 접수되었습니다. 공개 응답: ${result.question.judgement}`
          : "질문이 접수되었습니다.",
      );
      setStatusMessage("질문이 저장되었습니다. 공개 응답을 확인하세요.");
      setErrorMessage(null);
    } else {
      setQuestionFeedbackTone("negative");
      setQuestionFeedbackMessage(result.errorMessage ?? "질문 제출에 실패했습니다.");
      setErrorMessage(result.errorMessage ?? "질문 제출에 실패했습니다.");
    }

    setIsQuestionSubmitting(false);
  }

  async function handleSubmitAnswer() {
    if (
      isAnswerSubmitting ||
      !displayedSnapshot.stage?.stageId ||
      !displayedSnapshot.stage?.investigation ||
      !isLockedByMe ||
      !displayedSnapshot.me.teamSlotId
    ) {
      return;
    }

    setIsAnswerSubmitting(true);
    setAnswerFeedbackMessage(null);
    setAnswerFeedbackTone("note");

    const result = await submitInvestigationAnswer({
      type: "submit_answer",
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      playerId: displayedSnapshot.me.playerId,
      teamSlotId: displayedSnapshot.me.teamSlotId,
      content: answerDraft.trim(),
    });

    if (result.ok && result.snapshot) {
      setSnapshot(result.snapshot);
      const outcome = result.snapshot.stage?.lastAnswerResult;
      const publicOutcome =
        outcome && typeof outcome === "object" && "publicOutcome" in outcome
          ? outcome.publicOutcome
          : "needs_review";

      setAnswerFeedbackTone(publicOutcome === "correct" ? "positive" : publicOutcome === "wrong" ? "negative" : "note");
      setAnswerFeedbackMessage(
        publicOutcome === "correct"
          ? "정답으로 인정되었습니다. 이제 관전 상태로 전환됩니다."
          : publicOutcome === "wrong"
            ? "정답이 인정되지 않았습니다. 다시 정리해 보세요."
            : "운영자 확인이 필요합니다.",
      );
      setStatusMessage("정답 제출 결과가 반영되었습니다.");
      setErrorMessage(null);
    } else {
      setAnswerFeedbackTone("negative");
      setAnswerFeedbackMessage(result.errorMessage ?? "정답 제출에 실패했습니다.");
      setErrorMessage(result.errorMessage ?? "정답 제출에 실패했습니다.");
    }

    setIsAnswerSubmitting(false);
  }

  return (
    <InvestigationPanel
      snapshot={displayedSnapshot}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      statusMessage={statusMessage}
      onAcquireLock={handleAcquireLock}
      onReleaseLock={handleReleaseLock}
      onJoinQueue={handleJoinQueue}
      onLeaveQueue={handleLeaveQueue}
      canAcquireLock={hasStageContext && !isLockedByMe && !isLockedByOther}
      canReleaseLock={hasStageContext && isLockedByMe}
      canJoinQueue={hasStageContext && !isLockedByMe && !isQueued && queueCooldownSeconds === 0}
      canLeaveQueue={hasStageContext && isQueued}
      isQueued={isQueued}
      queuePosition={queuePosition}
      waitingPlayerCount={waitingPlayerCount}
      queueCooldownSeconds={queueCooldownSeconds}
      onSubmitQuestion={handleSubmitQuestion}
      onSubmitAnswer={handleSubmitAnswer}
      questionFeedbackMessage={questionFeedbackMessage}
      questionFeedbackTone={questionFeedbackTone}
      answerFeedbackMessage={answerFeedbackMessage}
      answerFeedbackTone={answerFeedbackTone}
      isQuestionSubmitting={isQuestionSubmitting}
      isAnswerSubmitting={isAnswerSubmitting}
      questionDraft={questionDraft}
      onQuestionDraftChange={setQuestionDraft}
      answerDraft={answerDraft}
      onAnswerDraftChange={setAnswerDraft}
      isDraftEditable={isLockedByMe}
    />
  );
}
