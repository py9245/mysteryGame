import { AiProviderHttpError, generateImage, getImageRouteDocumentation } from "@/lib/ai";
import type { ImageGenerationInput } from "@/lib/ai";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isPositiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isValidImageGenerationInput(value: unknown): value is ImageGenerationInput {
  if (!isRecord(value)) {
    return false;
  }

  const candidate = value as Partial<ImageGenerationInput>;
  if (candidate.provider !== undefined && candidate.provider !== "openai_gpt_image" && candidate.provider !== "google_imagen") {
    return false;
  }

  if (typeof candidate.prompt !== "string" || candidate.prompt.trim().length === 0) {
    return false;
  }

  if (candidate.n !== undefined && !isPositiveInteger(candidate.n)) {
    return false;
  }

  if (candidate.sampleCount !== undefined && !isPositiveInteger(candidate.sampleCount)) {
    return false;
  }

  if (candidate.size !== undefined && (typeof candidate.size !== "string" || candidate.size.trim().length === 0)) {
    return false;
  }

  return true;
}

export async function GET() {
  return Response.json({ ok: true, data: getImageRouteDocumentation() }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isValidImageGenerationInput(body)) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "invalid_image_request",
            message: "prompt 문자열과 선택적 provider/n/size/sampleCount 형식이 올바른 요청 본문이 필요합니다.",
          },
        },
        { status: 400 },
      );
    }

    const data = await generateImage(body);
    return Response.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    if (error instanceof AiProviderHttpError) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "ai_image_upstream_failed",
            message: error.message,
            provider: error.provider,
            upstreamStatus: error.upstreamStatus,
          },
        },
        { status: 502 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown AI image error.";
    return Response.json(
      {
        ok: false,
        error: {
          code: "ai_image_failed",
          message,
        },
      },
      { status: 500 },
    );
  }
}
