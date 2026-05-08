const TEXT_BASE_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_BASE_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1/images/generations";
const GOOGLE_IMAGEN_BASE_URL =
  "https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict";

export function hasGmsKey(): boolean {
  return typeof process.env.GMS_KEY === "string" && process.env.GMS_KEY.trim().length > 0;
}

export function getGmsKey(): string {
  const key = process.env.GMS_KEY?.trim();
  if (!key) {
    throw new Error("GMS_KEY is not configured.");
  }

  return key;
}

export function getTextCompletionUrl(): string {
  return TEXT_BASE_URL;
}

export function getOpenAiImageUrl(): string {
  return OPENAI_IMAGE_BASE_URL;
}

export function getGoogleImagenUrl(): string {
  return GOOGLE_IMAGEN_BASE_URL;
}
