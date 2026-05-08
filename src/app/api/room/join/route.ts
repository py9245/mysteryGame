import type {
  ApiFailure,
  ApiResponse,
  JoinRoomRequest,
  JoinRoomResponse,
} from "@/contracts/api";
import { joinRoomInStore, RoomJoinError } from "@/server/live-store";
import { buildSampleJoinRoomResponse } from "@/server/sample-room-snapshot";
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

function isApiFailure(
  value: JoinRoomRequest | ApiFailure,
): value is ApiFailure {
  return "ok" in value;
}

function validateJoinRoomRequest(
  body: unknown,
): JoinRoomRequest | ApiFailure {
  if (!isRecord(body)) {
    return createValidationFailure("Request body must be a JSON object.");
  }

  const roomCode = normalizeRequiredString(body.roomCode);
  if (!roomCode) {
    return createValidationFailure("roomCode is required.", {
      field: "roomCode",
    });
  }

  const nickname = normalizeRequiredString(body.nickname);
  if (!nickname) {
    return createValidationFailure("nickname is required.", {
      field: "nickname",
    });
  }

  return {
    roomCode: roomCode.toUpperCase(),
    nickname,
  };
}

function resolveJoinErrorStatus(error: RoomJoinError): number {
  switch (error.code) {
    case "ROOM_NOT_FOUND":
      return 404;
    case "ROOM_FULL":
    case "NICKNAME_TAKEN":
    case "ROOM_NOT_JOINABLE":
      return 409;
    default:
      return 400;
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    const payload = createValidationFailure("Request body must be valid JSON.", {
      expected: "JoinRoomRequest",
    });

    return Response.json(payload, { status: 400 });
  }

  const validated = validateJoinRoomRequest(body);
  if (isApiFailure(validated)) {
    return Response.json(validated, { status: 400 });
  }

  if (isSupabaseEnabled()) {
    try {
      const response = await joinRoomInStore(
        validated.roomCode,
        validated.nickname,
      );
      const payload = {
        ok: true,
        data: response,
      } satisfies ApiResponse<JoinRoomResponse>;

      return Response.json(payload, { status: 200 });
    } catch (error) {
      if (error instanceof RoomJoinError) {
        return Response.json(
          {
            ok: false,
            error: {
              code: error.code,
              message: error.message,
            },
          },
          { status: resolveJoinErrorStatus(error) },
        );
      }

      return Response.json(
        createValidationFailure(
          error instanceof Error ? error.message : "Failed to join room in Supabase.",
          { provider: "supabase" },
        ),
        { status: 500 },
      );
    }
  }

  const payload = {
    ok: true,
    data: buildSampleJoinRoomResponse(validated.roomCode, validated.nickname),
  } satisfies ApiResponse<JoinRoomResponse>;

  return Response.json(payload, { status: 200 });
}
