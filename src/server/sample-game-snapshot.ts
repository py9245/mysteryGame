import type {
  GameRuntimeSnapshot,
  GameSnapshotSummary,
  GetGameSnapshotResponse,
  ListGameSnapshotsResponse,
} from "@/contracts/api";

export const SAMPLE_GAME_ROOM_ID = "room-001";

function createSampleGameRuntimeSnapshot(
  roomId = SAMPLE_GAME_ROOM_ID,
): GameRuntimeSnapshot {
  return {
    roomId,
    roomCode: "A7K3",
    game: {
      id: "game-001",
      roomId,
      status: "in_progress",
      currentStageNumber: 1,
      startedAt: "2026-05-07T00:00:00.000Z",
      endedAt: null,
      createdAt: "2026-05-07T00:00:00.000Z",
      updatedAt: "2026-05-07T00:07:00.000Z",
    },
    stage: {
      id: "stage-01",
      gameId: "game-001",
      roomId,
      stageNumber: 1,
      caseKey: "case-001",
      status: "in_progress",
      briefingStartedAt: "2026-05-07T00:00:00.000Z",
      startedAt: "2026-05-07T00:01:00.000Z",
      endsAt: "2026-05-07T00:16:00.000Z",
      endedAt: null,
      solvedPlayerIds: ["player-04"],
      endReason: null,
      createdAt: "2026-05-07T00:00:00.000Z",
      updatedAt: "2026-05-07T00:07:00.000Z",
    },
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
    currentAssignments: [
      {
        stageId: "stage-01",
        playerId: "player-01",
        teamSlotId: "team-red",
        createdAt: "2026-05-07T00:00:00.000Z",
      },
      {
        stageId: "stage-01",
        playerId: "player-02",
        teamSlotId: "team-blue",
        createdAt: "2026-05-07T00:00:00.000Z",
      },
      {
        stageId: "stage-01",
        playerId: "player-03",
        teamSlotId: "team-green",
        createdAt: "2026-05-07T00:00:00.000Z",
      },
      {
        stageId: "stage-01",
        playerId: "player-04",
        teamSlotId: "team-red",
        createdAt: "2026-05-07T00:00:00.000Z",
      },
      {
        stageId: "stage-01",
        playerId: "player-05",
        teamSlotId: "team-blue",
        createdAt: "2026-05-07T00:00:00.000Z",
      },
      {
        stageId: "stage-01",
        playerId: "player-06",
        teamSlotId: "team-green",
        createdAt: "2026-05-07T00:00:00.000Z",
      },
    ],
    playerStates: [
      {
        stageId: "stage-01",
        playerId: "player-01",
        teamSlotId: "team-red",
        status: "active",
        questionCount: 2,
        answerAttemptCount: 0,
        hasReceivedInactivityPenalty: false,
        solvedAt: null,
        lockedAt: null,
        updatedAt: "2026-05-07T00:07:00.000Z",
      },
      {
        stageId: "stage-01",
        playerId: "player-02",
        teamSlotId: "team-blue",
        status: "active",
        questionCount: 1,
        answerAttemptCount: 1,
        hasReceivedInactivityPenalty: false,
        solvedAt: null,
        lockedAt: null,
        updatedAt: "2026-05-07T00:07:00.000Z",
      },
      {
        stageId: "stage-01",
        playerId: "player-03",
        teamSlotId: "team-green",
        status: "active",
        questionCount: 1,
        answerAttemptCount: 0,
        hasReceivedInactivityPenalty: false,
        solvedAt: null,
        lockedAt: null,
        updatedAt: "2026-05-07T00:07:00.000Z",
      },
      {
        stageId: "stage-01",
        playerId: "player-04",
        teamSlotId: "team-red",
        status: "solved_locked",
        questionCount: 2,
        answerAttemptCount: 1,
        hasReceivedInactivityPenalty: false,
        solvedAt: "2026-05-07T00:06:10.000Z",
        lockedAt: "2026-05-07T00:06:10.000Z",
        updatedAt: "2026-05-07T00:07:00.000Z",
      },
      {
        stageId: "stage-01",
        playerId: "player-05",
        teamSlotId: "team-blue",
        status: "inactive_penalized",
        questionCount: 0,
        answerAttemptCount: 0,
        hasReceivedInactivityPenalty: true,
        solvedAt: null,
        lockedAt: null,
        updatedAt: "2026-05-07T00:07:00.000Z",
      },
      {
        stageId: "stage-01",
        playerId: "player-06",
        teamSlotId: "team-green",
        status: "disconnected",
        questionCount: 1,
        answerAttemptCount: 0,
        hasReceivedInactivityPenalty: false,
        solvedAt: null,
        lockedAt: null,
        updatedAt: "2026-05-07T00:07:00.000Z",
      },
    ],
    activeLock: {
      stageId: "stage-01",
      roomId,
      lockedByPlayerId: "player-02",
      lockedAt: "2026-05-07T00:06:30.000Z",
      expiresAt: "2026-05-07T00:07:30.000Z",
      questionCount: 1,
      answerAttemptCount: 0,
      lastReleasedByPlayerId: "player-01",
      lastReleasedAt: "2026-05-07T00:05:58.000Z",
      version: 3,
      createdAt: "2026-05-07T00:00:00.000Z",
      updatedAt: "2026-05-07T00:06:30.000Z",
    },
    scores: [
      {
        playerId: "player-01",
        total: 1040,
        stageTotal: 15,
        lastEventAt: "2026-05-07T00:05:58.000Z",
        eventCount: 4,
      },
      {
        playerId: "player-02",
        total: 990,
        stageTotal: 10,
        lastEventAt: "2026-05-07T00:06:30.000Z",
        eventCount: 3,
      },
      {
        playerId: "player-03",
        total: 1015,
        stageTotal: 20,
        lastEventAt: "2026-05-07T00:04:20.000Z",
        eventCount: 4,
      },
      {
        playerId: "player-04",
        total: 960,
        stageTotal: -15,
        lastEventAt: "2026-05-07T00:06:10.000Z",
        eventCount: 5,
      },
      {
        playerId: "player-05",
        total: 1035,
        stageTotal: 25,
        lastEventAt: "2026-05-07T00:03:50.000Z",
        eventCount: 2,
      },
      {
        playerId: "player-06",
        total: 1085,
        stageTotal: 40,
        lastEventAt: "2026-05-07T00:02:10.000Z",
        eventCount: 3,
      },
    ],
    visibleHints: [
      {
        id: "hint-01",
        stageId: "stage-01",
        hintIndex: 0,
        triggerType: "time_unlock",
        revealedAt: "2026-05-07T00:04:00.000Z",
      },
    ],
  };
}

export function buildSampleGameSnapshot(
  roomId = SAMPLE_GAME_ROOM_ID,
): GetGameSnapshotResponse {
  return {
    snapshot: createSampleGameRuntimeSnapshot(roomId),
  };
}

export function buildSampleGameSnapshotSummary(
  roomId = SAMPLE_GAME_ROOM_ID,
): GameSnapshotSummary {
  const snapshot = createSampleGameRuntimeSnapshot(roomId);

  return {
    roomId: snapshot.roomId,
    roomCode: snapshot.roomCode,
    gameId: snapshot.game.id,
    gameStatus: snapshot.game.status,
    currentStageNumber: snapshot.game.currentStageNumber,
    stageId: snapshot.stage?.id ?? null,
    stageStatus: snapshot.stage?.status ?? null,
    stageEndsAt: snapshot.stage?.endsAt ?? null,
    teamCount: snapshot.teamSlots.length,
    assignedPlayerCount: snapshot.currentAssignments.length,
    activePlayerCount: snapshot.playerStates.filter((state) => state.status === "active").length,
    solvedPlayerCount: snapshot.stage?.solvedPlayerIds.length ?? 0,
    activeLockPlayerId: snapshot.activeLock?.lockedByPlayerId ?? null,
    visibleHintCount: snapshot.visibleHints.length,
  };
}

export function buildSampleGameSnapshotsResponse(): ListGameSnapshotsResponse {
  return {
    games: [buildSampleGameSnapshotSummary()],
  };
}
