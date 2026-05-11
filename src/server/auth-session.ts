import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";
import type {
  CurrentViewer,
  GuestProfileView,
} from "@/contracts/account";
import {
  getAuthenticatedAccountByToken,
  SESSION_COOKIE_NAME,
} from "@/server/account-store";
import { nowUtcIso } from "@/server/time";

export const GUEST_PROFILE_COOKIE_NAME = "mt_guest_profile";
export const ACTIVE_ROOM_COOKIE_NAME = "mt_active_room";

type GuestProfileCookiePayload = {
  guestId?: string;
  nickname: string;
  updatedAt: string;
};

type ActiveRoomCookiePayload = {
  roomId: string;
  playerId: string;
  roomCode?: string | null;
  updatedAt: string;
};

export type ActiveRoomMembership = {
  roomId: string;
  playerId: string;
  roomCode: string | null;
  updatedAt: string | null;
};

function normalizeGuestNickname(nickname: string): string {
  return nickname.trim();
}

export function generateGuestNickname(): string {
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  return `Guest-${suffix}`;
}

export function generateGuestIdentity(): string {
  return randomBytes(8).toString("hex");
}

export function createGuestViewer(
  nickname = generateGuestNickname(),
  guestId = generateGuestIdentity(),
): Extract<CurrentViewer, { kind: "guest" }> {
  return {
    kind: "guest",
    nickname,
    guest: {
      guestId,
      nickname,
      updatedAt: nowUtcIso(),
    },
  };
}

function parseGuestProfileCookie(value: string | undefined): GuestProfileView | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as GuestProfileCookiePayload;

    if (
      typeof parsed.nickname !== "string" ||
      parsed.nickname.trim().length < 2 ||
      parsed.nickname.trim().length > 20
    ) {
      return null;
    }

    return {
      guestId:
        typeof parsed.guestId === "string" && parsed.guestId.trim().length > 0
          ? parsed.guestId.trim()
          : null,
      nickname: normalizeGuestNickname(parsed.nickname),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return null;
  }
}

function parseActiveRoomCookie(value: string | undefined): ActiveRoomMembership | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as ActiveRoomCookiePayload;

    if (
      typeof parsed.roomId !== "string" ||
      parsed.roomId.trim().length === 0 ||
      typeof parsed.playerId !== "string" ||
      parsed.playerId.trim().length === 0
    ) {
      return null;
    }

    return {
      roomId: parsed.roomId.trim(),
      playerId: parsed.playerId.trim(),
      roomCode: typeof parsed.roomCode === "string" && parsed.roomCode.trim().length > 0 ? parsed.roomCode.trim() : null,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return null;
  }
}

export async function getAuthenticatedViewerFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getAuthenticatedAccountByToken(token);
}

export async function getGuestProfileFromCookies(): Promise<GuestProfileView | null> {
  const cookieStore = await cookies();
  return parseGuestProfileCookie(cookieStore.get(GUEST_PROFILE_COOKIE_NAME)?.value);
}

export async function getCurrentViewerFromCookies(): Promise<CurrentViewer | null> {
  const accountViewer = await getAuthenticatedViewerFromCookies();

  if (accountViewer) {
    return {
      kind: "account",
      nickname: accountViewer.nickname,
      account: accountViewer,
    };
  }

  const guestViewer = await getGuestProfileFromCookies();

  if (guestViewer) {
    return {
      kind: "guest",
      nickname: guestViewer.nickname,
      guest: guestViewer,
    };
  }

  return null;
}

export async function getActiveRoomMembershipFromCookies(): Promise<ActiveRoomMembership | null> {
  const cookieStore = await cookies();
  return parseActiveRoomCookie(cookieStore.get(ACTIVE_ROOM_COOKIE_NAME)?.value);
}

export function applySessionCookie(
  response: NextResponse,
  session: { token: string; expiresAt: string },
): void {
  response.cookies.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export function applyGuestProfileCookie(
  response: NextResponse,
  input: { guestId?: string | null; nickname: string; updatedAt?: string | null },
): void {
  const payload: GuestProfileCookiePayload = {
    guestId:
      typeof input.guestId === "string" && input.guestId.trim().length > 0
        ? input.guestId.trim()
        : generateGuestIdentity(),
    nickname: normalizeGuestNickname(input.nickname),
    updatedAt: input.updatedAt ?? nowUtcIso(),
  };

  response.cookies.set(
    GUEST_PROFILE_COOKIE_NAME,
    encodeURIComponent(JSON.stringify(payload)),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    },
  );
}

export function applyActiveRoomCookie(
  response: NextResponse,
  input: { roomId: string; playerId: string; roomCode?: string | null; updatedAt?: string | null },
): void {
  const payload: ActiveRoomCookiePayload = {
    roomId: input.roomId.trim(),
    playerId: input.playerId.trim(),
    roomCode: typeof input.roomCode === "string" ? input.roomCode.trim() : null,
    updatedAt: input.updatedAt ?? nowUtcIso(),
  };

  response.cookies.set(
    ACTIVE_ROOM_COOKIE_NAME,
    encodeURIComponent(JSON.stringify(payload)),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  );
}

export function clearGuestProfileCookie(response: NextResponse): void {
  response.cookies.set(GUEST_PROFILE_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export function clearActiveRoomCookie(response: NextResponse): void {
  response.cookies.set(ACTIVE_ROOM_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}
