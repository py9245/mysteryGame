import type { ApiResponse, ListChatMessagesResponse } from "@/contracts/api";
import { listChatMessagesFromStore } from "@/server/live-store";
import { buildSampleChatMessages } from "@/server/sample-chat-messages";
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

  const payload: ApiResponse<ListChatMessagesResponse> = {
    ok: true,
    data: buildSampleChatMessages(roomId),
  };

  return Response.json(payload, { status: 200 });
}
