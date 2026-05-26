"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RoomSnapshot } from "@/contracts/api";
import { appendRoomContextToHref } from "@/features/room-context/room-context";
import { emitToast } from "@/components/feedback/toast-bus";
import { useKeyboardShortcut } from "@/lib/keyboard-shortcuts";
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
  const advanceButtonRef = useRef<HTMLButtonElement | null>(null);
  const submittingRef = useRef(false);

  const isFinished = snapshot.game?.status === "finished";
  const canAdvance = isHostOrAdmin(snapshot.me.role) && !isFinished;
  const isLastStage = currentStageNumber >= 3;
  const advanceLabel = isLastStage ? "최종 결과 열기" : "다음 스테이지 준비";

  async function handleAdvanceStage() {
    if (!canAdvance || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    emitToast({
      tone: "info",
      title: isLastStage ? "최종 결과를 준비 중입니다" : "다음 스테이지 준비 중",
      detail: isLastStage
        ? "누적 점수와 순위를 정리해서 보여드립니다."
        : "잠시 후 대기실로 이동합니다.",
      durationMs: 2400,
    });

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
      submittingRef.current = false;
      router.push(targetHref);
      return;
    }

    setErrorMessage(result.errorMessage ?? "다음 스테이지 준비에 실패했습니다.");
    setIsSubmitting(false);
    submittingRef.current = false;
    emitToast({
      tone: "error",
      title: "준비에 실패했습니다",
      detail: result.errorMessage ?? "잠시 후 다시 시도해 주세요.",
      durationMs: 3200,
    });
  }

  // Auto-focus the primary CTA when available so Enter advances immediately.
  useEffect(() => {
    if (!canAdvance) return;
    const node = advanceButtonRef.current;
    if (!node) return;
    // Defer to next frame so router transition doesn't steal focus.
    const id = window.requestAnimationFrame(() => {
      if (document.activeElement === document.body) {
        node.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [canAdvance]);

  // Enter triggers advance for host/admin. Disabled while in inputs (default).
  useKeyboardShortcut(
    "enter",
    () => {
      if (canAdvance && !isSubmitting) {
        void handleAdvanceStage();
      }
    },
    { enabled: canAdvance && !isSubmitting, allowInInput: false, preventDefault: false },
  );

  const showProgress = canAdvance && !isSubmitting;

  return (
    <section
      className={`panel panel-accent span-12 track-d-advance-card${
        canAdvance ? " track-d-advance-card-ready uiux-results-advance-card--ready" : ""
      }`}
    >
      <div className="composer-header">
        <div>
          <p className="eyebrow">진행 안내</p>
          <h3 className="panel-title">{isFinished ? "게임이 종료되었습니다" : "다음 단계"}</h3>
          {isFinished ? (
            <p className="panel-copy">최종 결과 화면에서 누적 점수와 순위를 확인합니다.</p>
          ) : canAdvance ? (
            <p className="panel-copy">
              {isLastStage
                ? "이번이 마지막 스테이지였습니다. 최종 결과 화면을 열어 누적 점수를 공개합니다."
                : "다음 스테이지를 열 준비가 되었습니다. 대기실로 돌아가 팀 배정을 이어갑니다."}
            </p>
          ) : (
            <p className="panel-copy">방장이 다음 단계를 열 때까지 대기합니다.</p>
          )}
          <p className="message-note">
            다음 상태:{" "}
            {isFinished
              ? "최종 결과 페이지"
              : canAdvance
                ? isLastStage
                  ? "최종 결과 공개"
                  : "대기실 복귀 후 다음 스테이지 준비"
                : "방장의 다음 단계 대기"}
          </p>
        </div>
        <span className="status-badge" data-tone={canAdvance || isFinished ? "live" : "alert"}>
          {isFinished ? "게임 종료" : canAdvance ? "준비 가능" : "대기"}
        </span>
      </div>

      {showProgress ? (
        <div
          className="uiux-results-advance-strip"
          role="group"
          aria-label="다음 단계 진행"
        >
          <span className="uiux-results-advance-label">준비 상태</span>
          <span
            className="uiux-results-advance-bar"
            aria-hidden="true"
          >
            <span
              className="uiux-results-advance-fill"
              style={{ "--uiux-progress": "100%" } as CSSProperties}
            />
          </span>
          <span className="uiux-results-advance-count num-tabular" aria-hidden="true">
            준비 완료
          </span>
        </div>
      ) : null}

      {canAdvance ? (
        <div className="action-row track-d-advance-action-row">
          <button
            ref={advanceButtonRef}
            className="button-primary"
            type="button"
            onClick={handleAdvanceStage}
            disabled={isSubmitting}
            aria-keyshortcuts="Enter"
          >
            {isSubmitting ? "준비 중..." : advanceLabel}
          </button>
          <span className="uiux-results-advance-hint" aria-hidden="true">
            <kbd>Enter</kbd>로도 진행
          </span>
        </div>
      ) : null}

      {statusMessage ? (
        <p className="message-positive" role="status" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="message-negative" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
