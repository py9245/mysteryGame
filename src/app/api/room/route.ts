import type {
  ApiFailure,
  ApiResponse,
  CreateRoomRequest,
  CreateRoomResponse,
} from "@/contracts/api";
import { buildSampleCreateRoomResponse } from "@/server/sample-room-snapshot";

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
  if (!hostNickname) {
    return createValidationFailure("hostNickname is required.", {
      field: "hostNickname",
    });
  }

  return { hostNickname };
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

  const payload = {
    ok: true,
    data: buildSampleCreateRoomResponse(validated.hostNickname),
  } satisfies ApiResponse<CreateRoomResponse>;

  return Response.json(payload, { status: 200 });
}
