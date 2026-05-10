import type { ApiResponse, GetGameSnapshotResponse } from "@/contracts/api";
import { getGameRuntimeSnapshotFromStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;

  if (isSupabaseEnabled()) {
    try {
      const snapshot = await getGameRuntimeSnapshotFromStore(roomId);
      if (!snapshot) {
        return Response.json(
          {
            ok: false,
            error: {
              code: "GAME_NOT_FOUND",
              message: "요청한 게임 상태를 찾을 수 없습니다.",
            },
          },
          { status: 404 },
        );
      }

      const payload: ApiResponse<GetGameSnapshotResponse> = {
        ok: true,
        data: { snapshot },
      };

      return Response.json(payload, { status: 200 });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "GAME_FETCH_FAILED",
            message: error instanceof Error ? error.message : "게임 상태를 불러오지 못했습니다.",
          },
        },
        { status: 500 },
      );
    }
  }

  return Response.json(
    {
      ok: false,
      error: {
        code: "LIVE_STORAGE_REQUIRED",
        message: "실제 게임 상태 조회는 Supabase 런타임 설정이 필요합니다.",
      },
    } satisfies ApiResponse<GetGameSnapshotResponse>,
    { status: 501 },
  );
}
