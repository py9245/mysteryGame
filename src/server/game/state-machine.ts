import type {
  EntityId,
  Game,
  GameStatus,
  IsoTimestamp,
  Player,
  RoomStatus,
  Stage,
  StageEndReason,
  StageStatus,
  StageTeamAssignment,
  TeamSlot,
} from "../../contracts/game";
import { hasExpired } from "../time";

export const MAX_PLAYERS_PER_ROOM = 6;
export const TEAM_COUNT = 3;
export const PLAYERS_PER_TEAM = 2;
export const DEFAULT_TEAM_LABELS = ["A", "B", "C"] as const;

const ROOM_STATUS_TRANSITIONS: Record<RoomStatus, readonly RoomStatus[]> = {
  waiting: ["ready", "closed"],
  ready: ["assigning", "closed", "waiting"],
  assigning: ["in_game", "ready", "closed"],
  in_game: ["ready", "closed"],
  closed: [],
};

const GAME_STATUS_TRANSITIONS: Record<GameStatus, readonly GameStatus[]> = {
  lobby: ["briefing", "cancelled"],
  briefing: ["in_progress", "cancelled"],
  in_progress: ["stage_result", "finished", "cancelled"],
  stage_result: ["briefing", "finished", "cancelled"],
  finished: [],
  cancelled: [],
};

const STAGE_STATUS_TRANSITIONS: Record<StageStatus, readonly StageStatus[]> = {
  pending: ["briefing", "ended"],
  briefing: ["in_progress", "ended"],
  in_progress: ["ended"],
  ended: ["revealed"],
  revealed: [],
};

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitionError";
  }
}

function assertTransition<T extends string>(
  transitionMap: Record<T, readonly T[]>,
  from: T,
  to: T,
  domain: string,
): void {
  if (from === to) {
    return;
  }

  if (!transitionMap[from].includes(to)) {
    throw new TransitionError(`Invalid ${domain} transition: ${from} -> ${to}`);
  }
}

export function deriveRoomStatus(
  playerCount: number,
  readyCount: number,
  hasActiveGame: boolean,
): RoomStatus {
  if (hasActiveGame) {
    return "in_game";
  }

  if (playerCount === MAX_PLAYERS_PER_ROOM && readyCount === MAX_PLAYERS_PER_ROOM) {
    return "ready";
  }

  return "waiting";
}

export function assertRoomStatusTransition(
  from: RoomStatus,
  to: RoomStatus,
): void {
  assertTransition(ROOM_STATUS_TRANSITIONS, from, to, "room");
}

export function assertGameStatusTransition(
  from: GameStatus,
  to: GameStatus,
): void {
  assertTransition(GAME_STATUS_TRANSITIONS, from, to, "game");
}

export function assertStageStatusTransition(
  from: StageStatus,
  to: StageStatus,
): void {
  assertTransition(STAGE_STATUS_TRANSITIONS, from, to, "stage");
}

export function buildDefaultTeamSlots(
  roomId: EntityId,
  nowIso: IsoTimestamp,
  createId: () => EntityId,
): TeamSlot[] {
  return DEFAULT_TEAM_LABELS.map((label) => ({
    id: createId(),
    roomId,
    label,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}

export function assignPlayersToTeamSlots(
  stageId: EntityId,
  players: Player[],
  teamSlots: TeamSlot[],
  nowIso: IsoTimestamp,
): StageTeamAssignment[] {
  const sortedPlayers = [...players].sort((left, right) =>
    left.joinedAt.localeCompare(right.joinedAt),
  );
  const uniquePlayerIds = new Set(sortedPlayers.map((player) => player.id));

  if (sortedPlayers.length !== TEAM_COUNT * PLAYERS_PER_TEAM) {
    throw new TransitionError(
      `Expected ${TEAM_COUNT * PLAYERS_PER_TEAM} players, received ${sortedPlayers.length}`,
    );
  }

  if (uniquePlayerIds.size !== sortedPlayers.length) {
    throw new TransitionError("Duplicate player detected during team assignment");
  }

  if (teamSlots.length !== TEAM_COUNT) {
    throw new TransitionError(
      `Expected ${TEAM_COUNT} team slots, received ${teamSlots.length}`,
    );
  }

  return sortedPlayers.map((player, index) => ({
    stageId,
    playerId: player.id,
    teamSlotId: teamSlots[Math.floor(index / PLAYERS_PER_TEAM)]?.id ?? "",
    createdAt: nowIso,
  }));
}

export function moveGameToBriefing(game: Game, nowIso: IsoTimestamp): Game {
  assertGameStatusTransition(game.status, "briefing");

  return {
    ...game,
    status: "briefing",
    updatedAt: nowIso,
  };
}

export function moveGameToInProgress(game: Game, nowIso: IsoTimestamp): Game {
  assertGameStatusTransition(game.status, "in_progress");

  return {
    ...game,
    status: "in_progress",
    startedAt: game.startedAt ?? nowIso,
    updatedAt: nowIso,
  };
}

export function moveGameToStageResult(game: Game, nowIso: IsoTimestamp): Game {
  assertGameStatusTransition(game.status, "stage_result");

  return {
    ...game,
    status: "stage_result",
    updatedAt: nowIso,
  };
}

export function finishGame(game: Game, nowIso: IsoTimestamp): Game {
  assertGameStatusTransition(game.status, "finished");

  return {
    ...game,
    status: "finished",
    endedAt: nowIso,
    updatedAt: nowIso,
  };
}

export function cancelGame(game: Game, nowIso: IsoTimestamp): Game {
  assertGameStatusTransition(game.status, "cancelled");

  return {
    ...game,
    status: "cancelled",
    endedAt: nowIso,
    updatedAt: nowIso,
  };
}

export function moveStageToBriefing(
  stage: Stage,
  nowIso: IsoTimestamp,
): Stage {
  assertStageStatusTransition(stage.status, "briefing");

  return {
    ...stage,
    status: "briefing",
    briefingStartedAt: nowIso,
    updatedAt: nowIso,
  };
}

export function startStage(
  stage: Stage,
  nowIso: IsoTimestamp,
  endsAt: IsoTimestamp,
): Stage {
  assertStageStatusTransition(stage.status, "in_progress");

  return {
    ...stage,
    status: "in_progress",
    startedAt: nowIso,
    endsAt,
    updatedAt: nowIso,
  };
}

export function recordSolvedPlayer(
  stage: Stage,
  playerId: EntityId,
  nowIso: IsoTimestamp,
): Stage {
  if (stage.status !== "in_progress") {
    throw new TransitionError(`Cannot mark solved player while stage is ${stage.status}`);
  }

  if (stage.solvedPlayerIds.includes(playerId)) {
    return stage;
  }

  return {
    ...stage,
    solvedPlayerIds: [...stage.solvedPlayerIds, playerId],
    updatedAt: nowIso,
  };
}

export function shouldEndStage(stage: Stage, nowIso: IsoTimestamp): boolean {
  if (stage.solvedPlayerIds.length >= 2) {
    return true;
  }

  return hasExpired(stage.endsAt, nowIso);
}

export function deriveStageEndReason(
  stage: Stage,
  nowIso: IsoTimestamp,
): StageEndReason {
  if (stage.solvedPlayerIds.length >= 2) {
    return "two_players_solved";
  }

  if (hasExpired(stage.endsAt, nowIso)) {
    return "timer_expired";
  }

  return "cancelled";
}

export function endStage(
  stage: Stage,
  nowIso: IsoTimestamp,
  endReason: StageEndReason,
): Stage {
  if (stage.status !== "briefing" && stage.status !== "in_progress") {
    throw new TransitionError(`Cannot end stage while status is ${stage.status}`);
  }

  return {
    ...stage,
    status: "ended",
    endedAt: nowIso,
    endReason,
    updatedAt: nowIso,
  };
}

export function revealStage(stage: Stage, nowIso: IsoTimestamp): Stage {
  assertStageStatusTransition(stage.status, "revealed");

  return {
    ...stage,
    status: "revealed",
    updatedAt: nowIso,
  };
}
