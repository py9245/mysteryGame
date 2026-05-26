"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomSnapshot } from "@/contracts/api";

function formatTeamLabel(teamSlotId: string | null) {
  return teamSlotId ?? "팀 배정 전";
}

function formatRoleLabel(role: RoomSnapshot["players"][number]["role"]) {
  switch (role) {
    case "host":
      return "방장";
    case "admin":
      return "관리자";
    case "observer":
      return "관전자";
    default:
      return "참가자";
  }
}

function formatConnectionStatus(status: RoomSnapshot["players"][number]["connectionStatus"]) {
  return status === "connected" ? "접속" : "이탈";
}

function formatStageStatus(status: RoomSnapshot["players"][number]["stageStatus"]) {
  switch (status) {
    case "active":
      return "행동 가능";
    case "solved_locked":
      return "정답 확정";
    case "inactive_penalized":
      return "행동 제한";
    case "timed_out":
      return "시간 종료";
    case "disconnected":
      return "연결 이탈";
    default:
      return "대기";
  }
}

function getInitial(nickname: string): string {
  const trimmed = nickname.trim();
  if (trimmed.length === 0) {
    return "?";
  }

  // Take first visible character (works for Hangul, latin, emojis approximately)
  return Array.from(trimmed)[0]?.toUpperCase() ?? "?";
}

function getAvatarTone(playerId: string): number {
  // Stable, deterministic hue based on playerId so each player gets a consistent color
  let hash = 0;
  for (let index = 0; index < playerId.length; index += 1) {
    hash = (hash * 31 + playerId.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % 6;
}

const JUST_JOINED_DURATION_MS = 720;

export function PlayerRoster({
  players,
  visibility,
  redacted: _redacted,
  compact = false,
}: Pick<RoomSnapshot, "players" | "visibility" | "redacted"> & {
  compact?: boolean;
}) {
  const orderedPlayers = useMemo(
    () =>
      [...players].sort((left, right) => {
        if (left.isMe !== right.isMe) {
          return left.isMe ? -1 : 1;
        }

        if (left.role !== right.role) {
          return left.role === "host" ? -1 : 1;
        }

        if (left.isReady !== right.isReady) {
          return left.isReady ? -1 : 1;
        }

        return left.nickname.localeCompare(right.nickname, "ko");
      }),
    [players],
  );

  const readyCount = players.filter((player) => player.isReady).length;
  const connectedCount = players.filter((player) => player.connectionStatus === "connected").length;
  const totalForReady = Math.max(players.length, 1);
  const readyPercent = Math.min(100, Math.round((readyCount / totalForReady) * 100));
  const isReadyComplete = readyCount === players.length && players.length > 0;

  // Track newly joined players to apply a fade-up entrance animation.
  const previousIdsRef = useRef<Set<string>>(new Set(players.map((player) => player.playerId)));
  const isInitialMountRef = useRef(true);
  const [justJoinedIds, setJustJoinedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousIdsRef.current = new Set(players.map((player) => player.playerId));
      return;
    }

    const currentIds = new Set(players.map((player) => player.playerId));
    const newcomers: string[] = [];
    currentIds.forEach((id) => {
      if (!previousIdsRef.current.has(id)) {
        newcomers.push(id);
      }
    });
    previousIdsRef.current = currentIds;

    if (newcomers.length === 0) {
      return;
    }

    setJustJoinedIds((prev) => {
      const next = new Set(prev);
      newcomers.forEach((id) => next.add(id));
      return next;
    });

    const timer = window.setTimeout(() => {
      setJustJoinedIds((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        newcomers.forEach((id) => next.delete(id));
        return next;
      });
    }, JUST_JOINED_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [players]);

  const hasPlayers = players.length > 0;

  return (
    <section className={`panel mt-roster-panel track-a-roster-panel${compact ? " panel-compact" : ""}`}>
      <div className="composer-header">
        <div>
          <h3 className="panel-title">참가자</h3>
          <p className="panel-copy">준비와 접속 상태를 한눈에 확인합니다.</p>
        </div>
        <span className="status-badge">{players.length}명</span>
      </div>
      <div className={`metric-grid${compact ? " metric-grid-compact" : ""}`}>
        <article className="metric-card">
          <span className="metric-label">준비</span>
          <strong className="metric-value num-tabular">{readyCount}명</strong>
          <span className="metric-detail">
            {compact ? "참가자 기준" : "준비 후 시작 가능"}
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-label">접속</span>
          <strong className="metric-value num-tabular">{connectedCount}명</strong>
          <span className="metric-detail">실시간 접속 상태</span>
        </article>
      </div>
      <div
        className="uiux-lobby-ready-gauge"
        data-complete={isReadyComplete ? "true" : "false"}
        role="group"
        aria-label="전체 준비 진행률"
      >
        <div className="uiux-lobby-ready-gauge-meta">
          <span>준비 진행률</span>
          <strong className="num-tabular">
            {readyCount}/{players.length} · {readyPercent}%
          </strong>
        </div>
        <div
          className="uiux-lobby-ready-gauge-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={players.length}
          aria-valuenow={readyCount}
        >
          <div
            className="uiux-lobby-ready-gauge-fill"
            style={{ ["--uiux-lobby-ready-pct" as unknown as string]: `${readyPercent}%` }}
          />
        </div>
      </div>
      {hasPlayers ? (
        <ul className={`roster-list${compact ? " roster-list-compact" : ""} track-a-roster-grid`}>
          {orderedPlayers.map((player) => {
            const isDisconnected = player.connectionStatus !== "connected";
            const isHost = player.role === "host";
            const initial = getInitial(player.nickname);
            const tone = getAvatarTone(player.playerId);
            const justJoined = justJoinedIds.has(player.playerId);

            return (
              <li
                className={`roster-item${player.isMe ? " is-me" : ""} track-a-roster-item${isDisconnected ? " is-offline" : ""} uiux-lobby-roster-item`}
                key={player.playerId}
                data-just-joined={justJoined ? "true" : undefined}
              >
                <div className="track-a-roster-top">
                  <span
                    className="track-a-avatar"
                    data-host={isHost ? "true" : undefined}
                    data-offline={isDisconnected ? "true" : undefined}
                    data-tone={tone}
                    aria-hidden="true"
                  >
                    {initial}
                  </span>
                  <div className="track-a-roster-name-block">
                    <div className="track-a-roster-name-row">
                      <span className="roster-name">{player.nickname}</span>
                      {player.isMe ? (
                        <>
                          <span className="track-a-me-tag" aria-hidden="true">나</span>
                          <span className="sr-only">현재 사용자</span>
                        </>
                      ) : null}
                      {isHost ? (
                        <span className="sr-only">방장</span>
                      ) : null}
                    </div>
                    <p className="roster-meta">
                      {formatTeamLabel(player.teamSlotId)} · {formatStageStatus(player.stageStatus)}
                    </p>
                  </div>
                </div>
                <div className="chip-row track-a-roster-chips">
                  {isHost ? (
                    <span
                      className="status-badge track-a-badge-host"
                      data-tone="host"
                      aria-label="역할: 방장"
                    >
                      {formatRoleLabel(player.role)}
                    </span>
                  ) : (
                    <span className="status-badge" aria-label={`역할: ${formatRoleLabel(player.role)}`}>
                      {formatRoleLabel(player.role)}
                    </span>
                  )}
                  <span
                    className="status-badge"
                    data-tone={player.isReady ? "live" : "alert"}
                    aria-label={player.isReady ? "준비 완료 상태" : "준비 대기 상태"}
                  >
                    {player.isReady ? "준비 완료" : "대기 중"}
                  </span>
                  <span
                    className="status-badge"
                    data-tone={isDisconnected ? "alert" : "live"}
                    aria-label={isDisconnected ? "연결 끊김" : "접속 중"}
                  >
                    {formatConnectionStatus(player.connectionStatus)}
                  </span>
                </div>
                {visibility.players === "redacted" && !player.isMe ? (
                  <p className="roster-meta track-a-roster-privacy">일부 정보 비공개</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="uiux-lobby-roster-empty" role="status" aria-live="polite">
          <span className="uiux-skeleton uiux-lobby-skeleton-bar" aria-hidden="true" />
          <span className="uiux-skeleton uiux-lobby-skeleton-bar is-short" aria-hidden="true" />
          <p className="uiux-lobby-roster-empty-title">아직 참가자가 없습니다.</p>
          <p className="uiux-lobby-roster-empty-copy">
            방 코드를 공유하면 곧 참가자가 입장합니다.
          </p>
        </div>
      )}
    </section>
  );
}
