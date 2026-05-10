import type {
  EntityId,
  Game,
  HintReveal,
  InvestigationLock,
  IsoTimestamp,
  Player,
  PlayerStageState,
  QuestionJudgement,
  AnswerResult,
  Room,
  ScoreEvent,
  Stage,
  StageTeamAssignment,
  TeamSlot,
} from "../../contracts/game";
import type {
  MeView,
  PlayerStateView,
  PlayerView,
  RedactedValue,
  RoomRedactionBundle,
  RoomViewSnapshot,
  ScoreView,
  SnapshotVisibility,
  StageView,
  ViewMode,
  InvestigationLockView,
} from "../../contracts/view";
import type { PlayerScoreSnapshot, RoomSnapshot } from "../../contracts/api";
import { replayScoreEvents } from "./scoring";

export class BootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapError";
  }
}

export interface CreateInitialPlayerStageStateInput {
  stageId: EntityId;
  playerId: EntityId;
  teamSlotId: EntityId | null;
  nowIso: IsoTimestamp;
}

export function createInitialPlayerStageState(
  input: CreateInitialPlayerStageStateInput,
): PlayerStageState {
  return {
    stageId: input.stageId,
    playerId: input.playerId,
    teamSlotId: input.teamSlotId,
    status: "active",
    questionCount: 0,
    answerAttemptCount: 0,
    hasReceivedInactivityPenalty: false,
    solvedAt: null,
    lockedAt: null,
    updatedAt: input.nowIso,
  };
}

export function buildInitialPlayerStageStates(
  stageId: EntityId,
  players: Player[],
  assignments: StageTeamAssignment[],
  nowIso: IsoTimestamp,
): PlayerStageState[] {
  const assignmentByPlayerId = new Map(
    assignments.map((assignment) => [assignment.playerId, assignment.teamSlotId]),
  );
  const sortedPlayers = [...players].sort((left, right) =>
    left.joinedAt.localeCompare(right.joinedAt),
  );

  return sortedPlayers.map((player) => {
    const teamSlotId = assignmentByPlayerId.get(player.id);

    if (!teamSlotId) {
      throw new BootstrapError(
        `Missing stage team assignment for player ${player.id}`,
      );
    }

    return createInitialPlayerStageState({
      stageId,
      playerId: player.id,
      teamSlotId,
      nowIso,
    });
  });
}

export interface CreateInitialInvestigationLockInput {
  stageId: EntityId;
  roomId: EntityId;
  nowIso: IsoTimestamp;
}

export function createInitialInvestigationLock(
  input: CreateInitialInvestigationLockInput,
): InvestigationLock {
  return {
    stageId: input.stageId,
    roomId: input.roomId,
    lockedByPlayerId: null,
    lockedAt: null,
    expiresAt: null,
    questionCount: 0,
    answerAttemptCount: 0,
    lastReleasedByPlayerId: null,
    lastReleasedAt: null,
    version: 0,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
}

export interface CaseSummaryInput {
  title: string;
  publicDescription: string;
  imageUrl: string | null;
  truth: string;
  requiredKeywords: string[];
  bonusKeywords: string[];
  acceptedAnswerSummary: string;
}

export interface BuildRoomSnapshotInput {
  room: Room;
  players: Player[];
  teamSlots: TeamSlot[];
  currentAssignments: StageTeamAssignment[];
  game: Game | null;
  stage: Stage | null;
  playerStates: PlayerStageState[];
  activeLock: InvestigationLock | null;
  visibleHints: HintReveal[];
  scoreEvents: ScoreEvent[];
  viewerPlayerId: EntityId;
  caseSummary: CaseSummaryInput | null;
}

function redacted(reason: RedactedValue["reason"]): RedactedValue {
  return {
    hidden: true,
    reason,
  };
}

function buildVisibility(
  stage: Stage | null,
  game: Game | null,
): SnapshotVisibility {
  const revealScores = game?.status === "finished" || stage?.status === "revealed";

  return {
    players: "redacted",
    stageSecrets: stage?.status === "revealed" ? "public" : "redacted",
    scores: revealScores ? "public" : "self",
    investigation: "public",
    privateChat: "redacted",
    answerJudgements: revealScores ? "public" : "redacted",
  };
}

function deriveViewMode(
  stage: Stage | null,
  game: Game | null,
  meState: PlayerStageState | null,
  activeLock: InvestigationLock | null,
): ViewMode {
  if (!game) {
    return "lobby_waiting";
  }

  if (game.status === "lobby") {
    return "ready_confirmed";
  }

  if (!stage) {
    return "team_assigned";
  }

  if (stage.status === "briefing") {
    return "stage_briefing";
  }

  if (stage.status === "in_progress") {
    if (meState?.status === "solved_locked") {
      return "solved_spectator";
    }

    if (activeLock?.lockedByPlayerId === meState?.playerId) {
      return "investigation_active";
    }

    return "stage_playing";
  }

  if (stage.status === "ended") {
    return game.status === "finished" ? "game_results" : "stage_results";
  }

  if (stage.status === "revealed") {
    return game.status === "finished" ? "game_results" : "stage_results";
  }

  return "stage_playing";
}

function buildScoreView(
  snapshot: PlayerScoreSnapshot,
  viewerPlayerId: EntityId,
  scoresVisible: boolean,
): ScoreView {
  const isMe = snapshot.playerId === viewerPlayerId;
  const visible = isMe || scoresVisible;

  return {
    playerId: snapshot.playerId,
    total: visible ? snapshot.total : redacted("other_player"),
    stageTotal: visible ? snapshot.stageTotal : redacted("other_player"),
    lastEventAt: visible ? snapshot.lastEventAt : redacted("other_player"),
    eventCount: visible ? snapshot.eventCount : redacted("other_player"),
    visibility: isMe ? "self" : visible ? "public" : "redacted",
    isMe,
  };
}

function buildPlayerView(
  player: Player,
  scoreSnapshot: PlayerScoreSnapshot,
  state: PlayerStageState | undefined,
  viewerPlayerId: EntityId,
): PlayerView {
  const isMe = player.id === viewerPlayerId;
  const canSeeScores = isMe;

  return {
    playerId: player.id,
    nickname: player.nickname,
    roomId: player.roomId,
    role: player.role,
    teamSlotId: state?.teamSlotId ?? null,
    isReady: player.isReady,
    connectionStatus: player.connectionStatus,
    stageStatus: state?.status ?? null,
    solvedLocked: state?.status === "solved_locked",
    totalScore: canSeeScores ? scoreSnapshot.total : redacted("other_player"),
    stageScore: canSeeScores
      ? scoreSnapshot.stageTotal
      : redacted("other_player"),
    solvedCount: isMe ? player.solvedCount : redacted("other_player"),
    bonusKeywordCount: isMe ? player.bonusKeywordCount : redacted("other_player"),
    visibility: isMe ? "self" : "redacted",
    isMe,
  };
}

function buildPlayerStateView(
  state: PlayerStageState,
  viewerPlayerId: EntityId,
): PlayerStateView {
  const isMe = state.playerId === viewerPlayerId;

  return {
    stageId: state.stageId,
    playerId: state.playerId,
    teamSlotId: state.teamSlotId,
    status: state.status,
    questionCount: isMe ? state.questionCount : redacted("other_player"),
    answerAttemptCount: isMe
      ? state.answerAttemptCount
      : redacted("other_player"),
    hasReceivedInactivityPenalty: state.hasReceivedInactivityPenalty,
    solvedAt: isMe ? state.solvedAt : redacted("other_player"),
    lockedAt: isMe ? state.lockedAt : redacted("other_player"),
    visibility: isMe ? "self" : "redacted",
    isMe,
  };
}

function buildInvestigationLockView(
  lock: InvestigationLock | null,
  viewerPlayerId: EntityId,
): InvestigationLockView | null {
  if (!lock) {
    return null;
  }

  const questionCountRemaining = Math.max(0, 3 - lock.questionCount);
  const answerAttemptCountRemaining = Math.max(0, 1 - lock.answerAttemptCount);
  const isOwner = lock.lockedByPlayerId === viewerPlayerId;

  return {
    stageId: lock.stageId,
    roomId: lock.roomId,
    lockedByPlayerId: lock.lockedByPlayerId,
    lockedAt: lock.lockedAt,
    expiresAt: lock.expiresAt,
    remainingSeconds: lock.expiresAt
      ? Math.max(0, Math.ceil((Date.parse(lock.expiresAt) - Date.now()) / 1000))
      : 0,
    queuePosition: null,
    waitingPlayerCount: 0,
    queuedPlayerIds: [],
    reentryCooldownEndsAt: null,
    questionCountRemaining: isOwner
      ? questionCountRemaining
      : redacted("other_player"),
    answerAttemptCountRemaining: isOwner
      ? answerAttemptCountRemaining
      : redacted("other_player"),
    visibility: "public",
  };
}

function buildStageView(
  stage: Stage | null,
  viewerPlayerId: EntityId,
  caseSummary: CaseSummaryInput | null,
  activeLock: InvestigationLock | null,
  meState: PlayerStageState | null,
  visibility: SnapshotVisibility,
): StageView | null {
  if (!stage) {
    return null;
  }

  const remainingSeconds = stage.endsAt
    ? Math.max(0, Math.ceil((Date.parse(stage.endsAt) - Date.now()) / 1000))
    : 0;

  return {
    stageId: stage.id,
    gameId: stage.gameId,
    roomId: stage.roomId,
    stageNumber: stage.stageNumber,
    status: stage.status,
    caseKey: visibility.stageSecrets === "public"
      ? stage.caseKey
      : redacted("stage_secret"),
    publicTitle: caseSummary?.title ?? "",
    publicDescription: caseSummary?.publicDescription ?? "",
    imageUrl: caseSummary?.imageUrl ?? null,
    remainingSeconds,
    solvedPlayerIds: stage.solvedPlayerIds,
    endReason: stage.endReason,
    myTeamSlotId: meState?.teamSlotId ?? null,
    visibleHints: [],
    investigation: buildInvestigationLockView(activeLock, viewerPlayerId),
    lastQuestionJudgement: visibility.answerJudgements === "public"
      ? "IRRELEVANT"
      : redacted("ai_internal"),
    lastAnswerResult: visibility.answerJudgements === "public"
      ? "ambiguous"
      : redacted("ai_internal"),
    redacted: {
      truth:
        visibility.stageSecrets === "public"
          ? redacted("not_visible_yet")
          : redacted("stage_secret"),
      requiredKeywords:
        visibility.stageSecrets === "public"
          ? redacted("not_visible_yet")
          : redacted("stage_secret"),
      bonusKeywords:
        visibility.stageSecrets === "public"
          ? redacted("not_visible_yet")
          : redacted("stage_secret"),
      acceptedAnswerSummary:
        visibility.stageSecrets === "public"
          ? redacted("not_visible_yet")
          : redacted("stage_secret"),
    },
  };
}

function buildMeView(
  player: Player,
  state: PlayerStageState | null,
  score: PlayerScoreSnapshot,
): MeView {
  return {
    playerId: player.id,
    nickname: player.nickname,
    roomId: player.roomId,
    role: player.role,
    teamSlotId: state?.teamSlotId ?? null,
    isReady: player.isReady,
    connectionStatus: player.connectionStatus,
    stageStatus: state?.status ?? null,
    totalScore: score.total,
    stageScore: score.stageTotal,
    solvedCount: player.solvedCount,
    bonusKeywordCount: player.bonusKeywordCount,
    solvedLocked: state?.status === "solved_locked",
  };
}

function buildRedactionBundle(): RoomRedactionBundle {
  const hidden = redacted("other_player");
  return {
    otherPlayers: hidden,
    otherScores: hidden,
    stageSecrets: redacted("stage_secret"),
    privateChat: redacted("private_chat"),
    answerJudgements: redacted("ai_internal"),
  };
}

export function buildRoomSnapshot(
  input: BuildRoomSnapshotInput,
): RoomSnapshot {
  const scores = replayScoreEvents(
    input.players.map((player) => player.id),
    input.scoreEvents,
    input.stage?.id ?? null,
  );
  const visibility = buildVisibility(input.stage, input.game);
  const playerStateByPlayerId = new Map(
    input.playerStates.map((state) => [state.playerId, state]),
  );
  const scoreByPlayerId = new Map(
    scores.map((score) => [score.playerId, score]),
  );
  const me = input.players.find((player) => player.id === input.viewerPlayerId);

  if (!me) {
    throw new BootstrapError(
      `Viewer player ${input.viewerPlayerId} is not present in the room`,
    );
  }

  const meState = playerStateByPlayerId.get(input.viewerPlayerId) ?? null;
  const meScore = scoreByPlayerId.get(input.viewerPlayerId);

  if (!meScore) {
    throw new BootstrapError(
      `Viewer score ${input.viewerPlayerId} is not present in replay snapshot`,
    );
  }

  const scoreViews = scores.map((score) =>
    buildScoreView(
      score,
      input.viewerPlayerId,
      visibility.scores === "public",
    ),
  );

  const playerViews = input.players.map((player) =>
    buildPlayerView(
      player,
      scoreByPlayerId.get(player.id) ?? meScore,
      playerStateByPlayerId.get(player.id),
      input.viewerPlayerId,
    ),
  );

  const playerStateViews = input.playerStates.map((state) =>
    buildPlayerStateView(state, input.viewerPlayerId),
  );

  const activeLockView = buildInvestigationLockView(
    input.activeLock,
    input.viewerPlayerId,
  );
  const stageView = buildStageView(
    input.stage,
    input.viewerPlayerId,
    input.caseSummary,
    input.activeLock,
    meState,
    visibility,
  );
  const viewMode = deriveViewMode(
    input.stage,
    input.game,
    meState,
    input.activeLock,
  );

  return {
    viewMode,
    me: buildMeView(me, meState, meScore),
    visibility,
    redacted: buildRedactionBundle(),
    room: input.room,
    game: input.game,
    stage: stageView,
    players: playerViews,
    teamSlots: input.teamSlots,
    currentAssignments: input.currentAssignments,
    playerStates: playerStateViews,
    activeLock: activeLockView,
    visibleHints: input.visibleHints,
    scores: scoreViews,
    privateChat: redacted("private_chat"),
    results:
      input.game?.status === "finished"
        ? {
            finalRankingVisible: true,
            finalRanking: scoreViews,
            stageSummariesVisible: true,
          }
        : null,
  };
}
