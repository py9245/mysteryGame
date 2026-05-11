import { NextResponse } from "next/server";
import type { ApiFailure, ApiResponse, LeaveRoomRequest, LeaveRoomResponse } from "@/contracts/api";
import { clearActiveRoomCookie, getActiveRoomMembershipFromCookies } from "@/server/auth-session";
import { LeaveRoomError, leaveRoomInStore } from "@/server/live-store";
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

function validateLeaveRoomRequest(
  body: unknown,
  roomId: string,
): LeaveRoomRequest | ApiFailure {
  if (!isRecord(body)) {
    return createValidationFailure("Request body must be a JSON object.");
  }

  const requestedRoomId = normalizeRequiredString(body.roomId);
  const playerId = normalizeRequiredString(body.playerId);

  if (requestedRoomId && requestedRoomId !== roomId) {
    return createValidationFailure("roomId does not match the URL path.", {
      field: "roomId",
    });
  }

  if (!playerId) {
    return createValidationFailure("playerId is required.", {
      field: "playerId",
    });
  }

  return {
    roomId,
    playerId,
  };
}

function resolveLeaveRoomErrorStatus(error: LeaveRoomError): number {
  switch (error.code) {
    case "ROOM_NOT_FOUND":
    case "PLAYER_NOT_FOUND":
      return 404;
    default:
      return 409;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      createValidationFailure("Request body must be valid JSON.", {
        expected: "LeaveRoomRequest",
      }),
      { status: 400 },
    );
  }

  const validated = validateLeaveRoomRequest(body, roomId);
  if ("ok" in validated) {
    return Response.json(validated, { status: 400 });
  }

  if (!isSupabaseEnabled()) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "LIVE_STORAGE_REQUIRED",
          message: "방 나가기는 Supabase 런타임 설정이 필요합니다.",
        },
      } satisfies ApiResponse<LeaveRoomResponse>,
      { status: 501 },
    );
  }

  try {
    const response = await leaveRoomInStore(validated.roomId, validated.playerId);
    const activeRoomMembership = await getActiveRoomMembershipFromCookies();
    const nextResponse = NextResponse.json(
      {
        ok: true,
        data: response,
      } satisfies ApiResponse<LeaveRoomResponse>,
      { status: 200 },
    );

    if (
      activeRoomMembership?.roomId === response.roomId &&
      activeRoomMembership.playerId === response.playerId
    ) {
      clearActiveRoomCookie(nextResponse);
    }

    return nextResponse;
  } catch (error) {
    if (error instanceof LeaveRoomError) {
      return Response.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: resolveLeaveRoomErrorStatus(error) },
      );
    }

    return Response.json(
      {
        ok: false,
        error: {
          code: "ROOM_LEAVE_FAILED",
          message: error instanceof Error ? error.message : "방 나가기에 실패했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
