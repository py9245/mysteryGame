import type { ApiResponse, ListChatMessagesResponse } from "@/contracts/api";
import { listChatMessagesFromStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;

  if (isSupabaseEnabled()) {
    try {
      const searchParams = new URL(request.url).searchParams;
      const stageId = searchParams.get("stageId");
      const payload: ApiResponse<ListChatMessagesResponse> = {
        ok: true,
        data: await listChatMessagesFromStore(roomId, stageId && stageId.trim().length > 0 ? stageId.trim() : null),
      };

      return Response.json(payload, { status: 200 });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "CHAT_FETCH_FAILED",
            message: error instanceof Error ? error.message : "채팅을 불러오지 못했습니다.",
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
        message: "채팅 조회는 Supabase 런타임 설정이 필요합니다.",
      },
    } satisfies ApiResponse<ListChatMessagesResponse>,
    { status: 501 },
  );
}
