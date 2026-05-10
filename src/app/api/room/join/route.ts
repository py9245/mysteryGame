import type {
  ApiFailure,
  ApiResponse,
  JoinRoomRequest,
  JoinRoomResponse,
} from "@/contracts/api";
import {
  applyGuestProfileCookie,
  createGuestViewer,
  getCurrentViewerFromCookies,
} from "@/server/auth-session";
import { joinRoomInStore, RoomJoinError } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";
import { NextResponse } from "next/server";

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
  const roomPassword = normalizeRequiredString(body.roomPassword);
  return {
    roomCode: roomCode.toUpperCase(),
    nickname: nickname ?? undefined,
    roomPassword: roomPassword ?? undefined,
  };
}

function resolveJoinErrorStatus(error: RoomJoinError): number {
  switch (error.code) {
    case "ROOM_NOT_FOUND":
      return 404;
    case "ROOM_FULL":
    case "NICKNAME_TAKEN":
    case "ROOM_NOT_JOINABLE":
    case "ROOM_PASSWORD_REQUIRED":
      return 409;
    case "ROOM_PASSWORD_INVALID":
      return 403;
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

  const viewer = await getCurrentViewerFromCookies();
  const guestViewer = viewer ?? createGuestViewer();
  const resolvedNickname = guestViewer.nickname;

  if (!resolvedNickname) {
    return Response.json(
      createValidationFailure("닉네임을 먼저 설정하거나 로그인해야 합니다.", {
        field: "nickname",
      }),
      { status: 400 },
    );
  }

  if (isSupabaseEnabled()) {
    try {
      const response = await joinRoomInStore(
        validated.roomCode,
        resolvedNickname,
        viewer?.kind === "account" ? viewer.account.accountId : null,
        validated.roomPassword ?? null,
      );
      const payload = {
        ok: true,
        data: response,
      } satisfies ApiResponse<JoinRoomResponse>;

      const nextResponse = NextResponse.json(payload, { status: 200 });
      if (!viewer || viewer.kind === "guest") {
        applyGuestProfileCookie(nextResponse, { nickname: resolvedNickname });
      }
      return nextResponse;
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

  return Response.json(
    {
      ok: false,
      error: {
        code: "LIVE_STORAGE_REQUIRED",
        message: "방 입장은 Supabase 런타임 설정이 필요합니다.",
      },
    } satisfies ApiResponse<JoinRoomResponse>,
    { status: 501 },
  );
}
