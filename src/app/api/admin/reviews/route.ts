import type {
  AdminOperatorOverrideResponse,
  AdminReviewQueueListResponse,
} from "@/contracts/admin";
import type { ApiFailure, ApiResponse } from "@/contracts/api";
import type { JudgementReviewStatus } from "@/contracts/judgement";
import {
  applyOperatorOverrideInStore,
  listJudgementReviewQueueFromStore,
  OperatorOverrideError,
} from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";
import { resolveOperator } from "../_shared/auth";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createValidationFailure(
  message: string,
  details?: Record<string, unknown>,
): ApiFailure {
  return {
    ok: false,
    error: {
      code: "BAD_REQUEST",
      message,
      details,
    },
  };
}

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function liveStorageRequired(): ApiFailure {
  return {
    ok: false,
    error: {
      code: "LIVE_STORAGE_REQUIRED",
      message: "운영자 검토 큐는 Supabase 런타임 설정이 필요합니다.",
    },
  };
}

function parseReviewStatus(value: string | null): JudgementReviewStatus | "all" | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "pending" ||
    normalized === "approved" ||
    normalized === "rejected" ||
    normalized === "merged"
  ) {
    return normalized;
  }
  if (normalized === "all") {
    return "all";
  }
  return null;
}

function resolveOperatorOverrideErrorStatus(error: OperatorOverrideError): number {
  switch (error.code) {
    case "REVIEW_NOT_FOUND":
    case "JUDGEMENT_NOT_FOUND":
    case "OPERATOR_NOT_FOUND":
      return 404;
    case "OPERATOR_FORBIDDEN":
      return 403;
    case "REVIEW_ALREADY_RESOLVED":
    case "INVALID_OUTCOME":
      return 409;
    case "OVERRIDE_PERSISTENCE_FAILED":
    default:
      return 500;
  }
}

export async function GET(request: Request) {
  if (!isSupabaseEnabled()) {
    return Response.json(liveStorageRequired(), { status: 501 });
  }

  const authResult = await resolveOperator(request);
  if (!authResult.ok) {
    return Response.json(authResult.failure, { status: authResult.status });
  }

  const url = new URL(request.url);
  const status = parseReviewStatus(url.searchParams.get("status"));
  if (url.searchParams.get("status") && status === null) {
    return Response.json(
      createValidationFailure("status는 pending/approved/rejected/merged/all 중 하나여야 합니다.", {
        field: "status",
      }),
      { status: 400 },
    );
  }

  const roomId = normalizeRequiredString(url.searchParams.get("roomId"));
  const limitParam = url.searchParams.get("limit");
  let limit: number | undefined;
  if (limitParam !== null) {
    const parsed = Number.parseInt(limitParam, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return Response.json(
        createValidationFailure("limit must be a positive integer.", { field: "limit" }),
        { status: 400 },
      );
    }
    limit = parsed;
  }

  try {
    const data = await listJudgementReviewQueueFromStore({
      status: status ?? "pending",
      roomId: roomId ?? undefined,
      limit,
    });

    return Response.json(
      { ok: true, data } satisfies ApiResponse<AdminReviewQueueListResponse>,
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "REVIEW_QUEUE_FETCH_FAILED",
          message: error instanceof Error ? error.message : "운영자 검토 큐를 불러오지 못했습니다.",
        },
      },
      { status: 500 },
    );
  }
}

interface ParsedOverrideBody {
  reviewId: string;
  decision: "approve" | "reject";
  newPublicOutcome: "correct" | "wrong" | "needs_review";
  newPublicSummary: string | null;
  reason: string;
  operatorPlayerId: string;
}

function validateOverrideBody(body: unknown): ParsedOverrideBody | ApiFailure {
  if (!isRecord(body)) {
    return createValidationFailure("Request body must be a JSON object.");
  }

  const reviewId = normalizeRequiredString(body.reviewId);
  if (!reviewId) {
    return createValidationFailure("reviewId is required.", { field: "reviewId" });
  }

  const operatorPlayerId = normalizeRequiredString(body.operatorPlayerId);
  if (!operatorPlayerId) {
    return createValidationFailure("operatorPlayerId is required.", {
      field: "operatorPlayerId",
    });
  }

  const decision = normalizeRequiredString(body.decision);
  if (decision !== "approve" && decision !== "reject") {
    return createValidationFailure("decision must be 'approve' or 'reject'.", {
      field: "decision",
    });
  }

  const outcome = normalizeRequiredString(body.newPublicOutcome);
  if (outcome !== "correct" && outcome !== "wrong" && outcome !== "needs_review") {
    return createValidationFailure(
      "newPublicOutcome must be one of correct/wrong/needs_review.",
      { field: "newPublicOutcome" },
    );
  }

  const reason = normalizeRequiredString(body.reason);
  if (!reason) {
    return createValidationFailure("reason is required.", { field: "reason" });
  }
  if (reason.length > 1000) {
    return createValidationFailure("reason must be 1000 characters or fewer.", {
      field: "reason",
    });
  }

  const newPublicSummary =
    typeof body.newPublicSummary === "string" ? body.newPublicSummary.trim() : null;

  return {
    reviewId,
    decision,
    newPublicOutcome: outcome,
    newPublicSummary: newPublicSummary && newPublicSummary.length > 0 ? newPublicSummary : null,
    reason,
    operatorPlayerId,
  };
}

export async function POST(request: Request) {
  if (!isSupabaseEnabled()) {
    return Response.json(liveStorageRequired(), { status: 501 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      createValidationFailure("Request body must be valid JSON.", {
        expected: "AdminOperatorOverrideRequest",
      }),
      { status: 400 },
    );
  }

  const validated = validateOverrideBody(body);
  if ("ok" in validated) {
    return Response.json(validated, { status: 400 });
  }

  const authResult = await resolveOperator(request, validated.operatorPlayerId);
  if (!authResult.ok) {
    return Response.json(authResult.failure, { status: authResult.status });
  }

  if (authResult.operatorId !== validated.operatorPlayerId) {
    return Response.json(
      createValidationFailure(
        "operatorPlayerId가 인증된 운영자와 일치하지 않습니다.",
        { field: "operatorPlayerId" },
      ),
      { status: 403 },
    );
  }

  try {
    const data = await applyOperatorOverrideInStore({
      reviewId: validated.reviewId,
      operatorPlayerId: authResult.operatorId,
      decision: validated.decision,
      newPublicOutcome: validated.newPublicOutcome,
      newPublicSummary: validated.newPublicSummary,
      reason: validated.reason,
    });

    return Response.json(
      { ok: true, data } satisfies ApiResponse<AdminOperatorOverrideResponse>,
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof OperatorOverrideError) {
      return Response.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: resolveOperatorOverrideErrorStatus(error) },
      );
    }

    return Response.json(
      {
        ok: false,
        error: {
          code: "OVERRIDE_FAILED",
          message: error instanceof Error ? error.message : "운영자 override 적용에 실패했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
