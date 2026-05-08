export type AdminReviewCategory =
  | "question_review"
  | "answer_review"
  | "override_follow_up";

export type AdminReviewKind = "question" | "answer";
export type AdminReviewQueueStatus = "pending" | "escalated" | "resolved";
export type AdminReviewPriority = "normal" | "high";
export type AdminReviewActionOwner = "operator" | "ai_runtime" | "content";
export type AdminReviewFollowUpState =
  | "awaiting_decision"
  | "awaiting_override"
  | "completed";

export interface AdminReviewPlayerRef {
  id: string;
  nickname: string;
}

export interface AdminReviewStatusInfo {
  publicLabel: string;
  internalCode: string;
}

export interface AdminReviewNextAction {
  label: string;
  owner: AdminReviewActionOwner;
}

export interface AdminReviewLinks {
  judgementExampleId: string | null;
  judgementId: string;
  reviewId: string;
  overrideId: string | null;
}

export interface AdminReviewFollowUpInfo {
  state: AdminReviewFollowUpState;
  note: string;
}

export interface AdminReviewQueueItem {
  id: string;
  category: AdminReviewCategory;
  kind: AdminReviewKind;
  queueStatus: AdminReviewQueueStatus;
  priority: AdminReviewPriority;
  caseId: string;
  stageNumber: number;
  roomId: string;
  stageId: string;
  player: AdminReviewPlayerRef;
  status: AdminReviewStatusInfo;
  reasonCode: string;
  summary: string;
  blockingField: string;
  nextAction: AdminReviewNextAction;
  links: AdminReviewLinks;
  followUp: AdminReviewFollowUpInfo;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReviewQueueData {
  version: string;
  items: AdminReviewQueueItem[];
}

export type AdminOverrideAction = "approved" | "rejected";
export type AdminOverridePublicOutcome = "correct" | "wrong" | "needs_review";

export interface AdminOverrideOperatorRef {
  id: string;
  label: string;
}

export interface AdminOverrideResult {
  publicOutcome: AdminOverridePublicOutcome;
  publicSummary: string;
  internalNote: string;
}

export interface AdminOverrideLinks {
  queueItemId: string;
  judgementExampleId: string | null;
}

export interface AdminOverrideLogItem {
  id: string;
  reviewId: string;
  kind: AdminReviewKind;
  action: AdminOverrideAction;
  operator: AdminOverrideOperatorRef;
  result: AdminOverrideResult;
  links: AdminOverrideLinks;
  appliedAt: string;
}

export interface AdminOverrideLogData {
  version: string;
  items: AdminOverrideLogItem[];
}

export interface NormalizedAdminReviewQueueItem extends AdminReviewQueueItem {
  categoryLabel: string;
  queueStatusLabel: string;
  priorityLabel: string;
  linkedOverride: AdminOverrideLogItem | null;
  hasLinkedOverride: boolean;
}

export interface AdminReviewCountBucket<T extends string> {
  key: T;
  label: string;
  count: number;
}

export interface NormalizedAdminReviewDashboard {
  totalCount: number;
  activeCount: number;
  resolvedCount: number;
  followUpCount: number;
  pendingOverrideCount: number;
  highPriorityCount: number;
  linkedOverrideCount: number;
  categoryCounts: Array<AdminReviewCountBucket<AdminReviewCategory>>;
  statusCounts: Array<AdminReviewCountBucket<AdminReviewQueueStatus>>;
  followUpCounts: Array<AdminReviewCountBucket<AdminReviewFollowUpState>>;
  overrideActionCounts: Array<AdminReviewCountBucket<AdminOverrideAction>>;
  overrideOutcomeCounts: Array<AdminReviewCountBucket<AdminOverridePublicOutcome>>;
  groupedItems: Array<{
    category: AdminReviewCategory;
    label: string;
    count: number;
    items: NormalizedAdminReviewQueueItem[];
  }>;
  items: NormalizedAdminReviewQueueItem[];
}

const CATEGORY_LABELS: Record<AdminReviewCategory, string> = {
  question_review: "Question Review",
  answer_review: "Answer Review",
  override_follow_up: "Override Follow-Up",
};

const STATUS_LABELS: Record<AdminReviewQueueStatus, string> = {
  pending: "Pending",
  escalated: "Escalated",
  resolved: "Resolved",
};

const PRIORITY_LABELS: Record<AdminReviewPriority, string> = {
  normal: "Normal",
  high: "High",
};

export function getAdminReviewCategoryLabel(category: AdminReviewCategory): string {
  return CATEGORY_LABELS[category];
}

export function getAdminReviewQueueStatusLabel(status: AdminReviewQueueStatus): string {
  return STATUS_LABELS[status];
}

function getAdminReviewPriorityLabel(priority: AdminReviewPriority): string {
  return PRIORITY_LABELS[priority];
}

function buildCountBuckets<T extends string>(
  keys: readonly T[],
  labelOf: (key: T) => string,
  items: T[],
): Array<AdminReviewCountBucket<T>> {
  return keys.map((key) => ({
    key,
    label: labelOf(key),
    count: items.filter((item) => item === key).length,
  }));
}

export function buildAdminReviewDashboard(
  reviewQueue: AdminReviewQueueData,
  overrideLog: AdminOverrideLogData,
): NormalizedAdminReviewDashboard {
  const overrideById = new Map(overrideLog.items.map((item) => [item.id, item]));

  const items = reviewQueue.items.map((item) => {
    const linkedOverride = item.links.overrideId ? overrideById.get(item.links.overrideId) ?? null : null;

    return {
      ...item,
      categoryLabel: getAdminReviewCategoryLabel(item.category),
      queueStatusLabel: getAdminReviewQueueStatusLabel(item.queueStatus),
      priorityLabel: getAdminReviewPriorityLabel(item.priority),
      linkedOverride,
      hasLinkedOverride: linkedOverride !== null,
    } satisfies NormalizedAdminReviewQueueItem;
  });

  const categoryKeys = [
    "question_review",
    "answer_review",
    "override_follow_up",
  ] as const satisfies readonly AdminReviewCategory[];
  const statusKeys = ["pending", "escalated", "resolved"] as const satisfies readonly AdminReviewQueueStatus[];

  return {
    totalCount: items.length,
    activeCount: items.filter((item) => item.queueStatus !== "resolved").length,
    resolvedCount: items.filter((item) => item.queueStatus === "resolved").length,
    followUpCount: items.filter((item) => item.category === "override_follow_up").length,
    pendingOverrideCount: items.filter((item) => item.followUp.state === "awaiting_override").length,
    highPriorityCount: items.filter((item) => item.priority === "high").length,
    linkedOverrideCount: items.filter((item) => item.hasLinkedOverride).length,
    categoryCounts: buildCountBuckets(
      categoryKeys,
      getAdminReviewCategoryLabel,
      items.map((item) => item.category),
    ),
    statusCounts: buildCountBuckets(
      statusKeys,
      getAdminReviewQueueStatusLabel,
      items.map((item) => item.queueStatus),
    ),
    followUpCounts: buildCountBuckets(
      ["awaiting_decision", "awaiting_override", "completed"] as const,
      (state) =>
        ({
          awaiting_decision: "Awaiting Decision",
          awaiting_override: "Awaiting Override",
          completed: "Completed",
        })[state],
      items.map((item) => item.followUp.state),
    ),
    overrideActionCounts: buildCountBuckets(
      ["approved", "rejected"] as const,
      (action) =>
        ({
          approved: "Approved",
          rejected: "Rejected",
        })[action],
      overrideLog.items.map((item) => item.action),
    ),
    overrideOutcomeCounts: buildCountBuckets(
      ["correct", "wrong", "needs_review"] as const,
      (outcome) =>
        ({
          correct: "Correct",
          wrong: "Wrong",
          needs_review: "Needs Review",
        })[outcome],
      overrideLog.items.map((item) => item.result.publicOutcome),
    ),
    groupedItems: categoryKeys.map((category) => {
      const categoryItems = items.filter((item) => item.category === category);

      return {
        category,
        label: getAdminReviewCategoryLabel(category),
        count: categoryItems.length,
        items: categoryItems,
      };
    }),
    items,
  };
}
