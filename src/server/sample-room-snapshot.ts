import type {
  CreateRoomResponse,
  JoinRoomResponse,
  RoomSnapshot,
} from "@/contracts/api";
import { nowUtcIso } from "@/server/time";

export const SAMPLE_ROOM_ID = "room-001";

export function buildSampleRoomSnapshot(roomId = SAMPLE_ROOM_ID): RoomSnapshot {
  return {
    viewMode: "lobby_waiting",
    me: {
      playerId: "player-02",
      nickname: "Mina",
      roomId,
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
      id: roomId,
      code: "A7K3",
      status: "waiting",
      maxPlayers: 6,
      createdAt: "2026-05-07T00:00:00.000Z",
      updatedAt: "2026-05-07T00:00:00.000Z",
    },
    game: {
      id: "game-001",
      roomId,
      status: "lobby",
      currentStageNumber: 1,
      startedAt: null,
      endedAt: null,
      createdAt: "2026-05-07T00:00:00.000Z",
      updatedAt: "2026-05-07T00:00:00.000Z",
    },
    stage: null,
    players: [
      {
        playerId: "player-01",
        nickname: "Jun",
        roomId,
        role: "player",
        teamSlotId: "team-red",
        isReady: true,
        connectionStatus: "connected",
        stageStatus: "active",
        solvedLocked: false,
        totalScore: { hidden: true, reason: "other_player" },
        stageScore: { hidden: true, reason: "other_player" },
        solvedCount: { hidden: true, reason: "other_player" },
        bonusKeywordCount: { hidden: true, reason: "other_player" },
        visibility: "redacted",
        isMe: false,
      },
      {
        playerId: "player-02",
        nickname: "Mina",
        roomId,
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
        roomId,
        role: "player",
        teamSlotId: "team-green",
        isReady: false,
        connectionStatus: "connected",
        stageStatus: "active",
        solvedLocked: false,
        totalScore: { hidden: true, reason: "other_player" },
        stageScore: { hidden: true, reason: "other_player" },
        solvedCount: { hidden: true, reason: "other_player" },
        bonusKeywordCount: { hidden: true, reason: "other_player" },
        visibility: "redacted",
        isMe: false,
      },
    ],
    teamSlots: [
      {
        id: "team-red",
        roomId,
        label: "Red",
        createdAt: "2026-05-07T00:00:00.000Z",
        updatedAt: "2026-05-07T00:00:00.000Z",
      },
      {
        id: "team-blue",
        roomId,
        label: "Blue",
        createdAt: "2026-05-07T00:00:00.000Z",
        updatedAt: "2026-05-07T00:00:00.000Z",
      },
      {
        id: "team-green",
        roomId,
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
        total: { hidden: true, reason: "other_player" },
        stageTotal: { hidden: true, reason: "other_player" },
        lastEventAt: { hidden: true, reason: "other_player" },
        eventCount: { hidden: true, reason: "other_player" },
        visibility: "redacted",
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
        total: { hidden: true, reason: "other_player" },
        stageTotal: { hidden: true, reason: "other_player" },
        lastEventAt: { hidden: true, reason: "other_player" },
        eventCount: { hidden: true, reason: "other_player" },
        visibility: "redacted",
        isMe: false,
      },
    ],
    privateChat: null,
    results: null,
  };
}

function buildCompactTimestamp(isoTimestamp: string): string {
  return isoTimestamp.replace(/[^\d]/g, "").slice(0, 14);
}

function buildSampleEntityId(prefix: string, isoTimestamp: string): string {
  return `${prefix}-${buildCompactTimestamp(isoTimestamp)}`;
}

function buildSampleRoomCode(isoTimestamp: string): string {
  return `RM${buildCompactTimestamp(isoTimestamp).slice(-4)}`;
}

export function buildSampleCreateRoomResponse(
  hostNickname: string,
): CreateRoomResponse {
  const createdAt = nowUtcIso();
  const roomId = buildSampleEntityId("room", createdAt);
  const playerId = buildSampleEntityId("player-host", createdAt);
  const gameId = buildSampleEntityId("game", createdAt);
  const roomCode = buildSampleRoomCode(createdAt);
  const baseSnapshot = buildSampleRoomSnapshot(roomId);
  const selfPlayer = baseSnapshot.players.find((player) => player.isMe) ?? baseSnapshot.players[0];
  const selfScore = baseSnapshot.scores.find((score) => score.isMe) ?? baseSnapshot.scores[0];

  return {
    roomId,
    playerId,
    snapshot: {
      ...baseSnapshot,
      viewMode: "lobby_waiting",
      me: {
        ...baseSnapshot.me,
        playerId,
        nickname: hostNickname,
        roomId,
        role: "host",
        teamSlotId: null,
        isReady: false,
        connectionStatus: "connected",
        stageStatus: null,
        totalScore: 0,
        stageScore: 0,
        solvedCount: 0,
        bonusKeywordCount: 0,
        solvedLocked: false,
      },
      room: {
        ...baseSnapshot.room,
        id: roomId,
        code: roomCode,
        status: "waiting",
        createdAt,
        updatedAt: createdAt,
      },
      game: baseSnapshot.game
        ? {
            ...baseSnapshot.game,
            id: gameId,
            roomId,
            status: "lobby",
            currentStageNumber: 1,
            startedAt: null,
            endedAt: null,
            createdAt,
            updatedAt: createdAt,
          }
        : null,
      players: [
        {
          ...selfPlayer,
          playerId,
          nickname: hostNickname,
          roomId,
          role: "host",
          teamSlotId: null,
          isReady: false,
          connectionStatus: "connected",
          stageStatus: null,
          solvedLocked: false,
          totalScore: 0,
          stageScore: 0,
          solvedCount: 0,
          bonusKeywordCount: 0,
          visibility: "self",
          isMe: true,
        },
      ],
      teamSlots: baseSnapshot.teamSlots.map((teamSlot) => ({
        ...teamSlot,
        roomId,
        createdAt,
        updatedAt: createdAt,
      })),
      currentAssignments: [],
      playerStates: [],
      activeLock: null,
      visibleHints: [],
      scores: [
        {
          ...selfScore,
          playerId,
          total: 0,
          stageTotal: 0,
          lastEventAt: null,
          eventCount: 0,
          visibility: "self",
          isMe: true,
        },
      ],
      privateChat: null,
      results: null,
    },
  };
}

export function buildSampleJoinRoomResponse(
  roomCode: string,
  nickname: string,
): JoinRoomResponse {
  const createdAt = nowUtcIso();
  const roomId = buildSampleEntityId("room", createdAt);
  const playerId = buildSampleEntityId("player-join", createdAt);
  const baseSnapshot = buildSampleRoomSnapshot(roomId);
  const selfScore = baseSnapshot.scores.find((score) => score.isMe) ?? baseSnapshot.scores[0];

  return {
    roomId,
    playerId,
    snapshot: {
      ...baseSnapshot,
      me: {
        ...baseSnapshot.me,
        playerId,
        nickname,
        roomId,
        role: "player",
        teamSlotId: null,
        isReady: false,
        connectionStatus: "connected",
        stageStatus: null,
        totalScore: 0,
        stageScore: 0,
        solvedCount: 0,
        bonusKeywordCount: 0,
        solvedLocked: false,
      },
      room: {
        ...baseSnapshot.room,
        id: roomId,
        code: roomCode.trim().toUpperCase(),
        status: "waiting",
        updatedAt: createdAt,
      },
      game: baseSnapshot.game
        ? {
            ...baseSnapshot.game,
            roomId,
            updatedAt: createdAt,
          }
        : null,
      players: [
        ...baseSnapshot.players
          .filter((player) => !player.isMe)
          .map((player) => ({
            ...player,
            roomId,
          })),
        {
          ...baseSnapshot.me,
          playerId,
          nickname,
          roomId,
          role: "player",
          teamSlotId: null,
          isReady: false,
          connectionStatus: "connected",
          stageStatus: null,
          totalScore: 0,
          stageScore: 0,
          solvedCount: 0,
          bonusKeywordCount: 0,
          solvedLocked: false,
          visibility: "self",
          isMe: true,
        },
      ],
      teamSlots: baseSnapshot.teamSlots.map((teamSlot) => ({
        ...teamSlot,
        roomId,
      })),
      scores: [
        ...baseSnapshot.scores
          .filter((score) => !score.isMe)
          .map((score) => ({
            ...score,
          })),
        {
          ...selfScore,
          playerId,
          total: 0,
          stageTotal: 0,
          lastEventAt: null,
          eventCount: 0,
          visibility: "self",
          isMe: true,
        },
      ],
    },
  };
}
