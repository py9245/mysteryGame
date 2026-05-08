import { DEFAULT_IMAGE_PROVIDER, GOOGLE_IMAGEN_MODEL, OPENAI_IMAGE_MODEL } from "./catalog";
import { getGmsKey, getGoogleImagenUrl, getOpenAiImageUrl } from "./env";
import { AiProviderHttpError, readErrorBodySnippet } from "./errors";
import type {
  GeneratedImageAsset,
  ImageGenerationInput,
  ImageGenerationOutput,
  ImageProvider,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function extractOpenAiAssets(raw: unknown): GeneratedImageAsset[] {
  if (!isRecord(raw) || !Array.isArray(raw.data)) {
    return [];
  }

  return raw.data
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      return {
        url: typeof entry.url === "string" ? entry.url : null,
        base64Data: typeof entry.b64_json === "string" ? entry.b64_json : null,
        mimeType: typeof entry.mime_type === "string" ? entry.mime_type : null,
        revisedPrompt: typeof entry.revised_prompt === "string" ? entry.revised_prompt : null,
      };
    })
    .filter((asset): asset is GeneratedImageAsset => asset !== null);
}

function extractGoogleAsset(entry: unknown): GeneratedImageAsset | null {
  if (!isRecord(entry)) {
    return null;
  }

  const nestedImage = isRecord(entry.image) ? entry.image : null;
  const base64Data =
    typeof entry.bytesBase64Encoded === "string"
      ? entry.bytesBase64Encoded
      : typeof nestedImage?.bytesBase64Encoded === "string"
        ? nestedImage.bytesBase64Encoded
        : null;

  const mimeType =
    typeof entry.mimeType === "string"
      ? entry.mimeType
      : typeof nestedImage?.mimeType === "string"
        ? nestedImage.mimeType
        : null;

  const url =
    typeof entry.url === "string"
      ? entry.url
      : typeof nestedImage?.url === "string"
        ? nestedImage.url
        : null;

  return {
    url,
    base64Data,
    mimeType,
    revisedPrompt: null,
  };
}

function extractGoogleAssets(raw: unknown): GeneratedImageAsset[] {
  if (!isRecord(raw) || !Array.isArray(raw.predictions)) {
    return [];
  }

  return raw.predictions
    .map((prediction) => extractGoogleAsset(prediction))
    .filter((asset): asset is GeneratedImageAsset => asset !== null);
}

async function generateWithOpenAiImage(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
  const response = await fetch(getOpenAiImageUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getGmsKey()}`,
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt: input.prompt,
      n: input.n ?? 1,
      size: input.size ?? "1024x1024",
    }),
  });

  if (!response.ok) {
    throw new AiProviderHttpError({
      provider: "openai_gpt_image",
      upstreamStatus: response.status,
      bodySnippet: await readErrorBodySnippet(response),
    });
  }

  const raw = (await response.json()) as unknown;

  return {
    provider: "openai_gpt_image",
    model: OPENAI_IMAGE_MODEL,
    assets: extractOpenAiAssets(raw),
    raw,
  };
}

async function generateWithGoogleImagen(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
  const response = await fetch(getGoogleImagenUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": getGmsKey(),
    },
    body: JSON.stringify({
      instances: [
        {
          prompt: input.prompt,
        },
      ],
      parameters: {
        sampleCount: input.sampleCount ?? input.n ?? 1,
      },
    }),
  });

  if (!response.ok) {
    throw new AiProviderHttpError({
      provider: "google_imagen",
      upstreamStatus: response.status,
      bodySnippet: await readErrorBodySnippet(response),
    });
  }

  const raw = (await response.json()) as unknown;

  return {
    provider: "google_imagen",
    model: GOOGLE_IMAGEN_MODEL,
    assets: extractGoogleAssets(raw),
    raw,
  };
}

export async function generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
  const provider = input.provider ?? DEFAULT_IMAGE_PROVIDER;

  if (provider === "google_imagen") {
    return generateWithGoogleImagen(input);
  }

  return generateWithOpenAiImage(input);
}
