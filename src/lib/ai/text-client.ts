import { DEFAULT_TEXT_MODEL, DEFAULT_TEXT_PROVIDER } from "./catalog";
import { getGmsKey, getTextCompletionUrl } from "./env";
import { AiProviderHttpError, readErrorBodySnippet } from "./errors";
import type { TextCompletionInput, TextCompletionOutput } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function extractTextContent(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const parts = content
    .map((part) => {
      if (!isRecord(part)) {
        return null;
      }

      return typeof part.text === "string" ? part.text : null;
    })
    .filter((part): part is string => part !== null);

  if (parts.length === 0) {
    return null;
  }

  return parts.join("\n");
}

function extractTextFromCompletion(raw: unknown): string | null {
  if (!isRecord(raw)) {
    return null;
  }

  const payload = raw as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string }>;
      };
    }>;
  };

  return extractTextContent(payload.choices?.[0]?.message?.content);
}

function extractUsage(raw: unknown): TextCompletionOutput["usage"] {
  if (!isRecord(raw) || !isRecord(raw.usage)) {
    return null;
  }

  const usage = raw.usage as Record<string, unknown>;

  return {
    promptTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : null,
    completionTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : null,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : null,
  };
}

function extractFinishReason(raw: unknown): string | null {
  if (!isRecord(raw) || !Array.isArray(raw.choices)) {
    return null;
  }

  const firstChoice = raw.choices[0];
  if (!isRecord(firstChoice) || typeof firstChoice.finish_reason !== "string") {
    return null;
  }

  return firstChoice.finish_reason;
}

export async function createTextCompletion(input: TextCompletionInput): Promise<TextCompletionOutput> {
  const provider = input.provider ?? DEFAULT_TEXT_PROVIDER;
  const requestedModel = input.model ?? DEFAULT_TEXT_MODEL;
  const response = await fetch(getTextCompletionUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getGmsKey()}`,
    },
    body: JSON.stringify({
      model: requestedModel,
      messages: input.messages,
    }),
  });

  if (!response.ok) {
    throw new AiProviderHttpError({
      provider,
      upstreamStatus: response.status,
      bodySnippet: await readErrorBodySnippet(response),
    });
  }

  const raw = (await response.json()) as unknown;
  const resolvedModel =
    isRecord(raw) && typeof raw.model === "string" ? raw.model : requestedModel;

  return {
    provider,
    model: resolvedModel,
    text: extractTextFromCompletion(raw),
    finishReason: extractFinishReason(raw),
    usage: extractUsage(raw),
    raw,
  };
}
