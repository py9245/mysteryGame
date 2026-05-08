export class AiProviderHttpError extends Error {
  readonly provider: string;
  readonly upstreamStatus: number;
  readonly bodySnippet: string | null;

  constructor(params: { provider: string; upstreamStatus: number; bodySnippet?: string | null }) {
    const bodySuffix = params.bodySnippet ? ` Body: ${params.bodySnippet}` : "";
    super(`${params.provider} request failed with status ${params.upstreamStatus}.${bodySuffix}`);

    this.name = "AiProviderHttpError";
    this.provider = params.provider;
    this.upstreamStatus = params.upstreamStatus;
    this.bodySnippet = params.bodySnippet ?? null;
  }
}

export async function readErrorBodySnippet(response: Response): Promise<string | null> {
  const body = (await response.text()).trim();

  if (body.length === 0) {
    return null;
  }

  return body.length > 240 ? `${body.slice(0, 240)}...` : body;
}
