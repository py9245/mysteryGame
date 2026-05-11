import { Buffer } from "node:buffer";
import { getCaseImageDataUrlFromStore } from "@/server/live-store";

export const runtime = "nodejs";

function parseDataUrl(dataUrl: string): { mimeType: string; bytes: Uint8Array } | null {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) {
    return null;
  }

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const raw = match[3] || "";

  try {
    if (isBase64) {
      const buffer = Buffer.from(raw, "base64");
      return { mimeType, bytes: new Uint8Array(buffer) };
    }

    const decoded = decodeURIComponent(raw);
    const buffer = Buffer.from(decoded, "utf8");
    return { mimeType, bytes: new Uint8Array(buffer) };
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseKey: string }> },
) {
  const { caseKey } = await params;
  const dataUrl = await getCaseImageDataUrlFromStore(caseKey);

  if (!dataUrl) {
    return new Response("Not found", { status: 404 });
  }

  if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://") || dataUrl.startsWith("/")) {
    return Response.redirect(dataUrl, 307);
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return new Response("Invalid image data", { status: 500 });
  }

  return new Response(Buffer.from(parsed.bytes), {
    status: 200,
    headers: {
      "content-type": parsed.mimeType,
      "cache-control": "public, max-age=86400",
    },
  });
}
