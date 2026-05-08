import type { ApiResponse, RoomSnapshot } from "@/contracts/api";
import { buildSampleRoomSnapshot } from "@/server/sample-room-snapshot";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;
  const payload: ApiResponse<RoomSnapshot> = {
    ok: true,
    data: buildSampleRoomSnapshot(roomId),
  };

  return Response.json(payload, { status: 200 });
}
