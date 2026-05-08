import { AiProviderHttpError, createTextCompletion, getTextRouteDocumentation } from "@/lib/ai";
import type { TextCompletionInput, TextMessageRole } from "@/lib/ai";

export const runtime = "nodejs";

const TEXT_MESSAGE_ROLES: TextMessageRole[] = ["developer", "system", "user", "assistant"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isTextMessageRole(value: unknown): value is TextMessageRole {
  return typeof value === "string" && TEXT_MESSAGE_ROLES.includes(value as TextMessageRole);
}

function isValidTextCompletionInput(value: unknown): value is TextCompletionInput {
  if (!isRecord(value)) {
    return false;
  }

  const candidate = value as Partial<TextCompletionInput>;
  if (candidate.provider !== undefined && candidate.provider !== "openai_chat_gms") {
    return false;
  }

  if (candidate.model !== undefined && (typeof candidate.model !== "string" || candidate.model.trim().length === 0)) {
    return false;
  }

  if (!Array.isArray(candidate.messages) || candidate.messages.length === 0) {
    return false;
  }

  return candidate.messages.every(
    (message) =>
      isRecord(message) &&
      isTextMessageRole(message.role) &&
      typeof message.content === "string" &&
      message.content.trim().length > 0,
  );
}

export async function GET() {
  return Response.json({ ok: true, data: getTextRouteDocumentation() }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isValidTextCompletionInput(body)) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "invalid_text_request",
            message: "messages 배열과 role/content 문자열이 포함된 요청 본문이 필요합니다.",
          },
        },
        { status: 400 },
      );
    }

    const data = await createTextCompletion(body);
    return Response.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    if (error instanceof AiProviderHttpError) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "ai_text_upstream_failed",
            message: error.message,
            provider: error.provider,
            upstreamStatus: error.upstreamStatus,
          },
        },
        { status: 502 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown AI text error.";
    return Response.json(
      {
        ok: false,
        error: {
          code: "ai_text_failed",
          message,
        },
      },
      { status: 500 },
    );
  }
}
