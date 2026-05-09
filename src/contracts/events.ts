import type {
  AnswerAttempt,
  EntityId,
  HintReveal,
  InvestigationLock,
  IsoTimestamp,
  Player,
  PlayerStageState,
  PrivateChatRequest,
  PrivateChatSession,
  Question,
  Stage,
  StageTeamAssignment,
  TeamSlot,
} from "./game";
import type { PlayerScoreSnapshot, RoomSnapshot } from "./api";

export type RealtimeEventName =
  | "room.updated"
  | "room.ready_changed"
  | "teams.assigned"
  | "stage.briefing_started"
  | "stage.started"
  | "stage.timer_updated"
  | "hint.revealed"
  | "investigation.locked"
  | "investigation.released"
  | "question.submitted"
  | "question.judged"
  | "answer.submitted"
  | "answer.judged"
  | "player.solved"
  | "player.locked"
  | "score.updated"
  | "private_chat.requested"
  | "private_chat.expired"
  | "private_chat.busy"
  | "private_chat.accepted"
  | "private_chat.rejected"
  | "private_chat.ended"
  | "stage.ended"
  | "stage.results_revealed"
  | "game.finished";

export interface RealtimeEventPayloadMap {
  "room.updated": {
    roomId: EntityId;
    snapshot: RoomSnapshot;
  };
  "room.ready_changed": {
    roomId: EntityId;
    players: Player[];
  };
  "teams.assigned": {
    roomId: EntityId;
    stageId: EntityId | null;
    teamSlots: TeamSlot[];
    assignments: StageTeamAssignment[];
  };
  "stage.briefing_started": {
    roomId: EntityId;
    stage: Stage;
  };
  "stage.started": {
    roomId: EntityId;
    stage: Stage;
    playerStates: PlayerStageState[];
  };
  "stage.timer_updated": {
    roomId: EntityId;
    stageId: EntityId;
    now: IsoTimestamp;
    remainingSeconds: number;
  };
  "hint.revealed": {
    roomId: EntityId;
    stageId: EntityId;
    reveal: HintReveal;
  };
  "investigation.locked": {
    roomId: EntityId;
    lock: InvestigationLock;
  };
  "investigation.released": {
    roomId: EntityId;
    lock: InvestigationLock;
  };
  "question.submitted": {
    roomId: EntityId;
    stageId: EntityId;
    question: Question;
  };
  "question.judged": {
    roomId: EntityId;
    stageId: EntityId;
    question: Question;
  };
  "answer.submitted": {
    roomId: EntityId;
    stageId: EntityId;
    attempt: AnswerAttempt;
  };
  "answer.judged": {
    roomId: EntityId;
    stageId: EntityId;
    attempt: AnswerAttempt;
  };
  "player.solved": {
    roomId: EntityId;
    stageId: EntityId;
    playerId: EntityId;
    solvedPlayerIds: EntityId[];
  };
  "player.locked": {
    roomId: EntityId;
    stageId: EntityId;
    playerState: PlayerStageState;
  };
  "score.updated": {
    roomId: EntityId;
    stageId: EntityId | null;
    scores: PlayerScoreSnapshot[];
  };
  "private_chat.requested": {
    roomId: EntityId;
    request: PrivateChatRequest;
  };
  "private_chat.expired": {
    roomId: EntityId;
    request: PrivateChatRequest;
  };
  "private_chat.busy": {
    roomId: EntityId;
    request: PrivateChatRequest;
  };
  "private_chat.accepted": {
    roomId: EntityId;
    request: PrivateChatRequest;
    session: PrivateChatSession;
  };
  "private_chat.rejected": {
    roomId: EntityId;
    request: PrivateChatRequest;
  };
  "private_chat.ended": {
    roomId: EntityId;
    session: PrivateChatSession;
  };
  "stage.ended": {
    roomId: EntityId;
    stage: Stage;
  };
  "stage.results_revealed": {
    roomId: EntityId;
    stage: Stage;
    scores: PlayerScoreSnapshot[];
  };
  "game.finished": {
    roomId: EntityId;
    gameId: EntityId;
    finalScores: PlayerScoreSnapshot[];
  };
}

export interface RealtimeEnvelope<EventName extends RealtimeEventName> {
  event: EventName;
  payload: RealtimeEventPayloadMap[EventName];
  emittedAt: IsoTimestamp;
}
