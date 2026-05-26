import { touchRoomPresenceInStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";

export const runtime = "nodejs";

function normalizePlayerId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;

  if (!isSupabaseEnabled()) {
    return new Response(null, { status: 204 });
  }

  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "playerId가 필요합니다.",
        },
      },
      { status: 400 },
    );
  }

  const playerId =
    typeof body === "object" &&
    body !== null &&
    "playerId" in body
      ? normalizePlayerId((body as Record<string, unknown>).playerId)
      : null;

  if (!playerId) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "playerId가 필요합니다.",
        },
      },
      { status: 400 },
    );
  }

  if (!isUuidLike(playerId)) {
    return new Response(null, { status: 204 });
  }

  try {
    const touched = await touchRoomPresenceInStore(roomId, playerId);
    if (!touched) {
      return new Response(null, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "PRESENCE_SYNC_FAILED",
          message: error instanceof Error ? error.message : "presence 갱신에 실패했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
