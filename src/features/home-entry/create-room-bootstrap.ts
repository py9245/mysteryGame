import type {
  ApiResponse,
  CreateRoomRequest,
  CreateRoomResponse,
} from "@/contracts/api";

export interface SubmitCreateRoomOptions {
  hostNickname: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface SubmitCreateRoomResult {
  ok: boolean;
  endpoint: string;
  statusCode: number;
  request: CreateRoomRequest;
  response: CreateRoomResponse | null;
  errorCode: string | null;
  errorMessage: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveEndpoint(endpoint?: string): string {
  return endpoint ?? process.env.NEXT_PUBLIC_CREATE_ROOM_ENDPOINT ?? "/api/room";
}

function normalizeCreateRoomResponse(value: unknown): CreateRoomResponse | null {
  if (
    isRecord(value) &&
    typeof value.roomId === "string" &&
    typeof value.playerId === "string" &&
    isRecord(value.snapshot) &&
    isRecord(value.snapshot.room) &&
    typeof value.snapshot.room.code === "string" &&
    Array.isArray(value.snapshot.players) &&
    isRecord(value.snapshot.me) &&
    typeof value.snapshot.me.role === "string"
  ) {
    return value as unknown as CreateRoomResponse;
  }

  return null;
}

function resolveCreateRoomResponse(value: unknown): CreateRoomResponse | null {
  if (isRecord(value) && "data" in value) {
    return normalizeCreateRoomResponse(value.data);
  }

  return normalizeCreateRoomResponse(value);
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

export async function submitCreateRoom(
  options: SubmitCreateRoomOptions,
): Promise<SubmitCreateRoomResult> {
  const endpoint = resolveEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? fetch;
  const request: CreateRoomRequest = {
    hostNickname: options.hostNickname.trim(),
  };

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    let payload: unknown = null;

    try {
      payload = (await response.json()) as ApiResponse<CreateRoomResponse>;
    } catch {
      payload = null;
    }

    const createRoomResponse = resolveCreateRoomResponse(payload);
    const error = resolveApiError(payload);

    if (response.ok && createRoomResponse) {
      return {
        ok: true,
        endpoint,
        statusCode: response.status,
        request,
        response: createRoomResponse,
        errorCode: null,
        errorMessage: null,
      };
    }

    return {
      ok: false,
      endpoint,
      statusCode: response.status,
      request,
      response: createRoomResponse,
      errorCode: error.code,
      errorMessage: error.message ?? `HTTP ${response.status}`,
    };
  } catch {
    return {
      ok: false,
      endpoint,
      statusCode: 0,
      request,
      response: null,
      errorCode: "NETWORK_ERROR",
      errorMessage: "네트워크 오류로 방 생성 요청에 실패했습니다.",
    };
  }
}
