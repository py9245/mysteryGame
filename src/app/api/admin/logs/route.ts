import type { AdminLogListResponse } from "@/contracts/admin";
import type { ApiFailure, ApiResponse } from "@/contracts/api";
import { listAdminLogsFromStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";
import { resolveOperator } from "../_shared/auth";

export const runtime = "nodejs";

function liveStorageRequired(): ApiFailure {
  return {
    ok: false,
    error: {
      code: "LIVE_STORAGE_REQUIRED",
      message: "관리자 로그는 Supabase 런타임 설정이 필요합니다.",
    },
  };
}

function createValidationFailure(message: string, details?: Record<string, unknown>): ApiFailure {
  return {
    ok: false,
    error: {
      code: "BAD_REQUEST",
      message,
      details,
    },
  };
}

function normalizeOptional(value: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
    const data = await listAdminLogsFromStore({
      roomId: normalizeOptional(url.searchParams.get("roomId")),
      actorId: normalizeOptional(url.searchParams.get("actorId")),
      action: normalizeOptional(url.searchParams.get("action")),
      limit,
    });

    return Response.json(
      { ok: true, data } satisfies ApiResponse<AdminLogListResponse>,
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "ADMIN_LOGS_FETCH_FAILED",
          message: error instanceof Error ? error.message : "관리자 로그를 불러오지 못했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
