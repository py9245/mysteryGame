import type { EntityId, IsoTimestamp } from "./game";
import type {
  AnswerJudgementRequest,
  AnswerJudgementResponse,
  JudgementOverrideRecord,
  JudgementRecordKind,
  JudgementReviewStatus,
  QuestionJudgementRequest,
  QuestionJudgementResponse,
} from "./judgement";

export type AdminLogActorType = "operator" | "system" | "player";

export interface AdminLogEntry {
  id: EntityId;
  roomId: EntityId;
  gameId: EntityId | null;
  stageId: EntityId | null;
  actorType: AdminLogActorType;
  actorId: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: IsoTimestamp;
}

export type OperatorReviewDecision = "approve" | "reject";

export type OperatorOverridePublicOutcome = "correct" | "wrong" | "needs_review";

export interface AdminReviewQueueListItem {
  reviewId: EntityId;
  judgementId: EntityId;
  roomId: EntityId;
  stageId: EntityId;
  playerId: EntityId;
  kind: JudgementRecordKind;
  publicOutcome: string;
  reviewStatus: JudgementReviewStatus;
  reviewSummary: string;
  reviewedBy: string | null;
  reviewedAt: IsoTimestamp | null;
  needsOperatorOverride: boolean;
  caseId: string;
  stageNumber: number;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface AdminReviewQueueListResponse {
  items: AdminReviewQueueListItem[];
  totalCount: number;
}

export interface AdminReviewQueueDetail {
  reviewId: EntityId;
  judgementId: EntityId;
  roomId: EntityId;
  stageId: EntityId;
  playerId: EntityId;
  kind: JudgementRecordKind;
  publicOutcome: string;
  publicSummary: string;
  reviewStatus: JudgementReviewStatus;
  reviewSummary: string;
  reviewedBy: string | null;
  reviewedAt: IsoTimestamp | null;
  manualReviewRequired: boolean;
  needsOperatorOverride: boolean;
  caseId: string;
  stageNumber: number;
  request: QuestionJudgementRequest | AnswerJudgementRequest;
  response: QuestionJudgementResponse | AnswerJudgementResponse;
  internalPayload: Record<string, unknown>;
  override: JudgementOverrideRecord | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface AdminReviewQueueDetailResponse {
  detail: AdminReviewQueueDetail;
}

export interface AdminOperatorOverrideRequest {
  reviewId: EntityId;
  operatorPlayerId: EntityId;
  decision: OperatorReviewDecision;
  newPublicOutcome: OperatorOverridePublicOutcome;
  newPublicSummary?: string | null;
  reason: string;
}

export interface AdminOperatorOverrideResponse {
  override: JudgementOverrideRecord;
  review: AdminReviewQueueListItem;
  scoreRecalculationRequired: boolean;
}

export interface AdminLogListResponse {
  items: AdminLogEntry[];
  totalCount: number;
}
