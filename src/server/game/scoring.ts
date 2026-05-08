import type {
  EntityId,
  IsoTimestamp,
  ScoreEvent,
  ScoreEventType,
} from "../../contracts/game";
import type { PlayerScoreSnapshot } from "../../contracts/api";

export const SCORE_EVENT_DEFAULTS: Record<
  ScoreEventType,
  { delta: number; reason: string }
> = {
  time_tick: {
    delta: 1,
    reason: "Elapsed stage time",
  },
  question_cost: {
    delta: 30,
    reason: "Question submission cost",
  },
  wrong_answer_cost: {
    delta: 100,
    reason: "Wrong answer attempt cost",
  },
  bonus_keyword_reward: {
    delta: -60,
    reason: "Matched bonus keyword reward",
  },
  inactivity_penalty: {
    delta: 150,
    reason: "No activity for configured threshold",
  },
  unsolved_penalty: {
    delta: 300,
    reason: "Stage ended without correct answer",
  },
  macro_penalty: {
    delta: 300,
    reason: "Macro penalty",
  },
};

export interface CreateScoreEventInput {
  id: EntityId;
  roomId: EntityId;
  gameId: EntityId;
  stageId: EntityId | null;
  playerId: EntityId;
  type: ScoreEventType;
  createdAt: IsoTimestamp;
  quantity?: number;
  delta?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export function createScoreEvent(input: CreateScoreEventInput): ScoreEvent {
  const defaults = SCORE_EVENT_DEFAULTS[input.type];
  const quantity = input.quantity ?? 1;

  return {
    id: input.id,
    roomId: input.roomId,
    gameId: input.gameId,
    stageId: input.stageId,
    playerId: input.playerId,
    type: input.type,
    delta: input.delta ?? defaults.delta * quantity,
    quantity,
    reason: input.reason ?? defaults.reason,
    metadata: input.metadata ?? {},
    createdAt: input.createdAt,
  };
}

export function buildTimeTickEvent(
  input: Omit<CreateScoreEventInput, "type"> & { elapsedSeconds: number },
): ScoreEvent {
  return createScoreEvent({
    ...input,
    type: "time_tick",
    quantity: input.elapsedSeconds,
    metadata: {
      elapsedSeconds: input.elapsedSeconds,
      ...(input.metadata ?? {}),
    },
  });
}

export function buildQuestionCostEvent(
  input: Omit<CreateScoreEventInput, "type">,
): ScoreEvent {
  return createScoreEvent({
    ...input,
    type: "question_cost",
  });
}

export function buildWrongAnswerCostEvent(
  input: Omit<CreateScoreEventInput, "type">,
): ScoreEvent {
  return createScoreEvent({
    ...input,
    type: "wrong_answer_cost",
  });
}

export function buildBonusRewardEvents(
  input: Omit<CreateScoreEventInput, "id" | "type" | "quantity"> & {
    createId: () => EntityId;
    matchedBonusKeywords: string[];
  },
): ScoreEvent[] {
  return input.matchedBonusKeywords.map((keyword) =>
    createScoreEvent({
      ...input,
      id: input.createId(),
      type: "bonus_keyword_reward",
      metadata: {
        keyword,
        matchedBonusKeywords: input.matchedBonusKeywords,
        ...(input.metadata ?? {}),
      },
    }),
  );
}

export function buildInactivityPenaltyEvents(
  input: Omit<CreateScoreEventInput, "id" | "playerId" | "type"> & {
    createId: () => EntityId;
    playerIds: EntityId[];
    activePlayerIds: EntityId[];
  },
): ScoreEvent[] {
  const activeSet = new Set(input.activePlayerIds);

  return input.playerIds.flatMap((playerId) => {
    if (activeSet.has(playerId)) {
      return [];
    }

    return [
      createScoreEvent({
        id: input.createId(),
        roomId: input.roomId,
        gameId: input.gameId,
        stageId: input.stageId,
        playerId,
        type: "inactivity_penalty",
        createdAt: input.createdAt,
        metadata: {
          activePlayerIds: input.activePlayerIds,
          ...(input.metadata ?? {}),
        },
      }),
    ];
  });
}

export function replayScoreEvents(
  playerIds: EntityId[],
  events: ScoreEvent[],
  stageId: EntityId | null = null,
): PlayerScoreSnapshot[] {
  const totals = new Map<EntityId, PlayerScoreSnapshot>();

  for (const playerId of playerIds) {
    totals.set(playerId, {
      playerId,
      total: 0,
      stageTotal: 0,
      lastEventAt: null,
      eventCount: 0,
    });
  }

  for (const event of events) {
    const snapshot = totals.get(event.playerId);

    if (!snapshot) {
      continue;
    }

    snapshot.total += event.delta;

    if (stageId && event.stageId === stageId) {
      snapshot.stageTotal += event.delta;
    }

    snapshot.eventCount += 1;
    snapshot.lastEventAt = event.createdAt;
  }

  return [...totals.values()].sort((left, right) => left.total - right.total);
}
