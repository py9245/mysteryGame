import type { RoomViewSnapshot, RedactedValue } from "../../contracts/view";
import type { AnswerPublicOutcome, QuestionPublicReply } from "../../contracts/judgement";

type MockHint = {
  id: string;
  player: string;
  admin?: string | null;
};

type MockInvestigation = NonNullable<NonNullable<RoomViewSnapshot["stage"]>["investigation"]>;

type MockStage = Omit<NonNullable<RoomViewSnapshot["stage"]>, "visibleHints" | "investigation" | "lastQuestionJudgement" | "lastAnswerResult"> & {
  visibleHints: MockHint[];
  investigation: MockInvestigation | null;
  lastQuestionJudgement: { publicReply: QuestionPublicReply } | RedactedValue;
  lastAnswerResult: { publicOutcome: AnswerPublicOutcome; publicSummary: string | null } | RedactedValue;
};

type MockResults = {
  publicSummary: string | null;
  finalRankingVisible: boolean;
  stageSummariesVisible: boolean;
  finalRanking: Array<{ playerId: string; total: number }>;
};

export type RoomSnapshot = Omit<RoomViewSnapshot, "stage" | "results"> & {
  stage: MockStage | null;
  results: MockResults | null;
};

export const mockRoomSnapshot: RoomSnapshot = {
  viewMode: "lobby_waiting",
  me: {
    playerId: "player-02",
    nickname: "Mina",
    roomId: "room-001",
    role: "player",
    teamSlotId: "team-blue",
    isReady: true,
    connectionStatus: "connected",
    stageStatus: "active",
    totalScore: 1240,
    stageScore: -30,
    solvedCount: 1,
    bonusKeywordCount: 2,
    solvedLocked: false,
  },
  visibility: {
    players: "public",
    stageSecrets: "redacted",
    scores: "self",
    investigation: "redacted",
    privateChat: "redacted",
    answerJudgements: "redacted",
  },
  redacted: {
    otherPlayers: { hidden: true, reason: "other_player" },
    otherScores: { hidden: true, reason: "other_player" },
    stageSecrets: { hidden: true, reason: "stage_secret" },
    privateChat: { hidden: true, reason: "private_chat" },
    answerJudgements: { hidden: true, reason: "ai_internal" },
  },
  room: {
    id: "room-001",
    code: "A7K3",
    status: "waiting",
    maxPlayers: 6,
    createdAt: "2026-05-07T00:00:00.000Z",
    updatedAt: "2026-05-07T00:00:00.000Z",
  },
  game: {
    id: "game-001",
    roomId: "room-001",
    status: "lobby",
    currentStageNumber: 1,
    startedAt: null,
    endedAt: null,
    createdAt: "2026-05-07T00:00:00.000Z",
    updatedAt: "2026-05-07T00:00:00.000Z",
  },
  stage: {
    stageId: "stage-01",
    gameId: "game-001",
    roomId: "room-001",
    stageNumber: 1,
    caseKey: "case-01",
    status: "briefing",
    solvedPlayerIds: [],
    endReason: null,
    publicTitle: "사라진 약혼반지",
    publicDescription: "결혼식 전날, 신부의 약혼반지가 사라졌다.",
    imageUrl: null,
    remainingSeconds: 420,
    myTeamSlotId: "team-blue",
    visibleHints: [
      { id: "hint-01", player: "현장은 비가 온 직후였다.", admin: "비가 온 직후" },
    ],
    investigation: {
      stageId: "stage-01",
      roomId: "room-001",
      lockedByPlayerId: "player-02",
      lockedAt: null,
      expiresAt: null,
      remainingSeconds: 12,
      queuePosition: null,
      waitingPlayerCount: 0,
      queuedPlayerIds: [],
      reentryCooldownEndsAt: null,
      questionCountRemaining: 2,
      answerAttemptCountRemaining: 1,
      visibility: "redacted",
    },
    lastQuestionJudgement: { publicReply: "네, 그렇습니다." },
    lastAnswerResult: { publicOutcome: "needs_review", publicSummary: "운영자 확인이 필요합니다." },
    redacted: {
      truth: { hidden: true, reason: "stage_secret" },
      requiredKeywords: { hidden: true, reason: "stage_secret" },
      bonusKeywords: { hidden: true, reason: "stage_secret" },
      acceptedAnswerSummary: { hidden: true, reason: "stage_secret" },
    },
  },
  players: [
    {
      playerId: "player-01",
      nickname: "Jun",
      roomId: "room-001",
      role: "player",
      teamSlotId: "team-red",
      isReady: true,
      connectionStatus: "connected",
      stageStatus: "active",
      solvedLocked: false,
      totalScore: 1280,
      stageScore: 20,
      solvedCount: 0,
      bonusKeywordCount: 1,
      visibility: "public",
      isMe: false,
    },
    {
      playerId: "player-02",
      nickname: "Mina",
      roomId: "room-001",
      role: "player",
      teamSlotId: "team-blue",
      isReady: true,
      connectionStatus: "connected",
      stageStatus: "active",
      solvedLocked: false,
      totalScore: 1240,
      stageScore: -30,
      solvedCount: 1,
      bonusKeywordCount: 2,
      visibility: "self",
      isMe: true,
    },
    {
      playerId: "player-03",
      nickname: "Sora",
      roomId: "room-001",
      role: "player",
      teamSlotId: "team-green",
      isReady: false,
      connectionStatus: "connected",
      stageStatus: "active",
      solvedLocked: false,
      totalScore: 1300,
      stageScore: 10,
      solvedCount: 0,
      bonusKeywordCount: 0,
      visibility: "public",
      isMe: false,
    },
  ],
  teamSlots: [
    {
      id: "team-red",
      roomId: "room-001",
      label: "Red",
      createdAt: "2026-05-07T00:00:00.000Z",
      updatedAt: "2026-05-07T00:00:00.000Z",
    },
    {
      id: "team-blue",
      roomId: "room-001",
      label: "Blue",
      createdAt: "2026-05-07T00:00:00.000Z",
      updatedAt: "2026-05-07T00:00:00.000Z",
    },
    {
      id: "team-green",
      roomId: "room-001",
      label: "Green",
      createdAt: "2026-05-07T00:00:00.000Z",
      updatedAt: "2026-05-07T00:00:00.000Z",
    },
  ],
  currentAssignments: [],
  playerStates: [],
  activeLock: null,
  visibleHints: [],
  scores: [
    {
      playerId: "player-01",
      total: 1280,
      stageTotal: 20,
      lastEventAt: "2026-05-07T00:00:00.000Z",
      eventCount: 5,
      visibility: "public",
      isMe: false,
    },
    {
      playerId: "player-02",
      total: 1240,
      stageTotal: -30,
      lastEventAt: "2026-05-07T00:00:00.000Z",
      eventCount: 7,
      visibility: "self",
      isMe: true,
    },
    {
      playerId: "player-03",
      total: 1300,
      stageTotal: 10,
      lastEventAt: "2026-05-07T00:00:00.000Z",
      eventCount: 4,
      visibility: "public",
      isMe: false,
    },
  ],
  privateChat: null,
  results: null,
};
