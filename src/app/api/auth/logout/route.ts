import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { CurrentViewerResponse } from "@/contracts/account";
import type { ApiResponse } from "@/contracts/api";
import {
  getAuthenticatedViewerFromCookies,
  applyGuestProfileCookie,
  clearSessionCookie,
} from "@/server/auth-session";
import { revokeSession, SESSION_COOKIE_NAME } from "@/server/account-store";

export const runtime = "nodejs";

export async function POST() {
  const viewer = await getAuthenticatedViewerFromCookies();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await revokeSession(token);
  }

  const response = NextResponse.json(
    {
      ok: true,
      data: {
        viewer:
          viewer !== null
            ? {
                kind: "guest",
                nickname: viewer.nickname,
                guest: {
                  guestId: null,
                  nickname: viewer.nickname,
                  updatedAt: new Date().toISOString(),
                },
              }
            : null,
      },
    } satisfies ApiResponse<CurrentViewerResponse>,
    { status: 200 },
  );

  if (viewer) {
    applyGuestProfileCookie(response, { nickname: viewer.nickname });
  }

  clearSessionCookie(response);
  return response;
}
