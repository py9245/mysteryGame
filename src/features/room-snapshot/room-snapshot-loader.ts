import type { AnswerPublicOutcome, QuestionPublicReply } from "../../contracts/judgement";
import type { RedactedValue, RoomViewSnapshot } from "../../contracts/view";
import { SAMPLE_ROOM_ID } from "../../server/sample-room-snapshot";
import { mockRoomSnapshot, type RoomSnapshot } from "@/features/mock/mock-room-snapshot";

type SnapshotStage = NonNullable<RoomSnapshot["stage"]>;
type SnapshotResults = NonNullable<RoomSnapshot["results"]>;

export interface RoomSnapshotLoaderOptions {
  roomId?: string;
  roomCode?: string;
  stageNumber?: number;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  fallback?: RoomSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toPublicReply(value: unknown): QuestionPublicReply {
  switch (value) {
    case "YES":
      return "네, 그렇습니다.";
    case "NO":
      return "아니오, 그렇지 않습니다.";
    case "MAYBE":
      return "그럴 수도 있습니다.";
    default:
      return "중요하지 않습니다.";
  }
}

function toPublicOutcome(value: unknown): AnswerPublicOutcome {
  switch (value) {
    case "correct":
      return "correct";
    case "incorrect":
      return "wrong";
    default:
      return "needs_review";
  }
}

function resolveRoomId(options: RoomSnapshotLoaderOptions): string {
  return options.roomId ?? options.roomCode ?? SAMPLE_ROOM_ID;
}

function resolveEndpoint(options: RoomSnapshotLoaderOptions): string {
  const base =
    options.endpoint ??
    process.env.ROOM_SNAPSHOT_ENDPOINT ??
    process.env.NEXT_PUBLIC_ROOM_SNAPSHOT_ENDPOINT ??
    `/api/room/${encodeURIComponent(resolveRoomId(options))}`;

  try {
    const url = new URL(base, "http://localhost");
    if (typeof options.stageNumber === "number" && !url.searchParams.has("stageNumber")) {
      url.searchParams.set("stageNumber", String(options.stageNumber));
    }

    const resolved = url.toString();
    return resolved.startsWith("http://localhost") ? resolved.replace("http://localhost", "") : resolved;
  } catch {
    return `/api/room/${encodeURIComponent(resolveRoomId(options))}`;
  }
}

function normalizeQuestionJudgement(
  value: unknown,
  fallback: SnapshotStage["lastQuestionJudgement"],
): SnapshotStage["lastQuestionJudgement"] {
  if (isRecord(value) && typeof value.publicReply === "string") {
    return { publicReply: value.publicReply as QuestionPublicReply };
  }

  if (isRecord(value) && typeof value.judgement === "string") {
    return { publicReply: toPublicReply(value.judgement) };
  }

  if (typeof value === "string") {
    return { publicReply: toPublicReply(value) };
  }

  return fallback;
}

function normalizeAnswerResult(
  value: unknown,
  fallback: SnapshotStage["lastAnswerResult"],
): SnapshotStage["lastAnswerResult"] {
  if (isRecord(value) && typeof value.publicOutcome === "string") {
    return {
      publicOutcome: value.publicOutcome as AnswerPublicOutcome,
      publicSummary: typeof value.publicSummary === "string" ? value.publicSummary : null,
    };
  }

  if (isRecord(value) && typeof value.result === "string") {
    return {
      publicOutcome: toPublicOutcome(value.result),
      publicSummary: typeof value.publicSummary === "string" ? value.publicSummary : null,
    };
  }

  if (typeof value === "string") {
    return {
      publicOutcome: toPublicOutcome(value),
      publicSummary: null,
    };
  }

  return fallback;
}

function normalizeHints(value: unknown, fallback: SnapshotStage["visibleHints"]): SnapshotStage["visibleHints"] {
  if (
    Array.isArray(value) &&
    value.every((hint) => isRecord(hint) && typeof hint.player === "string" && typeof hint.id === "string")
  ) {
    return value as SnapshotStage["visibleHints"];
  }

  return fallback;
}

function normalizeInvestigation(
  value: unknown,
  fallback: SnapshotStage["investigation"],
): SnapshotStage["investigation"] {
  if (!isRecord(value)) {
    return fallback;
  }

  const merged = { ...(fallback ?? null), ...value } as SnapshotStage["investigation"];
  return merged;
}

function normalizeStage(
  value: unknown,
  fallback: SnapshotStage | null,
): SnapshotStage | null {
  if (!isRecord(value) || !fallback) {
    return fallback;
  }

  return {
    ...fallback,
    ...value,
    visibleHints: normalizeHints(value.visibleHints, fallback.visibleHints),
    investigation: normalizeInvestigation(value.investigation, fallback.investigation),
    lastQuestionJudgement: normalizeQuestionJudgement(value.lastQuestionJudgement, fallback.lastQuestionJudgement),
    lastAnswerResult: normalizeAnswerResult(value.lastAnswerResult, fallback.lastAnswerResult),
    redacted: isRecord(value.redacted) ? { ...fallback.redacted, ...value.redacted } : fallback.redacted,
  };
}

function normalizeResults(value: unknown, fallback: SnapshotResults | null): SnapshotResults | null {
  if (!isRecord(value) || !fallback) {
    return fallback;
  }

  return {
    ...fallback,
    ...value,
    publicSummary:
      typeof value.publicSummary === "string" || value.publicSummary === null
        ? (value.publicSummary as string | null)
        : fallback.publicSummary,
  };
}

export function normalizeRoomSnapshot(
  value: unknown,
  fallback: RoomSnapshot = mockRoomSnapshot,
): RoomSnapshot {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    ...fallback,
    ...value,
    stage: normalizeStage(value.stage, fallback.stage),
    results: normalizeResults(value.results, fallback.results),
  };
}

export async function loadRoomSnapshot(
  options: RoomSnapshotLoaderOptions = {},
): Promise<RoomSnapshot> {
  const fallback = options.fallback ?? mockRoomSnapshot;
  const endpoint = resolveEndpoint(options);

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(endpoint, { cache: "no-store" });
    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as RoomViewSnapshot | RoomSnapshot | { ok?: boolean; data?: unknown; snapshot?: unknown };
    const roomSnapshot =
      isRecord(payload) && "data" in payload
        ? payload.data
        : isRecord(payload) && "snapshot" in payload
          ? payload.snapshot
          : payload;

    return normalizeRoomSnapshot(roomSnapshot, fallback);
  } catch {
    return fallback;
  }
}
