import type {
  AdminOverrideAction,
  AdminOverrideLogData,
  AdminOverrideLogItem,
  AdminReviewCategory,
  AdminReviewQueueItem,
  AdminReviewQueueStatus,
} from "./adminReviewData";

export type AdminAiRoutePurpose = "question_judgement" | "answer_judgement";
export type AdminAiRoutingResult = "create_review_queue_item" | "skip_review_queue";

export interface AdminAiFlowRouteReference {
  textRoute: string;
  runtimeDoc: string;
  defaultProvider: string;
  defaultModel: string;
}

export interface AdminAiFlowRouteMessage {
  role: "developer" | "system" | "user" | "assistant";
  content: string;
}

export interface AdminAiFlowRouteRequest {
  provider: string;
  model: string;
  messages: AdminAiFlowRouteMessage[];
}

export interface AdminAiFlowNormalizedUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export interface AdminAiFlowNormalizedResponse {
  provider: string;
  model: string;
  text: string;
  finishReason: string | null;
  usage: AdminAiFlowNormalizedUsage | null;
}

export interface AdminAiFlowParsedJudgement {
  kind: "question" | "answer";
  judgement?: string;
  result?: string;
  publicReply?: string;
  publicOutcome?: string;
  publicSummary: string;
  reasonCode: string;
  manualReviewRequired: boolean;
  needsOperatorOverride: boolean;
  safetyFlags: string[];
  matchedRequiredKeywords?: string[];
  missingRequiredKeywords?: string[];
  matchedBonusKeywords?: string[];
}

export interface AdminAiFlowQueueAction {
  result: AdminAiRoutingResult;
  targetCategory: AdminReviewCategory | null;
  targetQueueItemId: string | null;
  note: string;
}

export interface AdminAiFlowRouteSample {
  id: string;
  label: string;
  purpose: AdminAiRoutePurpose;
  request: AdminAiFlowRouteRequest;
  normalizedResponse: AdminAiFlowNormalizedResponse;
  parsedJudgement: AdminAiFlowParsedJudgement;
  operatorFocus: string[];
  queueAction: AdminAiFlowQueueAction;
}

export interface AdminAiReviewRoutingRule {
  id: string;
  sourceKind: "question" | "answer" | "question_or_answer";
  trigger: string;
  result: AdminAiRoutingResult;
  targetCategory: AdminReviewCategory | null;
  targetQueueStatus: AdminReviewQueueStatus | null;
  blockingField: string | null;
  note: string;
}

export interface AdminAiOverrideTransition {
  id: string;
  sourceQueueItemId: string;
  operatorDecision: AdminOverrideAction;
  overrideLogId: string;
  followUpQueueItemId: string;
  resultPublicOutcome: string;
  note: string;
}

export interface AdminAiReviewFlowData {
  version: string;
  routeReference: AdminAiFlowRouteReference;
  operatorChecklist: string[];
  routeSamples: AdminAiFlowRouteSample[];
  reviewRoutingRules: AdminAiReviewRoutingRule[];
  overrideTransitions: AdminAiOverrideTransition[];
}

export interface NormalizedAdminAiFlowRouteSample extends AdminAiFlowRouteSample {
  linkedQueueItem: AdminReviewQueueItem | null;
}

export interface NormalizedAdminAiOverrideTransition extends AdminAiOverrideTransition {
  sourceQueueItem: AdminReviewQueueItem | null;
  linkedOverrideLog: AdminOverrideLogItem | null;
  followUpQueueItem: AdminReviewQueueItem | null;
}

export interface NormalizedAdminAiFlowGuide {
  totalRouteSamples: number;
  reviewCreationRuleCount: number;
  overrideTransitionCount: number;
  routeSamples: NormalizedAdminAiFlowRouteSample[];
  reviewRoutingRules: AdminAiReviewRoutingRule[];
  overrideTransitions: NormalizedAdminAiOverrideTransition[];
}

export function buildAdminAiFlowGuide(
  flow: AdminAiReviewFlowData,
  reviewQueue: { items: AdminReviewQueueItem[] },
  overrideLog: AdminOverrideLogData,
): NormalizedAdminAiFlowGuide {
  const queueById = new Map(reviewQueue.items.map((item) => [item.id, item]));
  const overrideById = new Map(overrideLog.items.map((item) => [item.id, item]));

  return {
    totalRouteSamples: flow.routeSamples.length,
    reviewCreationRuleCount: flow.reviewRoutingRules.filter(
      (rule) => rule.result === "create_review_queue_item",
    ).length,
    overrideTransitionCount: flow.overrideTransitions.length,
    routeSamples: flow.routeSamples.map((sample) => ({
      ...sample,
      linkedQueueItem: sample.queueAction.targetQueueItemId
        ? queueById.get(sample.queueAction.targetQueueItemId) ?? null
        : null,
    })),
    reviewRoutingRules: flow.reviewRoutingRules,
    overrideTransitions: flow.overrideTransitions.map((transition) => ({
      ...transition,
      sourceQueueItem: queueById.get(transition.sourceQueueItemId) ?? null,
      linkedOverrideLog: overrideById.get(transition.overrideLogId) ?? null,
      followUpQueueItem: queueById.get(transition.followUpQueueItemId) ?? null,
    })),
  };
}
