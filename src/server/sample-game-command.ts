import type {
  AcquireInvestigationLockRequest,
  AcquireInvestigationLockResponse,
  AdvanceStageRequest,
  AdvanceStageResponse,
  AssignTeamsRequest,
  AssignTeamsResponse,
  PlayerScoreSnapshot,
  ReleaseInvestigationLockRequest,
  ReleaseInvestigationLockResponse,
  RoomSnapshot,
  SetReadyRequest,
  SetReadyResponse,
  StartStageRequest,
  StartStageResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  SubmitQuestionRequest,
  SubmitQuestionResponse,
} from "@/contracts/api";
import type {
  AnswerPublicOutcome,
  QuestionPublicReply,
} from "@/contracts/judgement";
import type {
  AnswerAttempt,
  Game,
  InvestigationLock,
  Player,
  PlayerStageState,
  Question,
  QuestionJudgement,
  Room,
  Stage,
  StageTeamAssignment,
  TeamSlot,
} from "@/contracts/game";
import type { InvestigationLockView, PlayerStateView, StageView } from "@/contracts/view";
import { buildSampleRoomSnapshot } from "@/server/sample-room-snapshot";
import { addSeconds, diffSeconds, nowUtcIso } from "@/server/time";

export const IMPLEMENTED_SAMPLE_GAME_COMMAND_TYPES = [
  "set_ready",
  "assign_teams",
  "start_stage",
  "advance_stage",
  "acquire_lock",
  "release_lock",
  "submit_question",
  "submit_answer",
] as const;

const SAMPLE_ROOM_CODE = "A7K3";
const SAMPLE_ROOM_CREATED_AT = "2026-05-07T00:00:00.000Z";
const SAMPLE_PLAYER_JOINED_AT = "2026-05-07T00:00:00.000Z";

function resolveOtherPlayerId(
  basePlayerId: string,
  selfPlayerId: string,
): string {
  return basePlayerId === selfPlayerId ? `${basePlayerId}-sample` : basePlayerId;
}

function buildSamplePlayers(
  roomId: string,
  selfPlayerId: string,
  isReady: boolean,
  lastSeenAt: string,
): Player[] {
  return [
    {
      id: resolveOtherPlayerId("player-01", selfPlayerId),
      nickname: "Jun",
      roomId,
      role: "player",
      isReady: true,
      connectionStatus: "connected",
      totalScore: 1180,
      solvedCount: 1,
      bonusKeywordCount: 1,
      joinedAt: SAMPLE_PLAYER_JOINED_AT,
      lastSeenAt,
    },
    {
      id: selfPlayerId,
      nickname: "Mina",
      roomId,
      role: "player",
      isReady,
      connectionStatus: "connected",
      totalScore: 1240,
      solvedCount: 1,
      bonusKeywordCount: 2,
      joinedAt: SAMPLE_PLAYER_JOINED_AT,
      lastSeenAt,
    },
    {
      id: resolveOtherPlayerId("player-03", selfPlayerId),
      nickname: "Sora",
      roomId,
      role: "player",
      isReady: false,
      connectionStatus: "connected",
      totalScore: 1110,
      solvedCount: 0,
      bonusKeywordCount: 0,
      joinedAt: SAMPLE_PLAYER_JOINED_AT,
      lastSeenAt,
    },
  ];
}

function buildSampleRoom(
  roomId: string,
  players: Player[],
  updatedAt: string,
): Room {
  return {
    id: roomId,
    code: SAMPLE_ROOM_CODE,
    status: players.every((player) => player.isReady) ? "ready" : "waiting",
    maxPlayers: 6,
    createdAt: SAMPLE_ROOM_CREATED_AT,
    updatedAt,
  };
}

function buildSampleAssignments(
  stageId: string,
  teamSlots: TeamSlot[],
  players: RoomSnapshot["players"],
  createdAt: string,
): StageTeamAssignment[] {
  return players.map((player, index) => ({
    stageId,
    playerId: player.playerId,
    teamSlotId: teamSlots[index % teamSlots.length]?.id ?? teamSlots[0].id,
    createdAt,
  }));
}

function buildTeamAssignedSnapshot(
  roomId: string,
  requestedByPlayerId: string,
  stageNumber: number,
  updatedAt: string,
): {
  snapshot: RoomSnapshot;
  teamSlots: TeamSlot[];
  assignments: StageTeamAssignment[];
} {
  const baseSnapshot = buildSampleRoomSnapshot(roomId);
  const stageId = `stage-${String(stageNumber).padStart(2, "0")}`;
  const teamSlots = baseSnapshot.teamSlots.map((teamSlot) => ({
    ...teamSlot,
    roomId,
    updatedAt,
  }));
  const assignments = buildSampleAssignments(
    stageId,
    teamSlots,
    baseSnapshot.players,
    updatedAt,
  );
  const assignmentByPlayerId = new Map(
    assignments.map((assignment) => [assignment.playerId, assignment.teamSlotId]),
  );

  return {
    teamSlots,
    assignments,
    snapshot: {
      ...baseSnapshot,
      viewMode: "team_assigned",
      me: {
        ...baseSnapshot.me,
        playerId: requestedByPlayerId,
        roomId,
        teamSlotId:
          assignmentByPlayerId.get(requestedByPlayerId) ??
          assignmentByPlayerId.get(baseSnapshot.me.playerId) ??
          null,
        isReady: true,
      },
      room: {
        ...baseSnapshot.room,
        id: roomId,
        status: "assigning",
        updatedAt,
      },
      game: baseSnapshot.game
        ? {
            ...baseSnapshot.game,
            roomId,
            status: "lobby",
            currentStageNumber: stageNumber,
            updatedAt,
          }
        : null,
      players: baseSnapshot.players.map((player) => {
        const playerId =
          player.isMe || player.playerId === requestedByPlayerId
            ? requestedByPlayerId
            : player.playerId;

        return {
          ...player,
          playerId,
          roomId,
          teamSlotId: assignmentByPlayerId.get(playerId) ?? null,
          isReady: true,
          isMe: playerId === requestedByPlayerId,
        };
      }),
      teamSlots,
      currentAssignments: assignments,
      playerStates: [],
      activeLock: null,
      stage: null,
      visibleHints: [],
      privateChat: null,
      results: null,
      scores: baseSnapshot.scores.map((score) => ({
        ...score,
        playerId:
          score.isMe || score.playerId === requestedByPlayerId
            ? requestedByPlayerId
            : score.playerId,
        isMe: score.playerId === baseSnapshot.me.playerId,
      })),
    },
  };
}

function buildSamplePlayerStates(
  stageId: string,
  assignments: StageTeamAssignment[],
  updatedAt: string,
): PlayerStageState[] {
  return assignments.map((assignment) => ({
    stageId,
    playerId: assignment.playerId,
    teamSlotId: assignment.teamSlotId,
    status: "active",
    questionCount: 0,
    answerAttemptCount: 0,
    hasReceivedInactivityPenalty: false,
    solvedAt: null,
    lockedAt: null,
    updatedAt,
  }));
}

function buildSamplePlayerStateViews(
  playerStates: PlayerStageState[],
  mePlayerId: string,
  redactedValue: RoomSnapshot["redacted"]["otherPlayers"],
): PlayerStateView[] {
  return playerStates.map((playerState) => {
    const isMe = playerState.playerId === mePlayerId;

    return {
      stageId: playerState.stageId,
      playerId: playerState.playerId,
      teamSlotId: playerState.teamSlotId,
      status: playerState.status,
      questionCount: isMe ? playerState.questionCount : redactedValue,
      answerAttemptCount: isMe ? playerState.answerAttemptCount : redactedValue,
      hasReceivedInactivityPenalty: playerState.hasReceivedInactivityPenalty,
      solvedAt: isMe ? playerState.solvedAt : redactedValue,
      lockedAt: isMe ? playerState.lockedAt : redactedValue,
      visibility: isMe ? "self" : "redacted",
      isMe,
    };
  });
}

function buildStageView(
  stage: Stage,
  snapshot: RoomSnapshot,
): StageView {
  return {
    stageId: stage.id,
    gameId: stage.gameId,
    roomId: stage.roomId,
    stageNumber: stage.stageNumber,
    status: stage.status,
    caseKey: snapshot.redacted.stageSecrets,
    publicTitle: `Stage ${stage.stageNumber} Briefing`,
    publicDescription: `${stage.caseKey} 사건의 공개 브리핑이 시작되었습니다.`,
    imageUrl: null,
    remainingSeconds: 180,
    solvedPlayerIds: stage.solvedPlayerIds,
    endReason: stage.endReason,
    myTeamSlotId: snapshot.me.teamSlotId,
    visibleHints: [],
    investigation: null,
    lastQuestionJudgement: snapshot.redacted.answerJudgements,
    lastAnswerResult: snapshot.redacted.answerJudgements,
    redacted: {
      truth: snapshot.redacted.stageSecrets,
      requiredKeywords: snapshot.redacted.stageSecrets,
      bonusKeywords: snapshot.redacted.stageSecrets,
      acceptedAnswerSummary: snapshot.redacted.stageSecrets,
    },
  };
}

function buildSampleLockView(
  lock: InvestigationLock | null,
  viewerPlayerId: string,
  redactedValue: RoomSnapshot["redacted"]["otherPlayers"],
  nowIso: string,
): InvestigationLockView | null {
  if (!lock) {
    return null;
  }

  const isOwner = lock.lockedByPlayerId === viewerPlayerId;

  return {
    stageId: lock.stageId,
    roomId: lock.roomId,
    lockedByPlayerId: lock.lockedByPlayerId,
    lockedAt: lock.lockedAt,
    expiresAt: lock.expiresAt,
    remainingSeconds:
      lock.expiresAt && lock.lockedAt
        ? diffSeconds(nowIso, lock.expiresAt)
        : 0,
    queuePosition: null,
    waitingPlayerCount: 0,
    queuedPlayerIds: [],
    reentryCooldownEndsAt: null,
    questionCountRemaining: isOwner
      ? Math.max(0, 3 - lock.questionCount)
      : redactedValue,
    answerAttemptCountRemaining: isOwner
      ? Math.max(0, 1 - lock.answerAttemptCount)
      : redactedValue,
    visibility: "public",
  };
}

function buildSampleActiveStageSnapshot(
  roomId: string,
  viewerPlayerId: string,
  stageId: string,
  updatedAt: string,
  activeLock: InvestigationLock | null,
): RoomSnapshot {
  const startStageResponse = buildSampleStartStageResponse({
    type: "start_stage",
    roomId,
    requestedByPlayerId: viewerPlayerId,
    caseKey: "case-001",
    durationSeconds: 900,
  });

  const stage = startStageResponse.stage.id === stageId
    ? startStageResponse.stage
    : {
        ...startStageResponse.stage,
        id: stageId,
        updatedAt,
      };
  const stageView = buildStageView(stage, startStageResponse.snapshot);
  const investigationView = buildSampleLockView(
    activeLock,
    viewerPlayerId,
    startStageResponse.snapshot.redacted.otherPlayers,
    updatedAt,
  );

  return {
    ...startStageResponse.snapshot,
    viewMode: activeLock ? "investigation_active" : "stage_playing",
    me: {
      ...startStageResponse.snapshot.me,
      playerId: viewerPlayerId,
      roomId,
      stageStatus: "active",
    },
    room: {
      ...startStageResponse.snapshot.room,
      id: roomId,
      status: "in_game",
      updatedAt,
    },
    game: startStageResponse.snapshot.game
      ? {
          ...startStageResponse.snapshot.game,
          roomId,
          status: "in_progress",
          updatedAt,
        }
      : null,
    stage: stageView
      ? {
          ...stageView,
          status: "in_progress",
          publicTitle: `Stage ${stage.stageNumber} Investigation`,
          publicDescription: `${stage.caseKey} 사건 조사 단계가 진행 중입니다.`,
          remainingSeconds:
            stage.endsAt && stage.startedAt
              ? diffSeconds(updatedAt, stage.endsAt)
              : 0,
          investigation: investigationView,
        }
      : null,
    activeLock: investigationView,
    playerStates: startStageResponse.snapshot.playerStates.map((playerState) => ({
      ...playerState,
      stageId,
      playerId: playerState.isMe ? viewerPlayerId : playerState.playerId,
      teamSlotId:
        playerState.isMe
          ? startStageResponse.snapshot.me.teamSlotId
          : playerState.teamSlotId,
      questionCount: playerState.isMe && activeLock ? activeLock.questionCount : playerState.questionCount,
      answerAttemptCount:
        playerState.isMe && activeLock ? activeLock.answerAttemptCount : playerState.answerAttemptCount,
      lockedAt: playerState.isMe && activeLock?.lockedAt ? activeLock.lockedAt : playerState.lockedAt,
    })),
  };
}

function buildSampleSnapshotForSetReady(
  baseSnapshot: RoomSnapshot,
  room: Room,
  players: Player[],
  isReady: boolean,
): RoomSnapshot {
  const [playerOne, selfPlayer, playerThree] = players;
  const [basePlayerOne, baseSelfPlayer, basePlayerThree] = baseSnapshot.players;
  const [baseScoreOne, baseSelfScore, baseScoreThree] = baseSnapshot.scores;

  return {
    ...baseSnapshot,
    viewMode: isReady ? "ready_confirmed" : "lobby_waiting",
    me: {
      ...baseSnapshot.me,
      playerId: selfPlayer.id,
      nickname: selfPlayer.nickname,
      roomId: room.id,
      role: selfPlayer.role,
      isReady: selfPlayer.isReady,
      connectionStatus: selfPlayer.connectionStatus,
    },
    room,
    game: baseSnapshot.game
      ? {
          ...baseSnapshot.game,
          roomId: room.id,
          updatedAt: room.updatedAt,
        }
      : null,
    players: [
      {
        ...basePlayerOne,
        playerId: playerOne.id,
        nickname: playerOne.nickname,
        roomId: room.id,
        role: playerOne.role,
        isReady: playerOne.isReady,
        connectionStatus: playerOne.connectionStatus,
        isMe: false,
      },
      {
        ...baseSelfPlayer,
        playerId: selfPlayer.id,
        nickname: selfPlayer.nickname,
        roomId: room.id,
        role: selfPlayer.role,
        isReady: selfPlayer.isReady,
        connectionStatus: selfPlayer.connectionStatus,
        isMe: true,
      },
      {
        ...basePlayerThree,
        playerId: playerThree.id,
        nickname: playerThree.nickname,
        roomId: room.id,
        role: playerThree.role,
        isReady: playerThree.isReady,
        connectionStatus: playerThree.connectionStatus,
        isMe: false,
      },
    ],
    teamSlots: baseSnapshot.teamSlots.map((teamSlot) => ({
      ...teamSlot,
      roomId: room.id,
      updatedAt: room.updatedAt,
    })),
    scores: [
      {
        ...baseScoreOne,
        playerId: playerOne.id,
        isMe: false,
      },
      {
        ...baseSelfScore,
        playerId: selfPlayer.id,
        isMe: true,
      },
      {
        ...baseScoreThree,
        playerId: playerThree.id,
        isMe: false,
      },
    ],
  };
}

function toVisibleNumber(value: number | { hidden: true } | null | undefined, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function buildSampleScoreSnapshots(
  viewerPlayerId: string,
  updatedAt: string,
  overrides?: {
    selfTotal?: number;
    selfStageTotal?: number;
    selfEventCount?: number;
  },
): PlayerScoreSnapshot[] {
  return [
    {
      playerId: resolveOtherPlayerId("player-01", viewerPlayerId),
      total: 1180,
      stageTotal: 20,
      lastEventAt: updatedAt,
      eventCount: 5,
    },
    {
      playerId: viewerPlayerId,
      total: overrides?.selfTotal ?? 1240,
      stageTotal: overrides?.selfStageTotal ?? -30,
      lastEventAt: updatedAt,
      eventCount: overrides?.selfEventCount ?? 7,
    },
    {
      playerId: resolveOtherPlayerId("player-03", viewerPlayerId),
      total: 1110,
      stageTotal: 10,
      lastEventAt: updatedAt,
      eventCount: 4,
    },
  ];
}

function applySelfScoreDelta(
  snapshot: RoomSnapshot,
  delta: number,
  updatedAt: string,
): {
  meTotalScore: number;
  meStageScore: number;
  scoreSnapshots: PlayerScoreSnapshot[];
  scoreViews: RoomSnapshot["scores"];
} {
  const meTotalScore = snapshot.me.totalScore + delta;
  const meStageScore = snapshot.me.stageScore + delta;
  const selfScore = snapshot.scores.find((score) => score.isMe);
  const scoreSnapshots = buildSampleScoreSnapshots(snapshot.me.playerId, updatedAt, {
    selfTotal: meTotalScore,
    selfStageTotal: meStageScore,
    selfEventCount: toVisibleNumber(selfScore?.eventCount, 0) + 1,
  });

  return {
    meTotalScore,
    meStageScore,
    scoreSnapshots,
    scoreViews: snapshot.scores.map((score) =>
      score.isMe
        ? {
            ...score,
            total: meTotalScore,
            stageTotal: meStageScore,
            lastEventAt: updatedAt,
            eventCount: toVisibleNumber(score.eventCount, 0) + 1,
          }
        : score,
    ),
  };
}

function resolveSampleQuestionJudgement(content: string): {
  judgement: QuestionJudgement;
  reasonCode: string;
  publicReply: QuestionPublicReply;
} {
  const normalized = content.toLowerCase();

  if (normalized.includes("행사장") || normalized.includes("동선") || normalized.includes("미리")) {
    return {
      judgement: "YES",
      reasonCode: "question.scene_alignment",
      publicReply: "네, 그렇습니다.",
    };
  }

  if (normalized.includes("비") || normalized.includes("날씨") || normalized.includes("직후")) {
    return {
      judgement: "MAYBE",
      reasonCode: "question.weather_partial",
      publicReply: "그럴 수도 있습니다.",
    };
  }

  if (normalized.includes("외부") || normalized.includes("알리바이")) {
    return {
      judgement: "NO",
      reasonCode: "question.external_mismatch",
      publicReply: "아니오, 그렇지 않습니다.",
    };
  }

  return {
    judgement: "IRRELEVANT",
    reasonCode: "question.low_signal",
    publicReply: "중요하지 않습니다.",
  };
}

function resolveSampleAnswerResult(content: string): {
  result: AnswerAttempt["result"];
  publicOutcome: AnswerPublicOutcome;
  publicSummary: string;
  matchedBonusKeywords: string[];
  missingRequiredKeywords: string[];
  reasonCode: string;
  needsManualReview: boolean;
  shouldLockPlayer: boolean;
} {
  const normalized = content.toLowerCase();
  const hasBag = normalized.includes("가방");
  const hasCompanion = normalized.includes("들러리");
  const mentionsRain = normalized.includes("비");

  if (hasBag && hasCompanion) {
    return {
      result: "correct",
      publicOutcome: "correct",
      publicSummary: "핵심 인물과 이동 경로가 맞아 정답으로 인정되었습니다.",
      matchedBonusKeywords: mentionsRain ? ["비가 온 직후"] : [],
      missingRequiredKeywords: [],
      reasonCode: "answer.accepted.required_keywords_matched",
      needsManualReview: false,
      shouldLockPlayer: true,
    };
  }

  if (content.trim().length < 24) {
    return {
      result: "ambiguous",
      publicOutcome: "needs_review",
      publicSummary: "설명이 짧아 핵심 맥락이 불충분합니다. 운영자 확인이 필요합니다.",
      matchedBonusKeywords: [],
      missingRequiredKeywords: hasBag ? ["들러리"] : hasCompanion ? ["가방"] : ["들러리", "가방"],
      reasonCode: "answer.manual_review.low_context",
      needsManualReview: true,
      shouldLockPlayer: false,
    };
  }

  return {
    result: "incorrect",
    publicOutcome: "wrong",
    publicSummary: "핵심 인물과 보관 위치가 어긋나 오답으로 처리되었습니다.",
    matchedBonusKeywords: [],
    missingRequiredKeywords: hasBag ? ["들러리"] : hasCompanion ? ["가방"] : ["들러리", "가방"],
    reasonCode: "answer.rejected.required_keywords_missing",
    needsManualReview: false,
    shouldLockPlayer: false,
  };
}

export function buildSampleSetReadyResponse(
  input: SetReadyRequest,
): SetReadyResponse {
  const updatedAt = nowUtcIso();
  const players = buildSamplePlayers(
    input.roomId,
    input.playerId,
    input.isReady,
    updatedAt,
  );
  const room = buildSampleRoom(input.roomId, players, updatedAt);
  const baseSnapshot = buildSampleRoomSnapshot(input.roomId);

  return {
    room,
    players,
    snapshot: buildSampleSnapshotForSetReady(
      baseSnapshot,
      room,
      players,
      input.isReady,
    ),
  };
}

export function buildSampleAssignTeamsResponse(
  input: AssignTeamsRequest,
): AssignTeamsResponse {
  const updatedAt = nowUtcIso();
  const { snapshot, teamSlots, assignments } = buildTeamAssignedSnapshot(
    input.roomId,
    input.requestedByPlayerId,
    input.stageNumber,
    updatedAt,
  );

  return {
    teamSlots,
    assignments,
    snapshot,
  };
}

export function buildSampleStartStageResponse(
  input: StartStageRequest,
): StartStageResponse {
  const updatedAt = nowUtcIso();
  const stageNumber = 1;
  const { snapshot: teamSnapshot, assignments } = buildTeamAssignedSnapshot(
    input.roomId,
    input.requestedByPlayerId,
    stageNumber,
    updatedAt,
  );
  const gameId = teamSnapshot.game?.id ?? "game-001";
  const stageId = `stage-${String(stageNumber).padStart(2, "0")}`;
  const game: Game = {
    id: gameId,
    roomId: input.roomId,
    status: "briefing",
    currentStageNumber: stageNumber,
    startedAt: updatedAt,
    endedAt: null,
    createdAt: teamSnapshot.game?.createdAt ?? updatedAt,
    updatedAt,
  };
  const stage: Stage = {
    id: stageId,
    gameId,
    roomId: input.roomId,
    stageNumber,
    caseKey: input.caseKey,
    status: "briefing",
    briefingStartedAt: updatedAt,
    startedAt: null,
    endsAt: addSeconds(updatedAt, input.durationSeconds),
    endedAt: null,
    solvedPlayerIds: [],
    endReason: null,
    createdAt: updatedAt,
    updatedAt,
  };
  const playerStates = buildSamplePlayerStates(stageId, assignments, updatedAt);
  const stageSnapshot: RoomSnapshot = {
    ...teamSnapshot,
    viewMode: "stage_briefing",
    room: {
      ...teamSnapshot.room,
      status: "in_game",
      updatedAt,
    },
    game,
    stage: buildStageView(stage, teamSnapshot),
    playerStates: buildSamplePlayerStateViews(
      playerStates,
      teamSnapshot.me.playerId,
      teamSnapshot.redacted.otherPlayers,
    ),
    activeLock: null,
    visibleHints: [],
    privateChat: null,
    results: null,
  };

  return {
    game,
    stage,
    playerStates,
    snapshot: stageSnapshot,
  };
}

export function buildSampleAdvanceStageResponse(
  input: AdvanceStageRequest,
): AdvanceStageResponse {
  const updatedAt = nowUtcIso();
  const baseSnapshot = buildSampleRoomSnapshot(input.roomId);
  const game: Game =
    baseSnapshot.game
      ? {
          ...baseSnapshot.game,
          roomId: input.roomId,
          status: "lobby",
          currentStageNumber: baseSnapshot.game.currentStageNumber + 1,
          updatedAt,
        }
      : {
          id: "game-001",
          roomId: input.roomId,
          status: "lobby",
          currentStageNumber: 2,
          startedAt: updatedAt,
          endedAt: null,
          createdAt: updatedAt,
          updatedAt,
        };

  return {
    room: {
      ...baseSnapshot.room,
      id: input.roomId,
      status: "ready",
      updatedAt,
    },
    game,
    snapshot: {
      ...baseSnapshot,
      viewMode: "ready_confirmed",
      room: {
        ...baseSnapshot.room,
        id: input.roomId,
        status: "ready",
        updatedAt,
      },
      game,
      stage: null,
      results: null,
    },
  };
}

export function buildSampleAcquireLockResponse(
  input: AcquireInvestigationLockRequest,
): AcquireInvestigationLockResponse {
  const updatedAt = nowUtcIso();
  const lock: InvestigationLock = {
    stageId: input.stageId,
    roomId: input.roomId,
    lockedByPlayerId: input.playerId,
    lockedAt: updatedAt,
    expiresAt: addSeconds(updatedAt, 60),
    questionCount: 0,
    answerAttemptCount: 0,
    lastReleasedByPlayerId: "player-01",
    lastReleasedAt: addSeconds(updatedAt, -45),
    version: 1,
    createdAt: updatedAt,
    updatedAt,
  };

  return {
    lock,
    snapshot: buildSampleActiveStageSnapshot(
      input.roomId,
      input.playerId,
      input.stageId,
      updatedAt,
      lock,
    ),
  };
}

export function buildSampleReleaseLockResponse(
  input: ReleaseInvestigationLockRequest,
): ReleaseInvestigationLockResponse {
  const updatedAt = nowUtcIso();
  const lock: InvestigationLock = {
    stageId: input.stageId,
    roomId: input.roomId,
    lockedByPlayerId: null,
    lockedAt: null,
    expiresAt: null,
    questionCount: 1,
    answerAttemptCount: 0,
    lastReleasedByPlayerId: input.playerId,
    lastReleasedAt: updatedAt,
    version: 2,
    createdAt: addSeconds(updatedAt, -60),
    updatedAt,
  };

  return {
    lock,
    snapshot: buildSampleActiveStageSnapshot(
      input.roomId,
      input.playerId,
      input.stageId,
      updatedAt,
      null,
    ),
  };
}

export function buildSampleSubmitQuestionResponse(
  input: SubmitQuestionRequest,
): SubmitQuestionResponse {
  const updatedAt = nowUtcIso();
  const activeLock: InvestigationLock = {
    stageId: input.stageId,
    roomId: input.roomId,
    lockedByPlayerId: input.playerId,
    lockedAt: addSeconds(updatedAt, -12),
    expiresAt: addSeconds(updatedAt, 48),
    questionCount: 1,
    answerAttemptCount: 0,
    lastReleasedByPlayerId: "player-01",
    lastReleasedAt: addSeconds(updatedAt, -52),
    version: 2,
    createdAt: addSeconds(updatedAt, -12),
    updatedAt,
  };
  const baseSnapshot = buildSampleActiveStageSnapshot(
    input.roomId,
    input.playerId,
    input.stageId,
    updatedAt,
    activeLock,
  );
  const judged = resolveSampleQuestionJudgement(input.content);
  const scoreDelta = -10;
  const scoreState = applySelfScoreDelta(baseSnapshot, scoreDelta, updatedAt);
  const question: Question = {
    id: `question-${updatedAt}`,
    stageId: input.stageId,
    playerId: input.playerId,
    teamSlotId: input.teamSlotId,
    content: input.content,
    judgement: judged.judgement,
    reasonCode: judged.reasonCode,
    createdAt: updatedAt,
    judgedAt: updatedAt,
  };

  return {
    question,
    activeLock,
    scores: scoreState.scoreSnapshots,
    snapshot: {
      ...baseSnapshot,
      me: {
        ...baseSnapshot.me,
        totalScore: scoreState.meTotalScore,
        stageScore: scoreState.meStageScore,
      },
      stage: baseSnapshot.stage
        ? {
            ...baseSnapshot.stage,
            investigation: baseSnapshot.stage.investigation
              ? {
                  ...baseSnapshot.stage.investigation,
                  questionCountRemaining: 2,
                  answerAttemptCountRemaining: 1,
                }
              : null,
            lastQuestionJudgement: judged.judgement,
          }
        : null,
      activeLock: baseSnapshot.activeLock
        ? {
            ...baseSnapshot.activeLock,
            questionCountRemaining: 2,
            answerAttemptCountRemaining: 1,
          }
        : null,
      playerStates: baseSnapshot.playerStates.map((playerState) =>
        playerState.isMe
          ? {
              ...playerState,
              questionCount: 1,
              lockedAt: activeLock.lockedAt,
            }
          : playerState,
      ),
      scores: scoreState.scoreViews,
    },
  };
}

export function buildSampleSubmitAnswerResponse(
  input: SubmitAnswerRequest,
): SubmitAnswerResponse {
  const updatedAt = nowUtcIso();
  const resolved = resolveSampleAnswerResult(input.content);
  const activeLock: InvestigationLock | null = resolved.shouldLockPlayer
    ? null
    : {
        stageId: input.stageId,
        roomId: input.roomId,
        lockedByPlayerId: input.playerId,
        lockedAt: addSeconds(updatedAt, -18),
        expiresAt: addSeconds(updatedAt, 42),
        questionCount: 1,
        answerAttemptCount: 1,
        lastReleasedByPlayerId: "player-01",
        lastReleasedAt: addSeconds(updatedAt, -68),
        version: 3,
        createdAt: addSeconds(updatedAt, -18),
        updatedAt,
      };
  const baseSnapshot = buildSampleActiveStageSnapshot(
    input.roomId,
    input.playerId,
    input.stageId,
    updatedAt,
    activeLock,
  );
  const scoreDelta =
    resolved.publicOutcome === "correct"
      ? 140
      : resolved.publicOutcome === "needs_review"
        ? -20
        : -60;
  const scoreState = applySelfScoreDelta(baseSnapshot, scoreDelta, updatedAt);
  const attempt: AnswerAttempt = {
    id: `answer-${updatedAt}`,
    stageId: input.stageId,
    playerId: input.playerId,
    teamSlotId: input.teamSlotId,
    content: input.content,
    result: resolved.result,
    matchedBonusKeywords: resolved.matchedBonusKeywords,
    missingRequiredKeywords: resolved.missingRequiredKeywords,
    reasonCode: resolved.reasonCode,
    needsManualReview: resolved.needsManualReview,
    shouldLockPlayer: resolved.shouldLockPlayer,
    createdAt: updatedAt,
  };

  return {
    attempt,
    playerState: {
      stageId: input.stageId,
      playerId: input.playerId,
      teamSlotId: input.teamSlotId,
      status: resolved.shouldLockPlayer ? "solved_locked" : "active",
      questionCount: 1,
      answerAttemptCount: 1,
      hasReceivedInactivityPenalty: false,
      solvedAt: resolved.shouldLockPlayer ? updatedAt : null,
      lockedAt: resolved.shouldLockPlayer ? updatedAt : activeLock?.lockedAt ?? null,
      updatedAt,
    },
    scores: scoreState.scoreSnapshots,
    snapshot: {
      ...baseSnapshot,
      viewMode: resolved.shouldLockPlayer ? "solved_spectator" : "investigation_active",
      me: {
        ...baseSnapshot.me,
        totalScore: scoreState.meTotalScore,
        stageScore: scoreState.meStageScore,
        solvedLocked: resolved.shouldLockPlayer,
        stageStatus: resolved.shouldLockPlayer ? "solved_locked" : "active",
        solvedCount: resolved.shouldLockPlayer ? baseSnapshot.me.solvedCount + 1 : baseSnapshot.me.solvedCount,
        bonusKeywordCount: baseSnapshot.me.bonusKeywordCount + resolved.matchedBonusKeywords.length,
      },
      stage: baseSnapshot.stage
        ? {
            ...baseSnapshot.stage,
            solvedPlayerIds: resolved.shouldLockPlayer
              ? [...baseSnapshot.stage.solvedPlayerIds, input.playerId]
              : baseSnapshot.stage.solvedPlayerIds,
            investigation: resolved.shouldLockPlayer
              ? null
              : baseSnapshot.stage.investigation
                ? {
                    ...baseSnapshot.stage.investigation,
                    questionCountRemaining: 2,
                    answerAttemptCountRemaining: 0,
                  }
                : null,
            lastAnswerResult: resolved.result,
          }
        : null,
      activeLock: resolved.shouldLockPlayer
        ? null
        : baseSnapshot.activeLock
          ? {
              ...baseSnapshot.activeLock,
              questionCountRemaining: 2,
              answerAttemptCountRemaining: 0,
            }
          : null,
      playerStates: baseSnapshot.playerStates.map((playerState) =>
        playerState.isMe
          ? {
              ...playerState,
              status: resolved.shouldLockPlayer ? "solved_locked" : "active",
              questionCount: 1,
              answerAttemptCount: 1,
              solvedAt: resolved.shouldLockPlayer ? updatedAt : null,
              lockedAt: resolved.shouldLockPlayer ? updatedAt : activeLock?.lockedAt ?? null,
            }
          : playerState,
      ),
      scores: scoreState.scoreViews,
    },
  };
}
