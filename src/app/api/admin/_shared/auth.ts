import type { ApiFailure } from "@/contracts/api";
import { loadOperatorPlayerIfAuthorized } from "@/server/live-store";

const OPERATOR_HEADER = "x-operator-player-id";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Resolves the calling operator from the request.
 *
 * Looks at, in order:
 *   1. `x-operator-player-id` header
 *   2. `operatorPlayerId` query param (GET requests only)
 *   3. `operatorPlayerId` field on the parsed JSON body (POST requests).
 *
 * Returns the player row when the player exists AND has role=admin.
 * Returns an `ApiFailure` (with code/error) otherwise.
 */
export async function resolveOperator(
  request: Request,
  bodyOperatorId?: unknown,
): Promise<
  | {
      ok: true;
      operatorId: string;
    }
  | {
      ok: false;
      failure: ApiFailure;
      status: number;
    }
> {
  const headerValue = request.headers.get(OPERATOR_HEADER);
  const url = new URL(request.url);
  const queryValue = url.searchParams.get("operatorPlayerId");
  const candidate = [headerValue, queryValue, bodyOperatorId].find(isNonEmptyString)?.trim();

  if (!candidate) {
    return {
      ok: false,
      status: 401,
      failure: {
        ok: false,
        error: {
          code: "OPERATOR_REQUIRED",
          message: "운영자 식별자가 필요합니다.",
          details: { header: OPERATOR_HEADER },
        },
      },
    };
  }

  const player = await loadOperatorPlayerIfAuthorized(candidate);
  if (!player) {
    return {
      ok: false,
      status: 403,
      failure: {
        ok: false,
        error: {
          code: "OPERATOR_FORBIDDEN",
          message: "운영자 권한이 없는 사용자입니다.",
        },
      },
    };
  }

  return { ok: true, operatorId: player.id };
}
