import type {
  ApiResponse,
  JoinRoomRequest,
  JoinRoomResponse,
} from "@/contracts/api";

export interface SubmitJoinRoomOptions {
  roomCode: string;
  nickname: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface SubmitJoinRoomResult {
  ok: boolean;
  endpoint: string;
  statusCode: number;
  request: JoinRoomRequest;
  response: JoinRoomResponse | null;
  errorCode: string | null;
  errorMessage: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveEndpoint(endpoint?: string): string {
  return endpoint ?? process.env.NEXT_PUBLIC_JOIN_ROOM_ENDPOINT ?? "/api/room/join";
}

function normalizeJoinRoomResponse(value: unknown): JoinRoomResponse | null {
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
    return value as unknown as JoinRoomResponse;
  }

  return null;
}

function resolveJoinRoomResponse(value: unknown): JoinRoomResponse | null {
  if (isRecord(value) && "data" in value) {
    return normalizeJoinRoomResponse(value.data);
  }

  return normalizeJoinRoomResponse(value);
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

export async function submitJoinRoom(
  options: SubmitJoinRoomOptions,
): Promise<SubmitJoinRoomResult> {
  const endpoint = resolveEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? fetch;
  const request: JoinRoomRequest = {
    roomCode: options.roomCode.trim().toUpperCase(),
    nickname: options.nickname.trim(),
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
      payload = (await response.json()) as ApiResponse<JoinRoomResponse>;
    } catch {
      payload = null;
    }

    const joinRoomResponse = resolveJoinRoomResponse(payload);
    const error = resolveApiError(payload);

    if (response.ok && joinRoomResponse) {
      return {
        ok: true,
        endpoint,
        statusCode: response.status,
        request,
        response: joinRoomResponse,
        errorCode: null,
        errorMessage: null,
      };
    }

    return {
      ok: false,
      endpoint,
      statusCode: response.status,
      request,
      response: joinRoomResponse,
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
      errorMessage: "네트워크 오류로 방 참가 요청에 실패했습니다.",
    };
  }
}
