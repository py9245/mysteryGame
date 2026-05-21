import type { AdminReviewQueueDetailResponse } from "@/contracts/admin";
import type { ApiFailure, ApiResponse } from "@/contracts/api";
import { getJudgementReviewDetailFromStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";
import { resolveOperator } from "../../_shared/auth";

export const runtime = "nodejs";

function liveStorageRequired(): ApiFailure {
  return {
    ok: false,
    error: {
      code: "LIVE_STORAGE_REQUIRED",
      message: "검토 항목 조회는 Supabase 런타임 설정이 필요합니다.",
    },
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ reviewId: string }> },
) {
  if (!isSupabaseEnabled()) {
    return Response.json(liveStorageRequired(), { status: 501 });
  }

  const authResult = await resolveOperator(request);
  if (!authResult.ok) {
    return Response.json(authResult.failure, { status: authResult.status });
  }

  const { reviewId } = await context.params;
  const trimmed = reviewId?.trim();
  if (!trimmed) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "reviewId is required.",
        },
      } satisfies ApiFailure,
      { status: 400 },
    );
  }

  try {
    const detail = await getJudgementReviewDetailFromStore(trimmed);
    if (!detail) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "REVIEW_NOT_FOUND",
            message: "검토 항목을 찾을 수 없습니다.",
          },
        } satisfies ApiFailure,
        { status: 404 },
      );
    }

    return Response.json(
      {
        ok: true,
        data: { detail },
      } satisfies ApiResponse<AdminReviewQueueDetailResponse>,
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "REVIEW_DETAIL_FETCH_FAILED",
          message: error instanceof Error ? error.message : "검토 항목을 불러오지 못했습니다.",
        },
      } satisfies ApiFailure,
      { status: 500 },
    );
  }
}
