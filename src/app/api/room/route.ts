import { NextResponse } from "next/server";
import type {
  ApiFailure,
  ApiResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  ListRoomDirectoryResponse,
} from "@/contracts/api";
import { createGuestViewer, getCurrentViewerFromCookies, applyGuestProfileCookie } from "@/server/auth-session";
import { buildSampleCreateRoomResponse } from "@/server/sample-room-snapshot";
import { createRoomInStore, listRoomDirectoryFromStore } from "@/server/live-store";
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

function isApiFailure(
  value: CreateRoomRequest | ApiFailure,
): value is ApiFailure {
  return "ok" in value;
}

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function validateCreateRoomRequest(
  body: unknown,
): CreateRoomRequest | ApiFailure {
  if (!isRecord(body)) {
    return createValidationFailure("Request body must be a JSON object.");
  }

  const hostNickname = normalizeRequiredString(body.hostNickname);
  const roomMode = normalizeRequiredString(body.roomMode);
  const roomTitle = normalizeRequiredString(body.roomTitle);
  const roomPassword = normalizeRequiredString(body.roomPassword);
  const stageCount = typeof body.stageCount === "number" && Number.isFinite(body.stageCount)
    ? Math.floor(body.stageCount)
    : undefined;
  const maxPlayers = typeof body.maxPlayers === "number" && Number.isFinite(body.maxPlayers)
    ? Math.floor(body.maxPlayers)
    : undefined;

  return {
    hostNickname: hostNickname ?? undefined,
    roomMode: roomMode === "public" || roomMode === "secret" || roomMode === "practice" ? roomMode : undefined,
    roomTitle: roomTitle ?? undefined,
    roomPassword: roomPassword ?? undefined,
    stageCount,
    maxPlayers,
  };
}

export async function GET(request: Request) {
  if (isSupabaseEnabled()) {
    try {
      const searchParams = new URL(request.url).searchParams;
      const sort =
        searchParams.get("sort") === "least_players" ? "least_players" : "newest";
      const search = searchParams.get("search");
      const rooms = await listRoomDirectoryFromStore({ sort, search });

      return Response.json(
        {
          ok: true,
          data: rooms,
        } satisfies ApiResponse<ListRoomDirectoryResponse>,
        { status: 200 },
      );
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "ROOM_DIRECTORY_FAILED",
            message: error instanceof Error ? error.message : "방 목록을 불러오지 못했습니다.",
          },
        },
        { status: 500 },
      );
    }
  }

  return Response.json(
    {
      ok: true,
      data: {
        sort: "newest",
        search: null,
        rooms: [],
      } satisfies ListRoomDirectoryResponse,
    } satisfies ApiResponse<ListRoomDirectoryResponse>,
    { status: 200 },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    const payload = createValidationFailure("Request body must be valid JSON.", {
      expected: "CreateRoomRequest",
    });

    return Response.json(payload, { status: 400 });
  }

  const validated = validateCreateRoomRequest(body);
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
      const response = await createRoomInStore(
        resolvedNickname,
        viewer?.kind === "account" ? viewer.account.accountId : null,
        {
          roomMode: validated.roomMode,
          roomTitle: validated.roomTitle,
          roomPassword: validated.roomPassword,
          stageCount: validated.stageCount,
          maxPlayers: validated.maxPlayers,
        },
      );
      const payload = {
        ok: true,
        data: response,
      } satisfies ApiResponse<CreateRoomResponse>;

      const nextResponse = NextResponse.json(payload, { status: 200 });
      if (!viewer || viewer.kind === "guest") {
        applyGuestProfileCookie(nextResponse, { nickname: resolvedNickname });
      }
      return nextResponse;
    } catch (error) {
      const payload = createValidationFailure(
        error instanceof Error ? error.message : "Failed to create room in Supabase.",
        { provider: "supabase" },
      );

      return Response.json(payload, { status: 500 });
    }
  }

  const payload = {
    ok: true,
    data: buildSampleCreateRoomResponse(resolvedNickname),
  } satisfies ApiResponse<CreateRoomResponse>;

  const nextResponse = NextResponse.json(payload, { status: 200 });
  if (!viewer || viewer.kind === "guest") {
    applyGuestProfileCookie(nextResponse, { nickname: resolvedNickname });
  }
  return nextResponse;
}
