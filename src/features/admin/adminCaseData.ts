export interface AdminCaseIndexEntry {
  id: string;
  stageNumber: number;
  file: string;
}

export interface AdminCaseIndex {
  version: string;
  cases: AdminCaseIndexEntry[];
}

export type AdminCaseDifficulty = "easy" | "normal" | "hard";
export type AdminCaseStatus = "draft" | "in_review" | "approved" | "archived";
export type AdminCaseHintTriggerType =
  | "time_elapsed"
  | "first_player_solved"
  | "stage_pressure";
export type AdminCaseHintStrength = "weak" | "medium" | "strong";

export interface AdminCaseHint {
  hintId: string;
  order: number;
  triggerType: AdminCaseHintTriggerType;
  strength: AdminCaseHintStrength;
  publicText: string;
  internalNote: string;
}

export interface AdminCaseFileData {
  id: string;
  stageNumber: number;
  difficulty: AdminCaseDifficulty;
  title: string;
  publicDescription: string;
  question: string;
  truth: string;
  requiredKeywords: string[];
  bonusKeywords: string[];
  acceptedAnswerSummary: string;
  hints: AdminCaseHint[];
  reviewNotes?: string;
  status: AdminCaseStatus;
  version: string;
}

export interface AdminCaseDetail extends AdminCaseFileData {
  file: string;
  difficultyLabel: string;
  statusLabel: string;
  hintCount: number;
}

export interface AdminCaseCountBucket<T extends string> {
  key: T;
  label: string;
  count: number;
}

export interface AdminCaseCatalog {
  totalCount: number;
  difficultyCounts: Array<AdminCaseCountBucket<AdminCaseDifficulty>>;
  statusCounts: Array<AdminCaseCountBucket<AdminCaseStatus>>;
  cases: AdminCaseDetail[];
}

const DIFFICULTY_LABELS: Record<AdminCaseDifficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

const STATUS_LABELS: Record<AdminCaseStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  archived: "Archived",
};

function buildCountBuckets<T extends string>(
  keys: readonly T[],
  labelOf: (key: T) => string,
  items: T[],
): Array<AdminCaseCountBucket<T>> {
  return keys.map((key) => ({
    key,
    label: labelOf(key),
    count: items.filter((item) => item === key).length,
  }));
}

export function getAdminCaseDifficultyLabel(difficulty: AdminCaseDifficulty): string {
  return DIFFICULTY_LABELS[difficulty];
}

export function getAdminCaseStatusLabel(status: AdminCaseStatus): string {
  return STATUS_LABELS[status];
}

export function buildAdminCaseCatalog(
  caseIndex: AdminCaseIndex,
  caseFiles: AdminCaseFileData[],
): AdminCaseCatalog {
  const caseFilesById = new Map(caseFiles.map((caseFile) => [caseFile.id, caseFile]));
  const difficultyKeys = ["easy", "normal", "hard"] as const satisfies readonly AdminCaseDifficulty[];
  const statusKeys = [
    "draft",
    "in_review",
    "approved",
    "archived",
  ] as const satisfies readonly AdminCaseStatus[];

  const cases = caseIndex.cases
    .map((entry) => {
      const caseFile = caseFilesById.get(entry.id);
      if (!caseFile) {
        throw new Error(`Case detail not found for ${entry.id}.`);
      }

      const hints = [...caseFile.hints].sort((left, right) => left.order - right.order);

      return {
        ...caseFile,
        file: entry.file,
        hints,
        difficultyLabel: getAdminCaseDifficultyLabel(caseFile.difficulty),
        statusLabel: getAdminCaseStatusLabel(caseFile.status),
        hintCount: hints.length,
      } satisfies AdminCaseDetail;
    })
    .sort((left, right) => left.stageNumber - right.stageNumber);

  return {
    totalCount: cases.length,
    difficultyCounts: buildCountBuckets(
      difficultyKeys,
      getAdminCaseDifficultyLabel,
      cases.map((caseItem) => caseItem.difficulty),
    ),
    statusCounts: buildCountBuckets(
      statusKeys,
      getAdminCaseStatusLabel,
      cases.map((caseItem) => caseItem.status),
    ),
    cases,
  };
}
