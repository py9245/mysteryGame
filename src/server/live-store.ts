import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  AcquireInvestigationLockResponse,
  AssignTeamsResponse,
  CreateRoomResponse,
  EndPrivateChatResponse,
  GameRuntimeSnapshot,
  GameSnapshotSummary,
  JoinInvestigationQueueResponse,
  JoinRoomResponse,
  LeaveInvestigationQueueResponse,
  ListChatMessagesResponse,
  ListRoomDirectoryResponse,
  PlayerScoreSnapshot,
  ReleaseInvestigationLockResponse,
  RequestPrivateChatResponse,
  RespondPrivateChatResponse,
  RoomSnapshot,
  RoomSettingsResponse,
  RoomSettingsView,
  SendChatMessageRequest,
  SendChatMessageResponse,
  SetReadyResponse,
  StartStageResponse,
  SubmitAnswerResponse,
  SubmitQuestionResponse,
} from "@/contracts/api";
import type {
  AnswerAttempt,
  AnswerResult,
  ChatMessage,
  ChatChannel,
  ConnectionStatus,
  Game,
  HintReveal,
  InvestigationLock,
  Player,
  PlayerStageState,
  PlayerRole,
  PrivateChatRequest,
  PrivateChatRequestStatus,
  PrivateChatSession,
  Room,
  Stage,
  StageEndReason,
  StageStatus,
  StageTeamAssignment,
  TeamSlot,
  Question,
  QuestionJudgement,
  ScoreEvent,
} from "@/contracts/game";
import type {
  AnswerJudgementRequest,
  AnswerJudgementResponse,
  JudgementRecordKind,
  JudgementStorageEnvelope,
  QuestionJudgementRequest,
  QuestionJudgementResponse,
} from "@/contracts/judgement";
import type {
  RedactedValue,
  RoomViewSnapshot,
  ScoreView,
  ViewMode,
  VisibilityScope,
} from "@/contracts/view";
import type { RoomMode } from "@/contracts/game";
import { assignPlayersToTeamSlots, TransitionError } from "@/server/game/state-machine";
import {
  buildTimeTickEvent,
  buildQuestionCostEvent,
  buildWrongAnswerCostEvent,
  buildBonusRewardEvents,
  buildInactivityPenaltyEvents,
  createScoreEvent,
  replayScoreEvents,
} from "@/server/game/scoring";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { upsertAccountGameResults } from "@/server/account-store";
import { hashPassword, verifyPassword } from "@/server/auth-password";
import type { ActiveRoomMembership } from "@/server/auth-session";
import { addSeconds, diffSeconds, hasExpired, nowUtcIso, remainingSeconds } from "@/server/time";
import { createTextCompletion } from "@/lib/ai";

type DbRoomRow = {
  id: string;
  code: string;
  title?: string | null;
  mode?: RoomMode | null;
  password_hash?: string | null;
  stage_count?: number | null;
  status: Room["status"];
  max_players: number;
  created_at: string;
  updated_at: string;
};

type DbPlayerRow = {
  id: string;
  room_id: string;
  account_id?: string | null;
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

type DbPlayerStageStateRow = {
  stage_id: string;
  player_id: string;
  team_slot_id: string | null;
  status: PlayerStageState["status"];
  queue_joined_at: string | null;
  queue_cooldown_ends_at: string | null;
  question_count: number;
  answer_attempt_count: number;
  has_received_inactivity_penalty: boolean;
  solved_at: string | null;
  locked_at: string | null;
  updated_at: string;
};

type DbInvestigationLockRow = {
  stage_id: string;
  room_id: string;
  locked_by_player_id: string | null;
  locked_at: string | null;
  expires_at: string | null;
  question_count: number;
  answer_attempt_count: number;
  last_released_by_player_id: string | null;
  last_released_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

type DbHintRevealRow = {
  id: string;
  stage_id: string;
  hint_index: number;
  trigger_type: string;
  revealed_at: string;
};

type DbScoreEventRow = {
  id: string;
  room_id: string;
  game_id: string;
  stage_id: string | null;
  player_id: string;
  type: ScoreEvent["type"];
  delta: number;
  quantity: number;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type DbQuestionRow = {
  id: string;
  stage_id: string;
  player_id: string;
  team_slot_id: string;
  content: string;
  judgement: QuestionJudgement;
  reason_code: string;
  judged_at: string | null;
  created_at: string;
};

type DbAnswerAttemptRow = {
  id: string;
  stage_id: string;
  player_id: string;
  team_slot_id: string;
  content: string;
  result: AnswerResult;
  matched_bonus_keywords: string[];
  missing_required_keywords: string[];
  reason_code: string;
  needs_manual_review: boolean;
  should_lock_player: boolean;
  created_at: string;
};

type DbJudgementRecordRow = {
  id: string;
  room_id: string;
  game_id: string | null;
  stage_id: string;
  player_id: string;
  kind: JudgementRecordKind;
  case_id: string;
  stage_number: number;
  request: QuestionJudgementRequest | AnswerJudgementRequest;
  response: QuestionJudgementResponse | AnswerJudgementResponse;
  public_outcome: string;
  public_summary: string;
  internal_payload: Record<string, unknown>;
  manual_review_required: boolean;
  needs_operator_override: boolean;
  persistence_state: string;
  created_at: string;
  updated_at: string;
};

type DbJudgementReviewQueueRow = {
  review_id: string;
  judgement_id: string;
  kind: JudgementRecordKind;
  room_id: string;
  stage_id: string;
  player_id: string;
  public_outcome: string;
  review_status: "pending" | "approved" | "rejected" | "merged";
  review_summary: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
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

type DbPrivateChatRequestRow = {
  id: string;
  stage_id: string;
  requester_player_id: string;
  target_player_id: string;
  status: PrivateChatRequestStatus;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  response_reason: string | null;
  updated_at: string;
};

type DbPrivateChatSessionRow = {
  id: string;
  stage_id: string;
  request_id: string;
  player_a_id: string;
  player_b_id: string;
  started_at: string;
  release_allowed_at: string;
  ended_at: string | null;
  closed_by_player_id: string | null;
};

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_TEAM_LABELS = ["Red", "Blue", "Green"] as const;
const REDACTED_OTHER_PLAYER: RedactedValue = { hidden: true, reason: "other_player" };
const REDACTED_STAGE_SECRET: RedactedValue = { hidden: true, reason: "stage_secret" };
const REDACTED_PRIVATE_CHAT: RedactedValue = { hidden: true, reason: "private_chat" };
const REDACTED_AI_INTERNAL: RedactedValue = { hidden: true, reason: "ai_internal" };
const INVESTIGATION_LOCK_SECONDS = 60;
const INVESTIGATION_QUEUE_REENTRY_COOLDOWN_SECONDS = 5;
const STAGE_BRIEFING_SECONDS = 60;
const DEFAULT_STAGE_DURATION_SECONDS = 15 * 60;
const PRIVATE_CHAT_REQUEST_TTL_SECONDS = 15;
const PRIVATE_CHAT_MIN_SESSION_SECONDS = 30;
const PRIVATE_CHAT_COOLDOWN_SECONDS = 10;
const ROOM_PRESENCE_TTL_SECONDS = 15;

type CaseSummary = {
  title: string;
  publicDescription: string;
  imageUrl: string | null;
};

type SnapshotStage = NonNullable<RoomSnapshot["stage"]>;

type CaseFile = {
  key: string;
  stageNumber: number;
  title: string;
  publicDescription: string;
  imageUrl: string | null;
  question: string;
  truth: string;
  requiredKeywords: string[];
  bonusKeywords: string[];
  acceptedAnswerSummary: string;
  hints: Array<{
    hintId: string;
    order: number;
    triggerType: string;
    strength: string;
    publicText: string;
    internalNote: string;
  }>;
};

export class RoomJoinError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "ROOM_NOT_JOINABLE"
      | "ROOM_PASSWORD_REQUIRED"
      | "ROOM_PASSWORD_INVALID"
      | "ROOM_FULL"
      | "NICKNAME_TAKEN",
    message: string,
  ) {
    super(message);
    this.name = "RoomJoinError";
  }
}

export class RoomSettingsError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "REQUESTER_NOT_ALLOWED"
      | "ROOM_NOT_EDITABLE"
      | "INVALID_ROOM_MODE"
      | "PASSWORD_REQUIRED"
      | "ROOM_TOO_SMALL"
      | "ROOM_TOO_FULL",
    message: string,
  ) {
    super(message);
    this.name = "RoomSettingsError";
  }
}

export class LeaveRoomError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "PLAYER_NOT_FOUND"
      | "ROOM_LEAVE_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "LeaveRoomError";
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

export class StartStageError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "GAME_NOT_FOUND"
      | "REQUESTER_NOT_ALLOWED"
      | "STAGE_NOT_FOUND"
      | "STAGE_NOT_STARTABLE"
      | "ASSIGNMENTS_NOT_READY",
    message: string,
  ) {
    super(message);
    this.name = "StartStageError";
  }
}

export class AdvanceStageError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "GAME_NOT_FOUND"
      | "REQUESTER_NOT_ALLOWED"
      | "STAGE_NOT_READY"
      | "FINAL_STAGE_NOT_ADVANCABLE",
    message: string,
  ) {
    super(message);
    this.name = "AdvanceStageError";
  }
}

export class InvestigationLockError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "STAGE_NOT_FOUND"
      | "PLAYER_NOT_FOUND"
      | "PLAYER_NOT_ACTIVE"
      | "LOCK_CONFLICT"
      | "LOCK_NOT_OWNED"
      | "LOCK_LIMIT_REACHED"
      | "TEAM_SLOT_MISMATCH"
      | "STAGE_NOT_ACTIVE"
      | "QUEUE_ALREADY_JOINED"
      | "QUEUE_NOT_JOINED"
      | "QUEUE_COOLDOWN_ACTIVE"
      | "LOCK_ALREADY_OWNED",
    message: string,
  ) {
    super(message);
    this.name = "InvestigationLockError";
  }
}

export class PrivateChatError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "STAGE_NOT_FOUND"
      | "PLAYER_NOT_FOUND"
      | "REQUEST_NOT_FOUND"
      | "SESSION_NOT_FOUND"
      | "REQUESTER_NOT_ALLOWED"
      | "RESPONDER_NOT_ALLOWED"
      | "SESSION_NOT_ALLOWED"
      | "SAME_PLAYER"
      | "SAME_TEAM"
      | "TARGET_BUSY"
      | "REQUESTER_BUSY"
      | "REQUEST_COOLDOWN"
      | "ACTIVE_REQUEST_EXISTS"
      | "REQUEST_NOT_PENDING"
      | "REQUEST_EXPIRED"
      | "SESSION_LOCKED"
      | "STAGE_NOT_ACTIVE"
      | "PLAYER_NOT_ACTIVE",
    message: string,
  ) {
    super(message);
    this.name = "PrivateChatError";
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

function createEntityId(): string {
  return randomUUID();
}

function normalizeRoomMode(mode: unknown, fallback: RoomMode = "public"): RoomMode {
  return mode === "secret" || mode === "practice" || mode === "public" ? mode : fallback;
}

function normalizeRoomDirectoryTitle(title: unknown, roomCode: string): string {
  if (typeof title === "string" && title.trim().length > 0) {
    return title.trim();
  }

  return `${roomCode} 사건방`;
}

function normalizeRoomTitle(title: unknown, fallback: string): string {
  if (typeof title !== "string") {
    return fallback;
  }

  const normalized = title.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeStageCount(mode: RoomMode, requested: number | null | undefined): number {
  if (mode === "practice") {
    return 1;
  }

  if (requested === 1 || requested === 3) {
    return requested;
  }

  return 3;
}

function normalizeMaxPlayers(mode: RoomMode, requested: number | null | undefined): number {
  if (mode === "practice") {
    return 1;
  }

  if (typeof requested === "number" && Number.isInteger(requested) && requested >= 2 && requested <= 6) {
    return requested;
  }

  return 6;
}

function normalizeRoomPasswordHash(mode: RoomMode, password: string | null | undefined): Promise<string | null> {
  if (mode !== "secret") {
    return Promise.resolve(null);
  }

  if (typeof password !== "string" || password.trim().length < 4) {
    throw new Error("비밀방은 4자 이상 비밀번호가 필요합니다.");
  }

  return hashPassword(password.trim());
}

function resolveRoomMode(row: Pick<DbRoomRow, "mode">): RoomMode {
  return normalizeRoomMode(row.mode, "public");
}

function resolveRoomTitle(row: Pick<DbRoomRow, "title" | "code">): string {
  return normalizeRoomDirectoryTitle(row.title, row.code);
}

function resolveRoomStageCount(row: Pick<DbRoomRow, "stage_count" | "mode">): number {
  const mode = resolveRoomMode(row);
  if (typeof row.stage_count === "number" && Number.isFinite(row.stage_count)) {
    return Math.max(1, Math.floor(row.stage_count));
  }

  return mode === "practice" ? 1 : 3;
}

function resolveRoomPasswordHash(row: Pick<DbRoomRow, "password_hash">): string | null {
  return typeof row.password_hash === "string" && row.password_hash.length > 0
    ? row.password_hash
    : null;
}

function isLegacyMissingRoomColumnsError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message ?? "";
  return (
    message.includes("Could not find the 'mode' column of 'rooms'") ||
    message.includes("Could not find the 'title' column of 'rooms'") ||
    message.includes("Could not find the 'password_hash' column of 'rooms'") ||
    message.includes("Could not find the 'stage_count' column of 'rooms'")
  );
}

function toRoomSettings(row: DbRoomRow): RoomSettingsView {
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

function toPlayerStageState(row: DbPlayerStageStateRow): PlayerStageState {
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

function toInvestigationLock(row: DbInvestigationLockRow): InvestigationLock {
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

function toHintReveal(row: DbHintRevealRow): HintReveal {
  return {
    id: row.id,
    stageId: row.stage_id,
    hintIndex: row.hint_index,
    triggerType: row.trigger_type,
    revealedAt: row.revealed_at,
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

function toPrivateChatRequest(row: DbPrivateChatRequestRow): PrivateChatRequest {
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

function toPrivateChatSession(row: DbPrivateChatSessionRow): PrivateChatSession {
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

function toScoreEvent(row: DbScoreEventRow): ScoreEvent {
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

function buildScoreLedger(
  players: DbPlayerRow[],
  scoreEvents: DbScoreEventRow[],
  currentStageId: string | null,
): {
  snapshots: PlayerScoreSnapshot[];
  byPlayerId: Map<string, PlayerScoreSnapshot>;
} {
  const playerIds = players.map((player) => player.id);
  const replayed = replayScoreEvents(playerIds, scoreEvents.map(toScoreEvent), currentStageId);
  const byPlayerId = new Map(replayed.map((snapshot) => [snapshot.playerId, snapshot]));

  return {
    snapshots: replayed,
    byPlayerId,
  };
}

function normalizeKeywordText(value: string): string {
  return value.toLowerCase().replace(/[\s.,!?"'“”‘’(){}\[\]<>~`·、。！？\-_/]/g, "");
}

function includesNormalized(haystack: string, needle: string): boolean {
  return normalizeKeywordText(haystack).includes(normalizeKeywordText(needle));
}

function mapQuestionJudgementToPublicReply(judgement: QuestionJudgement): string {
  switch (judgement) {
    case "YES":
      return "네, 그렇습니다.";
    case "NO":
      return "아니오, 그렇지 않습니다.";
    case "MAYBE":
      return "그럴 수도 있습니다.";
    case "IRRELEVANT":
    default:
      return "중요하지 않습니다.";
  }
}

function mapQuestionJudgementToStoredJudgement(judgement: QuestionJudgement): QuestionJudgementResponse["judgement"] {
  switch (judgement) {
    case "YES":
      return "YES";
    case "NO":
      return "NO";
    case "MAYBE":
      return "PARTIAL";
    case "IRRELEVANT":
    default:
      return "IRRELEVANT";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractJsonObject(text: string | null): Record<string, unknown> | null {
  if (!text) {
    return null;
  }

  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;
  const startIndex = candidate.indexOf("{");
  const endIndex = candidate.lastIndexOf("}");

  if (startIndex < 0 || endIndex <= startIndex) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate.slice(startIndex, endIndex + 1)) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function resolveKeywordSubset(sourceKeywords: string[], rawMatches: string[]): string[] {
  const normalizedMatches = rawMatches.map((value) => normalizeKeywordText(value)).filter((value) => value.length > 0);
  const resolved = sourceKeywords.filter((keyword) => {
    const normalizedKeyword = normalizeKeywordText(keyword);
    return normalizedMatches.some(
      (candidate) =>
        candidate === normalizedKeyword ||
        candidate.includes(normalizedKeyword) ||
        normalizedKeyword.includes(candidate),
    );
  });

  return Array.from(new Set(resolved));
}

function buildVisibleHintTexts(caseFile: CaseFile, visibleHints: DbHintRevealRow[]): string[] {
  return visibleHints
    .map((hint) => caseFile.hints.find((candidate) => candidate.order === hint.hint_index)?.publicText ?? null)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function classifyQuestionJudgementFallback(caseFile: CaseFile, content: string): {
  judgement: QuestionJudgement;
  reasonCode: string;
  publicReply: string;
} {
  const matchedRequiredKeywords = caseFile.requiredKeywords.filter((keyword) => includesNormalized(content, keyword));
  const matchedBonusKeywords = caseFile.bonusKeywords.filter((keyword) => includesNormalized(content, keyword));

  if (matchedRequiredKeywords.length >= 2) {
    return {
      judgement: "YES",
      reasonCode: "question.required_keyword_alignment",
      publicReply: mapQuestionJudgementToPublicReply("YES"),
    };
  }

  if (matchedRequiredKeywords.length === 1 || matchedBonusKeywords.length >= 1) {
    return {
      judgement: "MAYBE",
      reasonCode: "question.partial_keyword_alignment",
      publicReply: mapQuestionJudgementToPublicReply("MAYBE"),
    };
  }

  if (includesNormalized(content, "외부") || includesNormalized(content, "알리바이") || includesNormalized(content, "바깥")) {
    return {
      judgement: "NO",
      reasonCode: "question.external_mismatch",
      publicReply: mapQuestionJudgementToPublicReply("NO"),
    };
  }

  return {
    judgement: "IRRELEVANT",
    reasonCode: "question.low_signal",
    publicReply: mapQuestionJudgementToPublicReply("IRRELEVANT"),
  };
}

function classifyAnswerAttemptFallback(caseFile: CaseFile, content: string): {
  result: AnswerResult;
  matchedRequiredKeywords: string[];
  publicOutcome: "correct" | "wrong" | "needs_review";
  publicSummary: string;
  matchedBonusKeywords: string[];
  missingRequiredKeywords: string[];
  reasonCode: string;
  needsManualReview: boolean;
  shouldLockPlayer: boolean;
} {
  const matchedRequiredKeywords = caseFile.requiredKeywords.filter((keyword) => includesNormalized(content, keyword));
  const matchedBonusKeywords = caseFile.bonusKeywords.filter((keyword) => includesNormalized(content, keyword));
  const missingRequiredKeywords = caseFile.requiredKeywords.filter((keyword) => !includesNormalized(content, keyword));

  if (missingRequiredKeywords.length === 0) {
    return {
      result: "correct",
      matchedRequiredKeywords,
      publicOutcome: "correct",
      publicSummary: caseFile.acceptedAnswerSummary,
      matchedBonusKeywords,
      missingRequiredKeywords: [],
      reasonCode: "answer.accepted.required_keywords_matched",
      needsManualReview: false,
      shouldLockPlayer: true,
    };
  }

  if (matchedRequiredKeywords.length >= 2 || matchedBonusKeywords.length >= 1) {
    return {
      result: "ambiguous",
      matchedRequiredKeywords,
      publicOutcome: "needs_review",
      publicSummary: "정답의 핵심 단서를 일부 맞췄지만, 아직 확정할 수 없습니다.",
      matchedBonusKeywords,
      missingRequiredKeywords,
      reasonCode: "answer.manual_review.partial_keyword_match",
      needsManualReview: true,
      shouldLockPlayer: false,
    };
  }

  return {
    result: "incorrect",
    matchedRequiredKeywords,
    publicOutcome: "wrong",
    publicSummary: "핵심 단서가 맞지 않아 오답으로 처리되었습니다.",
    matchedBonusKeywords,
    missingRequiredKeywords,
    reasonCode: "answer.rejected.required_keywords_missing",
    needsManualReview: false,
    shouldLockPlayer: false,
  };
}

async function resolveQuestionJudgement(input: {
  caseFile: CaseFile;
  content: string;
  visibleHintTexts: string[];
}): Promise<{
  judgement: QuestionJudgement;
  reasonCode: string;
  publicReply: string;
  manualReviewRequired: boolean;
  safetyFlags: string[];
  logSummary: string;
}> {
  const fallback = classifyQuestionJudgementFallback(input.caseFile, input.content);

  try {
    const completion = await createTextCompletion({
      messages: [
        {
          role: "developer",
          content:
            "너는 미스터리 추리 게임의 질문 판정기다. 반드시 JSON 객체만 반환한다. 코드블록, 설명문, 추가 문장 금지. judgement는 YES, NO, MAYBE, IRRELEVANT 중 하나만 허용한다. publicReply는 정확히 '네, 그렇습니다.', '아니오, 그렇지 않습니다.', '그럴 수도 있습니다.', '중요하지 않습니다.' 중 하나만 허용한다. reasonCode는 짧은 snake_case 문자열로 작성한다. manualReviewRequired는 boolean, safetyFlags는 문자열 배열, logSummary는 짧은 한국어 한 줄이다.",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              case: {
                title: input.caseFile.title,
                publicDescription: input.caseFile.publicDescription,
                question: input.caseFile.question,
                truth: input.caseFile.truth,
                requiredKeywords: input.caseFile.requiredKeywords,
                bonusKeywords: input.caseFile.bonusKeywords,
                visibleHints: input.visibleHintTexts,
              },
              playerQuestion: input.content,
              outputSchema: {
                judgement: "YES | NO | MAYBE | IRRELEVANT",
                publicReply:
                  "네, 그렇습니다. | 아니오, 그렇지 않습니다. | 그럴 수도 있습니다. | 중요하지 않습니다.",
                reasonCode: "snake_case",
                manualReviewRequired: false,
                safetyFlags: ["string"],
                logSummary: "short korean sentence",
              },
            },
            null,
            2,
          ),
        },
      ],
    });

    const parsed = extractJsonObject(completion.text);
    const judgement =
      parsed?.judgement === "YES" ||
      parsed?.judgement === "NO" ||
      parsed?.judgement === "MAYBE" ||
      parsed?.judgement === "IRRELEVANT"
        ? parsed.judgement
        : null;

    if (!judgement) {
      throw new Error("AI question judgement missing valid judgement.");
    }

    const publicReply =
      parsed?.publicReply === "네, 그렇습니다." ||
      parsed?.publicReply === "아니오, 그렇지 않습니다." ||
      parsed?.publicReply === "그럴 수도 있습니다." ||
      parsed?.publicReply === "중요하지 않습니다."
        ? parsed.publicReply
        : mapQuestionJudgementToPublicReply(judgement);

    const reasonCode =
      typeof parsed?.reasonCode === "string" && parsed.reasonCode.trim().length > 0
        ? parsed.reasonCode.trim()
        : `question.ai.${judgement.toLowerCase()}`;

    return {
      judgement,
      reasonCode,
      publicReply,
      manualReviewRequired: parsed?.manualReviewRequired === true,
      safetyFlags: asStringArray(parsed?.safetyFlags),
      logSummary:
        typeof parsed?.logSummary === "string" && parsed.logSummary.trim().length > 0
          ? parsed.logSummary.trim()
          : `question:${reasonCode}`,
    };
  } catch {
    return {
      ...fallback,
      manualReviewRequired: false,
      safetyFlags: ["ai_fallback"],
      logSummary: `fallback:${fallback.reasonCode}`,
    };
  }
}

async function resolveAnswerJudgement(input: {
  caseFile: CaseFile;
  content: string;
  visibleHintTexts: string[];
}): Promise<{
  result: AnswerResult;
  matchedRequiredKeywords: string[];
  publicOutcome: "correct" | "wrong" | "needs_review";
  publicSummary: string;
  matchedBonusKeywords: string[];
  missingRequiredKeywords: string[];
  reasonCode: string;
  needsManualReview: boolean;
  shouldLockPlayer: boolean;
  needsOperatorOverride: boolean;
  logSummary: string;
}> {
  const fallback = classifyAnswerAttemptFallback(input.caseFile, input.content);

  try {
    const completion = await createTextCompletion({
      messages: [
        {
          role: "developer",
          content:
            "너는 미스터리 추리 게임의 정답 판정기다. 반드시 JSON 객체만 반환한다. 코드블록, 설명문, 추가 문장 금지. result는 correct, incorrect, ambiguous 중 하나만 허용한다. publicOutcome은 correct, wrong, needs_review 중 하나만 허용한다. matchedRequiredKeywords, missingRequiredKeywords, matchedBonusKeywords에는 제공된 키워드 목록 안의 항목만 넣는다. reasonCode는 짧은 snake_case 문자열, publicSummary는 40자 이내 한국어 문장, needsOperatorOverride는 boolean, logSummary는 짧은 한국어 한 줄이다.",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              case: {
                title: input.caseFile.title,
                publicDescription: input.caseFile.publicDescription,
                question: input.caseFile.question,
                truth: input.caseFile.truth,
                acceptedAnswerSummary: input.caseFile.acceptedAnswerSummary,
                requiredKeywords: input.caseFile.requiredKeywords,
                bonusKeywords: input.caseFile.bonusKeywords,
                visibleHints: input.visibleHintTexts,
              },
              playerAnswer: input.content,
              outputSchema: {
                result: "correct | incorrect | ambiguous",
                publicOutcome: "correct | wrong | needs_review",
                matchedRequiredKeywords: ["keyword"],
                missingRequiredKeywords: ["keyword"],
                matchedBonusKeywords: ["keyword"],
                reasonCode: "snake_case",
                publicSummary: "40자 이내 한국어",
                needsOperatorOverride: false,
                logSummary: "short korean sentence",
              },
            },
            null,
            2,
          ),
        },
      ],
    });

    const parsed = extractJsonObject(completion.text);
    const result =
      parsed?.result === "correct" || parsed?.result === "incorrect" || parsed?.result === "ambiguous"
        ? parsed.result
        : null;

    if (!result) {
      throw new Error("AI answer judgement missing valid result.");
    }

    const matchedRequiredKeywords = resolveKeywordSubset(
      input.caseFile.requiredKeywords,
      asStringArray(parsed?.matchedRequiredKeywords),
    );
    const missingRequiredKeywords = resolveKeywordSubset(
      input.caseFile.requiredKeywords,
      asStringArray(parsed?.missingRequiredKeywords),
    );
    const matchedBonusKeywords = resolveKeywordSubset(
      input.caseFile.bonusKeywords,
      asStringArray(parsed?.matchedBonusKeywords),
    );

    const resolvedMissingRequiredKeywords =
      result === "correct"
        ? input.caseFile.requiredKeywords.filter((keyword) => !matchedRequiredKeywords.includes(keyword))
        : Array.from(new Set(missingRequiredKeywords));
    const resolvedMatchedRequiredKeywords =
      result === "correct" && matchedRequiredKeywords.length === input.caseFile.requiredKeywords.length
        ? matchedRequiredKeywords
        : input.caseFile.requiredKeywords.filter((keyword) => !resolvedMissingRequiredKeywords.includes(keyword));

    const isConsistentCorrect = result !== "correct" || resolvedMissingRequiredKeywords.length === 0;
    const normalizedResult = isConsistentCorrect ? result : "ambiguous";
    const needsManualReview = normalizedResult === "ambiguous";
    const publicOutcome =
      normalizedResult === "correct"
        ? "correct"
        : normalizedResult === "incorrect"
          ? "wrong"
          : "needs_review";
    const publicSummary =
      normalizedResult === "correct"
        ? input.caseFile.acceptedAnswerSummary
        : typeof parsed?.publicSummary === "string" && parsed.publicSummary.trim().length > 0
          ? parsed.publicSummary.trim()
          : normalizedResult === "incorrect"
            ? "핵심 단서가 맞지 않아 오답으로 처리되었습니다."
            : "정답 여부를 바로 확정할 수 없어 검토 대기 상태로 보냅니다.";
    const reasonCode =
      typeof parsed?.reasonCode === "string" && parsed.reasonCode.trim().length > 0
        ? parsed.reasonCode.trim()
        : normalizedResult === "correct"
          ? "answer.ai.accepted"
          : normalizedResult === "incorrect"
            ? "answer.ai.rejected"
            : "answer.ai.ambiguous";

    return {
      result: normalizedResult,
      matchedRequiredKeywords: Array.from(new Set(resolvedMatchedRequiredKeywords)),
      publicOutcome,
      publicSummary,
      matchedBonusKeywords,
      missingRequiredKeywords: Array.from(new Set(resolvedMissingRequiredKeywords)),
      reasonCode,
      needsManualReview,
      shouldLockPlayer: normalizedResult === "correct",
      needsOperatorOverride: parsed?.needsOperatorOverride === true || needsManualReview,
      logSummary:
        typeof parsed?.logSummary === "string" && parsed.logSummary.trim().length > 0
          ? parsed.logSummary.trim()
          : `answer:${reasonCode}`,
    };
  } catch {
    return {
      ...fallback,
      needsOperatorOverride: fallback.needsManualReview,
      logSummary: `fallback:${fallback.reasonCode}`,
    };
  }
}

function cloneSnapshotWithQuestionJudgement(
  snapshot: RoomSnapshot,
  publicReply: string,
): RoomSnapshot {
  if (!snapshot.stage) {
    return snapshot;
  }

  return {
    ...snapshot,
    stage: {
      ...snapshot.stage,
      lastQuestionJudgement: {
        publicReply,
      } as never as SnapshotStage["lastQuestionJudgement"],
    },
  };
}

function cloneSnapshotWithAnswerResult(
  snapshot: RoomSnapshot,
  publicOutcome: "correct" | "wrong" | "needs_review",
  publicSummary: string,
): RoomSnapshot {
  if (!snapshot.stage) {
    return snapshot;
  }

  return {
    ...snapshot,
    stage: {
      ...snapshot.stage,
      lastAnswerResult: {
        publicOutcome,
        publicSummary,
      } as never as SnapshotStage["lastAnswerResult"],
    },
  };
}

function isPrivateChatSessionActive(session: DbPrivateChatSessionRow): boolean {
  return session.ended_at === null;
}

function isPendingPrivateChatRequest(request: DbPrivateChatRequestRow, nowIso: string): boolean {
  return request.status === "pending" && !hasExpired(request.expires_at, nowIso);
}

function resolveLatestPrivateChatRequest(
  requests: DbPrivateChatRequestRow[],
  viewerPlayerId: string,
  nowIso: string,
): DbPrivateChatRequestRow | null {
  return (
    requests.find((request) => request.requester_player_id === viewerPlayerId && isPendingPrivateChatRequest(request, nowIso)) ??
    requests.find(
      (request) =>
        request.target_player_id === viewerPlayerId &&
        isPendingPrivateChatRequest(request, nowIso),
    ) ??
    requests.find(
      (request) =>
        request.requester_player_id === viewerPlayerId &&
        request.status !== "accepted",
    ) ??
    null
  );
}

function resolvePrivateChatCooldownEndsAt(
  requests: DbPrivateChatRequestRow[],
  sessions: DbPrivateChatSessionRow[],
  playerId: string,
  nowIso: string,
): string | null {
  let cooldownEndsAt: string | null = null;

  for (const request of requests) {
    if (request.requester_player_id !== playerId) {
      continue;
    }

    if (request.status !== "rejected" && request.status !== "expired") {
      continue;
    }

    const anchor = request.responded_at ?? request.updated_at ?? request.created_at;
    const candidate = addSeconds(anchor, PRIVATE_CHAT_COOLDOWN_SECONDS);
    if (!hasExpired(candidate, nowIso) && (!cooldownEndsAt || Date.parse(candidate) > Date.parse(cooldownEndsAt))) {
      cooldownEndsAt = candidate;
    }
  }

  for (const session of sessions) {
    if ((session.player_a_id !== playerId && session.player_b_id !== playerId) || !session.ended_at) {
      continue;
    }

    const candidate = addSeconds(session.ended_at, PRIVATE_CHAT_COOLDOWN_SECONDS);
    if (!hasExpired(candidate, nowIso) && (!cooldownEndsAt || Date.parse(candidate) > Date.parse(cooldownEndsAt))) {
      cooldownEndsAt = candidate;
    }
  }

  return cooldownEndsAt;
}

function resolveQueuedInvestigationPlayerStates(
  playerStates: DbPlayerStageStateRow[],
): DbPlayerStageStateRow[] {
  return [...playerStates]
    .filter((playerState) => typeof playerState.queue_joined_at === "string" && playerState.queue_joined_at.length > 0)
    .sort((left, right) => {
      const leftTime = Date.parse(left.queue_joined_at ?? "");
      const rightTime = Date.parse(right.queue_joined_at ?? "");

      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return left.player_id.localeCompare(right.player_id);
    });
}

function resolveInvestigationQueuePosition(
  queuedPlayerStates: DbPlayerStageStateRow[],
  playerId: string,
): number | null {
  const index = queuedPlayerStates.findIndex((playerState) => playerState.player_id === playerId);
  return index >= 0 ? index + 1 : null;
}

function resolveQueueCooldownEndsAt(
  playerState: DbPlayerStageStateRow | null,
  nowIso: string,
): string | null {
  if (!playerState?.queue_cooldown_ends_at) {
    return null;
  }

  return hasExpired(playerState.queue_cooldown_ends_at, nowIso) ? null : playerState.queue_cooldown_ends_at;
}

function resolveViewMode(
  viewer: DbPlayerRow,
  room: DbRoomRow,
  currentAssignments: DbStageTeamAssignmentRow[],
  game: DbGameRow | null,
  currentStage: DbStageRow | null,
  viewerState: DbPlayerStageStateRow | null,
  activeLock: DbInvestigationLockRow | null,
): ViewMode {
  if (currentStage && currentStage.status === "briefing") {
    return "stage_briefing";
  }

  if (currentStage && currentStage.status === "in_progress") {
    if (viewerState?.status === "solved_locked") {
      return "solved_spectator";
    }

    if (activeLock?.locked_by_player_id === viewer.id) {
      return "investigation_active";
    }

    return "stage_playing";
  }

  if (currentStage && (currentStage.status === "ended" || currentStage.status === "revealed")) {
    return game?.status === "finished" ? "game_results" : "stage_results";
  }

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
  currentStage,
  currentAssignments,
  playerStates,
  activeLock,
  visibleHints,
  scoreEvents,
  privateChatRequests = [],
  privateChatSessions = [],
  caseSummary,
  viewerPlayerId,
}: {
  room: DbRoomRow;
  game: DbGameRow | null;
  players: DbPlayerRow[];
  teamSlots: DbTeamSlotRow[];
  currentStage: DbStageRow | null;
  currentAssignments: DbStageTeamAssignmentRow[];
  playerStates: DbPlayerStageStateRow[];
  activeLock: DbInvestigationLockRow | null;
  visibleHints: DbHintRevealRow[];
  scoreEvents: DbScoreEventRow[];
  privateChatRequests?: DbPrivateChatRequestRow[];
  privateChatSessions?: DbPrivateChatSessionRow[];
  caseSummary: CaseSummary | null;
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
  const activeStage =
    currentStage && currentStage.status !== "pending" ? currentStage : null;
  const scoresPublic = game?.status === "finished" || activeStage?.status === "revealed";
  const { snapshots: scoreSnapshots, byPlayerId: scoreSnapshotByPlayerId } = buildScoreLedger(
    players,
    scoreEvents,
    currentStage?.id ?? null,
  );
  const scoreViews: ScoreView[] = scoreSnapshots.map((score): ScoreView => {
    const visibility: VisibilityScope =
      score.playerId === viewer.id
        ? "self"
        : game?.status === "finished" || activeStage?.status === "revealed"
          ? "public"
          : "redacted";

    return {
      playerId: score.playerId,
      total:
        score.playerId === viewer.id || game?.status === "finished" || activeStage?.status === "revealed"
          ? score.total
          : REDACTED_OTHER_PLAYER,
      stageTotal:
        score.playerId === viewer.id || game?.status === "finished" || activeStage?.status === "revealed"
          ? score.stageTotal
          : REDACTED_OTHER_PLAYER,
      lastEventAt:
        score.playerId === viewer.id || game?.status === "finished" || activeStage?.status === "revealed"
          ? score.lastEventAt
          : REDACTED_OTHER_PLAYER,
      eventCount:
        score.playerId === viewer.id || game?.status === "finished" || activeStage?.status === "revealed"
          ? score.eventCount
          : REDACTED_OTHER_PLAYER,
      visibility,
      isMe: score.playerId === viewer.id,
    };
  });
  const resultsView: RoomViewSnapshot["results"] =
    game?.status === "finished"
      ? {
          finalRankingVisible: true,
          finalRanking: scoreViews,
          stageSummariesVisible: true,
        }
      : null;
  const assignmentByPlayerId = new Map(
    currentAssignments.map((assignment) => [assignment.player_id, assignment.team_slot_id]),
  );
  const playerStateByPlayerId = new Map(
    playerStates.map((playerState) => [playerState.player_id, playerState]),
  );
  const viewerState = playerStateByPlayerId.get(viewer.id) ?? null;
  const nowIso = nowUtcIso();
  const queuedPlayerStates = resolveQueuedInvestigationPlayerStates(playerStates);
  const viewerQueuePosition = resolveInvestigationQueuePosition(queuedPlayerStates, viewer.id);
  const viewerQueueCooldownEndsAt = resolveQueueCooldownEndsAt(viewerState, nowIso);
  const investigationView =
    activeStage
      ? {
          stageId: activeLock?.stage_id ?? activeStage.id,
          roomId: activeLock?.room_id ?? room.id,
          lockedByPlayerId: activeLock?.locked_by_player_id ?? null,
          lockedAt: activeLock?.locked_at ?? null,
          expiresAt: activeLock?.expires_at ?? null,
          remainingSeconds: remainingSeconds(activeLock?.expires_at ?? null, nowIso),
          queuePosition: viewerQueuePosition,
          waitingPlayerCount: queuedPlayerStates.length,
          queuedPlayerIds: queuedPlayerStates.map((playerState) => playerState.player_id),
          reentryCooldownEndsAt: viewerQueueCooldownEndsAt,
          questionCountRemaining:
            activeLock?.locked_by_player_id === viewer.id
              ? Math.max(0, 3 - activeLock.question_count)
              : activeLock?.locked_by_player_id
                ? REDACTED_OTHER_PLAYER
                : 3,
          answerAttemptCountRemaining:
            activeLock?.locked_by_player_id === viewer.id
              ? Math.max(0, 1 - activeLock.answer_attempt_count)
              : activeLock?.locked_by_player_id
                ? REDACTED_OTHER_PLAYER
                : 1,
          visibility: "public" as const,
        }
      : null;
  const stageView =
    activeStage
      ? {
          stageId: activeStage.id,
          gameId: activeStage.game_id,
          roomId: activeStage.room_id,
          stageNumber: activeStage.stage_number,
          status: activeStage.status,
          caseKey: REDACTED_STAGE_SECRET,
          publicTitle: caseSummary?.title ?? `스테이지 ${activeStage.stage_number}`,
          publicDescription:
            caseSummary?.publicDescription ?? `${activeStage.case_key} 사건 브리핑이 준비되었습니다.`,
          imageUrl: caseSummary?.imageUrl ?? null,
          remainingSeconds:
            activeStage.status === "briefing"
              ? remainingSeconds(resolveStageBriefingEndsAt(activeStage), nowUtcIso())
              : remainingSeconds(activeStage.ends_at, nowUtcIso()),
          solvedPlayerIds: activeStage.solved_player_ids,
          endReason: activeStage.end_reason,
          myTeamSlotId:
            viewerState?.team_slot_id ?? assignmentByPlayerId.get(viewer.id) ?? null,
          visibleHints: visibleHints.map(toHintReveal),
          investigation: investigationView,
          lastQuestionJudgement: REDACTED_AI_INTERNAL,
          lastAnswerResult: REDACTED_AI_INTERNAL,
          redacted: {
            truth: REDACTED_STAGE_SECRET,
            requiredKeywords: REDACTED_STAGE_SECRET,
            bonusKeywords: REDACTED_STAGE_SECRET,
            acceptedAnswerSummary: REDACTED_STAGE_SECRET,
          },
        }
      : null;
  const activePrivateChatSession =
    privateChatSessions.find(
      (session) =>
        isPrivateChatSessionActive(session) &&
        (session.player_a_id === viewer.id || session.player_b_id === viewer.id),
    ) ?? null;
  const visibleIncomingRequests = privateChatRequests
    .filter(
      (request) =>
        request.target_player_id === viewer.id &&
        isPendingPrivateChatRequest(request, nowIso),
    )
    .map(toPrivateChatRequest);
  const primaryPrivateChatRequest = resolveLatestPrivateChatRequest(
    privateChatRequests,
    viewer.id,
    nowIso,
  );
  const privateChatParticipants = activePrivateChatSession
    ? [activePrivateChatSession.player_a_id, activePrivateChatSession.player_b_id]
    : primaryPrivateChatRequest
      ? [primaryPrivateChatRequest.requester_player_id, primaryPrivateChatRequest.target_player_id]
      : [];
  const privateChatCooldownEndsAt = resolvePrivateChatCooldownEndsAt(
    privateChatRequests,
    privateChatSessions,
    viewer.id,
    nowIso,
  );
  const privateChatView =
    activePrivateChatSession ||
    primaryPrivateChatRequest ||
    visibleIncomingRequests.length > 0 ||
    privateChatCooldownEndsAt
      ? {
          request: primaryPrivateChatRequest ? toPrivateChatRequest(primaryPrivateChatRequest) : null,
          incomingRequests: visibleIncomingRequests,
          session: activePrivateChatSession ? toPrivateChatSession(activePrivateChatSession) : null,
          participants: privateChatParticipants,
          cooldownEndsAt: privateChatCooldownEndsAt,
        }
      : null;

  const snapshot: RoomViewSnapshot = {
    viewMode: resolveViewMode(
      viewer,
      room,
      currentAssignments,
      game,
      currentStage,
      viewerState,
      activeLock,
    ),
    me: {
      playerId: viewer.id,
      nickname: viewer.nickname,
      roomId: viewer.room_id,
      role: viewer.role,
      teamSlotId: viewerState?.team_slot_id ?? assignmentByPlayerId.get(viewer.id) ?? null,
      isReady: viewer.is_ready,
      connectionStatus: viewer.connection_status,
      stageStatus: viewerState?.status ?? null,
      totalScore: scoreSnapshotByPlayerId.get(viewer.id)?.total ?? viewer.total_score,
      stageScore: scoreSnapshotByPlayerId.get(viewer.id)?.stageTotal ?? 0,
      solvedCount: viewer.solved_count,
      bonusKeywordCount: viewer.bonus_keyword_count,
      solvedLocked: viewerState?.status === "solved_locked",
    },
    visibility: {
      players: "public",
      stageSecrets: "redacted",
      scores: scoresPublic ? "public" : "self",
      investigation: activeStage ? "public" : "redacted",
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
    stage: stageView,
    players: players.map((player) => {
      const playerState = playerStateByPlayerId.get(player.id) ?? null;
      const playerScore = scoreSnapshotByPlayerId.get(player.id);
      const playerScoresVisible = player.id === viewer.id || scoresPublic;

      return {
        playerId: player.id,
        nickname: player.nickname,
        roomId: player.room_id,
        role: player.role,
        teamSlotId: playerState?.team_slot_id ?? assignmentByPlayerId.get(player.id) ?? null,
        isReady: player.is_ready,
        connectionStatus: player.connection_status,
        stageStatus: playerState?.status ?? null,
        solvedLocked: playerState?.status === "solved_locked",
        totalScore: playerScoresVisible ? (playerScore?.total ?? player.total_score) : REDACTED_OTHER_PLAYER,
        stageScore: playerScoresVisible ? (playerScore?.stageTotal ?? 0) : REDACTED_OTHER_PLAYER,
        solvedCount: playerScoresVisible ? player.solved_count : REDACTED_OTHER_PLAYER,
        bonusKeywordCount: playerScoresVisible ? player.bonus_keyword_count : REDACTED_OTHER_PLAYER,
        visibility: player.id === viewer.id ? "self" : "redacted",
        isMe: player.id === viewer.id,
      };
    }),
    teamSlots: teamSlotContracts,
    currentAssignments: currentAssignments.map(toStageTeamAssignment),
    playerStates: playerStates.map((playerState) => ({
      playerId: playerState.player_id,
      stageId: playerState.stage_id,
      teamSlotId: playerState.team_slot_id,
      status: playerState.status,
      questionCount:
        playerState.player_id === viewer.id ? playerState.question_count : REDACTED_OTHER_PLAYER,
      answerAttemptCount:
        playerState.player_id === viewer.id
          ? playerState.answer_attempt_count
          : REDACTED_OTHER_PLAYER,
      hasReceivedInactivityPenalty: playerState.has_received_inactivity_penalty,
      solvedAt:
        playerState.player_id === viewer.id ? playerState.solved_at : REDACTED_OTHER_PLAYER,
      lockedAt:
        playerState.player_id === viewer.id ? playerState.locked_at : REDACTED_OTHER_PLAYER,
      visibility: playerState.player_id === viewer.id ? "self" : "redacted",
      isMe: playerState.player_id === viewer.id,
    })),
    activeLock: investigationView,
    visibleHints: visibleHints.map(toHintReveal),
    scores: scoreViews.map((score) => ({
      ...score,
      total: score.playerId === viewer.id || scoresPublic ? score.total : REDACTED_OTHER_PLAYER,
      stageTotal:
        score.playerId === viewer.id || scoresPublic ? score.stageTotal : REDACTED_OTHER_PLAYER,
      lastEventAt:
        score.playerId === viewer.id || scoresPublic
          ? score.lastEventAt
          : REDACTED_OTHER_PLAYER,
      eventCount:
        score.playerId === viewer.id || scoresPublic
          ? score.eventCount
          : REDACTED_OTHER_PLAYER,
      visibility: score.playerId === viewer.id ? "self" : scoresPublic ? "public" : "redacted",
    })),
    privateChat: privateChatView,
    results: resultsView,
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
  playerStates: DbPlayerStageStateRow[];
  activeLock: DbInvestigationLockRow | null;
  visibleHints: DbHintRevealRow[];
  scoreEvents: DbScoreEventRow[];
  privateChatRequests: DbPrivateChatRequestRow[];
  privateChatSessions: DbPrivateChatSessionRow[];
}> {
  const supabase = getSupabaseAdminClient();
  const [{ data: room, error: roomError }, { data: game, error: gameError }, { data: players, error: playersError }, { data: teamSlots, error: teamSlotsError }, { data: scoreEvents, error: scoreEventsError }] =
    await Promise.all([
      supabase.from("rooms").select("*").eq("id", roomId).single<DbRoomRow>(),
      supabase.from("games").select("*").eq("room_id", roomId).maybeSingle<DbGameRow>(),
      supabase.from("players").select("*").eq("room_id", roomId).order("joined_at", { ascending: true }).returns<DbPlayerRow[]>(),
      supabase.from("team_slots").select("*").eq("room_id", roomId).order("created_at", { ascending: true }).returns<DbTeamSlotRow[]>(),
      supabase.from("score_events").select("*").eq("room_id", roomId).order("created_at", { ascending: true }).returns<DbScoreEventRow[]>(),
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
  if (scoreEventsError) {
    throw new Error(`Failed to load score events: ${scoreEventsError.message}`);
  }

  let currentStage: DbStageRow | null = null;
  let currentAssignments: DbStageTeamAssignmentRow[] = [];
  let playerStates: DbPlayerStageStateRow[] = [];
  let activeLock: DbInvestigationLockRow | null = null;
  let visibleHints: DbHintRevealRow[] = [];
  let privateChatRequests: DbPrivateChatRequestRow[] = [];
  let privateChatSessions: DbPrivateChatSessionRow[] = [];

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

      const [
        { data: loadedPlayerStates, error: playerStatesError },
        { data: lock, error: lockError },
        { data: hintRows, error: hintsError },
        { data: requestRows, error: requestsError },
        { data: sessionRows, error: sessionsError },
      ] = await Promise.all([
        supabase
          .from("player_stage_states")
          .select("*")
          .eq("stage_id", currentStage.id)
          .returns<DbPlayerStageStateRow[]>(),
        supabase
          .from("investigation_locks")
          .select("*")
          .eq("stage_id", currentStage.id)
          .maybeSingle<DbInvestigationLockRow>(),
        supabase
          .from("hint_reveals")
          .select("*")
          .eq("stage_id", currentStage.id)
          .order("hint_index", { ascending: true })
          .returns<DbHintRevealRow[]>(),
        supabase
          .from("private_chat_requests")
          .select("*")
          .eq("stage_id", currentStage.id)
          .order("created_at", { ascending: false })
          .returns<DbPrivateChatRequestRow[]>(),
        supabase
          .from("private_chat_sessions")
          .select("*")
          .eq("stage_id", currentStage.id)
          .order("started_at", { ascending: false })
          .returns<DbPrivateChatSessionRow[]>(),
      ]);

      if (playerStatesError) {
        throw new Error(`Failed to load player stage states: ${playerStatesError.message}`);
      }

      if (lockError) {
        throw new Error(`Failed to load investigation lock: ${lockError.message}`);
      }

      if (hintsError) {
        throw new Error(`Failed to load revealed hints: ${hintsError.message}`);
      }

      if (requestsError) {
        throw new Error(`Failed to load private chat requests: ${requestsError.message}`);
      }

      if (sessionsError) {
        throw new Error(`Failed to load private chat sessions: ${sessionsError.message}`);
      }

      playerStates = loadedPlayerStates ?? [];
      activeLock = lock ?? null;
      visibleHints = hintRows ?? [];
      privateChatRequests = requestRows ?? [];
      privateChatSessions = sessionRows ?? [];
    }
  }

  return {
    room,
    game: game ?? null,
    players: players ?? [],
    teamSlots: teamSlots ?? [],
    currentStage,
    currentAssignments,
    playerStates,
    activeLock,
    visibleHints,
    scoreEvents: scoreEvents ?? [],
    privateChatRequests,
    privateChatSessions,
  };
}

async function loadSyncedLobbyState(
  roomId: string,
  options: { cleanupPresence?: boolean } = {},
) {
  const room = await findRoomByRef(roomId);
  if (!room) {
    throw new Error("Room not found during synchronized lobby load.");
  }

  if (options.cleanupPresence !== false) {
    await cleanupStalePlayersInRoom(room);
    const refreshedRoom = await findRoomByRef(roomId);
    if (!refreshedRoom) {
      throw new Error("Room was removed during presence cleanup.");
    }
  }

  await syncDerivedStageState(roomId);
  return loadLobbyState(roomId);
}

type SyncedLobbyState = Awaited<ReturnType<typeof loadLobbyState>>;

function buildSnapshotFromState(
  state: SyncedLobbyState,
  caseSummary: CaseSummary | null,
  viewerPlayerId?: string,
): RoomSnapshot {
  return buildRoomSnapshot({
    room: state.room,
    game: state.game,
    players: state.players,
    teamSlots: state.teamSlots,
    currentStage: state.currentStage,
    currentAssignments: state.currentAssignments,
    playerStates: state.playerStates,
    activeLock: state.activeLock,
    visibleHints: state.visibleHints,
    scoreEvents: state.scoreEvents,
    privateChatRequests: state.privateChatRequests,
    privateChatSessions: state.privateChatSessions,
    caseSummary,
    viewerPlayerId,
  });
}

function resolvePlayerStageState(
  state: Awaited<ReturnType<typeof loadLobbyState>>,
  playerId: string,
): DbPlayerStageStateRow | null {
  return state.playerStates.find((playerState) => playerState.player_id === playerId) ?? null;
}

function resolvePlayerTeamSlotId(
  state: Awaited<ReturnType<typeof loadLobbyState>>,
  playerId: string,
): string | null {
  return (
    resolvePlayerStageState(state, playerId)?.team_slot_id ??
    state.currentAssignments.find((assignment) => assignment.player_id === playerId)?.team_slot_id ??
    null
  );
}

function resolveInvestigationQueueCooldownEndsAt(
  playerState: DbPlayerStageStateRow | null,
  nowIso: string,
): string | null {
  if (!playerState?.queue_cooldown_ends_at) {
    return null;
  }

  return hasExpired(playerState.queue_cooldown_ends_at, nowIso)
    ? null
    : playerState.queue_cooldown_ends_at;
}

async function applyInvestigationQueueCooldown(
  stageId: string,
  playerId: string,
  nowIso: string,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("player_stage_states")
    .update({
      queue_joined_at: null,
      queue_cooldown_ends_at: addSeconds(nowIso, INVESTIGATION_QUEUE_REENTRY_COOLDOWN_SECONDS),
      updated_at: nowIso,
    })
    .eq("stage_id", stageId)
    .eq("player_id", playerId);

  if (error) {
    throw new Error(`Failed to apply investigation queue cooldown: ${error.message}`);
  }
}

async function admitNextInvestigationQueuePlayer(
  roomId: string,
  stageId: string,
  nowIso: string,
): Promise<DbInvestigationLockRow | null> {
  const state = await loadLobbyState(roomId);
  const stage = state.currentStage;

  if (!stage || stage.id !== stageId) {
    return state.activeLock;
  }

  if (stage.status !== "in_progress") {
    return state.activeLock;
  }

  const activeLock = state.activeLock;
  if (
    activeLock?.locked_by_player_id &&
    (!activeLock.expires_at || !hasExpired(activeLock.expires_at, nowIso))
  ) {
    return activeLock;
  }

  const queuedPlayerState = resolveQueuedInvestigationPlayerStates(state.playerStates).find(
    (playerState) => playerState.status === "active",
  );

  if (!queuedPlayerState) {
    return activeLock;
  }

  const supabase = getSupabaseAdminClient();

  const { data: nextLockRow, error: nextLockError } = await supabase
    .from("investigation_locks")
    .upsert({
      stage_id: stageId,
      room_id: roomId,
      locked_by_player_id: queuedPlayerState.player_id,
      locked_at: nowIso,
      expires_at: addSeconds(nowIso, INVESTIGATION_LOCK_SECONDS),
      question_count: 0,
      answer_attempt_count: 0,
      last_released_by_player_id: activeLock?.last_released_by_player_id ?? null,
      last_released_at: activeLock?.last_released_at ?? null,
      version: (activeLock?.version ?? 0) + 1,
      created_at: activeLock?.created_at ?? nowIso,
      updated_at: nowIso,
    })
    .select("*")
    .single<DbInvestigationLockRow>();

  if (nextLockError || !nextLockRow) {
    throw new Error(`Failed to admit next queued investigation player: ${nextLockError?.message ?? "unknown error"}`);
  }

  const { error: queueClearError } = await supabase
    .from("player_stage_states")
    .update({
      queue_joined_at: null,
      queue_cooldown_ends_at: null,
      locked_at: nowIso,
      updated_at: nowIso,
    })
    .eq("stage_id", stageId)
    .eq("player_id", queuedPlayerState.player_id);

  if (queueClearError) {
    throw new Error(`Failed to clear investigation queue entry after admission: ${queueClearError.message}`);
  }

  return nextLockRow;
}

function assertPrivateChatStageActive(
  stage: DbStageRow | null,
): asserts stage is DbStageRow {
  if (!stage) {
    throw new PrivateChatError("STAGE_NOT_FOUND", "현재 스테이지를 찾을 수 없습니다.");
  }

  if (stage.status !== "in_progress") {
    throw new PrivateChatError("STAGE_NOT_ACTIVE", "1:1 채팅은 플레이 중에만 사용할 수 있습니다.");
  }
}

function assertPrivateChatPlayerActive(
  state: Awaited<ReturnType<typeof loadLobbyState>>,
  playerId: string,
): DbPlayerStageStateRow {
  const playerState = resolvePlayerStageState(state, playerId);

  if (!playerState) {
    throw new PrivateChatError("PLAYER_NOT_FOUND", "플레이어 상태를 찾을 수 없습니다.");
  }

  if (playerState.status !== "active") {
    throw new PrivateChatError("PLAYER_NOT_ACTIVE", "현재 상태에서는 1:1 채팅을 사용할 수 없습니다.");
  }

  return playerState;
}

function findActivePrivateChatSessionForPlayer(
  sessions: DbPrivateChatSessionRow[],
  playerId: string,
): DbPrivateChatSessionRow | null {
  return (
    sessions.find(
      (session) =>
        isPrivateChatSessionActive(session) &&
        (session.player_a_id === playerId || session.player_b_id === playerId),
    ) ?? null
  );
}

function resolvePrivateChatSessionPartner(
  session: DbPrivateChatSessionRow,
  playerId: string,
): string | null {
  if (session.player_a_id === playerId) {
    return session.player_b_id;
  }

  if (session.player_b_id === playerId) {
    return session.player_a_id;
  }

  return null;
}

async function applyPendingPrivateChatResolution(
  requests: DbPrivateChatRequestRow[],
  resolveStatus: "busy" | "expired" | "cancelled",
  nowIso: string,
  responseReason: string,
): Promise<void> {
  if (requests.length === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();

  for (const request of requests) {
    const { error } = await supabase
      .from("private_chat_requests")
      .update({
        status: resolveStatus,
        responded_at: nowIso,
        response_reason: responseReason,
        updated_at: nowIso,
      })
      .eq("id", request.id)
      .eq("status", "pending");

    if (error) {
      throw new Error(`Failed to resolve private chat request ${request.id}: ${error.message}`);
    }
  }
}

async function loadCaseSummary(caseKey: string): Promise<CaseSummary | null> {
  const caseFile = await loadCaseFile(caseKey);
  if (!caseFile) {
    return null;
  }

  return {
    title: caseFile.title,
    publicDescription: caseFile.publicDescription,
    imageUrl: caseFile.imageUrl,
  };
}

async function loadCaseFile(caseKey: string): Promise<CaseFile | null> {
  try {
    const raw = await readFile(join(process.cwd(), "data/cases", `${caseKey}.json`), "utf8");
    const parsed = JSON.parse(raw) as {
      id?: unknown;
      key?: unknown;
      stageNumber?: unknown;
      title?: unknown;
      publicDescription?: unknown;
      imageUrl?: unknown;
      question?: unknown;
      truth?: unknown;
      requiredKeywords?: unknown;
      bonusKeywords?: unknown;
      acceptedAnswerSummary?: unknown;
      hints?: unknown;
    };

    const resolvedKey =
      typeof parsed.key === "string"
        ? parsed.key
        : typeof parsed.id === "string"
          ? parsed.id
          : null;

    if (
      typeof resolvedKey !== "string" ||
      typeof parsed.stageNumber !== "number" ||
      typeof parsed.title !== "string" ||
      typeof parsed.publicDescription !== "string" ||
      typeof parsed.question !== "string" ||
      typeof parsed.truth !== "string" ||
      !Array.isArray(parsed.requiredKeywords) ||
      !Array.isArray(parsed.bonusKeywords) ||
      typeof parsed.acceptedAnswerSummary !== "string" ||
      !Array.isArray(parsed.hints)
    ) {
      return null;
    }

    return {
      key: resolvedKey,
      stageNumber: parsed.stageNumber,
      title: parsed.title,
      publicDescription: parsed.publicDescription,
      imageUrl:
        typeof parsed.imageUrl === "string" && parsed.imageUrl.trim().length > 0
          ? parsed.imageUrl.trim()
          : `/case-images/${resolvedKey}.svg`,
      question: parsed.question,
      truth: parsed.truth,
      requiredKeywords: parsed.requiredKeywords.filter((value): value is string => typeof value === "string"),
      bonusKeywords: parsed.bonusKeywords.filter((value): value is string => typeof value === "string"),
      acceptedAnswerSummary: parsed.acceptedAnswerSummary,
      hints: parsed.hints
        .filter((hint): hint is Record<string, unknown> => typeof hint === "object" && hint !== null)
        .map((hint) => ({
          hintId: typeof hint.hintId === "string" ? hint.hintId : "",
          order: typeof hint.order === "number" ? hint.order : 0,
          triggerType: typeof hint.triggerType === "string" ? hint.triggerType : "",
          strength: typeof hint.strength === "string" ? hint.strength : "",
          publicText: typeof hint.publicText === "string" ? hint.publicText : "",
          internalNote: typeof hint.internalNote === "string" ? hint.internalNote : "",
        }))
        .filter((hint) => hint.hintId.length > 0 && hint.publicText.length > 0),
    };
  } catch {
    return null;
  }
}

async function getCaseFileOrThrow(caseKey: string): Promise<CaseFile> {
  const caseFile = await loadCaseFile(caseKey);
  if (!caseFile) {
    throw new Error(`Case file not found: ${caseKey}`);
  }

  return caseFile;
}

async function createUniqueRoom(input: {
  title: string;
  mode: RoomMode;
  passwordHash: string | null;
  stageCount: number;
  maxPlayers: number;
}): Promise<DbRoomRow> {
  const supabase = getSupabaseAdminClient();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode();
    let { data, error } = await supabase
      .from("rooms")
      .insert({
        code,
        title: input.title,
        mode: input.mode,
        password_hash: input.passwordHash,
        stage_count: input.stageCount,
        status: "waiting",
        max_players: input.maxPlayers,
      })
      .select("*")
      .single<DbRoomRow>();

    if (error && isLegacyMissingRoomColumnsError(error)) {
      ({ data, error } = await supabase
        .from("rooms")
        .insert({
          code,
          status: "waiting",
          max_players: input.maxPlayers,
        })
        .select("*")
        .single<DbRoomRow>());
    }

    if (!error && data) {
      return data;
    }

    if (error?.code !== "23505") {
      throw new Error(`Failed to create room: ${error?.message ?? "unknown error"}`);
    }
  }

  throw new Error("Failed to create unique room code after multiple attempts.");
}

export async function createRoomInStore(
  hostNickname: string,
  accountId?: string | null,
  settings?: {
    roomMode?: RoomMode;
    roomTitle?: string;
    roomPassword?: string | null;
    stageCount?: number;
    maxPlayers?: number;
  },
  currentMembership?: ActiveRoomMembership | null,
): Promise<CreateRoomResponse> {
  const supabase = getSupabaseAdminClient();
  const roomMode = normalizeRoomMode(settings?.roomMode ?? "public");
  const roomTitle = normalizeRoomTitle(settings?.roomTitle, `${hostNickname}의 방`);
  const stageCount = normalizeStageCount(roomMode, settings?.stageCount ?? null);
  const maxPlayers = normalizeMaxPlayers(roomMode, settings?.maxPlayers ?? null);
  const passwordHash = await normalizeRoomPasswordHash(roomMode, settings?.roomPassword ?? null);

  await cleanupViewerRoomMemberships({
    accountId,
    currentMembership,
  });

  const room = await createUniqueRoom({
    title: roomTitle,
    mode: roomMode,
    passwordHash,
    stageCount,
    maxPlayers,
  });
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
      account_id: accountId ?? null,
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
    (resolveRoomMode(room) === "practice" ? ["Solo"] : DEFAULT_TEAM_LABELS).map((label) => ({
      room_id: room.id,
      label,
    })),
  );

  if (teamSlotsError) {
    throw new Error(`Failed to create team slots: ${teamSlotsError.message}`);
  }

  const hostPlayers: DbPlayerRow[] = [player];
  const nextRoomStatus = resolveLobbyStatus(room, hostPlayers);

  if (room.status !== nextRoomStatus) {
    const { error: roomStatusError } = await supabase
      .from("rooms")
      .update({
        status: nextRoomStatus,
        updated_at: nowUtcIso(),
      })
      .eq("id", room.id);

    if (roomStatusError) {
      throw new Error(`Failed to initialize room status: ${roomStatusError.message}`);
    }
  }

  const state = await loadLobbyState(room.id);
  const caseSummary = state.currentStage ? await loadCaseSummary(state.currentStage.case_key) : null;

  return {
    roomId: room.id,
    playerId: player.id,
    settings: toRoomSettings(room),
    snapshot: buildSnapshotFromState(state, caseSummary, player.id),
  };
}

function assertJoinableRoom(
  room: DbRoomRow,
  players: DbPlayerRow[],
  nickname: string,
  roomPassword?: string | null,
) {
  const roomMode = resolveRoomMode(room);
  const passwordHash = resolveRoomPasswordHash(room);

  if (room.status !== "waiting" && room.status !== "ready") {
    throw new RoomJoinError(
      "ROOM_NOT_JOINABLE",
      "현재 상태에서는 이 방에 새로 입장할 수 없습니다.",
    );
  }

  if (roomMode === "practice") {
    throw new RoomJoinError("ROOM_NOT_JOINABLE", "연습방은 외부 입장이 불가능합니다.");
  }

  if (roomMode === "secret") {
    if (typeof roomPassword !== "string" || roomPassword.trim().length === 0) {
      throw new RoomJoinError("ROOM_PASSWORD_REQUIRED", "비밀방에는 비밀번호가 필요합니다.");
    }

    if (!passwordHash) {
      throw new RoomJoinError("ROOM_NOT_JOINABLE", "비밀방 설정이 손상되었습니다.");
    }
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
  accountId?: string | null,
  roomPassword?: string | null,
  currentMembership?: ActiveRoomMembership | null,
): Promise<JoinRoomResponse> {
  const room = await findRoomByRef(roomCode);

  if (!room) {
    throw new RoomJoinError("ROOM_NOT_FOUND", "입장 코드를 찾을 수 없습니다.");
  }

  const stateBeforeJoin = await loadLobbyState(room.id);

  if (currentMembership?.roomId === room.id) {
    const existingCurrentMembershipPlayer = stateBeforeJoin.players.find(
      (player) => player.id === currentMembership.playerId,
    );

    if (existingCurrentMembershipPlayer) {
      return {
        roomId: room.id,
        playerId: existingCurrentMembershipPlayer.id,
        settings: toRoomSettings(stateBeforeJoin.room),
        snapshot: buildSnapshotFromState(stateBeforeJoin, null, existingCurrentMembershipPlayer.id),
      };
    }
  }

  if (accountId) {
    const existingPlayer = stateBeforeJoin.players.find(
      (player) => player.account_id === accountId,
    );

    if (existingPlayer) {
      return {
        roomId: room.id,
        playerId: existingPlayer.id,
        settings: toRoomSettings(stateBeforeJoin.room),
        snapshot: buildSnapshotFromState(stateBeforeJoin, null, existingPlayer.id),
      };
    }
  }

  await cleanupViewerRoomMemberships({
    accountId,
    currentMembership,
    targetRoomId: room.id,
  });

  assertJoinableRoom(stateBeforeJoin.room, stateBeforeJoin.players, nickname, roomPassword);

  if (resolveRoomMode(stateBeforeJoin.room) === "secret") {
    const passwordOk = await verifyPassword(
      roomPassword ?? "",
      resolveRoomPasswordHash(stateBeforeJoin.room) ?? "",
    );
    if (!passwordOk) {
      throw new RoomJoinError("ROOM_PASSWORD_INVALID", "비밀번호가 올바르지 않습니다.");
    }
  }

  const supabase = getSupabaseAdminClient();
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      account_id: accountId ?? null,
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
  const nextRoomStatus = resolveLobbyStatus(joinedState.room, joinedState.players);

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
  const caseSummary = state.currentStage ? await loadCaseSummary(state.currentStage.case_key) : null;

  return {
    roomId: room.id,
    playerId: player.id,
    settings: toRoomSettings(state.room),
    snapshot: buildSnapshotFromState(state, caseSummary, player.id),
  };
}

function assertRoomSettingsChangeAllowed(input: {
  room: DbRoomRow;
  players: DbPlayerRow[];
  requestedByPlayerId: string;
}) {
  if (input.room.status === "in_game" || input.room.status === "closed") {
    throw new RoomSettingsError("ROOM_NOT_EDITABLE", "현재 상태에서는 방 설정을 변경할 수 없습니다.");
  }

  const requester = input.players.find((player) => player.id === input.requestedByPlayerId);
  if (!requester || (requester.role !== "host" && requester.role !== "admin")) {
    throw new RoomSettingsError("REQUESTER_NOT_ALLOWED", "방장만 방 설정을 변경할 수 있습니다.");
  }
}

export async function updateRoomSettingsInStore(input: {
  roomId: string;
  requestedByPlayerId: string;
  title?: string;
  mode?: RoomMode;
  roomPassword?: string | null;
  stageCount?: number;
  maxPlayers?: number;
}): Promise<RoomSettingsResponse> {
  const room = await findRoomByRef(input.roomId);
  if (!room) {
    throw new RoomSettingsError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const state = await loadLobbyState(room.id);
  assertRoomSettingsChangeAllowed({
    room: state.room,
    players: state.players,
    requestedByPlayerId: input.requestedByPlayerId,
  });

  const nextMode = normalizeRoomMode(input.mode ?? resolveRoomMode(state.room));
  const nextTitle = normalizeRoomTitle(input.title, resolveRoomTitle(state.room));
  const nextStageCount = normalizeStageCount(nextMode, input.stageCount ?? resolveRoomStageCount(state.room));
  const nextMaxPlayers = normalizeMaxPlayers(nextMode, input.maxPlayers ?? state.room.max_players);

  if (nextMode === "secret" && typeof input.roomPassword !== "string" && !resolveRoomPasswordHash(state.room)) {
    throw new RoomSettingsError("PASSWORD_REQUIRED", "비밀방으로 변경하려면 비밀번호가 필요합니다.");
  }

  if (nextMode === "practice" && state.players.length > 1) {
    throw new RoomSettingsError("ROOM_TOO_FULL", "연습방은 한 명만 참여할 수 있습니다.");
  }

  if (nextMaxPlayers < state.players.length) {
    throw new RoomSettingsError("ROOM_TOO_SMALL", "현재 인원보다 작은 정원으로는 변경할 수 없습니다.");
  }

  const passwordHash =
    nextMode === "secret"
      ? typeof input.roomPassword === "string"
        ? await normalizeRoomPasswordHash(nextMode, input.roomPassword)
        : resolveRoomPasswordHash(state.room)
      : null;

  if (nextMode === "secret" && !passwordHash) {
    throw new RoomSettingsError("PASSWORD_REQUIRED", "비밀방으로 변경하려면 비밀번호가 필요합니다.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: updatedRoom, error: roomError } = await supabase
    .from("rooms")
    .update({
      title: nextTitle,
      mode: nextMode,
      password_hash: passwordHash,
      stage_count: nextStageCount,
      max_players: nextMaxPlayers,
      updated_at: nowUtcIso(),
    })
    .eq("id", room.id)
    .select("*")
    .single<DbRoomRow>();

  if (roomError || !updatedRoom) {
    throw new Error(`Failed to update room settings: ${roomError?.message ?? "unknown error"}`);
  }

  const refreshed = await loadLobbyState(room.id);
  const caseSummary = refreshed.currentStage ? await loadCaseSummary(refreshed.currentStage.case_key) : null;

  return {
    roomId: updatedRoom.id,
    settings: toRoomSettings(updatedRoom),
    snapshot: buildSnapshotFromState(refreshed, caseSummary, input.requestedByPlayerId),
  };
}

export async function getRoomSnapshotFromStore(
  roomRef: string,
  viewerPlayerId?: string,
  options: {
    lightweight?: boolean;
    touchPresence?: boolean;
    cleanupPresence?: boolean;
  } = {},
): Promise<RoomSnapshot | null> {
  const room = await findRoomByRef(roomRef);
  if (!room) {
    return null;
  }

  if (viewerPlayerId && options.touchPresence !== false) {
    await touchPlayerPresence(room.id, viewerPlayerId);
  }

  if (options.cleanupPresence === true) {
    await cleanupStalePlayersInRoom(room, viewerPlayerId);
  }

  const state =
    options.lightweight === true
      ? await loadLobbyState(room.id)
      : await loadSyncedLobbyState(room.id, {
          cleanupPresence: options.cleanupPresence ?? !viewerPlayerId,
        });
  const caseSummary = state.currentStage ? await loadCaseSummary(state.currentStage.case_key) : null;
  return buildSnapshotFromState(state, caseSummary, viewerPlayerId);
}

function isHostLikeRole(role: PlayerRole): boolean {
  return role === "host" || role === "admin";
}

function isPracticeRoom(room: Pick<DbRoomRow, "mode" | "max_players">): boolean {
  return resolveRoomMode(room) === "practice" || room.max_players === 1;
}

function getReadyRequiredPlayers(players: DbPlayerRow[]): DbPlayerRow[] {
  return players.filter((player) => !isHostLikeRole(player.role));
}

function isLobbyReadyForStart(room: Pick<DbRoomRow, "mode" | "max_players">, players: DbPlayerRow[]): boolean {
  if (isPracticeRoom(room)) {
    return players.length >= 1;
  }

  if (players.length !== room.max_players) {
    return false;
  }

  const readyRequiredPlayers = getReadyRequiredPlayers(players);
  return readyRequiredPlayers.length > 0 && readyRequiredPlayers.every((player) => player.is_ready);
}

function resolveLobbyStatus(
  room: Pick<DbRoomRow, "mode" | "max_players">,
  players: DbPlayerRow[],
): Room["status"] {
  return isLobbyReadyForStart(room, players) ? "ready" : "waiting";
}

function isPresenceManagedRoomStatus(status: Room["status"]): boolean {
  return status === "waiting" || status === "ready" || status === "assigning" || status === "in_game" || status === "closed";
}

function isPlayerPresenceStale(player: Pick<DbPlayerRow, "last_seen_at">, nowIso: string): boolean {
  if (!player.last_seen_at) {
    return true;
  }

  return hasExpired(addSeconds(player.last_seen_at, ROOM_PRESENCE_TTL_SECONDS), nowIso);
}

async function cleanupViewerRoomMemberships(input: {
  accountId?: string | null;
  currentMembership?: ActiveRoomMembership | null;
  targetRoomId?: string | null;
}): Promise<void> {
  const memberships = new Map<string, { roomId: string; playerId: string }>();

  if (
    input.currentMembership?.roomId &&
    input.currentMembership.playerId &&
    input.currentMembership.roomId !== input.targetRoomId
  ) {
    memberships.set(input.currentMembership.playerId, {
      roomId: input.currentMembership.roomId,
      playerId: input.currentMembership.playerId,
    });
  }

  if (input.accountId) {
    const supabase = getSupabaseAdminClient();
    const { data: accountPlayers, error } = await supabase
      .from("players")
      .select("id, room_id")
      .eq("account_id", input.accountId)
      .returns<Array<{ id: string; room_id: string }>>();

    if (error) {
      throw new Error(`Failed to inspect existing room membership: ${error.message}`);
    }

    for (const player of accountPlayers ?? []) {
      if (player.room_id === input.targetRoomId) {
        continue;
      }

      memberships.set(player.id, {
        roomId: player.room_id,
        playerId: player.id,
      });
    }
  }

  for (const membership of memberships.values()) {
    const existingRoom = await findRoomByRef(membership.roomId);
    if (!existingRoom) {
      continue;
    }

    await removePlayerFromRoomRecord(existingRoom, membership.playerId);
  }
}

async function removePlayerFromRoomRecord(
  room: DbRoomRow,
  playerId: string,
): Promise<{
  roomDeleted: boolean;
  remainingPlayerCount: number;
  nextHostPlayerId: string | null;
}> {
  const supabase = getSupabaseAdminClient();
  const { error: deletePlayerError } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId)
    .eq("room_id", room.id);

  if (deletePlayerError) {
    throw new Error(`Failed to remove player from room: ${deletePlayerError.message}`);
  }

  const { data: remainingPlayers, error: playersError } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", room.id)
    .order("joined_at", { ascending: true })
    .returns<DbPlayerRow[]>();

  if (playersError) {
    throw new Error(`Failed to load remaining players after removal: ${playersError.message}`);
  }

  const nextPlayers = remainingPlayers ?? [];

  if (nextPlayers.length === 0) {
    const { error: deleteRoomError } = await supabase.from("rooms").delete().eq("id", room.id);

    if (deleteRoomError) {
      throw new Error(`Failed to delete empty room: ${deleteRoomError.message}`);
    }

    return {
      roomDeleted: true,
      remainingPlayerCount: 0,
      nextHostPlayerId: null,
    };
  }

  let nextHostPlayerId = nextPlayers.find((player) => player.role === "host")?.id ?? null;

  if (!nextHostPlayerId) {
    const nextHost = nextPlayers[0] ?? null;
    if (nextHost) {
      const { error: hostUpdateError } = await supabase
        .from("players")
        .update({
          role: "host",
          last_seen_at: nowUtcIso(),
        })
        .eq("id", nextHost.id)
        .eq("room_id", room.id);

      if (hostUpdateError) {
        throw new Error(`Failed to promote next host: ${hostUpdateError.message}`);
      }

      nextHostPlayerId = nextHost.id;
    }
  }

  const nextRoomStatus =
    room.status === "in_game" || room.status === "closed"
      ? room.status
      : resolveLobbyStatus(room, nextPlayers);

  if (room.status !== nextRoomStatus) {
    const { error: roomStatusError } = await supabase
      .from("rooms")
      .update({
        status: nextRoomStatus,
        updated_at: nowUtcIso(),
      })
      .eq("id", room.id);

    if (roomStatusError) {
      throw new Error(`Failed to recalculate room status: ${roomStatusError.message}`);
    }
  }

  await reconcileRoomAfterPlayerRemoval(room.id);

  return {
    roomDeleted: false,
    remainingPlayerCount: nextPlayers.length,
    nextHostPlayerId,
  };
}

function resolveStageSolvedPlayerIdsForCurrentPlayers(
  stage: DbStageRow,
  playerStates: DbPlayerStageStateRow[],
  playerIds: string[],
): string[] {
  const playerIdSet = new Set(playerIds);
  const solvedFromStates = playerStates
    .filter((playerState) => playerState.status === "solved_locked")
    .map((playerState) => playerState.player_id);

  return Array.from(
    new Set([...stage.solved_player_ids, ...solvedFromStates].filter((playerId) => playerIdSet.has(playerId))),
  );
}

function resolveRequiredSolvedPlayerCount(playerCount: number): number {
  if (playerCount <= 2) {
    return 1;
  }

  return 2;
}

async function reconcileRoomAfterPlayerRemoval(roomId: string): Promise<void> {
  const state = await loadLobbyState(roomId);
  const stage = state.currentStage;
  const game = state.game;

  if (!stage || !game) {
    return;
  }

  if (stage.status !== "briefing" && stage.status !== "in_progress") {
    return;
  }

  const remainingPlayerIds = state.players.map((player) => player.id);
  if (remainingPlayerIds.length === 0) {
    return;
  }

  const nowIso = nowUtcIso();
  const supabase = getSupabaseAdminClient();
  const solvedPlayerIds = resolveStageSolvedPlayerIdsForCurrentPlayers(
    stage,
    state.playerStates,
    remainingPlayerIds,
  );
  const activeParticipantCount = state.playerStates.length;

  if (activeParticipantCount === 0) {
    return;
  }

  const shouldAutoWinLastPlayer = activeParticipantCount === 1;
  const requiredSolvedCount = resolveRequiredSolvedPlayerCount(activeParticipantCount);
  const shouldEndStage = shouldAutoWinLastPlayer || solvedPlayerIds.length >= requiredSolvedCount;

  if (!shouldEndStage) {
    return;
  }

  let updatedSolvedPlayerIds = solvedPlayerIds;
  const lastRemainingPlayerId = shouldAutoWinLastPlayer ? state.playerStates[0]?.player_id ?? null : null;

  if (lastRemainingPlayerId && !updatedSolvedPlayerIds.includes(lastRemainingPlayerId)) {
    updatedSolvedPlayerIds = [...updatedSolvedPlayerIds, lastRemainingPlayerId];

    const lonePlayerState = state.playerStates.find((playerState) => playerState.player_id === lastRemainingPlayerId);
    const lonePlayer = state.players.find((player) => player.id === lastRemainingPlayerId);

    const { error: lonePlayerStateError } = await supabase
      .from("player_stage_states")
      .update({
        status: "solved_locked",
        solved_at: nowIso,
        locked_at: lonePlayerState?.locked_at ?? null,
        updated_at: nowIso,
      })
      .eq("stage_id", stage.id)
      .eq("player_id", lastRemainingPlayerId);

    if (lonePlayerStateError) {
      throw new Error(`Failed to mark last remaining player as winner: ${lonePlayerStateError.message}`);
    }

    const { error: lonePlayerAggregateError } = await supabase
      .from("players")
      .update({
        solved_count:
          lonePlayerState?.status === "solved_locked"
            ? lonePlayer?.solved_count ?? 0
            : (lonePlayer?.solved_count ?? 0) + 1,
        updated_at: nowIso,
      })
      .eq("id", lastRemainingPlayerId)
      .eq("room_id", roomId);

    if (lonePlayerAggregateError) {
      throw new Error(`Failed to update last remaining player aggregates: ${lonePlayerAggregateError.message}`);
    }
  }

  const shouldFinishGame =
    shouldAutoWinLastPlayer || stage.stage_number >= resolveRoomStageCount(state.room);

  const { error: stageUpdateError } = await supabase
    .from("stages")
    .update({
      solved_player_ids: updatedSolvedPlayerIds,
      status: shouldFinishGame ? "revealed" : "ended",
      ended_at: nowIso,
      end_reason: "two_players_solved",
      updated_at: nowIso,
    })
    .eq("id", stage.id);

  if (stageUpdateError) {
    throw new Error(`Failed to reconcile stage after player leave: ${stageUpdateError.message}`);
  }

  if (state.activeLock) {
    const { error: lockResetError } = await supabase
      .from("investigation_locks")
      .update({
        locked_by_player_id: null,
        locked_at: null,
        expires_at: null,
        question_count: 0,
        answer_attempt_count: 0,
        last_released_by_player_id: state.activeLock.locked_by_player_id,
        last_released_at: nowIso,
        version: state.activeLock.version + 1,
        updated_at: nowIso,
      })
      .eq("stage_id", stage.id);

    if (lockResetError) {
      throw new Error(`Failed to clear investigation lock after player leave: ${lockResetError.message}`);
    }
  }

  const { error: queueResetError } = await supabase
    .from("player_stage_states")
    .update({
      queue_joined_at: null,
      queue_cooldown_ends_at: null,
      updated_at: nowIso,
    })
    .eq("stage_id", stage.id);

  if (queueResetError) {
    throw new Error(`Failed to clear investigation queue after player leave: ${queueResetError.message}`);
  }

  const stageEndPenaltyEvents = buildStageEndPenaltyEvents({
    roomId,
    gameId: game.id,
    stageId: stage.id,
    createdAt: nowIso,
    playerIds: remainingPlayerIds,
    solvedPlayerIds: updatedSolvedPlayerIds,
    endReason: "two_players_solved",
  }).filter(
    (event) =>
      !state.scoreEvents.some(
        (scoreEvent) =>
          scoreEvent.stage_id === event.stageId &&
          scoreEvent.player_id === event.playerId &&
          scoreEvent.type === event.type,
      ),
  );

  await persistScoreEventsAndSyncTotals(roomId, stageEndPenaltyEvents);

  const { error: gameUpdateError } = await supabase
    .from("games")
    .update({
      status: shouldFinishGame ? "finished" : "stage_result",
      ended_at: shouldFinishGame ? nowIso : game.ended_at,
      updated_at: nowIso,
    })
    .eq("id", game.id);

  if (gameUpdateError) {
    throw new Error(`Failed to reconcile game after player leave: ${gameUpdateError.message}`);
  }

  if (shouldFinishGame) {
    const { error: roomCloseError } = await supabase
      .from("rooms")
      .update({
        status: "closed",
        updated_at: nowIso,
      })
      .eq("id", roomId);

    if (roomCloseError) {
      throw new Error(`Failed to close room after player leave: ${roomCloseError.message}`);
    }

    const refreshed = await loadLobbyState(roomId);
    await saveFinishedGameResults({
      roomId,
      gameId: game.id,
      players: refreshed.players,
      scoreEvents: refreshed.scoreEvents,
      currentStageId: refreshed.currentStage?.id ?? null,
    });
  }
}

async function cleanupStalePlayersInRoom(room: DbRoomRow, excludePlayerId?: string): Promise<boolean> {
  if (!isPresenceManagedRoomStatus(room.status)) {
    return false;
  }

  const supabase = getSupabaseAdminClient();
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", room.id)
    .order("joined_at", { ascending: true })
    .returns<DbPlayerRow[]>();

  if (playersError) {
    throw new Error(`Failed to load room players for presence cleanup: ${playersError.message}`);
  }

  const nowIso = nowUtcIso();
  const stalePlayers = (players ?? []).filter(
    (player) => player.id !== excludePlayerId && isPlayerPresenceStale(player, nowIso),
  );

  let changed = false;

  for (const stalePlayer of stalePlayers) {
    await removePlayerFromRoomRecord(room, stalePlayer.id);
    changed = true;
  }

  return changed;
}

async function cleanupStalePlayersInRoomDirectory(
  rooms: DbRoomRow[],
  players: DbPlayerRow[],
): Promise<boolean> {
  const nowIso = nowUtcIso();
  let changed = false;

  for (const room of rooms) {
    if (!isPresenceManagedRoomStatus(room.status)) {
      continue;
    }

    const stalePlayers = players.filter(
      (player) => player.room_id === room.id && isPlayerPresenceStale(player, nowIso),
    );

    for (const stalePlayer of stalePlayers) {
      await removePlayerFromRoomRecord(room, stalePlayer.id);
      changed = true;
    }
  }

  return changed;
}

async function touchPlayerPresence(roomId: string, playerId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("players")
    .update({
      connection_status: "connected",
      last_seen_at: nowUtcIso(),
    })
    .eq("id", playerId)
    .eq("room_id", roomId);

  if (error) {
    throw new Error(`Failed to touch player presence: ${error.message}`);
  }
}

export async function touchRoomPresenceInStore(
  roomRef: string,
  playerId: string,
): Promise<boolean> {
  const room = await findRoomByRef(roomRef);
  if (!room) {
    return false;
  }

  await touchPlayerPresence(room.id, playerId);
  return true;
}

export async function leaveRoomInStore(
  roomId: string,
  playerId: string,
): Promise<{
  roomId: string;
  playerId: string;
  roomDeleted: boolean;
  remainingPlayerCount: number;
  nextHostPlayerId: string | null;
}> {
  const room = await findRoomByRef(roomId);
  if (!room) {
    throw new LeaveRoomError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const stateBeforeLeave = await loadSyncedLobbyState(room.id);
  const leavingPlayer = stateBeforeLeave.players.find((player) => player.id === playerId);

  if (!leavingPlayer) {
    throw new LeaveRoomError("PLAYER_NOT_FOUND", "이미 방에서 나갔거나 플레이어 정보를 찾을 수 없습니다.");
  }

  let leaveResult;
  try {
    leaveResult = await removePlayerFromRoomRecord(room, playerId);
  } catch (error) {
    throw new LeaveRoomError(
      "ROOM_LEAVE_FAILED",
      error instanceof Error ? error.message : "방에서 나가지 못했습니다.",
    );
  }

  return {
    roomId: room.id,
    playerId,
    roomDeleted: leaveResult.roomDeleted,
    remainingPlayerCount: leaveResult.remainingPlayerCount,
    nextHostPlayerId: leaveResult.nextHostPlayerId,
  };
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
  const nextRoomStatus = resolveLobbyStatus(stateBeforeRoomUpdate.room, stateBeforeRoomUpdate.players);
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
  const caseSummary = state.currentStage ? await loadCaseSummary(state.currentStage.case_key) : null;
  return {
    room: toRoom(room),
    players: state.players.map(toPlayer),
    snapshot: buildSnapshotFromState(state, caseSummary, playerId),
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

  if (!isPracticeRoom(input.room) && input.players.length !== input.room.max_players) {
    throw new AssignTeamsError("ROOM_NOT_FULL", "정원이 가득 찼을 때만 팀 배정을 할 수 있습니다.");
  }

  if (input.room.status !== "assigning" && !isLobbyReadyForStart(input.room, input.players)) {
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
  const caseSummary = state.currentStage ? await loadCaseSummary(state.currentStage.case_key) : null;

  return {
    teamSlots: state.teamSlots.map(toTeamSlot),
    assignments: state.currentAssignments.map(toStageTeamAssignment),
    snapshot: buildSnapshotFromState(state, caseSummary, requestedByPlayerId),
  };
}

function assertStartableStageState(input: {
  room: DbRoomRow;
  game: DbGameRow | null;
  players: DbPlayerRow[];
  currentStage: DbStageRow | null;
  currentAssignments: DbStageTeamAssignmentRow[];
  requestedByPlayerId: string;
}) {
  if (!input.game) {
    throw new StartStageError("GAME_NOT_FOUND", "방에 연결된 게임 정보를 찾을 수 없습니다.");
  }

  const requester = input.players.find((player) => player.id === input.requestedByPlayerId);

  if (!requester || (requester.role !== "host" && requester.role !== "admin")) {
    throw new StartStageError("REQUESTER_NOT_ALLOWED", "방장만 스테이지를 시작할 수 있습니다.");
  }

  if (!input.currentStage) {
    throw new StartStageError("STAGE_NOT_FOUND", "시작할 스테이지 정보를 찾을 수 없습니다.");
  }

  if (input.currentStage.status !== "pending") {
    throw new StartStageError("STAGE_NOT_STARTABLE", "이미 시작된 스테이지는 다시 브리핑할 수 없습니다.");
  }

  if (input.room.status !== "assigning") {
    throw new StartStageError("STAGE_NOT_STARTABLE", "팀 배정 완료 후에만 스테이지를 시작할 수 있습니다.");
  }

  if (input.currentAssignments.length !== input.players.length || input.currentAssignments.length === 0) {
    throw new StartStageError("ASSIGNMENTS_NOT_READY", "모든 플레이어의 팀 배정이 완료되어야 합니다.");
  }
}

export async function startStageInStore(
  roomId: string,
  requestedByPlayerId: string,
  caseKey: string,
  durationSeconds: number,
): Promise<StartStageResponse> {
  const room = await findRoomByRef(roomId);

  if (!room) {
    throw new StartStageError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const stateBeforeStart = await loadLobbyState(room.id);
  assertStartableStageState({
    room: stateBeforeStart.room,
    game: stateBeforeStart.game,
    players: stateBeforeStart.players,
    currentStage: stateBeforeStart.currentStage,
    currentAssignments: stateBeforeStart.currentAssignments,
    requestedByPlayerId,
  });

  const stage = stateBeforeStart.currentStage!;
  const game = stateBeforeStart.game!;
  const nowIso = nowUtcIso();
  const resolvedDurationSeconds = durationSeconds > 0 ? durationSeconds : DEFAULT_STAGE_DURATION_SECONDS;
  const endsAt = addSeconds(nowIso, STAGE_BRIEFING_SECONDS + resolvedDurationSeconds);
  const supabase = getSupabaseAdminClient();

  const { data: updatedStage, error: stageUpdateError } = await supabase
    .from("stages")
    .update({
      case_key: caseKey,
      status: "briefing",
      briefing_started_at: nowIso,
      started_at: null,
      ends_at: endsAt,
      ended_at: null,
      solved_player_ids: [],
      end_reason: null,
      updated_at: nowIso,
    })
    .eq("id", stage.id)
    .select("*")
    .single<DbStageRow>();

  if (stageUpdateError || !updatedStage) {
    throw new Error(`Failed to update stage briefing state: ${stageUpdateError?.message ?? "unknown error"}`);
  }

  const { data: updatedGame, error: gameUpdateError } = await supabase
    .from("games")
    .update({
      status: "briefing",
      started_at: game.started_at ?? nowIso,
      updated_at: nowIso,
    })
    .eq("id", game.id)
    .select("*")
    .single<DbGameRow>();

  if (gameUpdateError || !updatedGame) {
    throw new Error(`Failed to update game briefing state: ${gameUpdateError?.message ?? "unknown error"}`);
  }

  const { error: roomUpdateError } = await supabase
    .from("rooms")
    .update({
      status: "in_game",
      updated_at: nowIso,
    })
    .eq("id", room.id);

  if (roomUpdateError) {
    throw new Error(`Failed to update room in-game state: ${roomUpdateError.message}`);
  }

  const { error: deletePlayerStatesError } = await supabase
    .from("player_stage_states")
    .delete()
    .eq("stage_id", stage.id);

  if (deletePlayerStatesError) {
    throw new Error(`Failed to reset stage player states: ${deletePlayerStatesError.message}`);
  }

  const { error: insertPlayerStatesError } = await supabase
    .from("player_stage_states")
    .insert(
      stateBeforeStart.currentAssignments.map((assignment) => ({
        stage_id: assignment.stage_id,
        player_id: assignment.player_id,
        team_slot_id: assignment.team_slot_id,
        status: "active",
        question_count: 0,
        answer_attempt_count: 0,
        has_received_inactivity_penalty: false,
        solved_at: null,
        locked_at: null,
        updated_at: nowIso,
      })),
    );

  if (insertPlayerStatesError) {
    throw new Error(`Failed to create stage player states: ${insertPlayerStatesError.message}`);
  }

  const { error: upsertLockError } = await supabase
    .from("investigation_locks")
    .upsert({
      stage_id: stage.id,
      room_id: room.id,
      locked_by_player_id: null,
      locked_at: null,
      expires_at: null,
      question_count: 0,
      answer_attempt_count: 0,
      last_released_by_player_id: null,
      last_released_at: null,
      version: 0,
      created_at: nowIso,
      updated_at: nowIso,
    });

  if (upsertLockError) {
    throw new Error(`Failed to initialize investigation lock: ${upsertLockError.message}`);
  }

  const state = await loadLobbyState(room.id);
  const caseSummary = await loadCaseSummary(caseKey);

  return {
    game: toGame(updatedGame),
    stage: toStage(updatedStage),
    playerStates: state.playerStates.map(toPlayerStageState),
    snapshot: buildSnapshotFromState(state, caseSummary, requestedByPlayerId),
  };
}

function assertAdvanceStageState(input: {
  room: DbRoomRow;
  game: DbGameRow | null;
  players: DbPlayerRow[];
  currentStage: DbStageRow | null;
  requestedByPlayerId: string;
}) {
  if (!input.game) {
    throw new AdvanceStageError("GAME_NOT_FOUND", "방에 연결된 게임 정보를 찾을 수 없습니다.");
  }

  const requester = input.players.find((player) => player.id === input.requestedByPlayerId);
  if (!requester || (requester.role !== "host" && requester.role !== "admin")) {
    throw new AdvanceStageError("REQUESTER_NOT_ALLOWED", "방장만 다음 스테이지를 준비할 수 있습니다.");
  }

  if (input.game.current_stage_number >= resolveRoomStageCount(input.room)) {
    throw new AdvanceStageError("FINAL_STAGE_NOT_ADVANCABLE", "마지막 스테이지 이후에는 다음 스테이지를 준비할 수 없습니다.");
  }

  if (input.game.status !== "stage_result") {
    throw new AdvanceStageError("STAGE_NOT_READY", "현재 스테이지 결과가 공개된 뒤에만 다음 스테이지를 준비할 수 있습니다.");
  }

  if (!input.currentStage || input.currentStage.stage_number !== input.game.current_stage_number) {
    throw new AdvanceStageError("STAGE_NOT_READY", "현재 스테이지 상태를 찾을 수 없습니다.");
  }

  if (input.currentStage.status !== "ended" && input.currentStage.status !== "revealed") {
    throw new AdvanceStageError("STAGE_NOT_READY", "스테이지 결과가 먼저 종료되어야 합니다.");
  }
}

export async function advanceStageInStore(
  roomId: string,
  requestedByPlayerId: string,
): Promise<{ room: Room; game: Game; snapshot: RoomSnapshot }> {
  const room = await findRoomByRef(roomId);
  if (!room) {
    throw new AdvanceStageError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const state = await loadLobbyState(room.id);
  assertAdvanceStageState({
    room: state.room,
    game: state.game,
    players: state.players,
    currentStage: state.currentStage,
    requestedByPlayerId,
  });

  const supabase = getSupabaseAdminClient();
  const nowIso = nowUtcIso();
  const nextStageNumber = (state.game!.current_stage_number ?? 1) + 1;

  const { data: updatedGame, error: gameUpdateError } = await supabase
    .from("games")
    .update({
      status: "lobby",
      current_stage_number: nextStageNumber,
      ended_at: null,
      updated_at: nowIso,
    })
    .eq("id", state.game!.id)
    .select("*")
    .single<DbGameRow>();

  if (gameUpdateError || !updatedGame) {
    throw new Error(`Failed to advance game stage: ${gameUpdateError?.message ?? "unknown error"}`);
  }

  const { data: updatedRoom, error: roomUpdateError } = await supabase
    .from("rooms")
    .update({
      status: "ready",
      updated_at: nowIso,
    })
    .eq("id", room.id)
    .select("*")
    .single<DbRoomRow>();

  if (roomUpdateError || !updatedRoom) {
    throw new Error(`Failed to prepare room for next stage: ${roomUpdateError?.message ?? "unknown error"}`);
  }

  const refreshed = await loadLobbyState(room.id);
  const caseSummary = refreshed.currentStage ? await loadCaseSummary(refreshed.currentStage.case_key) : null;

  return {
    room: toRoom(updatedRoom),
    game: toGame(updatedGame),
    snapshot: buildSnapshotFromState(refreshed, caseSummary, requestedByPlayerId),
  };
}

function assertLockableStageState(input: {
  currentStage: DbStageRow | null;
  playerStates: DbPlayerStageStateRow[];
  roomId: string;
  stageId: string;
  playerId: string;
}) {
  if (!input.currentStage || input.currentStage.id !== input.stageId) {
    throw new InvestigationLockError("STAGE_NOT_FOUND", "조사실을 열 수 있는 스테이지를 찾지 못했습니다.");
  }

  const playerState = input.playerStates.find((state) => state.player_id === input.playerId);

  if (!playerState) {
    throw new InvestigationLockError("PLAYER_NOT_FOUND", "현재 스테이지에 참여한 플레이어가 아닙니다.");
  }

  if (playerState.status !== "active") {
    throw new InvestigationLockError("PLAYER_NOT_ACTIVE", "현재 상태에서는 조사실을 사용할 수 없습니다.");
  }
}

export async function joinInvestigationQueueInStore(
  roomId: string,
  stageId: string,
  playerId: string,
): Promise<JoinInvestigationQueueResponse> {
  const room = await findRoomByRef(roomId);

  if (!room) {
    throw new InvestigationLockError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const stateBeforeJoin = await loadSyncedLobbyState(room.id);
  assertLockableStageState({
    currentStage: stateBeforeJoin.currentStage,
    playerStates: stateBeforeJoin.playerStates,
    roomId: room.id,
    stageId,
    playerId,
  });

  if (stateBeforeJoin.currentStage?.status !== "in_progress") {
    throw new InvestigationLockError("STAGE_NOT_ACTIVE", "질문방은 브리핑 1분이 끝난 뒤부터 사용할 수 있습니다.");
  }

  const playerState = stateBeforeJoin.playerStates.find((state) => state.player_id === playerId) ?? null;
  const nowIso = nowUtcIso();
  const cooldownEndsAt = resolveInvestigationQueueCooldownEndsAt(playerState, nowIso);

  if (cooldownEndsAt) {
    throw new InvestigationLockError("QUEUE_COOLDOWN_ACTIVE", `질문방은 ${cooldownEndsAt} 이후에 다시 대기열에 들어갈 수 있습니다.`);
  }

  if (stateBeforeJoin.activeLock?.locked_by_player_id === playerId) {
    throw new InvestigationLockError("LOCK_ALREADY_OWNED", "이미 내가 조사실을 점유하고 있습니다.");
  }

  if (playerState?.queue_joined_at) {
    throw new InvestigationLockError("QUEUE_ALREADY_JOINED", "이미 질문방 대기열에 들어가 있습니다.");
  }

  const supabase = getSupabaseAdminClient();
  const { error: queueJoinError } = await supabase
    .from("player_stage_states")
    .update({
      queue_joined_at: nowIso,
      queue_cooldown_ends_at: null,
      updated_at: nowIso,
    })
    .eq("stage_id", stageId)
    .eq("player_id", playerId);

  if (queueJoinError) {
    throw new Error(`Failed to join investigation queue: ${queueJoinError.message}`);
  }

  const admittedLock = await admitNextInvestigationQueuePlayer(room.id, stageId, nowIso);
  const refreshed = await loadSyncedLobbyState(room.id);
  const caseSummary = refreshed.currentStage ? await loadCaseSummary(refreshed.currentStage.case_key) : null;

  return {
    lock: admittedLock ? toInvestigationLock(admittedLock) : null,
    autoAdmitted: refreshed.activeLock?.locked_by_player_id === playerId,
    snapshot: buildSnapshotFromState(refreshed, caseSummary, playerId),
  };
}

export async function leaveInvestigationQueueInStore(
  roomId: string,
  stageId: string,
  playerId: string,
): Promise<LeaveInvestigationQueueResponse> {
  const room = await findRoomByRef(roomId);

  if (!room) {
    throw new InvestigationLockError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const stateBeforeLeave = await loadSyncedLobbyState(room.id);
  assertLockableStageState({
    currentStage: stateBeforeLeave.currentStage,
    playerStates: stateBeforeLeave.playerStates,
    roomId: room.id,
    stageId,
    playerId,
  });

  const playerState = stateBeforeLeave.playerStates.find((state) => state.player_id === playerId) ?? null;
  if (!playerState?.queue_joined_at) {
    throw new InvestigationLockError("QUEUE_NOT_JOINED", "질문방 대기열에 들어가 있지 않습니다.");
  }

  const nowIso = nowUtcIso();
  const supabase = getSupabaseAdminClient();
  const { error: queueLeaveError } = await supabase
    .from("player_stage_states")
    .update({
      queue_joined_at: null,
      updated_at: nowIso,
    })
    .eq("stage_id", stageId)
    .eq("player_id", playerId);

  if (queueLeaveError) {
    throw new Error(`Failed to leave investigation queue: ${queueLeaveError.message}`);
  }

  const refreshed = await loadSyncedLobbyState(room.id);
  const caseSummary = refreshed.currentStage ? await loadCaseSummary(refreshed.currentStage.case_key) : null;

  return {
    snapshot: buildSnapshotFromState(refreshed, caseSummary, playerId),
  };
}

export async function acquireInvestigationLockInStore(
  roomId: string,
  stageId: string,
  playerId: string,
): Promise<AcquireInvestigationLockResponse> {
  const room = await findRoomByRef(roomId);

  if (!room) {
    throw new InvestigationLockError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const stateBeforeAcquire = await loadSyncedLobbyState(room.id);
  assertLockableStageState({
    currentStage: stateBeforeAcquire.currentStage,
    playerStates: stateBeforeAcquire.playerStates,
    roomId: room.id,
    stageId,
    playerId,
  });

  const nowIso = nowUtcIso();
  const supabase = getSupabaseAdminClient();
  const currentLock = stateBeforeAcquire.activeLock;
  const lockExpired = currentLock ? hasExpired(currentLock.expires_at, nowIso) : false;
  const queuedPlayerStates = resolveQueuedInvestigationPlayerStates(stateBeforeAcquire.playerStates);
  const nextQueuedPlayerId = queuedPlayerStates[0]?.player_id ?? null;

  if (
    currentLock &&
    currentLock.locked_by_player_id &&
    currentLock.locked_by_player_id !== playerId &&
    !lockExpired
  ) {
    throw new InvestigationLockError("LOCK_CONFLICT", "다른 플레이어가 조사실을 사용 중입니다.");
  }

  if (nextQueuedPlayerId && nextQueuedPlayerId !== playerId) {
    throw new InvestigationLockError("LOCK_CONFLICT", "질문방 대기열의 앞순위 플레이어가 먼저 입장해야 합니다.");
  }

  if (stateBeforeAcquire.currentStage?.status !== "in_progress") {
    throw new InvestigationLockError("STAGE_NOT_ACTIVE", "질문방은 브리핑 1분이 끝난 뒤부터 열 수 있습니다.");
  }

  const nextVersion = (currentLock?.version ?? 0) + 1;
  const expiresAt = addSeconds(nowIso, INVESTIGATION_LOCK_SECONDS);
  const { data: lockRow, error: lockError } = await supabase
    .from("investigation_locks")
    .upsert({
      stage_id: stageId,
      room_id: room.id,
      locked_by_player_id: playerId,
      locked_at: nowIso,
      expires_at: expiresAt,
      question_count: 0,
      answer_attempt_count: 0,
      last_released_by_player_id: currentLock?.last_released_by_player_id ?? null,
      last_released_at: currentLock?.last_released_at ?? null,
      version: nextVersion,
      created_at: currentLock?.created_at ?? nowIso,
      updated_at: nowIso,
    })
    .select("*")
    .single<DbInvestigationLockRow>();

  if (lockError || !lockRow) {
    throw new Error(`Failed to acquire investigation lock: ${lockError?.message ?? "unknown error"}`);
  }

  const { error: playerStateError } = await supabase
    .from("player_stage_states")
    .update({
      queue_joined_at: null,
      queue_cooldown_ends_at: null,
      locked_at: nowIso,
      updated_at: nowIso,
    })
    .eq("stage_id", stageId)
    .eq("player_id", playerId);

  if (playerStateError) {
    throw new Error(`Failed to mark player lock acquisition: ${playerStateError.message}`);
  }

  const state = await loadSyncedLobbyState(room.id);
  const caseSummary = state.currentStage ? await loadCaseSummary(state.currentStage.case_key) : null;

  return {
    lock: toInvestigationLock(lockRow),
    snapshot: buildSnapshotFromState(state, caseSummary, playerId),
  };
}

export async function releaseInvestigationLockInStore(
  roomId: string,
  stageId: string,
  playerId: string,
): Promise<ReleaseInvestigationLockResponse> {
  const room = await findRoomByRef(roomId);

  if (!room) {
    throw new InvestigationLockError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const stateBeforeRelease = await loadSyncedLobbyState(room.id);
  const currentLock = stateBeforeRelease.activeLock;

  if (!stateBeforeRelease.currentStage || stateBeforeRelease.currentStage.id !== stageId) {
    throw new InvestigationLockError("STAGE_NOT_FOUND", "조사실 스테이지를 찾지 못했습니다.");
  }

  if (!currentLock || currentLock.locked_by_player_id !== playerId) {
    throw new InvestigationLockError("LOCK_NOT_OWNED", "내가 점유한 조사실만 반납할 수 있습니다.");
  }

  const nowIso = nowUtcIso();
  const supabase = getSupabaseAdminClient();
  const { data: lockRow, error: releaseError } = await supabase
    .from("investigation_locks")
    .update({
      locked_by_player_id: null,
      locked_at: null,
      expires_at: null,
      question_count: 0,
      answer_attempt_count: 0,
      last_released_by_player_id: playerId,
      last_released_at: nowIso,
      version: currentLock.version + 1,
      updated_at: nowIso,
    })
    .eq("stage_id", stageId)
    .select("*")
    .single<DbInvestigationLockRow>();

  if (releaseError || !lockRow) {
    throw new Error(`Failed to release investigation lock: ${releaseError?.message ?? "unknown error"}`);
  }

  await applyInvestigationQueueCooldown(stageId, playerId, nowIso);
  await admitNextInvestigationQueuePlayer(room.id, stageId, nowIso);

  const state = await loadSyncedLobbyState(room.id);
  const caseSummary = state.currentStage ? await loadCaseSummary(state.currentStage.case_key) : null;

  return {
    lock: toInvestigationLock(lockRow),
    snapshot: buildSnapshotFromState(state, caseSummary, playerId),
  };
}

export async function submitQuestionInStore(
  roomId: string,
  stageId: string,
  playerId: string,
  teamSlotId: string,
  content: string,
): Promise<SubmitQuestionResponse> {
  const room = await findRoomByRef(roomId);
  if (!room) {
    throw new InvestigationLockError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const state = await loadSyncedLobbyState(room.id);
  assertQuestionSubmissionState({
    currentStage: state.currentStage,
    playerStates: state.playerStates,
    activeLock: state.activeLock,
    stageId,
    playerId,
  });

  const currentStage = state.currentStage!;
  const activeLock = state.activeLock!;
  const currentPlayerState = state.playerStates.find((playerState) => playerState.player_id === playerId) ?? null;
  const currentPlayerRow = state.players.find((player) => player.id === playerId) ?? null;
  const resolvedTeamSlotId = currentPlayerState?.team_slot_id ?? teamSlotId;

  if (currentPlayerState?.team_slot_id && currentPlayerState.team_slot_id !== teamSlotId) {
    throw new InvestigationLockError("TEAM_SLOT_MISMATCH", "현재 플레이어의 팀 슬롯과 제출 정보가 일치하지 않습니다.");
  }

  const caseFile = await getCaseFileOrThrow(currentStage.case_key);
  const nowIso = nowUtcIso();
  const judged = await resolveQuestionJudgement({
    caseFile,
    content,
    visibleHintTexts: buildVisibleHintTexts(caseFile, state.visibleHints),
  });
  const nextQuestionCount = activeLock.question_count + 1;
  const supabase = getSupabaseAdminClient();
  const previousJudgementIds = await loadJudgementHistory(stageId);

  const { data: questionRow, error: questionError } = await supabase
    .from("questions")
    .insert({
      stage_id: stageId,
      player_id: playerId,
      team_slot_id: resolvedTeamSlotId,
      content,
      judgement: judged.judgement,
      reason_code: judged.reasonCode,
      judged_at: nowIso,
    })
    .select("*")
    .single<DbQuestionRow>();

  if (questionError || !questionRow) {
    throw new Error(`Failed to store question: ${questionError?.message ?? "unknown error"}`);
  }

  const { data: updatedLock, error: lockUpdateError } = await supabase
    .from("investigation_locks")
    .update({
      question_count: nextQuestionCount,
      version: activeLock.version + 1,
      updated_at: nowIso,
    })
    .eq("stage_id", stageId)
    .select("*")
    .single<DbInvestigationLockRow>();

  if (lockUpdateError || !updatedLock) {
    throw new Error(`Failed to update investigation lock question count: ${lockUpdateError?.message ?? "unknown error"}`);
  }

  const { error: playerStateError } = await supabase
    .from("player_stage_states")
    .update({
      question_count: nextQuestionCount,
      locked_at: activeLock.locked_at,
      updated_at: nowIso,
    })
    .eq("stage_id", stageId)
    .eq("player_id", playerId);

  if (playerStateError) {
    throw new Error(`Failed to update player question count: ${playerStateError.message}`);
  }

  const questionResponse = createQuestionJudgementResponse({
    judgement: judged.judgement,
    reasonCode: judged.reasonCode,
    publicReply: judged.publicReply,
    manualReviewRequired: judged.manualReviewRequired,
    safetyFlags: judged.safetyFlags,
    logSummary: judged.logSummary,
  });

  await persistJudgementRecord({
    roomId: room.id,
    gameId: state.game?.id ?? null,
    stageId,
    playerId,
    kind: "question",
    caseId: currentStage.case_key,
    stageNumber: currentStage.stage_number,
    request: createQuestionJudgementRequest({
      roomId: room.id,
      gameId: state.game?.id ?? null,
      stageId,
      playerId,
      teamSlotId: resolvedTeamSlotId,
      caseId: currentStage.case_key,
      stageNumber: currentStage.stage_number,
      questionText: content,
      visibleHints: state.visibleHints.map((hint) => hint.id),
      previousQuestionIds: previousJudgementIds.previousQuestionIds,
      previousAnswerIds: previousJudgementIds.previousAnswerIds,
      viewMode: activeLock.locked_by_player_id === playerId ? "investigation_active" : "stage_playing",
      canSeeStageSecrets: false,
      canSeeOwnLockState: true,
      isSolvedLocked: currentPlayerState?.status === "solved_locked",
      createdAt: nowIso,
    }),
    response: questionResponse,
    publicOutcome: questionResponse.publicReply,
    publicSummary: questionResponse.logSummary,
    internalPayload: {
      reasonCode: judged.reasonCode,
      judgement: judged.judgement,
      safetyFlags: questionResponse.safetyFlags,
      logSummary: judged.logSummary,
    },
    manualReviewRequired: questionResponse.manualReviewRequired,
    needsOperatorOverride: false,
    createdAt: nowIso,
  });

  await persistScoreEventsAndSyncTotals(room.id, [
    buildQuestionCostScoreEvent({
      roomId: room.id,
      gameId: currentStage.game_id,
      stageId,
      playerId,
      createdAt: nowIso,
      questionId: questionRow.id,
      judgement: judged.judgement,
      reasonCode: judged.reasonCode,
    }),
  ]);

  const refreshed = await loadSyncedLobbyState(room.id);
  const caseSummary = await loadCaseSummary(currentStage.case_key);
  const scoreSnapshots = buildScoreLedger(
    refreshed.players,
    refreshed.scoreEvents,
    refreshed.currentStage?.id ?? null,
  ).snapshots;
  const snapshot = cloneSnapshotWithQuestionJudgement(
    buildSnapshotFromState(refreshed, caseSummary, playerId),
    judged.publicReply,
  );

  return {
    question: createQuestionRecord({
      stageId,
      playerId,
      teamSlotId: resolvedTeamSlotId,
      content,
      judgement: judged.judgement,
      reasonCode: judged.reasonCode,
      createdAt: nowIso,
    }),
    activeLock: toInvestigationLock(updatedLock),
    scores: scoreSnapshots,
    snapshot,
  };
}


function assertQuestionSubmissionState(input: {
  currentStage: DbStageRow | null;
  playerStates: DbPlayerStageStateRow[];
  activeLock: DbInvestigationLockRow | null;
  stageId: string;
  playerId: string;
}) {
  if (!input.currentStage || input.currentStage.id !== input.stageId) {
    throw new InvestigationLockError("STAGE_NOT_FOUND", "질문을 제출할 수 있는 스테이지를 찾지 못했습니다.");
  }

  if (input.currentStage.status !== "in_progress") {
    throw new InvestigationLockError("STAGE_NOT_ACTIVE", "현재 스테이지에서는 질문을 제출할 수 없습니다.");
  }

  const playerState = input.playerStates.find((state) => state.player_id === input.playerId);
  if (!playerState) {
    throw new InvestigationLockError("PLAYER_NOT_FOUND", "현재 스테이지에 참여한 플레이어가 아닙니다.");
  }

  if (playerState.status !== "active") {
    throw new InvestigationLockError("PLAYER_NOT_ACTIVE", "현재 상태에서는 질문을 제출할 수 없습니다.");
  }

  if (!input.activeLock || input.activeLock.locked_by_player_id !== input.playerId) {
    throw new InvestigationLockError("LOCK_NOT_OWNED", "내가 점유한 조사실에서만 질문할 수 있습니다.");
  }

  if (input.activeLock.question_count >= 3) {
    throw new InvestigationLockError("LOCK_LIMIT_REACHED", "이 조사실 세션에서는 더 이상 질문할 수 없습니다.");
  }

  if (input.activeLock.expires_at && hasExpired(input.activeLock.expires_at, nowUtcIso())) {
    throw new InvestigationLockError("LOCK_CONFLICT", "조사실 사용 시간이 만료되었습니다. 다시 입장해 주세요.");
  }
}

function assertAnswerSubmissionState(input: {
  currentStage: DbStageRow | null;
  playerStates: DbPlayerStageStateRow[];
  activeLock: DbInvestigationLockRow | null;
  stageId: string;
  playerId: string;
}) {
  if (!input.currentStage || input.currentStage.id !== input.stageId) {
    throw new InvestigationLockError("STAGE_NOT_FOUND", "정답을 제출할 수 있는 스테이지를 찾지 못했습니다.");
  }

  if (input.currentStage.status !== "in_progress") {
    throw new InvestigationLockError("STAGE_NOT_ACTIVE", "현재 스테이지에서는 정답을 제출할 수 없습니다.");
  }

  const playerState = input.playerStates.find((state) => state.player_id === input.playerId);
  if (!playerState) {
    throw new InvestigationLockError("PLAYER_NOT_FOUND", "현재 스테이지에 참여한 플레이어가 아닙니다.");
  }

  if (playerState.status !== "active") {
    throw new InvestigationLockError("PLAYER_NOT_ACTIVE", "현재 상태에서는 정답을 제출할 수 없습니다.");
  }

  if (!input.activeLock || input.activeLock.locked_by_player_id !== input.playerId) {
    throw new InvestigationLockError("LOCK_NOT_OWNED", "내가 점유한 조사실에서만 정답을 제출할 수 있습니다.");
  }

  if (input.activeLock.answer_attempt_count >= 1) {
    throw new InvestigationLockError("LOCK_LIMIT_REACHED", "이 조사실 세션에서는 이미 정답을 제출했습니다.");
  }

  if (input.activeLock.expires_at && hasExpired(input.activeLock.expires_at, nowUtcIso())) {
    throw new InvestigationLockError("LOCK_CONFLICT", "조사실 사용 시간이 만료되었습니다. 다시 입장해 주세요.");
  }
}

function createQuestionRecord(input: {
  stageId: string;
  playerId: string;
  teamSlotId: string;
  content: string;
  judgement: QuestionJudgement;
  reasonCode: string;
  createdAt: string;
}): Question {
  return {
    id: `question-${input.createdAt}-${input.playerId}`,
    stageId: input.stageId,
    playerId: input.playerId,
    teamSlotId: input.teamSlotId,
    content: input.content,
    judgement: input.judgement,
    reasonCode: input.reasonCode,
    createdAt: input.createdAt,
    judgedAt: input.createdAt,
  };
}

function createAnswerAttemptRecord(input: {
  stageId: string;
  playerId: string;
  teamSlotId: string;
  content: string;
  result: AnswerResult;
  matchedBonusKeywords: string[];
  missingRequiredKeywords: string[];
  reasonCode: string;
  needsManualReview: boolean;
  shouldLockPlayer: boolean;
  createdAt: string;
}): AnswerAttempt {
  return {
    id: `answer-${input.createdAt}-${input.playerId}`,
    stageId: input.stageId,
    playerId: input.playerId,
    teamSlotId: input.teamSlotId,
    content: input.content,
    result: input.result,
    matchedBonusKeywords: input.matchedBonusKeywords,
    missingRequiredKeywords: input.missingRequiredKeywords,
    reasonCode: input.reasonCode,
    needsManualReview: input.needsManualReview,
    shouldLockPlayer: input.shouldLockPlayer,
    createdAt: input.createdAt,
  };
}

function createJudgementRequestBase(input: {
  roomId: string;
  gameId: string | null;
  stageId: string;
  playerId: string;
  caseId: string;
  stageNumber: number;
  kind: JudgementRecordKind;
  createdAt: string;
}) {
  return {
    roomId: input.roomId,
    gameId: input.gameId,
    stageId: input.stageId,
    playerId: input.playerId,
    caseId: input.caseId,
    stageNumber: input.stageNumber,
    kind: input.kind,
    createdAt: input.createdAt,
  };
}

function createQuestionJudgementRequest(input: {
  roomId: string;
  gameId: string | null;
  stageId: string;
  playerId: string;
  teamSlotId: string | null;
  caseId: string;
  stageNumber: number;
  questionText: string;
  visibleHints: string[];
  previousQuestionIds: string[];
  previousAnswerIds: string[];
  viewMode: string;
  canSeeStageSecrets: boolean;
  canSeeOwnLockState: boolean;
  isSolvedLocked: boolean;
  createdAt: string;
}): QuestionJudgementRequest {
  return {
    caseId: input.caseId,
    stageNumber: input.stageNumber,
    playerId: input.playerId,
    teamSlotId: input.teamSlotId,
    questionText: input.questionText,
    conversationContext: {
      roomId: input.roomId,
      stageId: input.stageId,
      playerId: input.playerId,
      teamSlotId: input.teamSlotId,
      visibleHints: input.visibleHints,
      previousQuestionIds: input.previousQuestionIds,
      previousAnswerIds: input.previousAnswerIds,
    },
    visibilityContext: {
      viewMode: input.viewMode,
      canSeeStageSecrets: input.canSeeStageSecrets,
      canSeeOwnLockState: input.canSeeOwnLockState,
      isSolvedLocked: input.isSolvedLocked,
    },
  };
}

function createAnswerJudgementRequest(input: {
  roomId: string;
  gameId: string | null;
  stageId: string;
  playerId: string;
  teamSlotId: string | null;
  caseId: string;
  stageNumber: number;
  answerText: string;
  visibleHints: string[];
  previousQuestionIds: string[];
  previousAnswerIds: string[];
  viewMode: string;
  canSeeStageSecrets: boolean;
  canSeeOwnLockState: boolean;
  isSolvedLocked: boolean;
  createdAt: string;
}): AnswerJudgementRequest {
  return {
    caseId: input.caseId,
    stageNumber: input.stageNumber,
    playerId: input.playerId,
    teamSlotId: input.teamSlotId,
    answerText: input.answerText,
    conversationContext: {
      roomId: input.roomId,
      stageId: input.stageId,
      playerId: input.playerId,
      teamSlotId: input.teamSlotId,
      visibleHints: input.visibleHints,
      previousQuestionIds: input.previousQuestionIds,
      previousAnswerIds: input.previousAnswerIds,
    },
    visibilityContext: {
      viewMode: input.viewMode,
      canSeeStageSecrets: input.canSeeStageSecrets,
      canSeeOwnLockState: input.canSeeOwnLockState,
      isSolvedLocked: input.isSolvedLocked,
    },
  };
}

function createQuestionJudgementResponse(input: {
  judgement: QuestionJudgement;
  reasonCode: string;
  publicReply: string;
  manualReviewRequired?: boolean;
  safetyFlags?: string[];
  logSummary?: string;
}): QuestionJudgementResponse {
  return {
    judgement: mapQuestionJudgementToStoredJudgement(input.judgement),
    reasonCode: input.reasonCode,
    publicReply: input.publicReply as QuestionJudgementResponse["publicReply"],
    manualReviewRequired: input.manualReviewRequired === true,
    safetyFlags: input.safetyFlags ?? [],
    logSummary: input.logSummary?.trim() || `question:${input.reasonCode}`,
  };
}

function createAnswerJudgementResponse(input: {
  result: AnswerResult;
  publicOutcome: "correct" | "wrong" | "needs_review";
  publicSummary: string;
  matchedRequiredKeywords: string[];
  missingRequiredKeywords: string[];
  matchedBonusKeywords: string[];
  reasonCode: string;
  needsManualReview: boolean;
  needsOperatorOverride?: boolean;
}): AnswerJudgementResponse {
  const storedResult =
    input.result === "correct"
      ? "accepted"
      : input.result === "incorrect"
        ? "rejected"
        : input.needsManualReview
          ? "manual_review"
          : "ambiguous";

  return {
    result: storedResult,
    publicOutcome: input.publicOutcome,
    matchedRequiredKeywords: input.matchedRequiredKeywords,
    missingRequiredKeywords: input.missingRequiredKeywords,
    matchedBonusKeywords: input.matchedBonusKeywords,
    reasonCode: input.reasonCode,
    publicSummary: input.publicSummary,
    needsOperatorOverride: input.needsOperatorOverride ?? input.needsManualReview,
  };
}

function createJudgementEnvelope(input: {
  judgementId: string;
  reviewId?: string | null;
  manualReviewRequired: boolean;
  needsOperatorOverride: boolean;
  publicPayload: {
    publicReply?: string;
    publicOutcome?: string;
    publicSummary: string;
  };
  internalPayload: Record<string, unknown>;
}): JudgementStorageEnvelope {
  return {
    judgementId: input.judgementId,
    reviewId: input.reviewId ?? null,
    manualReviewRequired: input.manualReviewRequired,
    needsOperatorOverride: input.needsOperatorOverride,
    publicPayload: {
      publicReply: input.publicPayload.publicReply as JudgementStorageEnvelope["publicPayload"]["publicReply"],
      publicOutcome: input.publicPayload.publicOutcome as JudgementStorageEnvelope["publicPayload"]["publicOutcome"],
      publicSummary: input.publicPayload.publicSummary,
    },
    internalPayload: input.internalPayload as JudgementStorageEnvelope["internalPayload"],
  };
}

async function persistJudgementRecord(input: {
  roomId: string;
  gameId: string | null;
  stageId: string;
  playerId: string;
  kind: JudgementRecordKind;
  caseId: string;
  stageNumber: number;
  request: QuestionJudgementRequest | AnswerJudgementRequest;
  response: QuestionJudgementResponse | AnswerJudgementResponse;
  publicOutcome: string;
  publicSummary: string;
  internalPayload: Record<string, unknown>;
  manualReviewRequired: boolean;
  needsOperatorOverride: boolean;
  createdAt: string;
}): Promise<{ judgementId: string; reviewId: string | null }> {
  const supabase = getSupabaseAdminClient();
  const judgementId = `${input.kind}-${input.stageId}-${input.playerId}-${input.createdAt}`;
  const envelope = createJudgementEnvelope({
    judgementId,
    manualReviewRequired: input.manualReviewRequired,
    needsOperatorOverride: input.needsOperatorOverride,
    publicPayload: {
      publicReply: (input.response as QuestionJudgementResponse).publicReply,
      publicOutcome: (input.response as AnswerJudgementResponse).publicOutcome,
      publicSummary: input.publicSummary,
    },
    internalPayload: input.internalPayload,
  });

  const { data: judgementRow, error: judgementError } = await supabase
    .from("judgement_records")
    .upsert(
      {
        id: judgementId,
        room_id: input.roomId,
        game_id: input.gameId,
        stage_id: input.stageId,
        player_id: input.playerId,
        kind: input.kind,
        case_id: input.caseId,
        stage_number: input.stageNumber,
        request: input.request,
        response: input.response,
        public_outcome: input.publicOutcome,
        public_summary: input.publicSummary,
        internal_payload: envelope.internalPayload,
        manual_review_required: input.manualReviewRequired,
        needs_operator_override: input.needsOperatorOverride,
        persistence_state: input.manualReviewRequired ? "queued_for_review" : "stored",
        created_at: input.createdAt,
        updated_at: input.createdAt,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single<DbJudgementRecordRow>();

  if (judgementError || !judgementRow) {
    throw new Error(`Failed to persist judgement record: ${judgementError?.message ?? "unknown error"}`);
  }

  if (!input.manualReviewRequired) {
    return { judgementId, reviewId: null };
  }

  const { data: reviewRow, error: reviewError } = await supabase
    .from("judgement_review_queue")
    .upsert(
      {
        judgement_id: judgementId,
        room_id: input.roomId,
        stage_id: input.stageId,
        player_id: input.playerId,
        kind: input.kind,
        public_outcome: input.publicOutcome,
        review_status: "pending",
        review_summary: input.publicSummary,
        reviewed_by: null,
        reviewed_at: null,
        created_at: input.createdAt,
        updated_at: input.createdAt,
      },
      { onConflict: "judgement_id" },
    )
    .select("*")
    .single<DbJudgementReviewQueueRow>();

  if (reviewError || !reviewRow) {
    throw new Error(`Failed to persist judgement review queue item: ${reviewError?.message ?? "unknown error"}`);
  }

  return { judgementId, reviewId: reviewRow.review_id };
}

async function loadJudgementHistory(stageId: string): Promise<{
  previousQuestionIds: string[];
  previousAnswerIds: string[];
}> {
  const supabase = getSupabaseAdminClient();
  const [
    { data: questionRows, error: questionError },
    { data: answerRows, error: answerError },
  ] = await Promise.all([
    supabase
      .from("questions")
      .select("id")
      .eq("stage_id", stageId)
      .order("created_at", { ascending: true })
      .returns<Array<{ id: string }>>(),
    supabase
      .from("answer_attempts")
      .select("id")
      .eq("stage_id", stageId)
      .order("created_at", { ascending: true })
      .returns<Array<{ id: string }>>(),
  ]);

  if (questionError) {
    throw new Error(`Failed to load previous questions: ${questionError.message}`);
  }
  if (answerError) {
    throw new Error(`Failed to load previous answers: ${answerError.message}`);
  }

  return {
    previousQuestionIds: (questionRows ?? []).map((row) => row.id),
    previousAnswerIds: (answerRows ?? []).map((row) => row.id),
  };
}

function toScoreEventRow(event: ScoreEvent): DbScoreEventRow {
  return {
    id: event.id,
    room_id: event.roomId,
    game_id: event.gameId,
    stage_id: event.stageId,
    player_id: event.playerId,
    type: event.type,
    delta: event.delta,
    quantity: event.quantity,
    reason: event.reason,
    metadata: event.metadata,
    created_at: event.createdAt,
  };
}

function buildQuestionCostScoreEvent(input: {
  roomId: string;
  gameId: string;
  stageId: string;
  playerId: string;
  createdAt: string;
  questionId: string;
  judgement: QuestionJudgement;
  reasonCode: string;
}): ScoreEvent {
  return buildQuestionCostEvent({
    id: createEntityId(),
    roomId: input.roomId,
    gameId: input.gameId,
    stageId: input.stageId,
    playerId: input.playerId,
    createdAt: input.createdAt,
    metadata: {
      questionId: input.questionId,
      judgement: input.judgement,
      reasonCode: input.reasonCode,
    },
  });
}

function buildWrongAnswerCostScoreEvent(input: {
  roomId: string;
  gameId: string;
  stageId: string;
  playerId: string;
  createdAt: string;
  answerAttemptId: string;
  reasonCode: string;
}): ScoreEvent {
  return buildWrongAnswerCostEvent({
    id: createEntityId(),
    roomId: input.roomId,
    gameId: input.gameId,
    stageId: input.stageId,
    playerId: input.playerId,
    createdAt: input.createdAt,
    metadata: {
      answerAttemptId: input.answerAttemptId,
      reasonCode: input.reasonCode,
    },
  });
}

function buildStageEndPenaltyEvents(input: {
  roomId: string;
  gameId: string;
  stageId: string;
  createdAt: string;
  playerIds: string[];
  solvedPlayerIds: string[];
  endReason: StageEndReason;
}): ScoreEvent[] {
  const solvedSet = new Set(input.solvedPlayerIds);

  return input.playerIds.flatMap((playerId) => {
    if (solvedSet.has(playerId)) {
      return [];
    }

    return [
      createScoreEvent({
        id: createEntityId(),
        roomId: input.roomId,
        gameId: input.gameId,
        stageId: input.stageId,
        playerId,
        type: "unsolved_penalty",
        createdAt: input.createdAt,
        metadata: {
          endReason: input.endReason,
          solvedPlayerIds: input.solvedPlayerIds,
        },
      }),
    ];
  });
}

function sumTimeTickQuantityForPlayer(
  scoreEvents: DbScoreEventRow[],
  stageId: string,
  playerId: string,
): number {
  return scoreEvents.reduce((total, event) => {
    if (
      event.stage_id !== stageId ||
      event.player_id !== playerId ||
      event.type !== "time_tick"
    ) {
      return total;
    }

    return total + event.quantity;
  }, 0);
}

function minIsoTimestamp(left: string, right: string): string {
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

function resolveStageBriefingEndsAt(stage: DbStageRow): string | null {
  return stage.briefing_started_at ? addSeconds(stage.briefing_started_at, STAGE_BRIEFING_SECONDS) : null;
}

function resolveStageTimerStart(stage: DbStageRow): string | null {
  return stage.started_at ?? null;
}

function resolveStageTimerCutoff(input: {
  stage: DbStageRow;
  playerState: DbPlayerStageStateRow;
  nowIso: string;
}): string | null {
  const startIso = resolveStageTimerStart(input.stage);
  if (!startIso) {
    return null;
  }

  let cutoffIso =
    input.stage.ended_at ??
    (input.stage.ends_at && hasExpired(input.stage.ends_at, input.nowIso)
      ? input.stage.ends_at
      : input.nowIso);

  if (input.playerState.status === "solved_locked" && input.playerState.solved_at) {
    cutoffIso = minIsoTimestamp(cutoffIso, input.playerState.solved_at);
  }

  if (input.stage.ends_at) {
    cutoffIso = minIsoTimestamp(cutoffIso, input.stage.ends_at);
  }

  return Date.parse(cutoffIso) >= Date.parse(startIso) ? cutoffIso : null;
}

async function syncDerivedStageState(roomId: string): Promise<void> {
  const state = await loadLobbyState(roomId);
  const stage = state.currentStage;
  const game = state.game;

  if (!stage || !game) {
    return;
  }

  const nowIso = nowUtcIso();
  const supabase = getSupabaseAdminClient();
  const briefingEndsAt = resolveStageBriefingEndsAt(stage);

  if (
    stage.status === "briefing" &&
    briefingEndsAt &&
    hasExpired(briefingEndsAt, nowIso)
  ) {
    const { error: stageProgressError } = await supabase
      .from("stages")
      .update({
        status: "in_progress",
        started_at: stage.started_at ?? briefingEndsAt,
        updated_at: nowIso,
      })
      .eq("id", stage.id);

    if (stageProgressError) {
      throw new Error(`Failed to promote stage after briefing: ${stageProgressError.message}`);
    }

    const { error: gameProgressError } = await supabase
      .from("games")
      .update({
        status: "in_progress",
        started_at: game.started_at ?? briefingEndsAt,
        updated_at: nowIso,
      })
      .eq("id", game.id);

    if (gameProgressError) {
      throw new Error(`Failed to promote game after briefing: ${gameProgressError.message}`);
    }

    return syncDerivedStageState(roomId);
  }

  const willStageExpireNow =
    Boolean(stage.ends_at) &&
    hasExpired(stage.ends_at, nowIso) &&
    (stage.status === "briefing" || stage.status === "in_progress");
  const stageTimerStart = resolveStageTimerStart(stage);
  const timeTickEvents: ScoreEvent[] = [];

  if (stageTimerStart && ["briefing", "in_progress", "ended", "revealed"].includes(stage.status)) {
    for (const playerState of state.playerStates) {
      const cutoffIso = resolveStageTimerCutoff({
        stage,
        playerState,
        nowIso,
      });

      if (!cutoffIso) {
        continue;
      }

      const elapsedSeconds = diffSeconds(stageTimerStart, cutoffIso);
      const chargedSeconds = sumTimeTickQuantityForPlayer(
        state.scoreEvents,
        stage.id,
        playerState.player_id,
      );
      const deltaSeconds = elapsedSeconds - chargedSeconds;

      if (deltaSeconds <= 0) {
        continue;
      }

      timeTickEvents.push(
        buildTimeTickEvent({
          id: createEntityId(),
          roomId,
          gameId: game.id,
          stageId: stage.id,
          playerId: playerState.player_id,
          createdAt: cutoffIso,
          elapsedSeconds: deltaSeconds,
          metadata: {
            stageStatus: stage.status,
            chargedThrough: cutoffIso,
          },
        }),
      );
    }
  }

  if (timeTickEvents.length > 0) {
    await persistScoreEventsAndSyncTotals(roomId, timeTickEvents);
  }

  const lock = state.activeLock;

  const expiredPrivateChatRequests = state.privateChatRequests.filter(
    (request) => request.status === "pending" && hasExpired(request.expires_at, nowIso),
  );

  if (expiredPrivateChatRequests.length > 0) {
    await applyPendingPrivateChatResolution(
      expiredPrivateChatRequests,
      "expired",
      nowIso,
      "request_timeout",
    );
  }

  if (lock?.locked_by_player_id && hasExpired(lock.expires_at, nowIso)) {
    const { error: lockResetError } = await supabase
      .from("investigation_locks")
      .update({
        locked_by_player_id: null,
        locked_at: null,
        expires_at: null,
        question_count: 0,
        answer_attempt_count: 0,
        last_released_by_player_id: lock.locked_by_player_id,
        last_released_at: nowIso,
        version: lock.version + 1,
        updated_at: nowIso,
      })
      .eq("stage_id", lock.stage_id);

    if (lockResetError) {
      throw new Error(`Failed to reset expired investigation lock: ${lockResetError.message}`);
    }

    await applyInvestigationQueueCooldown(stage.id, lock.locked_by_player_id, nowIso);
    if (!willStageExpireNow) {
      await admitNextInvestigationQueuePlayer(roomId, stage.id, nowIso);
    }
  }

  if (
    !stage.ends_at ||
    !hasExpired(stage.ends_at, nowIso) ||
    (stage.status !== "briefing" && stage.status !== "in_progress")
  ) {
    return;
  }

  const updatedSolvedPlayerIds = Array.from(
    new Set([
      ...stage.solved_player_ids,
      ...state.playerStates
        .filter((playerState) => playerState.status === "solved_locked")
        .map((playerState) => playerState.player_id),
    ]),
  );
  const shouldFinishGame = stage.stage_number >= resolveRoomStageCount(state.room);
  const stageEndedAt = stage.ends_at;

  const { error: stageUpdateError } = await supabase
    .from("stages")
    .update({
      status: shouldFinishGame ? "revealed" : "ended",
      ended_at: stageEndedAt,
      end_reason: "timer_expired",
      solved_player_ids: updatedSolvedPlayerIds,
      updated_at: nowIso,
    })
    .eq("id", stage.id);

  if (stageUpdateError) {
    throw new Error(`Failed to end expired stage: ${stageUpdateError.message}`);
  }

  const timedOutPlayerIds = state.playerStates
    .filter((playerState) => playerState.status === "active")
    .map((playerState) => playerState.player_id);

  if (timedOutPlayerIds.length > 0) {
    const { error: playerStatesUpdateError } = await supabase
      .from("player_stage_states")
      .update({
        status: "timed_out",
        updated_at: nowIso,
      })
      .eq("stage_id", stage.id)
      .in("player_id", timedOutPlayerIds);

    if (playerStatesUpdateError) {
      throw new Error(`Failed to mark timed out players: ${playerStatesUpdateError.message}`);
    }
  }

  if (lock?.locked_by_player_id) {
    const { error: lockResetError } = await supabase
      .from("investigation_locks")
      .update({
        locked_by_player_id: null,
        locked_at: null,
        expires_at: null,
        question_count: 0,
        answer_attempt_count: 0,
        last_released_by_player_id: lock.locked_by_player_id,
        last_released_at: stageEndedAt,
        version: lock.version + 1,
        updated_at: nowIso,
      })
      .eq("stage_id", lock.stage_id);

    if (lockResetError) {
      throw new Error(`Failed to clear lock on timer expiry: ${lockResetError.message}`);
    }
  }

  const { error: queueResetError } = await supabase
    .from("player_stage_states")
    .update({
      queue_joined_at: null,
      queue_cooldown_ends_at: null,
      updated_at: nowIso,
    })
    .eq("stage_id", stage.id);

  if (queueResetError) {
    throw new Error(`Failed to clear investigation queue on timer expiry: ${queueResetError.message}`);
  }

  const stageEndPenaltyEvents = buildStageEndPenaltyEvents({
    roomId,
    gameId: game.id,
    stageId: stage.id,
    createdAt: stageEndedAt,
    playerIds: state.playerStates.map((playerState) => playerState.player_id),
    solvedPlayerIds: updatedSolvedPlayerIds,
    endReason: "timer_expired",
  }).filter(
    (event) =>
      !state.scoreEvents.some(
        (scoreEvent) =>
          scoreEvent.stage_id === event.stageId &&
          scoreEvent.player_id === event.playerId &&
          scoreEvent.type === event.type,
      ),
  );

  await persistScoreEventsAndSyncTotals(roomId, stageEndPenaltyEvents);

  const { error: gameUpdateError } = await supabase
    .from("games")
    .update({
      status: shouldFinishGame ? "finished" : "stage_result",
      ended_at: shouldFinishGame ? stageEndedAt : game.ended_at,
      updated_at: nowIso,
    })
    .eq("id", game.id);

  if (gameUpdateError) {
    throw new Error(`Failed to update game on timer expiry: ${gameUpdateError.message}`);
  }

  if (shouldFinishGame) {
    const { error: roomCloseError } = await supabase
      .from("rooms")
      .update({
        status: "closed",
        updated_at: nowIso,
      })
      .eq("id", roomId);

    if (roomCloseError) {
      throw new Error(`Failed to close room on timer expiry: ${roomCloseError.message}`);
    }

    const refreshed = await loadLobbyState(roomId);
    await saveFinishedGameResults({
      roomId,
      gameId: game.id,
      players: refreshed.players,
      scoreEvents: refreshed.scoreEvents,
      currentStageId: refreshed.currentStage?.id ?? null,
    });
  }
}

async function persistScoreEventsAndSyncTotals(
  roomId: string,
  scoreEvents: ScoreEvent[],
): Promise<void> {
  if (scoreEvents.length === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error: insertError } = await supabase
    .from("score_events")
    .insert(scoreEvents.map(toScoreEventRow));

  if (insertError) {
    throw new Error(`Failed to persist score events: ${insertError.message}`);
  }

  const refreshed = await loadLobbyState(roomId);
  const { snapshots } = buildScoreLedger(
    refreshed.players,
    refreshed.scoreEvents,
    refreshed.currentStage?.id ?? null,
  );

  const updateResults = await Promise.all(
    snapshots.map((snapshot) =>
      supabase
        .from("players")
        .update({
          total_score: snapshot.total,
          updated_at: nowUtcIso(),
        })
        .eq("id", snapshot.playerId)
        .eq("room_id", roomId),
    ),
  );

  const failedUpdate = updateResults.find((result) => result.error);
  if (failedUpdate?.error) {
    throw new Error(`Failed to sync player totals: ${failedUpdate.error.message}`);
  }
}

async function saveFinishedGameResults(input: {
  roomId: string;
  gameId: string;
  players: DbPlayerRow[];
  scoreEvents: DbScoreEventRow[];
  currentStageId: string | null;
}): Promise<PlayerScoreSnapshot[]> {
  const { snapshots } = buildScoreLedger(
    input.players,
    input.scoreEvents,
    input.currentStageId,
  );

  const accountResults = snapshots
    .map((score, index) => {
      const player = input.players.find((row) => row.id === score.playerId);

      if (!player?.account_id) {
        return null;
      }

      return {
        accountId: player.account_id,
        gameId: input.gameId,
        roomId: input.roomId,
        finalRank: index + 1,
        isWinner: index === 0,
        totalScore: score.total,
        solvedCount: player.solved_count,
        bonusKeywordCount: player.bonus_keyword_count,
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  await upsertAccountGameResults(accountResults);

  return snapshots;
}

export async function submitAnswerInStore(
  roomId: string,
  stageId: string,
  playerId: string,
  teamSlotId: string,
  content: string,
): Promise<SubmitAnswerResponse> {
  const room = await findRoomByRef(roomId);
  if (!room) {
    throw new InvestigationLockError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const state = await loadSyncedLobbyState(room.id);
  assertAnswerSubmissionState({
    currentStage: state.currentStage,
    playerStates: state.playerStates,
    activeLock: state.activeLock,
    stageId,
    playerId,
  });

  const currentStage = state.currentStage!;
  const activeLock = state.activeLock!;
  const currentPlayerState = state.playerStates.find((playerState) => playerState.player_id === playerId) ?? null;
  const currentPlayerRow = state.players.find((player) => player.id === playerId) ?? null;
  const resolvedTeamSlotId = currentPlayerState?.team_slot_id ?? teamSlotId;

  if (currentPlayerState?.team_slot_id && currentPlayerState.team_slot_id !== teamSlotId) {
    throw new InvestigationLockError("TEAM_SLOT_MISMATCH", "현재 플레이어의 팀 슬롯과 제출 정보가 일치하지 않습니다.");
  }

  const caseFile = await getCaseFileOrThrow(currentStage.case_key);
  const nowIso = nowUtcIso();
  const resolution = await resolveAnswerJudgement({
    caseFile,
    content,
    visibleHintTexts: buildVisibleHintTexts(caseFile, state.visibleHints),
  });
  const nextAnswerAttemptCount = activeLock.answer_attempt_count + 1;
  const supabase = getSupabaseAdminClient();
  const previousJudgementIds = await loadJudgementHistory(stageId);

  const { data: answerRow, error: answerError } = await supabase
    .from("answer_attempts")
    .insert({
      stage_id: stageId,
      player_id: playerId,
      team_slot_id: resolvedTeamSlotId,
      content,
      result: resolution.result,
      matched_bonus_keywords: resolution.matchedBonusKeywords,
      missing_required_keywords: resolution.missingRequiredKeywords,
      reason_code: resolution.reasonCode,
      needs_manual_review: resolution.needsManualReview,
      should_lock_player: resolution.shouldLockPlayer,
    })
    .select("*")
    .single<DbAnswerAttemptRow>();

  if (answerError || !answerRow) {
    throw new Error(`Failed to store answer attempt: ${answerError?.message ?? "unknown error"}`);
  }

  const updatedPlayerStageState = {
    question_count: currentPlayerState?.question_count ?? 0,
    answer_attempt_count: nextAnswerAttemptCount,
    status: resolution.shouldLockPlayer ? "solved_locked" : "active",
    solved_at: resolution.shouldLockPlayer ? nowIso : currentPlayerState?.solved_at ?? null,
    locked_at: resolution.shouldLockPlayer ? activeLock.locked_at : currentPlayerState?.locked_at ?? null,
    updated_at: nowIso,
  };

  const { error: playerStateUpdateError } = await supabase
    .from("player_stage_states")
    .update(updatedPlayerStageState)
    .eq("stage_id", stageId)
    .eq("player_id", playerId);

  if (playerStateUpdateError) {
    throw new Error(`Failed to update player answer state: ${playerStateUpdateError.message}`);
  }

  if (resolution.shouldLockPlayer) {
    const currentPlayerRow = state.players.find((player) => player.id === playerId);
    const { error: playerAggregateError } = await supabase
      .from("players")
      .update({
        solved_count: (currentPlayerRow?.solved_count ?? 0) + 1,
        bonus_keyword_count:
          (currentPlayerRow?.bonus_keyword_count ?? 0) + resolution.matchedBonusKeywords.length,
        updated_at: nowIso,
      })
      .eq("id", playerId)
      .eq("room_id", roomId);

    if (playerAggregateError) {
      throw new Error(`Failed to update player aggregates after solve: ${playerAggregateError.message}`);
    }
  }

  const answerResponse = createAnswerJudgementResponse({
    result: resolution.result,
    publicOutcome: resolution.publicOutcome,
    publicSummary: resolution.publicSummary,
    matchedRequiredKeywords: resolution.matchedRequiredKeywords,
    missingRequiredKeywords: resolution.missingRequiredKeywords,
    matchedBonusKeywords: resolution.matchedBonusKeywords,
    reasonCode: resolution.reasonCode,
    needsManualReview: resolution.needsManualReview,
    needsOperatorOverride: resolution.needsOperatorOverride,
  });

  const manualReviewRequired = resolution.needsManualReview;
  await persistJudgementRecord({
    roomId: room.id,
    gameId: state.game?.id ?? null,
    stageId,
    playerId,
    kind: "answer",
    caseId: currentStage.case_key,
    stageNumber: currentStage.stage_number,
    request: createAnswerJudgementRequest({
      roomId: room.id,
      gameId: state.game?.id ?? null,
      stageId,
      playerId,
      teamSlotId: resolvedTeamSlotId,
      caseId: currentStage.case_key,
      stageNumber: currentStage.stage_number,
      answerText: content,
      visibleHints: state.visibleHints.map((hint) => hint.id),
      previousQuestionIds: previousJudgementIds.previousQuestionIds,
      previousAnswerIds: previousJudgementIds.previousAnswerIds,
      viewMode: activeLock.locked_by_player_id === playerId ? "investigation_active" : "stage_playing",
      canSeeStageSecrets: false,
      canSeeOwnLockState: true,
      isSolvedLocked: currentPlayerState?.status === "solved_locked",
      createdAt: nowIso,
    }),
    response: answerResponse,
    publicOutcome: answerResponse.publicOutcome,
    publicSummary: answerResponse.publicSummary,
    internalPayload: {
      reasonCode: answerResponse.reasonCode,
      result: answerResponse.result,
      matchedRequiredKeywords: answerResponse.matchedRequiredKeywords,
      missingRequiredKeywords: answerResponse.missingRequiredKeywords,
      matchedBonusKeywords: answerResponse.matchedBonusKeywords,
      logSummary: resolution.logSummary,
    },
    manualReviewRequired,
    needsOperatorOverride: answerResponse.needsOperatorOverride,
    createdAt: nowIso,
  });

  const updatedSolvedPlayerIds = resolution.shouldLockPlayer
    ? Array.from(new Set([...currentStage.solved_player_ids, playerId]))
    : currentStage.solved_player_ids;

  const requiredSolvedCount = resolveRequiredSolvedPlayerCount(state.playerStates.length);
  const shouldEndStage = resolution.shouldLockPlayer && updatedSolvedPlayerIds.length >= requiredSolvedCount;
  const shouldFinishGame =
    shouldEndStage &&
    (state.playerStates.length <= 1 || currentStage.stage_number >= resolveRoomStageCount(state.room));
  const { error: stageUpdateError } = await supabase
    .from("stages")
    .update({
      solved_player_ids: updatedSolvedPlayerIds,
      status: shouldEndStage ? (shouldFinishGame ? "revealed" : "ended") : currentStage.status,
      ended_at: shouldEndStage ? nowIso : currentStage.ended_at,
      end_reason: shouldEndStage ? "two_players_solved" : currentStage.end_reason,
      updated_at: nowIso,
    })
    .eq("id", stageId);

  if (stageUpdateError) {
    throw new Error(`Failed to update stage after answer submission: ${stageUpdateError.message}`);
  }

  if (resolution.shouldLockPlayer) {
    const { error: lockResetError } = await supabase
      .from("investigation_locks")
      .update({
        locked_by_player_id: null,
        locked_at: null,
        expires_at: null,
        question_count: 0,
        answer_attempt_count: 0,
        last_released_by_player_id: playerId,
        last_released_at: nowIso,
        version: activeLock.version + 1,
        updated_at: nowIso,
      })
      .eq("stage_id", stageId);

    if (lockResetError) {
      throw new Error(`Failed to reset investigation lock after solve: ${lockResetError.message}`);
    }

    if (!shouldEndStage) {
      await admitNextInvestigationQueuePlayer(room.id, stageId, nowIso);
    }
  } else {
    const { error: lockUpdateError } = await supabase
      .from("investigation_locks")
      .update({
        answer_attempt_count: nextAnswerAttemptCount,
        version: activeLock.version + 1,
        updated_at: nowIso,
      })
      .eq("stage_id", stageId);

    if (lockUpdateError) {
      throw new Error(`Failed to update investigation lock answer count: ${lockUpdateError.message}`);
    }
  }

  if (shouldEndStage && state.game) {
    const { error: gameUpdateError } = await supabase
      .from("games")
      .update({
        status: shouldFinishGame ? "finished" : "stage_result",
        ended_at: shouldFinishGame ? nowIso : state.game.ended_at,
        updated_at: nowIso,
      })
      .eq("id", state.game.id);

    if (gameUpdateError) {
      throw new Error(`Failed to update game status after solve: ${gameUpdateError.message}`);
    }
  }

  if (shouldEndStage) {
    const { error: queueResetError } = await supabase
      .from("player_stage_states")
      .update({
        queue_joined_at: null,
        queue_cooldown_ends_at: null,
        updated_at: nowIso,
      })
      .eq("stage_id", stageId);

    if (queueResetError) {
      throw new Error(`Failed to clear investigation queue after stage resolution: ${queueResetError.message}`);
    }
  }

  if (shouldFinishGame) {
    const { error: roomCloseError } = await supabase
      .from("rooms")
      .update({
        status: "closed",
        updated_at: nowIso,
      })
      .eq("id", room.id);

    if (roomCloseError) {
      throw new Error(`Failed to close room after finish: ${roomCloseError.message}`);
    }
  }

  const scoreEvents: ScoreEvent[] = [];
  if (resolution.result === "incorrect") {
    scoreEvents.push(
      buildWrongAnswerCostScoreEvent({
        roomId: room.id,
        gameId: currentStage.game_id,
        stageId,
        playerId,
        createdAt: nowIso,
        answerAttemptId: answerRow.id,
        reasonCode: resolution.reasonCode,
      }),
    );
  }

  if (resolution.result === "correct" && resolution.matchedBonusKeywords.length > 0) {
    let bonusEventIndex = 0;
    scoreEvents.push(
      ...buildBonusRewardEvents({
        roomId: room.id,
        gameId: currentStage.game_id,
        stageId,
        playerId,
        createdAt: nowIso,
        createId: () => {
          bonusEventIndex += 1;
          return createEntityId();
        },
        matchedBonusKeywords: resolution.matchedBonusKeywords,
        metadata: {
          answerAttemptId: answerRow.id,
          reasonCode: resolution.reasonCode,
        },
      }),
    );
  }

  if (shouldEndStage && state.game) {
    scoreEvents.push(
      ...buildStageEndPenaltyEvents({
        roomId: room.id,
        gameId: state.game.id,
        stageId,
        createdAt: nowIso,
        playerIds: state.playerStates.map((playerState) => playerState.player_id),
        solvedPlayerIds: updatedSolvedPlayerIds,
        endReason: "two_players_solved",
      }),
    );
  }

  await persistScoreEventsAndSyncTotals(room.id, scoreEvents);

  const refreshed = await loadSyncedLobbyState(room.id);
  const caseSummary = await loadCaseSummary(currentStage.case_key);
  const scoreSnapshots = buildScoreLedger(
    refreshed.players,
    refreshed.scoreEvents,
    refreshed.currentStage?.id ?? null,
  ).snapshots;
  if (shouldFinishGame && refreshed.game) {
    await saveFinishedGameResults({
      roomId: room.id,
      gameId: refreshed.game.id,
      players: refreshed.players,
      scoreEvents: refreshed.scoreEvents,
      currentStageId: refreshed.currentStage?.id ?? null,
    });
  }
  const snapshot = cloneSnapshotWithAnswerResult(
    buildSnapshotFromState(refreshed, caseSummary, playerId),
    resolution.publicOutcome,
    resolution.publicSummary,
  );

  const refreshedPlayerState = refreshed.playerStates.find((playerState) => playerState.player_id === playerId) ?? null;

  return {
    attempt: createAnswerAttemptRecord({
      stageId,
      playerId,
      teamSlotId: resolvedTeamSlotId,
      content,
      result: resolution.result,
      matchedBonusKeywords: resolution.matchedBonusKeywords,
      missingRequiredKeywords: resolution.missingRequiredKeywords,
      reasonCode: resolution.reasonCode,
      needsManualReview: resolution.needsManualReview,
      shouldLockPlayer: resolution.shouldLockPlayer,
      createdAt: nowIso,
    }),
    playerState: refreshedPlayerState ? toPlayerStageState(refreshedPlayerState) : null,
    scores: scoreSnapshots,
    snapshot,
  };
}

export async function requestPrivateChatInStore(
  roomId: string,
  stageId: string,
  requesterPlayerId: string,
  targetPlayerId: string,
): Promise<RequestPrivateChatResponse> {
  const room = await findRoomByRef(roomId);
  if (!room) {
    throw new PrivateChatError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const state = await loadSyncedLobbyState(room.id);
  assertPrivateChatStageActive(state.currentStage);

  if (state.currentStage.id !== stageId) {
    throw new PrivateChatError("STAGE_NOT_FOUND", "현재 진행 중인 스테이지와 요청 정보가 일치하지 않습니다.");
  }

  if (requesterPlayerId === targetPlayerId) {
    throw new PrivateChatError("SAME_PLAYER", "자기 자신에게는 1:1 채팅을 신청할 수 없습니다.");
  }

  const requester = state.players.find((player) => player.id === requesterPlayerId);
  const target = state.players.find((player) => player.id === targetPlayerId);

  if (!requester || !target) {
    throw new PrivateChatError("PLAYER_NOT_FOUND", "요청 대상 플레이어를 찾을 수 없습니다.");
  }

  assertPrivateChatPlayerActive(state, requesterPlayerId);
  assertPrivateChatPlayerActive(state, targetPlayerId);

  const requesterTeamSlotId = resolvePlayerTeamSlotId(state, requesterPlayerId);
  const targetTeamSlotId = resolvePlayerTeamSlotId(state, targetPlayerId);

  if (requesterTeamSlotId && targetTeamSlotId && requesterTeamSlotId === targetTeamSlotId) {
    throw new PrivateChatError("SAME_TEAM", "같은 팀원에게는 1:1 채팅을 신청할 수 없습니다.");
  }

  const nowIso = nowUtcIso();
  const cooldownEndsAt = resolvePrivateChatCooldownEndsAt(
    state.privateChatRequests,
    state.privateChatSessions,
    requesterPlayerId,
    nowIso,
  );

  if (cooldownEndsAt) {
    throw new PrivateChatError("REQUEST_COOLDOWN", `다시 신청하려면 ${cooldownEndsAt} 이후까지 기다려야 합니다.`);
  }

  if (findActivePrivateChatSessionForPlayer(state.privateChatSessions, requesterPlayerId)) {
    throw new PrivateChatError("REQUESTER_BUSY", "이미 다른 1:1 채팅 세션에 참여 중입니다.");
  }

  const existingPendingOutgoingRequest = state.privateChatRequests.find(
    (request) =>
      request.requester_player_id === requesterPlayerId &&
      isPendingPrivateChatRequest(request, nowIso),
  );

  if (existingPendingOutgoingRequest) {
    throw new PrivateChatError("ACTIVE_REQUEST_EXISTS", "이미 응답 대기 중인 1:1 채팅 요청이 있습니다.");
  }

  const supabase = getSupabaseAdminClient();
  const targetActiveSession = findActivePrivateChatSessionForPlayer(
    state.privateChatSessions,
    targetPlayerId,
  );

  const requestPayload: {
    stage_id: string;
    requester_player_id: string;
    target_player_id: string;
    status: PrivateChatRequestStatus;
    created_at: string;
    expires_at: string;
    responded_at: string | null;
    response_reason: string | null;
    updated_at: string;
  } = targetActiveSession
    ? {
        stage_id: stageId,
        requester_player_id: requesterPlayerId,
        target_player_id: targetPlayerId,
        status: "busy",
        created_at: nowIso,
        expires_at: nowIso,
        responded_at: nowIso,
        response_reason: "target_busy",
        updated_at: nowIso,
      }
    : {
        stage_id: stageId,
        requester_player_id: requesterPlayerId,
        target_player_id: targetPlayerId,
        status: "pending",
        created_at: nowIso,
        expires_at: addSeconds(nowIso, PRIVATE_CHAT_REQUEST_TTL_SECONDS),
        responded_at: null,
        response_reason: null,
        updated_at: nowIso,
      };

  const { data: requestRow, error: requestError } = await supabase
    .from("private_chat_requests")
    .insert(requestPayload)
    .select("*")
    .single<DbPrivateChatRequestRow>();

  if (requestError || !requestRow) {
    throw new Error(`Failed to store private chat request: ${requestError?.message ?? "unknown error"}`);
  }

  const refreshed = await loadSyncedLobbyState(room.id);
  const caseSummary = await loadCaseSummary(state.currentStage.case_key);
  const resolvedRequest =
    refreshed.privateChatRequests.find((request) => request.id === requestRow.id) ?? requestRow;

  return {
    request: toPrivateChatRequest(resolvedRequest),
    snapshot: buildSnapshotFromState(refreshed, caseSummary, requesterPlayerId),
  };
}

export async function respondPrivateChatInStore(
  roomId: string,
  requestId: string,
  responderPlayerId: string,
  accept: boolean,
): Promise<RespondPrivateChatResponse> {
  const room = await findRoomByRef(roomId);
  if (!room) {
    throw new PrivateChatError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const state = await loadSyncedLobbyState(room.id);
  const request = state.privateChatRequests.find((candidate) => candidate.id === requestId);

  if (!request) {
    throw new PrivateChatError("REQUEST_NOT_FOUND", "1:1 채팅 요청을 찾을 수 없습니다.");
  }

  assertPrivateChatStageActive(state.currentStage);

  if (request.target_player_id !== responderPlayerId) {
    throw new PrivateChatError("RESPONDER_NOT_ALLOWED", "해당 요청에 응답할 권한이 없습니다.");
  }

  const nowIso = nowUtcIso();
  if (request.status !== "pending") {
    if (request.status === "expired" || hasExpired(request.expires_at, nowIso)) {
      throw new PrivateChatError("REQUEST_EXPIRED", "응답 시간이 지나 요청이 만료되었습니다.");
    }

    throw new PrivateChatError("REQUEST_NOT_PENDING", "이미 처리된 1:1 채팅 요청입니다.");
  }

  if (hasExpired(request.expires_at, nowIso)) {
    await applyPendingPrivateChatResolution([request], "expired", nowIso, "request_timeout");
    throw new PrivateChatError("REQUEST_EXPIRED", "응답 시간이 지나 요청이 만료되었습니다.");
  }

  assertPrivateChatPlayerActive(state, responderPlayerId);
  assertPrivateChatPlayerActive(state, request.requester_player_id);

  const supabase = getSupabaseAdminClient();

  if (!accept) {
    const { data: rejectedRequest, error: rejectError } = await supabase
      .from("private_chat_requests")
      .update({
        status: "rejected",
        responded_at: nowIso,
        response_reason: "declined",
        updated_at: nowIso,
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("*")
      .single<DbPrivateChatRequestRow>();

    if (rejectError || !rejectedRequest) {
      throw new Error(`Failed to reject private chat request: ${rejectError?.message ?? "unknown error"}`);
    }

    const refreshed = await loadSyncedLobbyState(room.id);
    const caseSummary = await loadCaseSummary(state.currentStage.case_key);

    return {
      request: toPrivateChatRequest(rejectedRequest),
      session: null,
      snapshot: buildSnapshotFromState(refreshed, caseSummary, responderPlayerId),
    };
  }

  const requesterActiveSession = findActivePrivateChatSessionForPlayer(
    state.privateChatSessions,
    request.requester_player_id,
  );
  const responderActiveSession = findActivePrivateChatSessionForPlayer(
    state.privateChatSessions,
    responderPlayerId,
  );

  if (requesterActiveSession || responderActiveSession) {
    const { data: busyRequest, error: busyError } = await supabase
      .from("private_chat_requests")
      .update({
        status: "busy",
        responded_at: nowIso,
        response_reason: "participant_busy",
        updated_at: nowIso,
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("*")
      .single<DbPrivateChatRequestRow>();

    if (busyError || !busyRequest) {
      throw new Error(`Failed to mark private chat request busy: ${busyError?.message ?? "unknown error"}`);
    }

    const refreshed = await loadSyncedLobbyState(room.id);
    const caseSummary = await loadCaseSummary(state.currentStage.case_key);

    return {
      request: toPrivateChatRequest(busyRequest),
      session: null,
      snapshot: buildSnapshotFromState(refreshed, caseSummary, responderPlayerId),
    };
  }

  const { data: acceptedRequest, error: acceptError } = await supabase
    .from("private_chat_requests")
    .update({
      status: "accepted",
      responded_at: nowIso,
      response_reason: "accepted",
      updated_at: nowIso,
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("*")
    .single<DbPrivateChatRequestRow>();

  if (acceptError || !acceptedRequest) {
    throw new Error(`Failed to accept private chat request: ${acceptError?.message ?? "unknown error"}`);
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from("private_chat_sessions")
    .insert({
      stage_id: request.stage_id,
      request_id: requestId,
      player_a_id: request.requester_player_id,
      player_b_id: responderPlayerId,
      started_at: nowIso,
      release_allowed_at: addSeconds(nowIso, PRIVATE_CHAT_MIN_SESSION_SECONDS),
      ended_at: null,
      closed_by_player_id: null,
    })
    .select("*")
    .single<DbPrivateChatSessionRow>();

  if (sessionError || !sessionRow) {
    throw new Error(`Failed to create private chat session: ${sessionError?.message ?? "unknown error"}`);
  }

  const busyRequestIds = new Set(
    state.privateChatRequests
      .filter(
        (candidate) =>
          candidate.id !== requestId &&
          candidate.status === "pending" &&
          (candidate.target_player_id === responderPlayerId ||
            candidate.target_player_id === request.requester_player_id),
      )
      .map((candidate) => candidate.id),
  );

  await applyPendingPrivateChatResolution(
    state.privateChatRequests.filter((candidate) => busyRequestIds.has(candidate.id)),
    "busy",
    nowIso,
    "participant_connected",
  );

  await applyPendingPrivateChatResolution(
    state.privateChatRequests.filter(
      (candidate) =>
        candidate.id !== requestId &&
        candidate.status === "pending" &&
        !busyRequestIds.has(candidate.id) &&
        (candidate.requester_player_id === responderPlayerId ||
          candidate.requester_player_id === request.requester_player_id),
    ),
    "cancelled",
    nowIso,
    "participant_connected",
  );

  const refreshed = await loadSyncedLobbyState(room.id);
  const caseSummary = await loadCaseSummary(state.currentStage.case_key);

  return {
    request: toPrivateChatRequest(acceptedRequest),
    session: toPrivateChatSession(sessionRow),
    snapshot: buildSnapshotFromState(refreshed, caseSummary, responderPlayerId),
  };
}

export async function endPrivateChatInStore(
  roomId: string,
  stageId: string,
  sessionId: string,
  playerId: string,
): Promise<EndPrivateChatResponse> {
  const room = await findRoomByRef(roomId);
  if (!room) {
    throw new PrivateChatError("ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
  }

  const state = await loadSyncedLobbyState(room.id);
  assertPrivateChatStageActive(state.currentStage);

  if (state.currentStage.id !== stageId) {
    throw new PrivateChatError("STAGE_NOT_FOUND", "현재 진행 중인 스테이지와 세션 정보가 일치하지 않습니다.");
  }

  const session = state.privateChatSessions.find((candidate) => candidate.id === sessionId);
  if (!session || !isPrivateChatSessionActive(session)) {
    throw new PrivateChatError("SESSION_NOT_FOUND", "종료할 1:1 채팅 세션을 찾을 수 없습니다.");
  }

  const partnerPlayerId = resolvePrivateChatSessionPartner(session, playerId);
  if (!partnerPlayerId) {
    throw new PrivateChatError("SESSION_NOT_ALLOWED", "해당 세션을 종료할 권한이 없습니다.");
  }

  const nowIso = nowUtcIso();
  if (!hasExpired(session.release_allowed_at, nowIso)) {
    throw new PrivateChatError("SESSION_LOCKED", "최소 유지 시간이 지나기 전에는 세션을 종료할 수 없습니다.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: endedSession, error: endError } = await supabase
    .from("private_chat_sessions")
    .update({
      ended_at: nowIso,
      closed_by_player_id: playerId,
    })
    .eq("id", sessionId)
    .is("ended_at", null)
    .select("*")
    .single<DbPrivateChatSessionRow>();

  if (endError || !endedSession) {
    throw new Error(`Failed to end private chat session: ${endError?.message ?? "unknown error"}`);
  }

  const refreshed = await loadSyncedLobbyState(room.id);
  const caseSummary = await loadCaseSummary(state.currentStage.case_key);

  return {
    session: toPrivateChatSession(endedSession),
    snapshot: buildSnapshotFromState(refreshed, caseSummary, playerId),
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
    playerStates: state.playerStates.map(toPlayerStageState),
    activeLock: state.activeLock ? toInvestigationLock(state.activeLock) : null,
    scores: buildScoreLedger(state.players, state.scoreEvents, state.currentStage?.id ?? null).snapshots,
    visibleHints: state.visibleHints.map(toHintReveal),
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

export async function listRoomDirectoryFromStore(input: {
  sort?: "newest" | "least_players";
  search?: string | null;
} = {}): Promise<ListRoomDirectoryResponse> {
  const supabase = getSupabaseAdminClient();
  let [roomsResult, playersResult] = await Promise.all([
    supabase.from("rooms").select("*").returns<DbRoomRow[]>(),
    supabase.from("players").select("room_id, id, last_seen_at, joined_at, role, nickname, is_ready, connection_status, total_score, solved_count, bonus_keyword_count, created_at, updated_at").returns<DbPlayerRow[]>(),
  ]);

  if (roomsResult.error) {
    throw new Error(`Failed to list rooms: ${roomsResult.error.message}`);
  }

  if (playersResult.error) {
    throw new Error(`Failed to count room players: ${playersResult.error.message}`);
  }

  if (await cleanupStalePlayersInRoomDirectory(roomsResult.data ?? [], playersResult.data ?? [])) {
    [roomsResult, playersResult] = await Promise.all([
      supabase.from("rooms").select("*").returns<DbRoomRow[]>(),
      supabase.from("players").select("room_id, id, last_seen_at, joined_at, role, nickname, is_ready, connection_status, total_score, solved_count, bonus_keyword_count, created_at, updated_at").returns<DbPlayerRow[]>(),
    ]);

    if (roomsResult.error) {
      throw new Error(`Failed to reload rooms after presence cleanup: ${roomsResult.error.message}`);
    }

    if (playersResult.error) {
      throw new Error(`Failed to reload players after presence cleanup: ${playersResult.error.message}`);
    }
  }

  const search = input.search?.trim() ?? "";
  const currentPlayersByRoomId = new Map<string, number>();

  for (const player of playersResult.data ?? []) {
    currentPlayersByRoomId.set(player.room_id, (currentPlayersByRoomId.get(player.room_id) ?? 0) + 1);
  }

  const rooms = (roomsResult.data ?? [])
    .filter((room) => {
      if (!search) {
        return true;
      }

      const normalizedSearch = search.toLowerCase();
      const roomTitle = normalizeRoomDirectoryTitle((room as Partial<DbRoomRow>).title, room.code);
      return roomTitle.toLowerCase().includes(normalizedSearch) || room.code.toLowerCase().includes(normalizedSearch);
    })
    .sort((left, right) => {
      if (input.sort === "least_players") {
        const leftPlayers = currentPlayersByRoomId.get(left.id) ?? 0;
        const rightPlayers = currentPlayersByRoomId.get(right.id) ?? 0;

        if (leftPlayers !== rightPlayers) {
          return leftPlayers - rightPlayers;
        }
      }

      return Date.parse(right.created_at) - Date.parse(left.created_at);
    })
    .map((room) => {
      const currentPlayers = currentPlayersByRoomId.get(room.id) ?? 0;
      const roomMode = normalizeRoomMode((room as Partial<DbRoomRow>).mode, "public");
      const roomTitle = normalizeRoomDirectoryTitle((room as Partial<DbRoomRow>).title, room.code);
      const stageCount =
        typeof (room as Partial<DbRoomRow>).stage_count === "number" &&
        Number.isFinite((room as Partial<DbRoomRow>).stage_count)
          ? Math.max(1, Math.floor((room as Partial<DbRoomRow>).stage_count as number))
          : roomMode === "practice"
            ? 1
            : 3;
      const maxPlayers =
        typeof (room as Partial<DbRoomRow>).max_players === "number" &&
        Number.isFinite((room as Partial<DbRoomRow>).max_players)
          ? Math.max(1, Math.floor((room as Partial<DbRoomRow>).max_players as number))
          : roomMode === "practice"
            ? 1
            : 6;
      const roomStatus = (room as Partial<DbRoomRow>).status ?? "waiting";

      return {
        roomId: room.id,
        roomCode: room.code,
        title: roomTitle,
        mode: roomMode,
        stageCount,
        maxPlayers,
        currentPlayers,
        passwordProtected: roomMode === "secret",
        joinable: roomMode !== "practice" && roomStatus !== "closed" && currentPlayers < maxPlayers,
        createdAt: room.created_at,
        updatedAt: room.updated_at,
      };
    });

  return {
    sort: input.sort ?? "newest",
    search: search.length > 0 ? search : null,
    rooms,
  };
}
