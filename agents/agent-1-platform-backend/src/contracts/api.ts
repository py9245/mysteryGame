import type {
  AnswerAttempt,
  ChatMessage,
  EntityId,
  Game,
  InvestigationLock,
  IsoTimestamp,
  Player,
  PlayerStageState,
  PrivateChatRequest,
  PrivateChatSession,
  Question,
  Room,
  Stage,
  StageTeamAssignment,
  TeamSlot,
} from "./game";
import type {
  AnswerJudgementRequest,
  AnswerJudgementResponse,
  JudgementStorageEnvelope,
  ManualReviewRecord,
  QuestionJudgementRequest,
  QuestionJudgementResponse,
} from "./judgement";
import type { RoomViewSnapshot } from "./view";

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PlayerScoreSnapshot {
  playerId: EntityId;
  total: number;
  stageTotal: number;
  lastEventAt: IsoTimestamp | null;
  eventCount: number;
}

export type RoomSnapshot = RoomViewSnapshot;

export interface CreateRoomRequest {
  hostNickname: string;
}

export interface CreateRoomResponse {
  roomId: EntityId;
  playerId: EntityId;
  snapshot: RoomSnapshot;
}

export interface JoinRoomRequest {
  roomCode: string;
  nickname: string;
}

export interface JoinRoomResponse {
  roomId: EntityId;
  playerId: EntityId;
  snapshot: RoomSnapshot;
}

export interface GetRoomStateRequest {
  roomId: EntityId;
}

export interface SetReadyRequest {
  type: "set_ready";
  roomId: EntityId;
  playerId: EntityId;
  isReady: boolean;
}

export interface SetReadyResponse {
  room: Room;
  players: Player[];
  snapshot: RoomSnapshot;
}

export interface AssignTeamsRequest {
  type: "assign_teams";
  roomId: EntityId;
  requestedByPlayerId: EntityId;
  stageNumber: number;
}

export interface AssignTeamsResponse {
  teamSlots: TeamSlot[];
  assignments: StageTeamAssignment[];
  snapshot: RoomSnapshot;
}

export interface StartStageRequest {
  type: "start_stage";
  roomId: EntityId;
  requestedByPlayerId: EntityId;
  caseKey: string;
  durationSeconds: number;
}

export interface StartStageResponse {
  game: Game;
  stage: Stage;
  playerStates: PlayerStageState[];
  snapshot: RoomSnapshot;
}

export interface AcquireInvestigationLockRequest {
  type: "acquire_lock";
  roomId: EntityId;
  stageId: EntityId;
  playerId: EntityId;
}

export interface AcquireInvestigationLockResponse {
  lock: InvestigationLock;
  snapshot: RoomSnapshot;
}

export interface ReleaseInvestigationLockRequest {
  type: "release_lock";
  roomId: EntityId;
  stageId: EntityId;
  playerId: EntityId;
}

export interface ReleaseInvestigationLockResponse {
  lock: InvestigationLock;
  snapshot: RoomSnapshot;
}

export interface SubmitQuestionRequest {
  type: "submit_question";
  roomId: EntityId;
  stageId: EntityId;
  playerId: EntityId;
  teamSlotId: EntityId;
  content: string;
}

export interface SubmitQuestionResponse {
  question: Question;
  activeLock: InvestigationLock | null;
  scores: PlayerScoreSnapshot[];
  snapshot: RoomSnapshot;
}

export interface SubmitAnswerRequest {
  type: "submit_answer";
  roomId: EntityId;
  stageId: EntityId;
  playerId: EntityId;
  teamSlotId: EntityId;
  content: string;
}

export interface SubmitAnswerResponse {
  attempt: AnswerAttempt;
  playerState: PlayerStageState | null;
  scores: PlayerScoreSnapshot[];
  snapshot: RoomSnapshot;
}

export interface RequestPrivateChatRequest {
  type: "request_private_chat";
  roomId: EntityId;
  stageId: EntityId;
  requesterPlayerId: EntityId;
  targetPlayerId: EntityId;
}

export interface RequestPrivateChatResponse {
  request: PrivateChatRequest;
  snapshot: RoomSnapshot;
}

export interface RespondPrivateChatRequest {
  type: "respond_private_chat";
  roomId: EntityId;
  requestId: EntityId;
  responderPlayerId: EntityId;
  accept: boolean;
}

export interface RespondPrivateChatResponse {
  request: PrivateChatRequest;
  session: PrivateChatSession | null;
  snapshot: RoomSnapshot;
}

export interface CloseRoomRequest {
  type: "close_room";
  roomId: EntityId;
  requestedByPlayerId: EntityId;
  reason?: string;
}

export interface CloseRoomResponse {
  room: Room;
  snapshot: RoomSnapshot;
}

export interface JudgeQuestionRequest {
  type: "judge_question";
  roomId: EntityId;
  stageId: EntityId;
  playerId: EntityId;
  payload: QuestionJudgementRequest;
}

export interface JudgeQuestionResponse {
  response: QuestionJudgementResponse;
  envelope: JudgementStorageEnvelope;
  manualReview: ManualReviewRecord | null;
  snapshot: RoomSnapshot;
}

export interface JudgeAnswerRequest {
  type: "judge_answer";
  roomId: EntityId;
  stageId: EntityId;
  playerId: EntityId;
  payload: AnswerJudgementRequest;
}

export interface JudgeAnswerResponse {
  response: AnswerJudgementResponse;
  envelope: JudgementStorageEnvelope;
  manualReview: ManualReviewRecord | null;
  snapshot: RoomSnapshot;
}

export interface OperatorOverrideRequest {
  type: "operator_override";
  roomId: EntityId;
  stageId: EntityId;
  actorId: EntityId;
  reviewId: EntityId;
  publicOutcome: "correct" | "wrong" | "needs_review";
  reason: string;
}

export interface OperatorOverrideResponse {
  review: ManualReviewRecord;
  snapshot: RoomSnapshot;
}

export type GameCommandRequest =
  | SetReadyRequest
  | AssignTeamsRequest
  | StartStageRequest
  | AcquireInvestigationLockRequest
  | ReleaseInvestigationLockRequest
  | SubmitQuestionRequest
  | SubmitAnswerRequest
  | RequestPrivateChatRequest
  | RespondPrivateChatRequest
  | CloseRoomRequest
  | JudgeQuestionRequest
  | JudgeAnswerRequest
  | OperatorOverrideRequest;

export type GameCommandResponse =
  | SetReadyResponse
  | AssignTeamsResponse
  | StartStageResponse
  | AcquireInvestigationLockResponse
  | ReleaseInvestigationLockResponse
  | SubmitQuestionResponse
  | SubmitAnswerResponse
  | RequestPrivateChatResponse
  | RespondPrivateChatResponse
  | CloseRoomResponse
  | JudgeQuestionResponse
  | JudgeAnswerResponse
  | OperatorOverrideResponse;

export interface SendChatMessageRequest {
  roomId: EntityId;
  stageId?: EntityId | null;
  playerId: EntityId;
  teamSlotId?: EntityId | null;
  channel: "global" | "team" | "private";
  content: string;
}

export interface SendChatMessageResponse {
  message: ChatMessage;
}

export interface ListChatMessagesRequest {
  roomId: EntityId;
  stageId?: EntityId | null;
  channel?: "global" | "team" | "private";
}

export interface ListChatMessagesResponse {
  messages: ChatMessage[];
}
