import { getGoogleImagenUrl, getOpenAiImageUrl, getTextCompletionUrl, hasGmsKey } from "./env";
import type { ImageGenerationInput, ImageProvider, TextCompletionInput, TextProvider } from "./types";

export const DEFAULT_TEXT_PROVIDER: TextProvider = "openai_chat_gms";
export const DEFAULT_TEXT_MODEL = "gpt-5-mini";

export const DEFAULT_IMAGE_PROVIDER: ImageProvider = "openai_gpt_image";
export const OPENAI_IMAGE_MODEL = "gpt-image-1.5";
export const GOOGLE_IMAGEN_MODEL = "imagen-4.0-ultra-generate-001";

const TEXT_REQUEST_EXAMPLE: TextCompletionInput = {
  provider: DEFAULT_TEXT_PROVIDER,
  model: DEFAULT_TEXT_MODEL,
  messages: [
    {
      role: "developer",
      content: "Answer in Korean. Return concise plain text.",
    },
    {
      role: "user",
      content: "운영자 공지 문구 한 줄만 작성해줘.",
    },
  ],
};

const OPENAI_IMAGE_REQUEST_EXAMPLE: ImageGenerationInput = {
  provider: "openai_gpt_image",
  prompt: "A tense locked-room mystery crime scene, cinematic illustration",
  n: 1,
  size: "1024x1024",
};

const GOOGLE_IMAGE_REQUEST_EXAMPLE: ImageGenerationInput = {
  provider: "google_imagen",
  prompt: "A tense locked-room mystery crime scene, cinematic illustration",
  sampleCount: 1,
};

export function getAiRuntimeStatus() {
  return {
    gmsKeyConfigured: hasGmsKey(),
    requiredEnv: ["GMS_KEY"],
  };
}

export function getTextRouteDocumentation() {
  return {
    route: "/api/ai/text",
    runtime: "nodejs",
    transport: "GMS OpenAI-compatible proxy",
    defaults: {
      provider: DEFAULT_TEXT_PROVIDER,
      model: DEFAULT_TEXT_MODEL,
    },
    upstream: {
      endpoint: getTextCompletionUrl(),
      auth: "Authorization: Bearer $GMS_KEY",
    },
    requestContract: {
      required: ["messages"],
      optional: ["provider", "model"],
      messageRoles: ["developer", "system", "user", "assistant"],
    },
    exampleRequest: TEXT_REQUEST_EXAMPLE,
    successShape: {
      ok: true,
      data: {
        provider: DEFAULT_TEXT_PROVIDER,
        model: "string",
        text: "string | null",
        finishReason: "string | null",
        usage: {
          promptTokens: "number | null",
          completionTokens: "number | null",
          totalTokens: "number | null",
        },
        raw: "provider payload",
      },
    },
    env: getAiRuntimeStatus(),
  };
}

export function getImageRouteDocumentation() {
  return {
    route: "/api/ai/image",
    runtime: "nodejs",
    transport: "GMS proxy",
    defaults: {
      provider: DEFAULT_IMAGE_PROVIDER,
      openAiModel: OPENAI_IMAGE_MODEL,
      googleModel: GOOGLE_IMAGEN_MODEL,
    },
    providers: [
      {
        provider: "openai_gpt_image",
        endpoint: getOpenAiImageUrl(),
        auth: "Authorization: Bearer $GMS_KEY",
      },
      {
        provider: "google_imagen",
        endpoint: getGoogleImagenUrl(),
        auth: "x-goog-api-key: $GMS_KEY",
      },
    ],
    requestContract: {
      required: ["prompt"],
      optional: ["provider", "n", "size", "sampleCount"],
    },
    exampleRequests: {
      openai: OPENAI_IMAGE_REQUEST_EXAMPLE,
      google: GOOGLE_IMAGE_REQUEST_EXAMPLE,
    },
    successShape: {
      ok: true,
      data: {
        provider: "openai_gpt_image | google_imagen",
        model: "string",
        assets: [
          {
            url: "string | null",
            base64Data: "string | null",
            mimeType: "string | null",
            revisedPrompt: "string | null",
          },
        ],
        raw: "provider payload",
      },
    },
    env: getAiRuntimeStatus(),
  };
}
