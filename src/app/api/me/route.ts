import { NextResponse } from "next/server";
import type {
  CurrentViewer,
  CurrentViewerResponse,
  UpdateNicknameRequest,
} from "@/contracts/account";
import type { ApiFailure, ApiResponse } from "@/contracts/api";
import {
  applyGuestProfileCookie,
  createGuestViewer,
  getAuthenticatedViewerFromCookies,
  getCurrentViewerFromCookies,
} from "@/server/auth-session";
import { updateAccountNickname } from "@/server/account-store";

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

function validateUpdateNicknameRequest(
  body: unknown,
): UpdateNicknameRequest | ApiFailure {
  if (!isRecord(body)) {
    return createValidationFailure("Request body must be a JSON object.");
  }

  const nickname = normalizeRequiredString(body.nickname);

  if (!nickname) {
    return createValidationFailure("nickname is required.", { field: "nickname" });
  }

  return { nickname };
}

export async function GET() {
  const viewer = await getCurrentViewerFromCookies();

  if (!viewer) {
    const guestViewer = createGuestViewer();
    const response = NextResponse.json(
      {
        ok: true,
        data: {
          viewer: guestViewer,
        },
      } satisfies ApiResponse<CurrentViewerResponse>,
      { status: 200 },
    );

    applyGuestProfileCookie(response, {
      guestId: guestViewer.guest.guestId,
      nickname: guestViewer.nickname,
    });
    return response;
  }

  if (viewer.kind === "guest" && !viewer.guest.guestId) {
    const repairedGuestViewer = createGuestViewer(viewer.nickname);
    const response = NextResponse.json(
      {
        ok: true,
        data: {
          viewer: repairedGuestViewer,
        },
      } satisfies ApiResponse<CurrentViewerResponse>,
      { status: 200 },
    );

    applyGuestProfileCookie(response, {
      guestId: repairedGuestViewer.guest.guestId,
      nickname: repairedGuestViewer.nickname,
    });
    return response;
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        viewer,
      },
    } satisfies ApiResponse<CurrentViewerResponse>,
    { status: 200 },
  );
}

export async function PATCH(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      createValidationFailure("Request body must be valid JSON.", {
        expected: "UpdateNicknameRequest",
      }),
      { status: 400 },
    );
  }

  const validated = validateUpdateNicknameRequest(body);

  if ("ok" in validated) {
    return NextResponse.json(validated, { status: 400 });
  }

  const authenticatedViewer = await getAuthenticatedViewerFromCookies();

  if (authenticatedViewer) {
    const viewer = await updateAccountNickname(
      authenticatedViewer.accountId,
      validated.nickname,
    );
    const response = NextResponse.json(
      {
        ok: true,
        data: {
          viewer: {
            kind: "account",
            nickname: viewer.nickname,
            account: viewer,
          },
        },
      } satisfies ApiResponse<CurrentViewerResponse>,
      { status: 200 },
    );

    applyGuestProfileCookie(response, { nickname: viewer.nickname });
    return response;
  }

  return NextResponse.json(
    createValidationFailure("게스트 닉네임은 수정할 수 없습니다. 먼저 계정으로 로그인해 주세요.", {
      code: "GUEST_NICKNAME_LOCKED",
    }),
    { status: 403 },
  );
}
