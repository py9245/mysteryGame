import type {
  ChatMessage,
  Game,
  HintReveal,
  InvestigationLock,
  Player,
  PlayerStageState,
  PrivateChatRequest,
  PrivateChatSession,
  Room,
  RoomMode,
  ScoreEvent,
  Stage,
  StageTeamAssignment,
  TeamSlot,
} from "@/contracts/game";
import type { RoomSettingsView } from "@/contracts/api";
import { hashPassword } from "@/server/auth-password";
import type {
  DbChatMessageRow,
  DbGameRow,
  DbHintRevealRow,
  DbInvestigationLockRow,
  DbPlayerRow,
  DbPlayerStageStateRow,
  DbPrivateChatRequestRow,
  DbPrivateChatSessionRow,
  DbRoomRow,
  DbScoreEventRow,
  DbStageRow,
  DbStageTeamAssignmentRow,
  DbTeamSlotRow,
} from "./types";

export function normalizeRoomMode(mode: unknown, fallback: RoomMode = "public"): RoomMode {
  return mode === "secret" || mode === "practice" || mode === "public" ? mode : fallback;
}

export function normalizeRoomDirectoryTitle(title: unknown, roomCode: string): string {
  if (typeof title === "string" && title.trim().length > 0) {
    return title.trim();
  }

  return `${roomCode} 사건방`;
}

export function normalizeRoomTitle(title: unknown, fallback: string): string {
  if (typeof title !== "string") {
    return fallback;
  }

  const normalized = title.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeStageCount(mode: RoomMode, requested: number | null | undefined): number {
  if (mode === "practice") {
    return 1;
  }

  if (requested === 1 || requested === 3) {
    return requested;
  }

  return 3;
}

export function normalizeMaxPlayers(mode: RoomMode, requested: number | null | undefined): number {
  if (mode === "practice") {
    return 1;
  }

  if (typeof requested === "number" && Number.isInteger(requested) && requested >= 2 && requested <= 6) {
    return requested;
  }

  return 6;
}

export function normalizeRoomPasswordHash(mode: RoomMode, password: string | null | undefined): Promise<string | null> {
  if (mode !== "secret") {
    return Promise.resolve(null);
  }

  if (typeof password !== "string" || password.trim().length < 4) {
    throw new Error("비밀방은 4자 이상 비밀번호가 필요합니다.");
  }

  return hashPassword(password.trim());
}

export function resolveRoomMode(row: Pick<DbRoomRow, "mode">): RoomMode {
  return normalizeRoomMode(row.mode, "public");
}

export function resolveRoomTitle(row: Pick<DbRoomRow, "title" | "code">): string {
  return normalizeRoomDirectoryTitle(row.title, row.code);
}

export function resolveRoomStageCount(row: Pick<DbRoomRow, "stage_count" | "mode">): number {
  const mode = resolveRoomMode(row);
  if (typeof row.stage_count === "number" && Number.isFinite(row.stage_count)) {
    return Math.max(1, Math.floor(row.stage_count));
  }

  return mode === "practice" ? 1 : 3;
}

export function resolveRoomPasswordHash(row: Pick<DbRoomRow, "password_hash">): string | null {
  return typeof row.password_hash === "string" && row.password_hash.length > 0
    ? row.password_hash
    : null;
}

export function isLegacyMissingRoomColumnsError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message ?? "";
  return (
    message.includes("Could not find the 'mode' column of 'rooms'") ||
    message.includes("Could not find the 'title' column of 'rooms'") ||
    message.includes("Could not find the 'password_hash' column of 'rooms'") ||
    message.includes("Could not find the 'stage_count' column of 'rooms'")
  );
}

export function isLegacyMissingGuestIdentityColumnError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message ?? "";
  return message.includes("Could not find the 'guest_identity' column of 'players'");
}

export function toRoomSettings(row: DbRoomRow): RoomSettingsView {
  const mode = resolveRoomMode(row);
  return {
    roomId: row.id,
    title: resolveRoomTitle(row),
    mode,
    stageCount: resolveRoomStageCount(row),
    maxPlayers: row.max_players,
    passwordProtected: mode === "secret" || resolveRoomPasswordHash(row) !== null,
    updatedAt: row.updated_at,
  };
}

export function toRoom(row: DbRoomRow): Room {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    maxPlayers: row.max_players,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPlayer(row: DbPlayerRow): Player {
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

export function toTeamSlot(row: DbTeamSlotRow): TeamSlot {
  return {
    id: row.id,
    roomId: row.room_id,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toGame(row: DbGameRow): Game {
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

export function toStage(row: DbStageRow): Stage {
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

export function toStageTeamAssignment(row: DbStageTeamAssignmentRow): StageTeamAssignment {
  return {
    stageId: row.stage_id,
    playerId: row.player_id,
    teamSlotId: row.team_slot_id,
    createdAt: row.created_at,
  };
}

export function toPlayerStageState(row: DbPlayerStageStateRow): PlayerStageState {
  return {
    stageId: row.stage_id,
    playerId: row.player_id,
    teamSlotId: row.team_slot_id,
    status: row.status,
    queueStatus: row.queue_joined_at ? "waiting" : "idle",
    queueJoinedAt: row.queue_joined_at,
    queueCooldownEndsAt: row.queue_cooldown_ends_at,
    questionCount: row.question_count,
    answerAttemptCount: row.answer_attempt_count,
    hasReceivedInactivityPenalty: row.has_received_inactivity_penalty,
    solvedAt: row.solved_at,
    lockedAt: row.locked_at,
    updatedAt: row.updated_at,
  };
}

export function toInvestigationLock(row: DbInvestigationLockRow): InvestigationLock {
  return {
    stageId: row.stage_id,
    roomId: row.room_id,
    lockedByPlayerId: row.locked_by_player_id,
    lockedAt: row.locked_at,
    expiresAt: row.expires_at,
    questionCount: row.question_count,
    answerAttemptCount: row.answer_attempt_count,
    lastReleasedByPlayerId: row.last_released_by_player_id,
    lastReleasedAt: row.last_released_at,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toHintReveal(row: DbHintRevealRow): HintReveal {
  return {
    id: row.id,
    stageId: row.stage_id,
    hintIndex: row.hint_index,
    triggerType: row.trigger_type,
    revealedAt: row.revealed_at,
  };
}

export function toChatMessage(row: DbChatMessageRow): ChatMessage {
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

export function toPrivateChatRequest(row: DbPrivateChatRequestRow): PrivateChatRequest {
  return {
    id: row.id,
    stageId: row.stage_id,
    requesterPlayerId: row.requester_player_id,
    targetPlayerId: row.target_player_id,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    respondedAt: row.responded_at,
    responseReason: row.response_reason,
  };
}

export function toPrivateChatSession(row: DbPrivateChatSessionRow): PrivateChatSession {
  return {
    id: row.id,
    stageId: row.stage_id,
    requestId: row.request_id,
    playerAId: row.player_a_id,
    playerBId: row.player_b_id,
    startedAt: row.started_at,
    releaseAllowedAt: row.release_allowed_at,
    endedAt: row.ended_at,
    closedByPlayerId: row.closed_by_player_id,
  };
}

export function toScoreEvent(row: DbScoreEventRow): ScoreEvent {
  return {
    id: row.id,
    roomId: row.room_id,
    gameId: row.game_id,
    stageId: row.stage_id,
    playerId: row.player_id,
    type: row.type,
    delta: row.delta,
    quantity: row.quantity,
    reason: row.reason,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}
