import type {
  ApiFailure,
  ApiResponse,
  RoomSettingsResponse,
  RoomSnapshot,
  UpdateRoomSettingsRequest,
} from "@/contracts/api";
import {
  RoomSettingsError,
  getRoomSnapshotFromStore,
  updateRoomSettingsInStore,
} from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createValidationFailure(
  message: string,
  details?: Record<string, unknown>,
): ApiFailure {
  return {
    ok: false,
    error: {
      code: "BAD_REQUEST",
      message,
      details,
    },
  };
}

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function validateUpdateRoomSettingsRequest(
  body: unknown,
  roomId: string,
): UpdateRoomSettingsRequest | ApiFailure {
  if (!isRecord(body)) {
    return createValidationFailure("Request body must be a JSON object.");
  }

  const requestedRoomId = normalizeRequiredString(body.roomId);
  const requestedByPlayerId = normalizeRequiredString(body.requestedByPlayerId);
  const title = normalizeRequiredString(body.title);
  const mode = normalizeRequiredString(body.mode);
  const roomPassword = normalizeRequiredString(body.roomPassword);
  const stageCount =
    typeof body.stageCount === "number" && Number.isFinite(body.stageCount)
      ? Math.floor(body.stageCount)
      : undefined;
  const maxPlayers =
    typeof body.maxPlayers === "number" && Number.isFinite(body.maxPlayers)
      ? Math.floor(body.maxPlayers)
      : undefined;

  if (requestedRoomId && requestedRoomId !== roomId) {
    return createValidationFailure("roomId does not match the URL path.", {
      field: "roomId",
    });
  }

  if (!requestedByPlayerId) {
    return createValidationFailure("requestedByPlayerId is required.", {
      field: "requestedByPlayerId",
    });
  }

  return {
    roomId,
    requestedByPlayerId,
    title: title ?? undefined,
    mode: mode === "public" || mode === "secret" || mode === "practice" ? mode : undefined,
    roomPassword: roomPassword ?? undefined,
    stageCount,
    maxPlayers,
  };
}

function resolveRoomSettingsErrorStatus(error: RoomSettingsError): number {
  switch (error.code) {
    case "ROOM_NOT_FOUND":
      return 404;
    case "REQUESTER_NOT_ALLOWED":
      return 403;
    case "PASSWORD_REQUIRED":
    case "ROOM_TOO_SMALL":
    case "ROOM_TOO_FULL":
    case "ROOM_NOT_EDITABLE":
    case "INVALID_ROOM_MODE":
      return 409;
    default:
      return 400;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId: roomRef } = await context.params;

  if (isSupabaseEnabled()) {
    try {
      const searchParams = new URL(request.url).searchParams;
      const requestedPlayerId = searchParams.get("playerId")?.trim() || undefined;

      if (requestedPlayerId && !isUuidLike(requestedPlayerId)) {
        return Response.json(
          {
            ok: false,
            error: {
              code: "INVALID_PLAYER_ID",
              message: "유효하지 않은 플레이어 식별자입니다.",
            },
          },
          { status: 400 },
        );
      }

      const snapshot = await getRoomSnapshotFromStore(roomRef, requestedPlayerId, {
        lightweight: true,
        touchPresence: false,
      });

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

  return Response.json(
    {
      ok: false,
      error: {
        code: "LIVE_STORAGE_REQUIRED",
        message: "방 상태 조회는 Supabase 런타임 설정이 필요합니다.",
      },
    } satisfies ApiResponse<RoomSnapshot>,
    { status: 501 },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId: roomRef } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      createValidationFailure("Request body must be valid JSON.", {
        expected: "UpdateRoomSettingsRequest",
      }),
      { status: 400 },
    );
  }

  const validated = validateUpdateRoomSettingsRequest(body, roomRef);
  if ("ok" in validated) {
    return Response.json(validated, { status: 400 });
  }

  if (!isSupabaseEnabled()) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "LIVE_STORAGE_REQUIRED",
          message: "방 설정 변경은 Supabase 런타임 설정이 필요합니다.",
        },
      } satisfies ApiResponse<RoomSettingsResponse>,
      { status: 501 },
    );
  }

  try {
    const response = await updateRoomSettingsInStore(validated);
    const payload: ApiResponse<RoomSettingsResponse> = {
      ok: true,
      data: response,
    };

    return Response.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof RoomSettingsError) {
      return Response.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: resolveRoomSettingsErrorStatus(error) },
      );
    }

    return Response.json(
      {
        ok: false,
        error: {
          code: "ROOM_SETTINGS_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "방 설정을 변경하지 못했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
