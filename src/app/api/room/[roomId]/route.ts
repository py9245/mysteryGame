import type { ApiResponse, RoomSnapshot } from "@/contracts/api";
import { buildSampleRoomSnapshot } from "@/server/sample-room-snapshot";
import { getRoomSnapshotFromStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId: roomRef } = await context.params;

  if (isSupabaseEnabled()) {
    try {
      const searchParams = new URL(request.url).searchParams;
      const playerId = searchParams.get("playerId")?.trim() || undefined;
      const snapshot = await getRoomSnapshotFromStore(roomRef, playerId);

      if (!snapshot) {
        return Response.json(
          {
            ok: false,
            error: {
              code: "ROOM_NOT_FOUND",
              message: "요청한 방을 찾을 수 없습니다.",
            },
          },
          { status: 404 },
        );
      }

      const payload: ApiResponse<RoomSnapshot> = {
        ok: true,
        data: snapshot,
      };

      return Response.json(payload, { status: 200 });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "ROOM_FETCH_FAILED",
            message: error instanceof Error ? error.message : "방 상태를 불러오지 못했습니다.",
          },
        },
        { status: 500 },
      );
    }
  }

  const payload: ApiResponse<RoomSnapshot> = {
    ok: true,
    data: buildSampleRoomSnapshot(roomRef),
  };

  return Response.json(payload, { status: 200 });
}
