import type {
  AccountProfileView,
  AccountViewerResponse,
  CurrentViewer,
  CurrentViewerResponse,
  LoginAccountRequest,
  RegisterAccountRequest,
  UpdateNicknameRequest,
} from "@/contracts/account";
import type { ApiResponse } from "@/contracts/api";

export interface ViewerMutationResult {
  ok: boolean;
  viewer: CurrentViewer | null;
  statusCode: number;
  errorCode: string | null;
  errorMessage: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toAccountViewer(viewer: AccountProfileView): CurrentViewer {
  return {
    kind: "account",
    nickname: viewer.nickname,
    account: viewer,
  };
}

function resolveApiError(value: unknown): { code: string | null; message: string | null } {
  if (isRecord(value) && "error" in value && isRecord(value.error)) {
    return {
      code: typeof value.error.code === "string" ? value.error.code : null,
      message: typeof value.error.message === "string" ? value.error.message : null,
    };
  }

  return { code: null, message: null };
}

function resolveCurrentViewer(value: unknown): CurrentViewer | null {
  if (
    isRecord(value) &&
    typeof value.kind === "string" &&
    typeof value.nickname === "string"
  ) {
    return value as CurrentViewer;
  }

  return null;
}

function resolveCurrentViewerPayload(value: unknown): CurrentViewer | null {
  if (isRecord(value) && "data" in value && isRecord(value.data) && "viewer" in value.data) {
    return resolveCurrentViewer(value.data.viewer);
  }

  return null;
}

function resolveAccountViewerPayload(value: unknown): CurrentViewer | null {
  if (
    isRecord(value) &&
    "data" in value &&
    isRecord(value.data) &&
    "viewer" in value.data &&
    isRecord(value.data.viewer) &&
    typeof value.data.viewer.email === "string" &&
    typeof value.data.viewer.nickname === "string" &&
    typeof value.data.viewer.accountId === "string" &&
    typeof value.data.viewer.createdAt === "string"
  ) {
    return toAccountViewer(value.data.viewer as unknown as AccountProfileView);
  }

  return null;
}

async function performJsonRequest(
  endpoint: string,
  init: RequestInit,
  resolver: (payload: unknown) => CurrentViewer | null,
): Promise<ViewerMutationResult> {
  try {
    const response = await fetch(endpoint, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    let payload: unknown = null;

    try {
      payload = (await response.json()) as ApiResponse<AccountViewerResponse | CurrentViewerResponse>;
    } catch {
      payload = null;
    }

    const viewer = resolver(payload);
    const error = resolveApiError(payload);

    return {
      ok: response.ok,
      viewer,
      statusCode: response.status,
      errorCode: error.code,
      errorMessage: error.message ?? (response.ok ? null : `HTTP ${response.status}`),
    };
  } catch {
    return {
      ok: false,
      viewer: null,
      statusCode: 0,
      errorCode: "NETWORK_ERROR",
      errorMessage: "네트워크 오류로 요청을 완료하지 못했습니다.",
    };
  }
}

export function saveViewerNickname(
  request: UpdateNicknameRequest,
): Promise<ViewerMutationResult> {
  return performJsonRequest(
    "/api/me",
    {
      method: "PATCH",
      body: JSON.stringify(request),
    },
    resolveCurrentViewerPayload,
  );
}

export function registerViewer(
  request: RegisterAccountRequest,
): Promise<ViewerMutationResult> {
  return performJsonRequest(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    resolveAccountViewerPayload,
  );
}

export function loginViewer(
  request: LoginAccountRequest,
): Promise<ViewerMutationResult> {
  return performJsonRequest(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    resolveAccountViewerPayload,
  );
}

export function logoutViewer(): Promise<ViewerMutationResult> {
  return performJsonRequest(
    "/api/auth/logout",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    resolveCurrentViewerPayload,
  );
}
