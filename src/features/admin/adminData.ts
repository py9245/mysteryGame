import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildAdminAiRuntimeGuide,
  type AdminAiRuntimeGuide,
} from "./adminAiRuntimeData";
import type { AdminAiReviewFlowData } from "./adminAiFlowData";
import {
  buildAdminCaseCatalog,
  type AdminCaseCatalog,
  type AdminCaseFileData,
  type AdminCaseIndex,
} from "./adminCaseData";
import type {
  AdminOverrideLogData,
  AdminReviewQueueData,
} from "./adminReviewData";

export interface AdminRuntimeData {
  caseIndex: AdminCaseIndex;
  caseCatalog: AdminCaseCatalog;
  copyPack: {
    categories: Record<string, Record<string, unknown>>;
  };
  copyKeyMap: {
    slots: Record<string, Record<string, string>>;
  };
  aiReviewFlow: AdminAiReviewFlowData;
  reviewQueue: AdminReviewQueueData;
  overrideLog: AdminOverrideLogData;
  aiRuntimeGuide: AdminAiRuntimeGuide;
  judgementExamples: {
    version: string;
    items: Array<Record<string, unknown>>;
  };
}

type DbJudgementRecordRow = {
  id: string;
  room_id: string;
  stage_id: string;
  player_id: string;
  kind: "question" | "answer";
  case_id: string;
  stage_number: number;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  public_outcome: string;
  public_summary: string;
  internal_payload: Record<string, unknown>;
  manual_review_required: boolean;
  needs_operator_override: boolean;
  created_at: string;
  updated_at: string;
};

type DbJudgementReviewQueueRow = {
  review_id: string;
  judgement_id: string;
  room_id: string;
  stage_id: string;
  player_id: string;
  kind: "question" | "answer";
  public_outcome: string;
  review_status: "pending" | "approved" | "rejected" | "merged";
  review_summary: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type DbJudgementOverrideRow = {
  id: string;
  review_id: string;
  judgement_id: string;
  room_id: string;
  stage_id: string;
  operator_id: string;
  previous_public_outcome: string;
  new_public_outcome: string;
  override_reason: string;
  applied_by: string;
  created_at: string;
};

type DbPlayerNicknameRow = {
  id: string;
  nickname: string;
};

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function isAdminLiveReviewEnabled(): boolean {
  return process.env.ENABLE_ADMIN_REVIEW_LIVE === "true";
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function normalizeReviewCategory(
  row: DbJudgementReviewQueueRow,
  linkedOverride: DbJudgementOverrideRow | null,
): AdminReviewQueueData["items"][number]["category"] {
  if (linkedOverride) {
    return "override_follow_up";
  }

  return row.kind === "question" ? "question_review" : "answer_review";
}

function normalizeQueueStatus(
  row: DbJudgementReviewQueueRow,
  record: DbJudgementRecordRow | undefined,
): AdminReviewQueueData["items"][number]["queueStatus"] {
  if (row.review_status === "approved" || row.review_status === "rejected" || row.review_status === "merged") {
    return "resolved";
  }

  if (record?.needs_operator_override || row.public_outcome === "needs_review") {
    return "escalated";
  }

  return "pending";
}

function normalizePriority(
  row: DbJudgementReviewQueueRow,
  record: DbJudgementRecordRow | undefined,
): AdminReviewQueueData["items"][number]["priority"] {
  if (record?.needs_operator_override || row.kind === "answer") {
    return "high";
  }

  return "normal";
}

function normalizeFollowUpState(
  row: DbJudgementReviewQueueRow,
  record: DbJudgementRecordRow | undefined,
  linkedOverride: DbJudgementOverrideRow | null,
): AdminReviewQueueData["items"][number]["followUp"]["state"] {
  if (linkedOverride || row.review_status === "approved" || row.review_status === "rejected" || row.review_status === "merged") {
    return "completed";
  }

  if (record?.needs_operator_override || row.public_outcome === "needs_review") {
    return "awaiting_override";
  }

  return "awaiting_decision";
}

function normalizeReasonCode(record: DbJudgementRecordRow | undefined): string {
  if (!record) {
    return "UNKNOWN";
  }

  const fromResponse = record.response.reasonCode;
  if (typeof fromResponse === "string" && fromResponse.length > 0) {
    return fromResponse;
  }

  const fromInternal = record.internal_payload.reasonCode;
  if (typeof fromInternal === "string" && fromInternal.length > 0) {
    return fromInternal;
  }

  return "UNKNOWN";
}

async function loadLiveAdminReviewData(): Promise<{
  reviewQueue: AdminReviewQueueData;
  overrideLog: AdminOverrideLogData;
} | null> {
  try {
    if (!isAdminLiveReviewEnabled()) {
      return null;
    }

    const { getSupabaseAdminClient } = await import("@/server/supabase-admin");
    const supabase = getSupabaseAdminClient();
    const [{ data: queueRows, error: queueError }, { data: overrideRows, error: overrideError }] =
      await Promise.all([
        supabase
          .from("judgement_review_queue")
          .select("*")
          .order("created_at", { ascending: false })
          .returns<DbJudgementReviewQueueRow[]>(),
        supabase
          .from("judgement_overrides")
          .select("*")
          .order("created_at", { ascending: false })
          .returns<DbJudgementOverrideRow[]>(),
      ]);

    if (queueError || overrideError) {
      return null;
    }

    const queueItems = queueRows ?? [];
    const overrideItems = overrideRows ?? [];

    if (queueItems.length === 0 && overrideItems.length === 0) {
      return null;
    }

    const judgementIds = Array.from(
      new Set([
        ...queueItems.map((item) => item.judgement_id),
        ...overrideItems.map((item) => item.judgement_id),
      ]),
    );
    const playerIds = Array.from(
      new Set([
        ...queueItems.map((item) => item.player_id),
        ...overrideItems.map((item) => item.operator_id),
      ]),
    );

    const [{ data: records, error: recordsError }, { data: players, error: playersError }] =
      await Promise.all([
        judgementIds.length > 0
          ? supabase
              .from("judgement_records")
              .select("*")
              .in("id", judgementIds)
              .returns<DbJudgementRecordRow[]>()
          : Promise.resolve({ data: [], error: null }),
        playerIds.length > 0
          ? supabase
              .from("players")
              .select("id, nickname")
              .in("id", playerIds)
              .returns<DbPlayerNicknameRow[]>()
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (recordsError || playersError) {
      return null;
    }

    const recordById = new Map((records ?? []).map((record) => [record.id, record]));
    const playerById = new Map((players ?? []).map((player) => [player.id, player]));
    const overrideByReviewId = new Map(overrideItems.map((item) => [item.review_id, item]));

    const reviewQueue: AdminReviewQueueData = {
      version: "live",
      items: queueItems.map((row) => {
        const record = recordById.get(row.judgement_id);
        const linkedOverride = overrideByReviewId.get(row.review_id) ?? null;
        const queueStatus = normalizeQueueStatus(row, record);
        const followUpState = normalizeFollowUpState(row, record, linkedOverride);
        const player = playerById.get(row.player_id);

        return {
          id: row.review_id,
          category: normalizeReviewCategory(row, linkedOverride),
          kind: row.kind,
          queueStatus,
          priority: normalizePriority(row, record),
          caseId: record?.case_id ?? "unknown-case",
          stageNumber: record?.stage_number ?? 0,
          roomId: row.room_id,
          stageId: row.stage_id,
          player: {
            id: row.player_id,
            nickname: player?.nickname ?? "unknown",
          },
          status: {
            publicLabel: asString(row.review_summary, record?.public_summary ?? "운영자 검토가 필요합니다."),
            internalCode: row.review_status,
          },
          reasonCode: normalizeReasonCode(record),
          summary: asString(record?.public_summary, "판정 결과를 다시 확인해야 합니다."),
          blockingField: record?.needs_operator_override ? "needsOperatorOverride" : "manualReviewRequired",
          nextAction: {
            label:
              followUpState === "awaiting_override"
                ? "운영자 최종 판단"
                : followUpState === "completed"
                  ? "로그 확인"
                  : "판정 검토",
            owner: "operator",
          },
          links: {
            judgementExampleId: null,
            judgementId: row.judgement_id,
            reviewId: row.review_id,
            overrideId: linkedOverride?.id ?? null,
          },
          followUp: {
            state: followUpState,
            note: asString(row.review_summary, "운영자 검토 후 다음 공개 결과를 확정합니다."),
          },
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }),
    };

    const overrideLog: AdminOverrideLogData = {
      version: "live",
      items: overrideItems.map((row) => {
        const record = recordById.get(row.judgement_id);
        const operator = playerById.get(row.operator_id);

        return {
          id: row.id,
          reviewId: row.review_id,
          kind: record?.kind ?? "answer",
          action: row.new_public_outcome === row.previous_public_outcome ? "rejected" : "approved",
          operator: {
            id: row.operator_id,
            label: operator?.nickname ?? "operator",
          },
          result: {
            publicOutcome:
              row.new_public_outcome === "correct" || row.new_public_outcome === "wrong"
                ? row.new_public_outcome
                : "needs_review",
            publicSummary: asString(record?.public_summary, row.override_reason),
            internalNote: row.override_reason,
          },
          links: {
            queueItemId: row.review_id,
            judgementExampleId: null,
          },
          appliedAt: row.created_at,
        };
      }),
    };

    return {
      reviewQueue,
      overrideLog,
    };
  } catch {
    return null;
  }
}

async function loadAdminStaticRuntimeData(): Promise<AdminRuntimeData> {
  const root = process.cwd();
  const caseIndexPath = join(root, "data/cases/index.json");
  const copyPackPath = join(root, "data/admin/copy-pack.json");
  const copyKeyMapPath = join(root, "data/admin/copy-key-map.json");
  const aiReviewFlowPath = join(root, "data/admin/ai-review-flow.json");
  const reviewQueuePath = join(root, "data/admin/review-queue.json");
  const overrideLogPath = join(root, "data/admin/override-log.json");
  const judgementExamplesPath = join(root, "data/admin/judgement-examples.json");
  const caseIndex = await readJson<AdminCaseIndex>(caseIndexPath);
  const caseFiles = await Promise.all(
    caseIndex.cases.map((caseEntry) =>
      readJson<AdminCaseFileData>(
        join(root, "data/cases", caseEntry.file.replace(/^\.\//, "")),
      ),
    ),
  );
  const liveAdminReviewData = await loadLiveAdminReviewData();

  return {
    caseIndex,
    caseCatalog: buildAdminCaseCatalog(caseIndex, caseFiles),
    copyPack: await readJson<AdminRuntimeData["copyPack"]>(copyPackPath),
    copyKeyMap: await readJson<AdminRuntimeData["copyKeyMap"]>(copyKeyMapPath),
    aiReviewFlow: await readJson<AdminAiReviewFlowData>(aiReviewFlowPath),
    reviewQueue:
      liveAdminReviewData?.reviewQueue ??
      (await readJson<AdminReviewQueueData>(reviewQueuePath)),
    overrideLog:
      liveAdminReviewData?.overrideLog ??
      (await readJson<AdminOverrideLogData>(overrideLogPath)),
    aiRuntimeGuide: await buildAdminAiRuntimeGuide(),
    judgementExamples: await readJson<AdminRuntimeData["judgementExamples"]>(judgementExamplesPath),
  };
}

export async function loadAdminFallbackRuntimeData(): Promise<AdminRuntimeData> {
  return loadAdminStaticRuntimeData();
}

export async function loadAdminRuntimeData(): Promise<AdminRuntimeData> {
  const staticData = await loadAdminStaticRuntimeData();
  const liveAdminReviewData = await loadLiveAdminReviewData();

  if (!liveAdminReviewData) {
    return staticData;
  }

  return {
    ...staticData,
    reviewQueue: liveAdminReviewData.reviewQueue,
    overrideLog: liveAdminReviewData.overrideLog,
  };
}

export function getAdminScaffoldNotes() {
  return [
    "현재 화면은 data/admin과 data/cases를 읽는 runtime-facing placeholder다.",
    "backend contract와 UI wiring이 붙기 전까지는 읽기 전용 요약만 제공한다.",
    "case index는 실제 case file을 함께 로드해 title, question, keywords, hints, status까지 보여준다.",
    "manual review와 override는 실제 API 연결 전에는 mock note로만 표현한다.",
    "ai-review-flow.json은 POST /api/ai/text 예시와 review queue/override log 연결 규칙을 보관한다.",
    "review queue는 question review / answer review / override follow-up category로 정리되어 있다.",
    "override log는 queue item link와 operator result payload를 함께 보관한다.",
    "judgement examples는 question / answer / manual review의 경계 샘플이다.",
    "AI Runtime은 provider, model, route, env key와 기능별 client 연결만 읽기 전용으로 노출한다.",
  ] as const;
}
