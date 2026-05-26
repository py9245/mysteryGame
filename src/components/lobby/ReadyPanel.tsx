"use client";

import { useCallback } from "react";
import type { RoomSnapshot } from "@/contracts/api";
import { useKeyboardShortcut } from "@/lib/keyboard-shortcuts";

function getViewModeLabel(viewMode: RoomSnapshot["viewMode"]) {
  switch (viewMode) {
    case "ready_confirmed":
      return "준비 완료";
    case "team_assigned":
      return "팀 배정 완료";
    case "stage_briefing":
      return "브리핑 중";
    case "stage_playing":
    case "investigation_active":
      return "플레이 중";
    case "stage_results":
      return "스테이지 결과";
    case "game_results":
      return "최종 결과";
    default:
      return "대기실";
  }
}

export function ReadyPanel({
  me,
  teamSlots,
  viewMode,
  players,
  isHost = false,
  isPracticeMode = false,
  compact = false,
  isSubmitting = false,
  errorMessage = null,
  statusMessage = null,
  onToggleReady,
}: Pick<RoomSnapshot, "me" | "viewMode" | "teamSlots"> & {
  players?: RoomSnapshot["players"];
  isHost?: boolean;
  isPracticeMode?: boolean;
  compact?: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  statusMessage?: string | null;
  onToggleReady?: () => void;
}) {
  const myTeamLabel = teamSlots.find((teamSlot) => teamSlot.id === me.teamSlotId)?.label ?? "팀 배정 전";

  // R key — only meaningful for non-host participants.
  const canShortcutToggle = !isHost && !isPracticeMode && !isSubmitting && typeof onToggleReady === "function";

  const handleShortcut = useCallback(() => {
    if (canShortcutToggle && onToggleReady) {
      onToggleReady();
    }
  }, [canShortcutToggle, onToggleReady]);

  useKeyboardShortcut("r", handleShortcut, { enabled: canShortcutToggle });

  // Ready dots are shown for participants (excluding host).
  const participants = (players ?? []).filter(
    (player) => player.role !== "host" && player.role !== "admin",
  );
  const readyDots = isHost && !isPracticeMode ? participants : [];

  return (
    <section className={`panel panel-muted ready-panel mt-ready-panel${compact ? " panel-compact" : ""}`}>
      <div className="composer-header">
        <div>
          <h3 className="panel-title">내 준비</h3>
          <p className="panel-copy">
            {isHost
              ? isPracticeMode
                ? "연습방은 바로 시작할 수 있습니다."
                : "참가자 준비가 끝나면 시작할 수 있습니다."
              : "준비 완료를 누르면 방장이 게임을 시작할 수 있습니다."}
          </p>
        </div>
        <span
          className="status-badge"
          data-tone={isHost ? "live" : me.isReady ? "live" : "alert"}
          aria-label={isHost ? "역할: 방장" : me.isReady ? "내 상태: 준비 완료" : "내 상태: 대기 중"}
        >
          {isHost ? "방장" : me.isReady ? "준비 완료" : "대기 중"}
        </span>
      </div>
      <div className={`metric-grid${compact ? " metric-grid-compact" : ""}`}>
        <article className="metric-card">
          <span className="metric-label">상태</span>
          <strong className="metric-value">{getViewModeLabel(viewMode)}</strong>
          <span className="metric-detail">현재 진행 단계</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">내 팀</span>
          <strong className="metric-value">{myTeamLabel}</strong>
          <span className="metric-detail">게임 시작 전 배정됩니다.</span>
        </article>
      </div>

      {!isHost && !isPracticeMode ? (
        <button
          type="button"
          className="uiux-lobby-ready-toggle"
          data-ready={me.isReady ? "true" : "false"}
          onClick={onToggleReady}
          disabled={isSubmitting}
          aria-pressed={me.isReady}
          aria-label={me.isReady ? "준비 해제" : "준비 완료"}
        >
          <span className="uiux-lobby-ready-toggle-icon" aria-hidden="true" />
          <span className="uiux-lobby-ready-toggle-text">
            <span className="uiux-lobby-ready-toggle-title">
              {isSubmitting ? "저장 중" : me.isReady ? "준비 완료" : "준비 누르기"}
              <span className="uiux-lobby-ready-toggle-kbd" aria-hidden="true">R</span>
            </span>
            <span className="uiux-lobby-ready-toggle-hint">
              {me.isReady ? "다시 누르면 준비를 해제합니다." : "R 키로도 토글할 수 있습니다."}
            </span>
          </span>
        </button>
      ) : null}

      {readyDots.length > 0 ? (
        <div className="uiux-lobby-ready-dots" role="group" aria-label="참가자 준비 도트">
          {readyDots.map((player) => {
            const isSelf = player.isMe;
            const state = isSelf
              ? player.isReady
                ? "self"
                : "self-pending"
              : player.isReady
                ? "ready"
                : "pending";
            return (
              <span
                key={player.playerId}
                className="uiux-lobby-ready-dot"
                data-state={state}
                aria-label={`${player.nickname} ${player.isReady ? "준비 완료" : "대기 중"}`}
              />
            );
          })}
        </div>
      ) : null}

      {statusMessage ? (
        <p className="message-positive uiux-lobby-status-msg" role="status" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="message-negative uiux-lobby-status-msg" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
