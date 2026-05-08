import type { ApiError, ApiFailure } from "@/contracts/api";

export const PLACEHOLDER_API_ERROR: ApiError = {
  code: "NOT_IMPLEMENTED",
  message: "API route scaffold is not wired yet.",
};

export function createPlaceholderFailure(
  details?: Record<string, unknown>,
): ApiFailure {
  return {
    ok: false,
    error: {
      ...PLACEHOLDER_API_ERROR,
      details,
    },
  };
}
