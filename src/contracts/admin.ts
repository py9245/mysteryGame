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

export type AdminOperatorOverrideScoreRecalcReason =
  | "no_change"
  | "non_applicable_kind"
  | "already_applied"
  | "applied"
  | "no_op_outcome_pair"
  | "judgement_missing"
  | "failed";

export interface AdminOperatorOverrideScoreRecalcSummary {
  /** Whether reversal/replacement score_events were actually appended for this override. */
  applied: boolean;
  /** Number of reversal/replacement score_events appended (0 when no-op or failed). */
  eventCount: number;
  /** Machine-readable explanation of the recalculation result. */
  reason: AdminOperatorOverrideScoreRecalcReason;
}

export interface AdminOperatorOverrideResponse {
  override: JudgementOverrideRecord;
  review: AdminReviewQueueListItem;
  /**
   * Indicates whether downstream score reconciliation is still pending after this
   * override call. `false` when reconciliation succeeded or was a deterministic
   * no-op (same outcome, non-applicable judgement kind, etc.). `true` only when
   * reconciliation was attempted but failed - the failure is also recorded in
   * `admin_logs` and the override write itself is not rolled back.
   */
  scoreRecalculationRequired: boolean;
  /** Detail of the score_events reconciliation attempt. */
  scoreRecalculation?: AdminOperatorOverrideScoreRecalcSummary;
}

export interface AdminLogListResponse {
  items: AdminLogEntry[];
  totalCount: number;
}
