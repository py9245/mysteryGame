import type { EntityId, IsoTimestamp } from "./game";

export type QuestionJudgementValue = "YES" | "NO" | "PARTIAL" | "IRRELEVANT";
export type QuestionPublicReply =
  | "네, 그렇습니다."
  | "아니오, 그렇지 않습니다."
  | "그럴 수도 있습니다."
  | "중요하지 않습니다.";

export type AnswerJudgementValue =
  | "accepted"
  | "rejected"
  | "ambiguous"
  | "manual_review";
export type AnswerPublicOutcome = "correct" | "wrong" | "needs_review";

export interface JudgementConversationContext {
  roomId: EntityId;
  stageId: EntityId;
  playerId: EntityId;
  teamSlotId: EntityId | null;
  visibleHints: string[];
  previousQuestionIds: EntityId[];
  previousAnswerIds: EntityId[];
}

export interface JudgementVisibilityContext {
  viewMode: string;
  canSeeStageSecrets: boolean;
  canSeeOwnLockState: boolean;
  isSolvedLocked: boolean;
}

export interface QuestionJudgementRequest {
  caseId: string;
  stageNumber: number;
  playerId: EntityId;
  teamSlotId: EntityId | null;
  questionText: string;
  conversationContext: JudgementConversationContext;
  visibilityContext: JudgementVisibilityContext;
}

export interface QuestionJudgementResponse {
  judgement: QuestionJudgementValue;
  reasonCode: string;
  publicReply: QuestionPublicReply;
  manualReviewRequired: boolean;
  safetyFlags: string[];
  logSummary: string;
}

export interface AnswerJudgementRequest {
  caseId: string;
  stageNumber: number;
  playerId: EntityId;
  teamSlotId: EntityId | null;
  answerText: string;
  conversationContext: JudgementConversationContext;
  visibilityContext: JudgementVisibilityContext;
}

export interface AnswerJudgementResponse {
  result: AnswerJudgementValue;
  publicOutcome: AnswerPublicOutcome;
  matchedRequiredKeywords: string[];
  missingRequiredKeywords: string[];
  matchedBonusKeywords: string[];
  reasonCode: string;
  publicSummary: string;
  needsOperatorOverride: boolean;
}

export type ReviewTargetKind = "question" | "answer";
export type JudgementRecordKind = ReviewTargetKind;
export type JudgementReviewStatus = "pending" | "approved" | "rejected" | "merged";
export type JudgementPublicSource = "ai" | "operator";
export type JudgementPersistenceState =
  | "stored"
  | "queued_for_review"
  | "reviewed"
  | "overridden";

export interface JudgementRequestBase {
  roomId: EntityId;
  gameId: EntityId | null;
  stageId: EntityId;
  playerId: EntityId;
  caseId: string;
  stageNumber: number;
  kind: JudgementRecordKind;
  createdAt: IsoTimestamp;
}

export interface JudgementRecordBase {
  id: EntityId;
  request: JudgementRequestBase;
  publicOutcome: string;
  publicSummary: string;
  internalPayload: {
    reasonCode: string;
    judgement?: QuestionJudgementValue | AnswerJudgementValue;
    safetyFlags?: string[];
    matchedRequiredKeywords?: string[];
    missingRequiredKeywords?: string[];
    matchedBonusKeywords?: string[];
    logSummary: string;
  };
  manualReviewRequired: boolean;
  needsOperatorOverride: boolean;
  persistenceState: JudgementPersistenceState;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface ManualReviewRecord {
  id: EntityId;
  roomId: EntityId;
  gameId: EntityId | null;
  stageId: EntityId;
  playerId: EntityId;
  kind: ReviewTargetKind;
  request: QuestionJudgementRequest | AnswerJudgementRequest;
  response: QuestionJudgementResponse | AnswerJudgementResponse;
  publicOutcome: string;
  operatorOverrideStatus: "pending" | "approved" | "rejected" | "merged";
  operatorOverrideReason: string | null;
  createdAt: IsoTimestamp;
  reviewedAt: IsoTimestamp | null;
  reviewedBy: EntityId | null;
}

export interface JudgementReviewQueueItem {
  reviewId: EntityId;
  judgementId: EntityId;
  kind: JudgementRecordKind;
  roomId: EntityId;
  stageId: EntityId;
  playerId: EntityId;
  publicOutcome: string;
  reviewStatus: JudgementReviewStatus;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface JudgementOverrideRecord {
  id: EntityId;
  reviewId: EntityId;
  judgementId: EntityId;
  roomId: EntityId;
  stageId: EntityId;
  operatorId: EntityId;
  previousPublicOutcome: string;
  newPublicOutcome: string;
  overrideReason: string;
  appliedBy: JudgementPublicSource;
  createdAt: IsoTimestamp;
}

export interface JudgementStorageEnvelope {
  judgementId?: EntityId;
  reviewId?: EntityId | null;
  manualReviewRequired: boolean;
  needsOperatorOverride: boolean;
  publicPayload: {
    publicReply?: QuestionPublicReply;
    publicOutcome?: AnswerPublicOutcome;
    publicSummary: string;
  };
  internalPayload: {
    judgement?: QuestionJudgementValue | AnswerJudgementValue;
    reasonCode: string;
    safetyFlags?: string[];
    matchedRequiredKeywords?: string[];
    missingRequiredKeywords?: string[];
    matchedBonusKeywords?: string[];
    logSummary: string;
  };
}
