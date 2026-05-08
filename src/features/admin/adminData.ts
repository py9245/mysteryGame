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

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function loadAdminRuntimeData(): Promise<AdminRuntimeData> {
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

  return {
    caseIndex,
    caseCatalog: buildAdminCaseCatalog(caseIndex, caseFiles),
    copyPack: await readJson<AdminRuntimeData["copyPack"]>(copyPackPath),
    copyKeyMap: await readJson<AdminRuntimeData["copyKeyMap"]>(copyKeyMapPath),
    aiReviewFlow: await readJson<AdminAiReviewFlowData>(aiReviewFlowPath),
    reviewQueue: await readJson<AdminReviewQueueData>(reviewQueuePath),
    overrideLog: await readJson<AdminOverrideLogData>(overrideLogPath),
    aiRuntimeGuide: await buildAdminAiRuntimeGuide(),
    judgementExamples: await readJson<AdminRuntimeData["judgementExamples"]>(judgementExamplesPath),
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
