export type EntityId = string;
export type IsoTimestamp = string;

export type RoomStatus = "waiting" | "ready" | "assigning" | "in_game" | "closed";
export type GameStatus =
  | "lobby"
  | "briefing"
  | "in_progress"
  | "stage_result"
  | "finished"
  | "cancelled";
export type StageStatus =
  | "pending"
  | "briefing"
  | "in_progress"
  | "ended"
  | "revealed";
export type PlayerRole = "host" | "player" | "admin" | "observer";
export type ConnectionStatus = "connected" | "disconnected";
export type QuestionJudgement = "YES" | "NO" | "MAYBE" | "IRRELEVANT";
export type AnswerResult = "correct" | "incorrect" | "ambiguous";
export type PlayerStageStatus =
  | "active"
  | "solved_locked"
  | "inactive_penalized"
  | "timed_out"
  | "disconnected";
export type ScoreEventType =
  | "time_tick"
  | "question_cost"
  | "wrong_answer_cost"
  | "bonus_keyword_reward"
  | "inactivity_penalty"
  | "unsolved_penalty"
  | "macro_penalty";
export type StageEndReason =
  | "two_players_solved"
  | "timer_expired"
  | "admin_closed"
  | "cancelled";
export type ChatChannel = "global" | "team" | "private" | "system";
export type PrivateChatRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export interface Room {
  id: EntityId;
  code: string;
  status: RoomStatus;
  maxPlayers: number;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface Player {
  id: EntityId;
  nickname: string;
  roomId: EntityId;
  role: PlayerRole;
  isReady: boolean;
  connectionStatus: ConnectionStatus;
  totalScore: number;
  solvedCount: number;
  bonusKeywordCount: number;
  joinedAt: IsoTimestamp;
  lastSeenAt: IsoTimestamp | null;
}

export interface TeamSlot {
  id: EntityId;
  roomId: EntityId;
  label: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface StageTeamAssignment {
  stageId: EntityId;
  playerId: EntityId;
  teamSlotId: EntityId;
  createdAt: IsoTimestamp;
}

export interface Game {
  id: EntityId;
  roomId: EntityId;
  status: GameStatus;
  currentStageNumber: number;
  startedAt: IsoTimestamp | null;
  endedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface Stage {
  id: EntityId;
  gameId: EntityId;
  roomId: EntityId;
  stageNumber: number;
  caseKey: string;
  status: StageStatus;
  briefingStartedAt: IsoTimestamp | null;
  startedAt: IsoTimestamp | null;
  endsAt: IsoTimestamp | null;
  endedAt: IsoTimestamp | null;
  solvedPlayerIds: EntityId[];
  endReason: StageEndReason | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface PlayerStageState {
  stageId: EntityId;
  playerId: EntityId;
  teamSlotId: EntityId | null;
  status: PlayerStageStatus;
  questionCount: number;
  answerAttemptCount: number;
  hasReceivedInactivityPenalty: boolean;
  solvedAt: IsoTimestamp | null;
  lockedAt: IsoTimestamp | null;
  updatedAt: IsoTimestamp;
}

export interface CaseFile {
  key: string;
  stage: number;
  title: string;
  publicDescription: string;
  question: string;
  imagePrompt: string | null;
  imageUrl: string | null;
  truth: string;
  requiredKeywords: string[];
  bonusKeywords: string[];
  acceptedAnswerSummary: string;
  hints: string[];
}

export interface Question {
  id: EntityId;
  stageId: EntityId;
  playerId: EntityId;
  teamSlotId: EntityId;
  content: string;
  judgement: QuestionJudgement | null;
  reasonCode: string | null;
  createdAt: IsoTimestamp;
  judgedAt: IsoTimestamp | null;
}

export interface AnswerAttempt {
  id: EntityId;
  stageId: EntityId;
  playerId: EntityId;
  teamSlotId: EntityId;
  content: string;
  result: AnswerResult;
  matchedBonusKeywords: string[];
  missingRequiredKeywords: string[];
  reasonCode: string;
  needsManualReview: boolean;
  shouldLockPlayer: boolean;
  createdAt: IsoTimestamp;
}

export interface ScoreEvent {
  id: EntityId;
  roomId: EntityId;
  gameId: EntityId;
  stageId: EntityId | null;
  playerId: EntityId;
  type: ScoreEventType;
  delta: number;
  quantity: number;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: IsoTimestamp;
}

export interface InvestigationLock {
  stageId: EntityId;
  roomId: EntityId;
  lockedByPlayerId: EntityId | null;
  lockedAt: IsoTimestamp | null;
  expiresAt: IsoTimestamp | null;
  questionCount: number;
  answerAttemptCount: number;
  lastReleasedByPlayerId: EntityId | null;
  lastReleasedAt: IsoTimestamp | null;
  version: number;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface ChatMessage {
  id: EntityId;
  roomId: EntityId;
  stageId: EntityId | null;
  playerId: EntityId;
  teamSlotId: EntityId | null;
  channel: ChatChannel;
  content: string;
  createdAt: IsoTimestamp;
}

export interface PrivateChatRequest {
  id: EntityId;
  stageId: EntityId;
  requesterPlayerId: EntityId;
  targetPlayerId: EntityId;
  status: PrivateChatRequestStatus;
  createdAt: IsoTimestamp;
}

export interface PrivateChatSession {
  id: EntityId;
  stageId: EntityId;
  requestId: EntityId;
  playerAId: EntityId;
  playerBId: EntityId;
  startedAt: IsoTimestamp;
  endsAt: IsoTimestamp;
}

export interface HintReveal {
  id: EntityId;
  stageId: EntityId;
  hintIndex: number;
  triggerType: string;
  revealedAt: IsoTimestamp;
}
