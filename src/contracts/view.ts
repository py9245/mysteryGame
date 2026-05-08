import type {
  AnswerResult,
  ChatMessage,
  ConnectionStatus,
  EntityId,
  Game,
  HintReveal,
  InvestigationLock,
  IsoTimestamp,
  PlayerRole,
  PlayerStageStatus,
  PrivateChatRequest,
  PrivateChatSession,
  QuestionJudgement,
  Room,
  Stage,
  StageTeamAssignment,
  TeamSlot,
} from "./game";

export type ViewMode =
  | "lobby_waiting"
  | "ready_confirmed"
  | "team_assigned"
  | "stage_briefing"
  | "stage_playing"
  | "investigation_active"
  | "solved_spectator"
  | "stage_results"
  | "game_results";

export type VisibilityScope = "public" | "self" | "redacted";
export type RedactionReason =
  | "other_player"
  | "stage_secret"
  | "private_chat"
  | "ai_internal"
  | "not_visible_yet";

export interface RedactedValue {
  hidden: true;
  reason: RedactionReason;
}

export interface SnapshotVisibility {
  players: VisibilityScope;
  stageSecrets: VisibilityScope;
  scores: VisibilityScope;
  investigation: VisibilityScope;
  privateChat: VisibilityScope;
  answerJudgements: VisibilityScope;
}

export interface PlayerView {
  playerId: EntityId;
  nickname: string;
  roomId: EntityId;
  role: PlayerRole;
  teamSlotId: EntityId | null;
  isReady: boolean;
  connectionStatus: ConnectionStatus;
  stageStatus: PlayerStageStatus | null;
  solvedLocked: boolean;
  totalScore: number | RedactedValue;
  stageScore: number | RedactedValue;
  solvedCount: number | RedactedValue;
  bonusKeywordCount: number | RedactedValue;
  visibility: VisibilityScope;
  isMe: boolean;
}

export interface PlayerStateView {
  stageId: EntityId;
  playerId: EntityId;
  teamSlotId: EntityId | null;
  status: PlayerStageStatus;
  questionCount: number | RedactedValue;
  answerAttemptCount: number | RedactedValue;
  hasReceivedInactivityPenalty: boolean;
  solvedAt: IsoTimestamp | null | RedactedValue;
  lockedAt: IsoTimestamp | null | RedactedValue;
  visibility: VisibilityScope;
  isMe: boolean;
}

export interface ScoreView {
  playerId: EntityId;
  total: number | RedactedValue;
  stageTotal: number | RedactedValue;
  lastEventAt: IsoTimestamp | null | RedactedValue;
  eventCount: number | RedactedValue;
  visibility: VisibilityScope;
  isMe: boolean;
}

export interface InvestigationLockView {
  stageId: EntityId;
  roomId: EntityId;
  lockedByPlayerId: EntityId | null;
  lockedAt: IsoTimestamp | null;
  expiresAt: IsoTimestamp | null;
  remainingSeconds: number;
  questionCountRemaining: number | RedactedValue;
  answerAttemptCountRemaining: number | RedactedValue;
  visibility: VisibilityScope;
}

export interface StageView {
  stageId: EntityId;
  gameId: EntityId;
  roomId: EntityId;
  stageNumber: number;
  status: Stage["status"];
  caseKey: string | RedactedValue;
  publicTitle: string;
  publicDescription: string;
  imageUrl: string | null;
  remainingSeconds: number;
  solvedPlayerIds: EntityId[];
  endReason: Stage["endReason"];
  myTeamSlotId: EntityId | null;
  visibleHints: HintReveal[];
  investigation: InvestigationLockView | null;
  lastQuestionJudgement: QuestionJudgement | RedactedValue;
  lastAnswerResult: AnswerResult | RedactedValue;
  redacted: {
    truth: RedactedValue;
    requiredKeywords: RedactedValue;
    bonusKeywords: RedactedValue;
    acceptedAnswerSummary: RedactedValue;
  };
}

export interface MeView {
  playerId: EntityId;
  nickname: string;
  roomId: EntityId;
  role: PlayerRole;
  teamSlotId: EntityId | null;
  isReady: boolean;
  connectionStatus: ConnectionStatus;
  stageStatus: PlayerStageStatus | null;
  totalScore: number;
  stageScore: number;
  solvedCount: number;
  bonusKeywordCount: number;
  solvedLocked: boolean;
}

export interface PrivateChatView {
  request: PrivateChatRequest | RedactedValue;
  session: PrivateChatSession | RedactedValue | null;
  participants: Array<EntityId> | RedactedValue;
}

export interface ChatMessageView extends ChatMessage {
  visibility: VisibilityScope;
  redacted: RedactedValue | null;
}

export interface RoomRedactionBundle {
  otherPlayers: RedactedValue;
  otherScores: RedactedValue;
  stageSecrets: RedactedValue;
  privateChat: RedactedValue;
  answerJudgements: RedactedValue;
}

export interface ResultsView {
  finalRankingVisible: boolean;
  finalRanking: ScoreView[];
  stageSummariesVisible: boolean;
}

export interface RoomViewSnapshot {
  viewMode: ViewMode;
  me: MeView;
  visibility: SnapshotVisibility;
  redacted: RoomRedactionBundle;
  room: Room;
  game: Game | null;
  stage: StageView | null;
  players: PlayerView[];
  teamSlots: TeamSlot[];
  currentAssignments: StageTeamAssignment[];
  playerStates: PlayerStateView[];
  activeLock: InvestigationLockView | null;
  visibleHints: HintReveal[];
  scores: ScoreView[];
  privateChat: PrivateChatView | RedactedValue | null;
  results: ResultsView | RedactedValue | null;
}
