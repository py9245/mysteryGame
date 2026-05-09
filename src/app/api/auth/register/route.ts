import { NextResponse } from "next/server";
import type {
  AccountViewerResponse,
  RegisterAccountRequest,
} from "@/contracts/account";
import type { ApiFailure, ApiResponse } from "@/contracts/api";
import {
  AccountAuthError,
  createSessionForAccount,
  registerAccount,
} from "@/server/account-store";
import {
  applyGuestProfileCookie,
  applySessionCookie,
} from "@/server/auth-session";

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

function validateRegisterRequest(
  body: unknown,
): RegisterAccountRequest | ApiFailure {
  if (!isRecord(body)) {
    return createValidationFailure("Request body must be a JSON object.");
  }

  const email = normalizeRequiredString(body.email);
  const password = normalizeRequiredString(body.password);
  const nickname = normalizeRequiredString(body.nickname);
  const ageValue = body.age;
  const age =
    typeof ageValue === "number" && Number.isFinite(ageValue)
      ? Math.floor(ageValue)
      : null;

  if (!email) {
    return createValidationFailure("email is required.", { field: "email" });
  }

  if (!password) {
    return createValidationFailure("password is required.", {
      field: "password",
    });
  }

  if (!nickname) {
    return createValidationFailure("nickname is required.", {
      field: "nickname",
    });
  }

  return { email, password, nickname, age: age ?? undefined };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      createValidationFailure("Request body must be valid JSON.", {
        expected: "RegisterAccountRequest",
      }),
      { status: 400 },
    );
  }

  const validated = validateRegisterRequest(body);

  if ("ok" in validated) {
    return NextResponse.json(validated, { status: 400 });
  }

  try {
    const viewer = await registerAccount(validated);
    const session = await createSessionForAccount(viewer.accountId);
    const response = NextResponse.json(
      {
        ok: true,
        data: {
          viewer,
        },
      } satisfies ApiResponse<AccountViewerResponse>,
      { status: 201 },
    );

    applySessionCookie(response, session);
    applyGuestProfileCookie(response, { nickname: viewer.nickname });
    return response;
  } catch (error) {
    if (error instanceof AccountAuthError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "REGISTER_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "회원가입 처리에 실패했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
