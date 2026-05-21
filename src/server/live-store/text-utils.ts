export function normalizeKeywordText(value: string): string {
  return value.toLowerCase().replace(/[\s.,!?"'“”‘’(){}\[\]<>~`·、。！？\-_/]/g, "");
}

export function includesNormalized(haystack: string, needle: string): boolean {
  return normalizeKeywordText(haystack).includes(normalizeKeywordText(needle));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractJsonObject(text: string | null): Record<string, unknown> | null {
  if (!text) {
    return null;
  }

  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;
  const startIndex = candidate.indexOf("{");
  const endIndex = candidate.lastIndexOf("}");

  if (startIndex < 0 || endIndex <= startIndex) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate.slice(startIndex, endIndex + 1)) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export function resolveKeywordSubset(sourceKeywords: string[], rawMatches: string[]): string[] {
  const normalizedMatches = rawMatches.map((value) => normalizeKeywordText(value)).filter((value) => value.length > 0);
  const resolved = sourceKeywords.filter((keyword) => {
    const normalizedKeyword = normalizeKeywordText(keyword);
    return normalizedMatches.some(
      (candidate) =>
        candidate === normalizedKeyword ||
        candidate.includes(normalizedKeyword) ||
        normalizedKeyword.includes(candidate),
    );
  });

  return Array.from(new Set(resolved));
}
