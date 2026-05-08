import type { ApiResponse, GetGameSnapshotResponse } from "@/contracts/api";
import { buildSampleGameSnapshot } from "@/server/sample-game-snapshot";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;
  const payload: ApiResponse<GetGameSnapshotResponse> = {
    ok: true,
    data: buildSampleGameSnapshot(roomId),
  };

  return Response.json(payload, { status: 200 });
}
