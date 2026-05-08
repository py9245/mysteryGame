import type {
  AssignTeamsResponse,
  CreateRoomResponse,
  GameRuntimeSnapshot,
  GameSnapshotSummary,
  JoinRoomResponse,
  ListChatMessagesResponse,
  PlayerScoreSnapshot,
  RoomSnapshot,
  SendChatMessageRequest,
  SendChatMessageResponse,
  SetReadyResponse,
} from "@/contracts/api";
import type {
  ChatMessage,
  ChatChannel,
  ConnectionStatus,
  Game,
  Player,
  PlayerRole,
  Room,
  Stage,
  StageEndReason,
  StageStatus,
  StageTeamAssignment,
  TeamSlot,
} from "@/contracts/game";
import type { RedactedValue, RoomViewSnapshot, ViewMode } from "@/contracts/view";
import { assignPlayersToTeamSlots, TransitionError } from "@/server/game/state-machine";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { nowUtcIso } from "@/server/time";

type DbRoomRow = {
  id: string;
  code: string;
  status: Room["status"];
  max_players: number;
  created_at: string;
  updated_at: string;
};

type DbPlayerRow = {
  id: string;
  room_id: string;
  nickname: string;
  role: PlayerRole;
  is_ready: boolean;
  connection_status: ConnectionStatus;
  total_score: number;
  solved_count: number;
  bonus_keyword_count: number;
  joined_at: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

type DbTeamSlotRow = {
  id: string;
  room_id: string;
  label: string;
  created_at: string;
  updated_at: string;
};

type DbGameRow = {
  id: string;
  room_id: string;
  status: Game["status"];
  current_stage_number: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

type DbStageRow = {
  id: string;
  game_id: string;
  room_id: string;
  stage_number: number;
  case_key: string;
  status: StageStatus;
  briefing_started_at: string | null;
  started_at: string | null;
  ends_at: string | null;
  ended_at: string | null;
  solved_player_ids: string[];
  end_reason: StageEndReason | null;
  created_at: string;
  updated_at: string;
};

type DbStageTeamAssignmentRow = {
  stage_id: string;
  player_id: string;
  team_slot_id: string;
  created_at: string;
};

type DbChatMessageRow = {
  id: string;
  room_id: string;
  stage_id: string | null;
  player_id: string;
  team_slot_id: string | null;
  channel: ChatChannel;
  content: string;
  created_at: string;
};

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_TEAM_LABELS = ["Red", "Blue", "Green"] as const;
const REDACTED_OTHER_PLAYER: RedactedValue = { hidden: true, reason: "other_player" };
const REDACTED_STAGE_SECRET: RedactedValue = { hidden: true, reason: "stage_secret" };
const REDACTED_PRIVATE_CHAT: RedactedValue = { hidden: true, reason: "private_chat" };
const REDACTED_AI_INTERNAL: RedactedValue = { hidden: true, reason: "ai_internal" };

export class RoomJoinError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "ROOM_NOT_JOINABLE"
      | "ROOM_FULL"
      | "NICKNAME_TAKEN",
    message: string,
  ) {
    super(message);
    this.name = "RoomJoinError";
  }
}

export class AssignTeamsError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "GAME_NOT_FOUND"
      | "REQUESTER_NOT_ALLOWED"
      | "ROOM_NOT_READY"
      | "ROOM_NOT_FULL"
      | "STAGE_NUMBER_MISMATCH"
      | "STAGE_NOT_ASSIGNABLE",
    message: string,
  ) {
    super(message);
    this.name = "AssignTeamsError";
  }
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generateRoomCode(length = 4): string {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)] ?? "A";
  }
  return result;
}

function toRoom(row: DbRoomRow): Room {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    maxPlayers: row.max_players,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPlayer(row: DbPlayerRow): Player {
  return {
    id: row.id,
    nickname: row.nickname,
    roomId: row.room_id,
    role: row.role,
    isReady: row.is_ready,
    connectionStatus: row.connection_status,
    totalScore: row.total_score,
    solvedCount: row.solved_count,
    bonusKeywordCount: row.bonus_keyword_count,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
  };
}

function toTeamSlot(row: DbTeamSlotRow): TeamSlot {
  return {
    id: row.id,
    roomId: row.room_id,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toGame(row: DbGameRow): Game {
  return {
    id: row.id,
    roomId: row.room_id,
    status: row.status,
    currentStageNumber: row.current_stage_number,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStage(row: DbStageRow): Stage {
  return {
    id: row.id,
    gameId: row.game_id,
    roomId: row.room_id,
    stageNumber: row.stage_number,
    caseKey: row.case_key,
    status: row.status,
    briefingStartedAt: row.briefing_started_at,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    endedAt: row.ended_at,
    solvedPlayerIds: row.solved_player_ids,
    endReason: row.end_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStageTeamAssignment(row: DbStageTeamAssignmentRow): StageTeamAssignment {
  return {
    stageId: row.stage_id,
    playerId: row.player_id,
    teamSlotId: row.team_slot_id,
    createdAt: row.created_at,
  };
}

function toChatMessage(row: DbChatMessageRow): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    stageId: row.stage_id,
    playerId: row.player_id,
    teamSlotId: row.team_slot_id,
    channel: row.channel,
    content: row.content,
    createdAt: row.created_at,
  };
}

function buildScoreSnapshots(players: DbPlayerRow[]): PlayerScoreSnapshot[] {
  return players.map((player) => ({
    playerId: player.id,
    total: player.total_score,
    stageTotal: 0,
    lastEventAt: player.last_seen_at,
    eventCount: 0,
  }));
}

function resolveViewMode(
  viewer: DbPlayerRow,
  room: DbRoomRow,
  currentAssignments: DbStageTeamAssignmentRow[],
): ViewMode {
  if (room.status === "assigning" || currentAssignments.length > 0) {
    return "team_assigned";
  }

  return viewer.is_ready ? "ready_confirmed" : "lobby_waiting";
}

function buildRoomSnapshot({
  room,
  game,
  players,
  teamSlots,
  currentAssignments,
  viewerPlayerId,
}: {
  room: DbRoomRow;
  game: DbGameRow | null;
  players: DbPlayerRow[];
  teamSlots: DbTeamSlotRow[];
  currentAssignments: DbStageTeamAssignmentRow[];
  viewerPlayerId?: string;
}): RoomSnapshot {
  if (players.length === 0) {
    throw new Error("Room must contain at least one player.");
  }

  const viewer =
    players.find((player) => player.id === viewerPlayerId) ??
    players.find((player) => player.role === "host") ??
    players[0];

  const roomContract = toRoom(room);
  const gameContract = game ? toGame(game) : null;
  const teamSlotContracts = teamSlots.map(toTeamSlot);
  const scoreSnapshots = buildScoreSnapshots(players);
  const meStageScore = 0;
  const assignmentByPlayerId = new Map(
    currentAssignments.map((assignment) => [assignment.player_id, assignment.team_slot_id]),
  );

  const snapshot: RoomViewSnapshot = {
    viewMode: resolveViewMode(viewer, room, currentAssignments),
    me: {
      playerId: viewer.id,
      nickname: viewer.nickname,
      roomId: viewer.room_id,
      role: viewer.role,
      teamSlotId: assignmentByPlayerId.get(viewer.id) ?? null,
      isReady: viewer.is_ready,
      connectionStatus: viewer.connection_status,
      stageStatus: null,
      totalScore: viewer.total_score,
      stageScore: meStageScore,
      solvedCount: viewer.solved_count,
      bonusKeywordCount: viewer.bonus_keyword_count,
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
      otherPlayers: REDACTED_OTHER_PLAYER,
      otherScores: REDACTED_OTHER_PLAYER,
      stageSecrets: REDACTED_STAGE_SECRET,
      privateChat: REDACTED_PRIVATE_CHAT,
      answerJudgements: REDACTED_AI_INTERNAL,
    },
    room: roomContract,
    game: gameContract,
    stage: null,
    players: players.map((player) => ({
      playerId: player.id,
      nickname: player.nickname,
      roomId: player.room_id,
      role: player.role,
      teamSlotId: assignmentByPlayerId.get(player.id) ?? null,
      isReady: player.is_ready,
      connectionStatus: player.connection_status,
      stageStatus: null,
      solvedLocked: false,
      totalScore: player.id === viewer.id ? player.total_score : REDACTED_OTHER_PLAYER,
      stageScore: player.id === viewer.id ? meStageScore : REDACTED_OTHER_PLAYER,
      solvedCount: player.id === viewer.id ? player.solved_count : REDACTED_OTHER_PLAYER,
      bonusKeywordCount: player.id === viewer.id ? player.bonus_keyword_count : REDACTED_OTHER_PLAYER,
      visibility: player.id === viewer.id ? "self" : "redacted",
      isMe: player.id === viewer.id,
    })),
    teamSlots: teamSlotContracts,
    currentAssignments: currentAssignments.map(toStageTeamAssignment),
    playerStates: [],
    activeLock: null,
    visibleHints: [],
    scores: scoreSnapshots.map((score) => ({
      playerId: score.playerId,
      total: score.playerId === viewer.id ? score.total : REDACTED_OTHER_PLAYER,
      stageTotal: score.playerId === viewer.id ? score.stageTotal : REDACTED_OTHER_PLAYER,
      lastEventAt: score.playerId === viewer.id ? score.lastEventAt : REDACTED_OTHER_PLAYER,
      eventCount: score.playerId === viewer.id ? score.eventCount : REDACTED_OTHER_PLAYER,
      visibility: score.playerId === viewer.id ? "self" : "redacted",
      isMe: score.playerId === viewer.id,
    })),
    privateChat: null,
    results: null,
  };

  return snapshot;
}

async function findRoomByRef(roomRef: string): Promise<DbRoomRow | null> {
  const supabase = getSupabaseAdminClient();
  const query = supabase.from("rooms").select("*");
  const scopedQuery = isUuidLike(roomRef)
    ? query.eq("id", roomRef)
    : query.eq("code", roomRef.toUpperCase());
  const { data, error } = await scopedQuery.maybeSingle<DbRoomRow>();

  if (error) {
    throw new Error(`Failed to resolve room: ${error.message}`);
  }

  return data;
}

async function loadLobbyState(roomId: string): Promise<{
  room: DbRoomRow;
  game: DbGameRow | null;
  players: DbPlayerRow[];
  teamSlots: DbTeamSlotRow[];
  currentStage: DbStageRow | null;
  currentAssignments: DbStageTeamAssignmentRow[];
}> {
  const supabase = getSupabaseAdminClient();
  const [{ data: room, error: roomError }, { data: game, error: gameError }, { data: players, error: playersError }, { data: teamSlots, error: teamSlotsError }] =
    await Promise.all([
      supabase.from("rooms").select("*").eq("id", roomId).single<DbRoomRow>(),
      supabase.from("games").select("*").eq("room_id", roomId).maybeSingle<DbGameRow>(),
      supabase.from("players").select("*").eq("room_id", roomId).order("joined_at", { ascending: true }).returns<DbPlayerRow[]>(),
      supabase.from("team_slots").select("*").eq("room_id", roomId).order("created_at", { ascending: true }).returns<DbTeamSlotRow[]>(),
    ]);

  if (roomError) {
    throw new Error(`Failed to load room state: ${roomError.message}`);
  }
  if (gameError) {
    throw new Error(`Failed to load game state: ${gameError.message}`);
  }
  if (playersError) {
    throw new Error(`Failed to load players: ${playersError.message}`);
  }
  if (teamSlotsError) {
    throw new Error(`Failed to load team slots: ${teamSlotsError.message}`);
  }

  let currentStage: DbStageRow | null = null;
  let currentAssignments: DbStageTeamAssignmentRow[] = [];

  if (game?.id) {
    const { data: stage, error: stageError } = await supabase
      .from("stages")
      .select("*")
      .eq("game_id", game.id)
      .eq("stage_number", game.current_stage_number)
      .maybeSingle<DbStageRow>();

    if (stageError) {
      throw new Error(`Failed to load current stage: ${stageError.message}`);
    }

    currentStage = stage ?? null;

    if (currentStage) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from("stage_team_assignments")
        .select("*")
        .eq("stage_id", currentStage.id)
        .order("created_at", { ascending: true })
        .returns<DbStageTeamAssignmentRow[]>();

      if (assignmentsError) {
        throw new Error(`Failed to load stage assignments: ${assignmentsError.message}`);
      }

      currentAssignments = assignments ?? [];
    }
  }

  return {
    room,
    game: game ?? null,
    players: players ?? [],
    teamSlots: teamSlots ?? [],
    currentStage,
    currentAssignments,
  };
}

async function createUniqueRoom(): Promise<DbRoomRow> {
  const supabase = getSupabaseAdminClient();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        code,
        status: "waiting",
        max_players: 6,
      })
      .select("*")
      .single<DbRoomRow>();

    if (!error && data) {
      return data;
    }

    if (error?.code !== "23505") {
      throw new Error(`Failed to create room: ${error.message}`);
    }
  }

  throw new Error("Failed to create unique room code after multiple attempts.");
}

export async function createRoomInStore(hostNickname: string): Promise<CreateRoomResponse> {
  const supabase = getSupabaseAdminClient();
  const room = await createUniqueRoom();
  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({
      room_id: room.id,
      status: "lobby",
      current_stage_number: 1,
    })
    .select("*")
    .single<DbGameRow>();

  if (gameError || !game) {
    throw new Error(`Failed to create game row: ${gameError?.message ?? "unknown error"}`);
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      nickname: hostNickname,
      role: "host",
      is_ready: false,
      connection_status: "connected",
      total_score: 0,
      solved_count: 0,
      bonus_keyword_count: 0,
      last_seen_at: nowUtcIso(),
    })
    .select("*")
    .single<DbPlayerRow>();

  if (playerError || !player) {
    throw new Error(`Failed to create host player: ${playerError?.message ?? "unknown error"}`);
  }

  const { error: teamSlotsError } = await supabase.from("team_slots").insert(
    DEFAULT_TEAM_LABELS.map((label) => ({
      room_id: room.id,
      label,
    })),
  );

  if (teamSlotsError) {
    throw new Error(`Failed to create team slots: ${teamSlotsError.message}`);
  }

  const state = await loadLobbyState(room.id);

  return {
    roomId: room.id,
    playerId: player.id,
    snapshot: buildRoomSnapshot({
      room: state.room,
      game: state.game,
      players: state.players,
      teamSlots: state.teamSlots,
      currentAssignments: state.currentAssignments,
      viewerPlayerId: player.id,
    }),
  };
}

function assertJoinableRoom(room: DbRoomRow, players: DbPlayerRow[], nickname: string) {
  if (room.status !== "waiting" && room.status !== "ready") {
    throw new RoomJoinError(
      "ROOM_NOT_JOINABLE",
      "현재 상태에서는 이 방에 새로 입장할 수 없습니다.",
    );
  }

  if (players.length >= room.max_players) {
    throw new RoomJoinError("ROOM_FULL", "이 방은 이미 정원이 가득 찼습니다.");
  }

  const normalizedNickname = nickname.trim().toLowerCase();
  const hasDuplicateNickname = players.some(
    (player) => player.nickname.trim().toLowerCase() === normalizedNickname,
  );

  if (hasDuplicateNickname) {
    throw new RoomJoinError("NICKNAME_TAKEN", "이미 같은 닉네임을 사용하는 플레이어가 있습니다.");
  }
}

export async function joinRoomInStore(
  roomCode: string,
  nickname: string,
): Promise<JoinRoomResponse> {
  const room = await findRoomByRef(roomCode);

  if (!room) {
    throw new RoomJoinError("ROOM_NOT_FOUND", "입장 코드를 찾을 수 없습니다.");
  }

  const stateBeforeJoin = await loadLobbyState(room.id);
  assertJoinableRoom(stateBeforeJoin.room, stateBeforeJoin.players, nickname);

  const supabase = getSupabaseAdminClient();
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      nickname,
      role: "player",
      is_ready: false,
      connection_status: "connected",
      total_score: 0,
      solved_count: 0,
      bonus_keyword_count: 0,
      last_seen_at: nowUtcIso(),
    })
    .select("*")
    .single<DbPlayerRow>();

  if (playerError || !player) {
    if (playerError?.code === "23505") {
      throw new RoomJoinError(
        "NICKNAME_TAKEN",
        "이미 같은 닉네임을 사용하는 플레이어가 있습니다.",
      );
    }

    throw new Error(`Failed to create joined player: ${playerError?.message ?? "unknown error"}`);
  }

  const joinedState = await loadLobbyState(room.id);
  const nextRoomStatus = resolveLobbyStatus(joinedState.players);

  if (joinedState.room.status !== nextRoomStatus) {
    const { error: roomUpdateError } = await supabase
      .from("rooms")
      .update({
        status: nextRoomStatus,
        updated_at: nowUtcIso(),
      })
      .eq("id", room.id);

    if (roomUpdateError) {
      throw new Error(`Failed to sync room status after join: ${roomUpdateError.message}`);
    }
  }

  const state = await loadLobbyState(room.id);

  return {
    roomId: room.id,
    playerId: player.id,
    snapshot: buildRoomSnapshot({
      room: state.room,
      game: state.game,
      players: state.players,
      teamSlots: state.teamSlots,
      currentAssignments: state.currentAssignments,
      viewerPlayerId: player.id,
    }),
  };
}

export async function getRoomSnapshotFromStore(
  roomRef: string,
  viewerPlayerId?: string,
): Promise<RoomSnapshot | null> {
  const room = await findRoomByRef(roomRef);
  if (!room) {
    return null;
  }

  const state = await loadLobbyState(room.id);
  return buildRoomSnapshot({
    room: state.room,
    game: state.game,
    players: state.players,
    teamSlots: state.teamSlots,
    currentAssignments: state.currentAssignments,
    viewerPlayerId,
  });
}

function resolveLobbyStatus(players: DbPlayerRow[]): Room["status"] {
  return players.length > 0 && players.every((player) => player.is_ready) ? "ready" : "waiting";
}

export async function setReadyInStore(
  roomId: string,
  playerId: string,
  isReady: boolean,
): Promise<SetReadyResponse | null> {
  const supabase = getSupabaseAdminClient();
  const { data: updatedPlayer, error: updateError } = await supabase
    .from("players")
    .update({
      is_ready: isReady,
      last_seen_at: nowUtcIso(),
    })
    .eq("id", playerId)
    .eq("room_id", roomId)
    .select("*")
    .maybeSingle<DbPlayerRow>();

  if (updateError) {
    throw new Error(`Failed to update ready state: ${updateError.message}`);
  }

  if (!updatedPlayer) {
    return null;
  }

  const stateBeforeRoomUpdate = await loadLobbyState(roomId);
  const nextRoomStatus = resolveLobbyStatus(stateBeforeRoomUpdate.players);
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .update({
      status: nextRoomStatus,
      updated_at: nowUtcIso(),
    })
    .eq("id", roomId)
    .select("*")
    .single<DbRoomRow>();

  if (roomError || !room) {
    throw new Error(`Failed to update room ready status: ${roomError?.message ?? "unknown error"}`);
  }

  const state = await loadLobbyState(roomId);
  return {
    room: toRoom(room),
    players: state.players.map(toPlayer),
    snapshot: buildRoomSnapshot({
      room: state.room,
      game: state.game,
      players: state.players,
      teamSlots: state.teamSlots,
      currentAssignments: state.currentAssignments,
      viewerPlayerId: playerId,
    }),
  };
}

function assertAssignableRoomState(input: {
  room: DbRoomRow;
  game: DbGameRow | null;
  players: DbPlayerRow[];
  currentStage: DbStageRow | null;
  requestedByPlayerId: string;
  stageNumber: number;
}) {
  if (!input.game) {
    throw new AssignTeamsError("GAME_NOT_FOUND", "방에 연결된 게임 정보를 찾을 수 없습니다.");
  }

  const requester = input.players.find((player) => player.id === input.requestedByPlayerId);

  if (!requester || (requester.role !== "host" && requester.role !== "admin")) {
    throw new AssignTeamsError("REQUESTER_NOT_ALLOWED", "방장만 팀 배정을 실행할 수 있습니다.");
  }

  if (input.players.length !== input.room.max_players) {
    throw new AssignTeamsError("ROOM_NOT_FULL", "정원이 가득 찼을 때만 팀 배정을 할 수 있습니다.");
  }

  if (input.room.status !== "ready" && input.room.status !== "assigning") {
    throw new AssignTeamsError("ROOM_NOT_READY", "현재 상태에서는 팀 배정을 실행할 수 없습니다.");
  }

  if (input.game.current_stage_number !== input.stageNumber) {
    throw new AssignTeamsError(
      "STAGE_NUMBER_MISMATCH",
      `현재는 ${input.game.current_stage_number} 스테이지 팀 배정만 가능합니다.`,
    );
  }

  if (input.currentStage && input.currentStage.status !== "pending") {
    throw new AssignTeamsError(
      "STAGE_NOT_ASSIGNABLE",
      "이미 진행 중인 스테이지에는 팀을 다시 배정할 수 없습니다.",
    );
  }
}

async function ensurePendingStage(
  roomId: string,
  game: DbGameRow,
  stageNumber: number,
): Promise<DbStageRow> {
  const supabase = getSupabaseAdminClient();
  const { data: existingStage, error: existingStageError } = await supabase
    .from("stages")
    .select("*")
    .eq("game_id", game.id)
    .eq("stage_number", stageNumber)
    .maybeSingle<DbStageRow>();

  if (existingStageError) {
    throw new Error(`Failed to inspect pending stage: ${existingStageError.message}`);
  }

  if (existingStage) {
    return existingStage;
  }

  const { data: stage, error: stageError } = await supabase
    .from("stages")
    .insert({
      game_id: game.id,
      room_id: roomId,
      stage_number: stageNumber,
      case_key: `pending-stage-${stageNumber}`,
      status: "pending",
      solved_player_ids: [],
      end_reason: null,
    })
    .select("*")
    .single<DbStageRow>();

  if (stageError || !stage) {
    throw new Error(`Failed to create pending stage: ${stageError?.message ?? "unknown error"}`);
  }

  return stage;
}

export async function assignTeamsInStore(
  roomId: string,
  requestedByPlayerId: string,
  stageNumber: number,
): Promise<AssignTeamsResponse> {
  const room = await findRoomByRef(roomId);

  if (!room) {
    throw new AssignTeamsError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const stateBeforeAssign = await loadLobbyState(room.id);
  assertAssignableRoomState({
    room: stateBeforeAssign.room,
    game: stateBeforeAssign.game,
    players: stateBeforeAssign.players,
    currentStage: stateBeforeAssign.currentStage,
    requestedByPlayerId,
    stageNumber,
  });

  const game = stateBeforeAssign.game!;
  const pendingStage = await ensurePendingStage(room.id, game, stageNumber);
  const nowIso = nowUtcIso();

  let assignments: StageTeamAssignment[];

  try {
    assignments = assignPlayersToTeamSlots(
      pendingStage.id,
      stateBeforeAssign.players.map(toPlayer),
      stateBeforeAssign.teamSlots.map(toTeamSlot),
      nowIso,
    );
  } catch (error) {
    if (error instanceof TransitionError) {
      throw new AssignTeamsError("ROOM_NOT_FULL", error.message);
    }

    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const { error: deleteAssignmentsError } = await supabase
    .from("stage_team_assignments")
    .delete()
    .eq("stage_id", pendingStage.id);

  if (deleteAssignmentsError) {
    throw new Error(`Failed to reset stage assignments: ${deleteAssignmentsError.message}`);
  }

  const { error: insertAssignmentsError } = await supabase
    .from("stage_team_assignments")
    .insert(
      assignments.map((assignment) => ({
        stage_id: assignment.stageId,
        player_id: assignment.playerId,
        team_slot_id: assignment.teamSlotId,
        created_at: assignment.createdAt,
      })),
    );

  if (insertAssignmentsError) {
    throw new Error(`Failed to persist stage assignments: ${insertAssignmentsError.message}`);
  }

  const { error: roomUpdateError } = await supabase
    .from("rooms")
    .update({
      status: "assigning",
      updated_at: nowIso,
    })
    .eq("id", room.id);

  if (roomUpdateError) {
    throw new Error(`Failed to update room status after team assignment: ${roomUpdateError.message}`);
  }

  const { error: gameUpdateError } = await supabase
    .from("games")
    .update({
      current_stage_number: stageNumber,
      updated_at: nowIso,
    })
    .eq("id", game.id);

  if (gameUpdateError) {
    throw new Error(`Failed to update game after team assignment: ${gameUpdateError.message}`);
  }

  const state = await loadLobbyState(room.id);

  return {
    teamSlots: state.teamSlots.map(toTeamSlot),
    assignments: state.currentAssignments.map(toStageTeamAssignment),
    snapshot: buildRoomSnapshot({
      room: state.room,
      game: state.game,
      players: state.players,
      teamSlots: state.teamSlots,
      currentAssignments: state.currentAssignments,
      viewerPlayerId: requestedByPlayerId,
    }),
  };
}

export async function listGameSnapshotsFromStore(): Promise<GameSnapshotSummary[]> {
  const supabase = getSupabaseAdminClient();
  const [{ data: games, error: gamesError }, { data: rooms, error: roomsError }, { data: players, error: playersError }, { data: teamSlots, error: teamSlotsError }] =
    await Promise.all([
      supabase.from("games").select("*").order("updated_at", { ascending: false }).returns<DbGameRow[]>(),
      supabase.from("rooms").select("*").returns<DbRoomRow[]>(),
      supabase.from("players").select("*").returns<DbPlayerRow[]>(),
      supabase.from("team_slots").select("*").returns<DbTeamSlotRow[]>(),
    ]);

  if (gamesError) {
    throw new Error(`Failed to list games: ${gamesError.message}`);
  }
  if (roomsError) {
    throw new Error(`Failed to list rooms: ${roomsError.message}`);
  }
  if (playersError) {
    throw new Error(`Failed to list players: ${playersError.message}`);
  }
  if (teamSlotsError) {
    throw new Error(`Failed to list team slots: ${teamSlotsError.message}`);
  }

  const roomById = new Map((rooms ?? []).map((room) => [room.id, room]));
  const playersByRoomId = new Map<string, DbPlayerRow[]>();
  for (const player of players ?? []) {
    const bucket = playersByRoomId.get(player.room_id) ?? [];
    bucket.push(player);
    playersByRoomId.set(player.room_id, bucket);
  }
  const teamSlotsByRoomId = new Map<string, DbTeamSlotRow[]>();
  for (const teamSlot of teamSlots ?? []) {
    const bucket = teamSlotsByRoomId.get(teamSlot.room_id) ?? [];
    bucket.push(teamSlot);
    teamSlotsByRoomId.set(teamSlot.room_id, bucket);
  }

  return (games ?? []).map((game) => {
    const room = roomById.get(game.room_id);
    const roomPlayers = playersByRoomId.get(game.room_id) ?? [];
    const roomTeamSlots = teamSlotsByRoomId.get(game.room_id) ?? [];

    return {
      roomId: game.room_id,
      roomCode: room?.code ?? "",
      gameId: game.id,
      gameStatus: game.status,
      currentStageNumber: game.current_stage_number,
      stageId: null,
      stageStatus: null,
      stageEndsAt: null,
      teamCount: roomTeamSlots.length,
      assignedPlayerCount: 0,
      activePlayerCount: roomPlayers.filter((player) => player.connection_status === "connected").length,
      solvedPlayerCount: 0,
      activeLockPlayerId: null,
      visibleHintCount: 0,
    };
  });
}

export async function getGameRuntimeSnapshotFromStore(roomId: string): Promise<GameRuntimeSnapshot | null> {
  const room = await findRoomByRef(roomId);
  if (!room) {
    return null;
  }

  const state = await loadLobbyState(room.id);
  if (!state.game) {
    return null;
  }

  return {
    roomId: state.room.id,
    roomCode: state.room.code,
    game: toGame(state.game),
    stage: state.currentStage ? toStage(state.currentStage) : null,
    teamSlots: state.teamSlots.map(toTeamSlot),
    currentAssignments: state.currentAssignments.map(toStageTeamAssignment),
    playerStates: [],
    activeLock: null,
    scores: buildScoreSnapshots(state.players),
    visibleHints: [],
  };
}

export async function listChatMessagesFromStore(
  roomId: string,
  stageId?: string | null,
): Promise<ListChatMessagesResponse> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (typeof stageId === "string" && stageId.length > 0) {
    query = query.eq("stage_id", stageId);
  }

  const { data, error } = await query.returns<DbChatMessageRow[]>();
  if (error) {
    throw new Error(`Failed to list chat messages: ${error.message}`);
  }

  return {
    messages: (data ?? []).map(toChatMessage),
  };
}

export async function sendChatMessageToStore(
  input: SendChatMessageRequest,
): Promise<SendChatMessageResponse> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      room_id: input.roomId,
      stage_id: input.stageId ?? null,
      player_id: input.playerId,
      team_slot_id: input.teamSlotId ?? null,
      channel: input.channel,
      content: input.content,
    })
    .select("*")
    .single<DbChatMessageRow>();

  if (error || !data) {
    throw new Error(`Failed to send chat message: ${error?.message ?? "unknown error"}`);
  }

  return {
    message: toChatMessage(data),
  };
}
