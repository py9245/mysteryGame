import type {
  ApiFailure,
  ApiResponse,
  SendChatMessageRequest,
  SendChatMessageResponse,
} from "@/contracts/api";
import { sendChatMessageToStore } from "@/server/live-store";
import { isSendableChatChannel } from "@/server/sample-chat-messages";
import { isSupabaseEnabled } from "@/server/supabase-admin";

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
  value: SendChatMessageRequest | ApiFailure,
): value is ApiFailure {
  return "ok" in value;
}

function normalizeRequiredString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalString(
  value: unknown,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function validateSendChatMessageRequest(
  body: unknown,
): SendChatMessageRequest | ApiFailure {
  if (!isRecord(body)) {
    return createValidationFailure("Request body must be a JSON object.");
  }

  const roomId = normalizeRequiredString(body.roomId);
  if (!roomId) {
    return createValidationFailure("roomId is required.", {
      field: "roomId",
    });
  }

  const playerId = normalizeRequiredString(body.playerId);
  if (!playerId) {
    return createValidationFailure("playerId is required.", {
      field: "playerId",
    });
  }

  const content = normalizeRequiredString(body.content);
  if (!content) {
    return createValidationFailure("content is required.", {
      field: "content",
    });
  }

  if (typeof body.channel !== "string" || !isSendableChatChannel(body.channel)) {
    return createValidationFailure("channel must be one of global, team, or private.", {
      field: "channel",
      allowed: ["global", "team", "private"],
    });
  }

  const stageId = normalizeOptionalString(body.stageId);
  if (body.stageId !== undefined && stageId === undefined) {
    return createValidationFailure("stageId must be a string or null when provided.", {
      field: "stageId",
    });
  }

  const teamSlotId = normalizeOptionalString(body.teamSlotId);
  if (body.teamSlotId !== undefined && teamSlotId === undefined) {
    return createValidationFailure("teamSlotId must be a string or null when provided.", {
      field: "teamSlotId",
    });
  }

  if (body.channel === "team" && !teamSlotId) {
    return createValidationFailure("teamSlotId is required for team channel messages.", {
      field: "teamSlotId",
      channel: body.channel,
    });
  }

  return {
    roomId,
    playerId,
    stageId,
    teamSlotId,
    channel: body.channel,
    content,
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    const payload = createValidationFailure("Request body must be valid JSON.", {
      expected: "SendChatMessageRequest",
    });

    return Response.json(payload, { status: 400 });
  }

  const validated = validateSendChatMessageRequest(body);
  if (isApiFailure(validated)) {
    return Response.json(validated, { status: 400 });
  }

  if (isSupabaseEnabled()) {
    try {
      const payload = {
        ok: true,
        data: await sendChatMessageToStore(validated),
      } satisfies ApiResponse<SendChatMessageResponse>;

      return Response.json(payload, { status: 200 });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "CHAT_SEND_FAILED",
            message: error instanceof Error ? error.message : "채팅 저장에 실패했습니다.",
          },
        },
        { status: 500 },
      );
    }
  }

  return Response.json(
    {
      ok: false,
      error: {
        code: "LIVE_STORAGE_REQUIRED",
        message: "채팅 전송은 Supabase 런타임 설정이 필요합니다.",
      },
    } satisfies ApiResponse<SendChatMessageResponse>,
    { status: 501 },
  );
}
