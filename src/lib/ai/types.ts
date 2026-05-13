export type TextProvider = "openai_chat_gms";
export type TextMessageRole = "developer" | "system" | "user" | "assistant";

export interface TextCompletionMessage {
  role: TextMessageRole;
  content: string;
}

export interface TextCompletionInput {
  provider?: TextProvider;
  model?: string;
  messages: TextCompletionMessage[];
  timeoutMs?: number;
}

export interface TextCompletionUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export interface TextCompletionOutput {
  provider: TextProvider;
  model: string;
  text: string | null;
  finishReason: string | null;
  usage: TextCompletionUsage | null;
  raw: unknown;
}

export type ImageProvider = "openai_gpt_image" | "google_imagen";

export interface ImageGenerationInput {
  provider?: ImageProvider;
  prompt: string;
  n?: number;
  size?: string;
  sampleCount?: number;
}

export interface GeneratedImageAsset {
  url: string | null;
  base64Data: string | null;
  mimeType: string | null;
  revisedPrompt: string | null;
}

export interface ImageGenerationOutput {
  provider: ImageProvider;
  model: string;
  assets: GeneratedImageAsset[];
  raw: unknown;
}
