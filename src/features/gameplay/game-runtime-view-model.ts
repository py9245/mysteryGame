import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import type { LoadedGameRuntimeSnapshot } from "./game-runtime-loader";

export interface GameplayRuntimeSignal {
  label: string;
  value: string;
  detail: string;
}

export interface GameplayRuntimeOverview {
  contextLabel: string;
  sourceLabel: string;
  endpoint: string;
  signals: GameplayRuntimeSignal[];
}

function formatRuntimeStatus(value: string | null | undefined): string {
  switch (value) {
    case "briefing":
      return "브리핑";
    case "in_progress":
      return "진행 중";
    case "ended":
      return "종료";
    case "revealed":
      return "공개 완료";
    case "pending":
      return "대기";
    case "lobby":
      return "로비";
    case "stage_result":
      return "스테이지 결과";
    case "finished":
      return "게임 종료";
    case "cancelled":
      return "취소";
    default:
      return "알 수 없음";
  }
}

function formatRuntimeTime(value: string | null): string {
  if (!value) {
    return "시간 정보 없음";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function resolvePlayerLabel(playerId: string | null, roomSnapshot: RoomSnapshot): string {
  if (!playerId) {
    return "없음";
  }

  if (playerId === roomSnapshot.me.playerId) {
    return `${roomSnapshot.me.nickname} (나)`;
  }

  return roomSnapshot.players.find((player) => player.playerId === playerId)?.nickname ?? playerId;
}

export function buildGameplayRuntimeOverview({
  roomSnapshot,
  runtime,
}: {
  roomSnapshot: RoomSnapshot;
  runtime: LoadedGameRuntimeSnapshot;
}): GameplayRuntimeOverview {
  const runtimeSnapshot = runtime.snapshot;
  const stageNumber =
    runtimeSnapshot?.stage?.stageNumber ??
    roomSnapshot.stage?.stageNumber ??
    roomSnapshot.game?.currentStageNumber ??
    null;
  const stageTitle = roomSnapshot.stage?.publicTitle ?? "미확정 사건";
  const stageStatus = runtimeSnapshot?.stage?.status ?? roomSnapshot.stage?.status ?? roomSnapshot.game?.status ?? null;
  const solvedPlayerCount =
    runtimeSnapshot?.stage?.solvedPlayerIds.length ?? roomSnapshot.stage?.solvedPlayerIds.length ?? 0;
  const activeLockPlayerId =
    runtimeSnapshot?.activeLock?.lockedByPlayerId ??
    roomSnapshot.stage?.investigation?.lockedByPlayerId ??
    roomSnapshot.activeLock?.lockedByPlayerId ??
    null;
  const visibleHintCount =
    runtimeSnapshot?.visibleHints.length ??
    roomSnapshot.stage?.visibleHints.length ??
    roomSnapshot.visibleHints.length;
  const activePlayerCount =
    runtimeSnapshot?.playerStates.filter((playerState) => playerState.status === "active").length ??
    roomSnapshot.playerStates.filter((playerState) => playerState.status === "active").length;
  const lockExpiresAt = runtimeSnapshot?.activeLock?.expiresAt ?? roomSnapshot.stage?.investigation?.expiresAt ?? null;
  const stageEndsAt = runtimeSnapshot?.stage?.endsAt ?? null;

  return {
    contextLabel: stageNumber ? `스테이지 ${stageNumber} · ${stageTitle}` : stageTitle,
    sourceLabel: runtime.source === "api" ? "실시간 상황 동기화" : "상태 동기화 준비 중",
    endpoint: runtime.endpoint,
    signals: [
      {
        label: "현재 stage 상태",
        value: formatRuntimeStatus(stageStatus),
        detail: stageEndsAt ? `종료 예정 ${formatRuntimeTime(stageEndsAt)}` : "종료 시각 정보 없음",
      },
      {
        label: "정답 성공 플레이어",
        value: `${solvedPlayerCount}명`,
        detail: "2명 성공 시 현재 스테이지가 종료됩니다.",
      },
      {
        label: "조사실 점유",
        value: resolvePlayerLabel(activeLockPlayerId, roomSnapshot),
        detail: activeLockPlayerId ? `잠금 만료 ${formatRuntimeTime(lockExpiresAt)}` : "현재 조사실 잠금이 없습니다.",
      },
      {
        label: "공개 힌트",
        value: `${visibleHintCount}개`,
        detail: "현재 화면에서 확인 가능한 공개 힌트 기준입니다.",
      },
      {
        label: "진행 가능 플레이어",
        value: `${activePlayerCount}명`,
        detail: runtimeSnapshot
          ? `${runtimeSnapshot.playerStates.length}명의 현재 상태를 기준으로 집계했습니다.`
          : "현재 방 상태를 기준으로 집계했습니다.",
      },
    ],
  };
}
