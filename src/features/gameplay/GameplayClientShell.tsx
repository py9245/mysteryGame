"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomSnapshot } from "@/contracts/api";
import type { ChatMessage } from "@/contracts/game";
import type { LoadedChatMessages } from "@/features/chat-ui/chat-messages-loader";
import { normalizeRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import { useRoomRealtimeSnapshot } from "@/features/room-snapshot/use-room-realtime-snapshot";
import {
  submitAcquireInvestigationLock,
  submitReleaseInvestigationLock,
} from "@/features/investigation/investigation-lock-command";
import {
  submitJoinInvestigationQueue,
  submitLeaveInvestigationQueue,
} from "@/features/investigation/investigation-queue-command";
import {
  submitInvestigationAnswer,
  submitInvestigationQuestion,
} from "@/features/investigation/investigation-command";
import { StageGameplayPanel } from "./StageGameplayPanel";
import type { LoadedGameRuntimeSnapshot } from "./game-runtime-loader";
import {
  submitPrivateChatEnd,
  submitPrivateChatRequest,
  submitPrivateChatResponse,
} from "./private-chat-command";
import { GameplayInvestigationModal } from "./GameplayInvestigationModal";
import type { InvestigationLockView } from "@/contracts/view";

const OPTIMISTIC_INVESTIGATION_LOCK_SECONDS = 60;
const OPTIMISTIC_INVESTIGATION_REENTRY_COOLDOWN_SECONDS = 5;

function futureIso(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

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
    fallbackIntervalMs: 3_000,
  });
  const [nowMs, setNowMs] = useState(Date.now());
  const [isSubmittingPrivateChat, setIsSubmittingPrivateChat] = useState(false);
  const [privateChatStatusMessage, setPrivateChatStatusMessage] = useState<string | null>(null);
  const [privateChatErrorMessage, setPrivateChatErrorMessage] = useState<string | null>(null);
  const [isInvestigationOpen, setIsInvestigationOpen] = useState(false);
  const [isSubmittingInvestigation, setIsSubmittingInvestigation] = useState(false);
  const [isQuestionSubmitting, setIsQuestionSubmitting] = useState(false);
  const [isAnswerSubmitting, setIsAnswerSubmitting] = useState(false);
  const [investigationStatusMessage, setInvestigationStatusMessage] = useState<string | null>(null);
  const [investigationErrorMessage, setInvestigationErrorMessage] = useState<string | null>(null);
  const [questionFeedbackMessage, setQuestionFeedbackMessage] = useState<string | null>(null);
  const [questionFeedbackTone, setQuestionFeedbackTone] = useState<"positive" | "negative" | "note">("note");
  const [answerFeedbackMessage, setAnswerFeedbackMessage] = useState<string | null>(null);
  const [answerFeedbackTone, setAnswerFeedbackTone] = useState<"positive" | "negative" | "note">("note");
  const [questionDraft, setQuestionDraft] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [countdownSeed, setCountdownSeed] = useState(() => ({
    stageId: initialSnapshot.stage?.stageId ?? null,
    stageStatus: initialSnapshot.stage?.status ?? null,
    remainingSeconds: initialSnapshot.stage?.remainingSeconds ?? 0,
    capturedAtMs: Date.now(),
  }));
  const [lockCountdownSeed, setLockCountdownSeed] = useState(() => ({
    stageId: initialSnapshot.stage?.stageId ?? null,
    lockOwnerId: initialSnapshot.stage?.investigation?.lockedByPlayerId ?? null,
    remainingSeconds: initialSnapshot.stage?.investigation?.remainingSeconds ?? 0,
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

  useEffect(() => {
    setLockCountdownSeed({
      stageId: snapshot.stage?.stageId ?? null,
      lockOwnerId: snapshot.stage?.investigation?.lockedByPlayerId ?? null,
      remainingSeconds: snapshot.stage?.investigation?.remainingSeconds ?? 0,
      capturedAtMs: Date.now(),
    });
  }, [
    snapshot.stage?.stageId,
    snapshot.stage?.investigation?.lockedByPlayerId,
    snapshot.stage?.investigation?.remainingSeconds,
  ]);

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

    const elapsedLockSeconds = Math.max(0, Math.floor((nowMs - lockCountdownSeed.capturedAtMs) / 1000));
    const lockRemainingSeconds =
      lockCountdownSeed.stageId === snapshot.stage.stageId &&
      lockCountdownSeed.lockOwnerId === snapshot.stage.investigation?.lockedByPlayerId
        ? Math.max(0, lockCountdownSeed.remainingSeconds - elapsedLockSeconds)
        : snapshot.stage.investigation?.remainingSeconds ?? 0;

    return {
      ...snapshot,
      stage: {
        ...snapshot.stage,
        remainingSeconds,
        investigation: snapshot.stage.investigation
          ? {
              ...snapshot.stage.investigation,
              remainingSeconds: lockRemainingSeconds,
            }
          : snapshot.stage.investigation,
      },
    };
  }, [countdownSeed, lockCountdownSeed, nowMs, snapshot]);

  useEffect(() => {
    if (displayedSnapshot.stage?.investigation?.lockedByPlayerId === displayedSnapshot.me.playerId) {
      setIsInvestigationOpen(true);
    }
  }, [displayedSnapshot.me.playerId, displayedSnapshot.stage?.investigation?.lockedByPlayerId]);

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

  const investigation = displayedSnapshot.stage?.investigation ?? null;
  const lockOwnerId = investigation?.lockedByPlayerId ?? null;
  const isLockedByMe = lockOwnerId === displayedSnapshot.me.playerId;
  const isLockedByOther = Boolean(lockOwnerId && lockOwnerId !== displayedSnapshot.me.playerId);
  const queuePosition = investigation?.queuePosition ?? null;
  const isQueued = queuePosition !== null;
  const waitingPlayerCount = investigation?.waitingPlayerCount ?? 0;
  const queueCooldownSeconds = (() => {
    const cooldownEndsAt = investigation?.reentryCooldownEndsAt;
    if (!cooldownEndsAt) {
      return 0;
    }

    const cooldownMs = Date.parse(cooldownEndsAt);
    if (!Number.isFinite(cooldownMs)) {
      return 0;
    }

    return Math.max(0, Math.ceil((cooldownMs - nowMs) / 1000));
  })();
  const hasStageContext = Boolean(displayedSnapshot.stage?.stageId);

  async function refreshCurrentSnapshot() {
    const stageNumber = snapshot.stage?.stageNumber ?? currentStageNumber ?? snapshot.game?.currentStageNumber ?? 1;
    const params = new URLSearchParams({
      playerId: snapshot.me.playerId,
      stageNumber: String(stageNumber),
    });

    try {
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

      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
      }
    } catch {
      // Fast-path reconciliation is best effort; realtime/fallback polling will still catch up.
    }
  }

  function scheduleSnapshotRefresh(delayMs = 350) {
    window.setTimeout(() => {
      void refreshCurrentSnapshot();
    }, delayMs);
  }

  function updateInvestigationOptimistically(
    updater: (current: InvestigationLockView) => InvestigationLockView,
  ) {
    setSnapshot((current) => {
      if (!current.stage?.investigation) {
        return current;
      }

      const nextInvestigation = updater(current.stage.investigation);

      return {
        ...current,
        stage: {
          ...current.stage,
          investigation: nextInvestigation,
        },
        activeLock: nextInvestigation,
      };
    });
  }

  async function handleAcquireLock() {
    if (isSubmittingInvestigation || !displayedSnapshot.stage?.stageId) {
      return;
    }

    const previousSnapshot = snapshot;
    const nowIso = new Date().toISOString();

    setIsSubmittingInvestigation(true);
    setInvestigationErrorMessage(null);
    setInvestigationStatusMessage("질문방에 입장 중입니다.");
    setIsInvestigationOpen(true);
    updateInvestigationOptimistically((current) => {
      const wasQueued = current.queuedPlayerIds.includes(displayedSnapshot.me.playerId);

      return {
        ...current,
        lockedByPlayerId: displayedSnapshot.me.playerId,
        lockedAt: nowIso,
        expiresAt: futureIso(OPTIMISTIC_INVESTIGATION_LOCK_SECONDS),
        remainingSeconds: OPTIMISTIC_INVESTIGATION_LOCK_SECONDS,
        queuePosition: null,
        waitingPlayerCount: wasQueued ? Math.max(0, current.waitingPlayerCount - 1) : current.waitingPlayerCount,
        queuedPlayerIds: current.queuedPlayerIds.filter((queuedPlayerId) => queuedPlayerId !== displayedSnapshot.me.playerId),
        reentryCooldownEndsAt: null,
        questionCountRemaining: 3,
        answerAttemptCountRemaining: 1,
      };
    });

    const result = await submitAcquireInvestigationLock({
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      playerId: displayedSnapshot.me.playerId,
    });

    if (result.ok) {
      if (result.snapshot) {
        setSnapshot(result.snapshot);
      } else {
        scheduleSnapshotRefresh();
      }
      setInvestigationStatusMessage("질문방에 입장했습니다. 지금부터 질문과 정답 시도가 가능합니다.");
      setIsInvestigationOpen(true);
      setIsSubmittingInvestigation(false);
      return;
    }

    setSnapshot(previousSnapshot);
    setInvestigationErrorMessage(result.errorMessage ?? "질문방 입장에 실패했습니다.");
    setInvestigationStatusMessage(null);
    setIsSubmittingInvestigation(false);
  }

  async function handleJoinQueue() {
    if (isSubmittingInvestigation || !displayedSnapshot.stage?.stageId) {
      return;
    }

    const previousSnapshot = snapshot;
    const shouldEnterImmediately =
      displayedSnapshot.stage.status === "in_progress" &&
      !lockOwnerId &&
      waitingPlayerCount === 0 &&
      !isQueued;
    const nowIso = new Date().toISOString();

    setIsSubmittingInvestigation(true);
    setInvestigationErrorMessage(null);
    setInvestigationStatusMessage(
      shouldEnterImmediately
        ? "질문방이 비어 있어 바로 입장합니다."
        : "질문방 대기열에 참가했습니다. 차례가 오면 자동으로 열립니다.",
    );
    if (shouldEnterImmediately) {
      setIsInvestigationOpen(true);
    }
    updateInvestigationOptimistically((current) => {
      if (shouldEnterImmediately) {
        return {
          ...current,
          lockedByPlayerId: displayedSnapshot.me.playerId,
          lockedAt: nowIso,
          expiresAt: futureIso(OPTIMISTIC_INVESTIGATION_LOCK_SECONDS),
          remainingSeconds: OPTIMISTIC_INVESTIGATION_LOCK_SECONDS,
          queuePosition: null,
          waitingPlayerCount: current.queuedPlayerIds.includes(displayedSnapshot.me.playerId)
            ? Math.max(0, current.waitingPlayerCount - 1)
            : current.waitingPlayerCount,
          queuedPlayerIds: current.queuedPlayerIds.filter((queuedPlayerId) => queuedPlayerId !== displayedSnapshot.me.playerId),
          reentryCooldownEndsAt: null,
          questionCountRemaining: 3,
          answerAttemptCountRemaining: 1,
        };
      }

      const wasQueued = current.queuedPlayerIds.includes(displayedSnapshot.me.playerId);
      const queuedPlayerIds = wasQueued
        ? current.queuedPlayerIds
        : [...current.queuedPlayerIds, displayedSnapshot.me.playerId];
      const nextPosition = current.queuePosition ?? queuedPlayerIds.indexOf(displayedSnapshot.me.playerId) + 1;

      return {
        ...current,
        queuePosition: nextPosition > 0 ? nextPosition : current.waitingPlayerCount + 1,
        waitingPlayerCount: wasQueued ? current.waitingPlayerCount : current.waitingPlayerCount + 1,
        queuedPlayerIds,
        reentryCooldownEndsAt: null,
      };
    });

    const result = await submitJoinInvestigationQueue({
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      playerId: displayedSnapshot.me.playerId,
    });

    if (result.ok) {
      if (result.snapshot) {
        setSnapshot(result.snapshot);
      } else {
        scheduleSnapshotRefresh();
      }
      const admitted =
        shouldEnterImmediately ||
        result.snapshot?.stage?.investigation?.lockedByPlayerId === displayedSnapshot.me.playerId;
      setInvestigationStatusMessage(
        admitted
          ? "질문방이 비어 있어서 바로 입장했습니다."
          : "질문방 대기열에 참가했습니다. 차례가 오면 자동으로 열립니다.",
      );
      if (admitted) {
        setIsInvestigationOpen(true);
      }
      setIsSubmittingInvestigation(false);
      return;
    }

    setSnapshot(previousSnapshot);
    setInvestigationErrorMessage(result.errorMessage ?? "질문방 대기열에 참가하지 못했습니다.");
    setInvestigationStatusMessage(null);
    setIsSubmittingInvestigation(false);
  }

  async function handleLeaveQueue() {
    if (isSubmittingInvestigation || !displayedSnapshot.stage?.stageId) {
      return;
    }

    const previousSnapshot = snapshot;

    setIsSubmittingInvestigation(true);
    setInvestigationErrorMessage(null);
    setInvestigationStatusMessage("질문방 대기열에서 빠졌습니다.");
    updateInvestigationOptimistically((current) => {
      const wasQueued = current.queuedPlayerIds.includes(displayedSnapshot.me.playerId);

      return {
        ...current,
        queuePosition: null,
        waitingPlayerCount: wasQueued ? Math.max(0, current.waitingPlayerCount - 1) : current.waitingPlayerCount,
        queuedPlayerIds: current.queuedPlayerIds.filter((queuedPlayerId) => queuedPlayerId !== displayedSnapshot.me.playerId),
      };
    });

    const result = await submitLeaveInvestigationQueue({
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      playerId: displayedSnapshot.me.playerId,
    });

    if (result.ok) {
      if (result.snapshot) {
        setSnapshot(result.snapshot);
      } else {
        scheduleSnapshotRefresh();
      }
      setInvestigationStatusMessage("질문방 대기열에서 빠졌습니다.");
      setIsSubmittingInvestigation(false);
      return;
    }

    setSnapshot(previousSnapshot);
    setInvestigationErrorMessage(result.errorMessage ?? "질문방 대기열 취소에 실패했습니다.");
    setInvestigationStatusMessage(null);
    setIsSubmittingInvestigation(false);
  }

  async function handleReleaseLock() {
    if (isSubmittingInvestigation || !displayedSnapshot.stage?.stageId) {
      return;
    }

    const previousSnapshot = snapshot;

    setIsSubmittingInvestigation(true);
    setInvestigationErrorMessage(null);
    setInvestigationStatusMessage("질문방에서 나왔습니다. 다음 플레이어가 자동으로 이어받습니다.");
    setIsInvestigationOpen(false);
    updateInvestigationOptimistically((current) => ({
      ...current,
      lockedByPlayerId: null,
      lockedAt: null,
      expiresAt: null,
      remainingSeconds: 0,
      reentryCooldownEndsAt: futureIso(OPTIMISTIC_INVESTIGATION_REENTRY_COOLDOWN_SECONDS),
      questionCountRemaining: 3,
      answerAttemptCountRemaining: 1,
    }));

    const result = await submitReleaseInvestigationLock({
      roomId: displayedSnapshot.room.id,
      stageId: displayedSnapshot.stage.stageId,
      playerId: displayedSnapshot.me.playerId,
    });

    if (result.ok) {
      if (result.snapshot) {
        setSnapshot(result.snapshot);
      } else {
        scheduleSnapshotRefresh();
      }
      setInvestigationStatusMessage("질문방에서 나왔습니다. 다음 플레이어가 자동으로 이어받습니다.");
      setIsSubmittingInvestigation(false);
      return;
    }

    setSnapshot(previousSnapshot);
    setIsInvestigationOpen(true);
    setInvestigationErrorMessage(result.errorMessage ?? "질문방 나가기에 실패했습니다.");
    setInvestigationStatusMessage(null);
    setIsSubmittingInvestigation(false);
  }

  async function handleSubmitQuestion() {
    if (
      isQuestionSubmitting ||
      !displayedSnapshot.stage?.stageId ||
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
      setQuestionDraft("");
      setQuestionFeedbackTone("positive");
      setQuestionFeedbackMessage(
        result.question?.judgement
          ? `질문이 접수되었습니다. 공개 응답: ${result.question.judgement}`
          : "질문이 접수되었습니다.",
      );
      setInvestigationStatusMessage("질문 결과가 반영되었습니다.");
      setInvestigationErrorMessage(null);
    } else {
      setQuestionFeedbackTone("negative");
      setQuestionFeedbackMessage(result.errorMessage ?? "질문 제출에 실패했습니다.");
      setInvestigationErrorMessage(result.errorMessage ?? "질문 제출에 실패했습니다.");
    }

    setIsQuestionSubmitting(false);
  }

  async function handleSubmitAnswer() {
    if (
      isAnswerSubmitting ||
      !displayedSnapshot.stage?.stageId ||
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

      setAnswerDraft("");
      setAnswerFeedbackTone(publicOutcome === "correct" ? "positive" : publicOutcome === "wrong" ? "negative" : "note");
      setAnswerFeedbackMessage(
        publicOutcome === "correct"
          ? "정답으로 인정되었습니다."
          : publicOutcome === "wrong"
            ? "정답이 인정되지 않았습니다."
            : "운영자 확인이 필요합니다.",
      );
      setInvestigationStatusMessage("정답 제출 결과가 반영되었습니다.");
      setInvestigationErrorMessage(null);
    } else {
      setAnswerFeedbackTone("negative");
      setAnswerFeedbackMessage(result.errorMessage ?? "정답 제출에 실패했습니다.");
      setInvestigationErrorMessage(result.errorMessage ?? "정답 제출에 실패했습니다.");
    }

    setIsAnswerSubmitting(false);
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
    <>
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
        onOpenInvestigationModal={() => setIsInvestigationOpen(true)}
      />
      <GameplayInvestigationModal
        snapshot={displayedSnapshot}
        isOpen={isInvestigationOpen}
        onClose={() => setIsInvestigationOpen(false)}
        isSubmitting={isSubmittingInvestigation}
        errorMessage={investigationErrorMessage}
        statusMessage={investigationStatusMessage}
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
    </>
  );
}
