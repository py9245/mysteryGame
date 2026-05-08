import type { ApiResponse, ListChatMessagesResponse } from "@/contracts/api";
import { buildSampleChatMessages } from "@/server/sample-chat-messages";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;
  const payload: ApiResponse<ListChatMessagesResponse> = {
    ok: true,
    data: buildSampleChatMessages(roomId),
  };

  return Response.json(payload, { status: 200 });
}
