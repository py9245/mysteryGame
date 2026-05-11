import { Buffer } from "node:buffer";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveStoredImageDataUrl(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.imageDataUrl === "string" && payload.imageDataUrl.length > 0) {
    return payload.imageDataUrl;
  }

  const caseFile = isRecord(payload.caseFile) ? payload.caseFile : null;
  if (caseFile && typeof caseFile.imageUrl === "string" && caseFile.imageUrl.startsWith("data:")) {
    return caseFile.imageUrl;
  }

  return null;
}

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
  { params }: { params: Promise<{ stageId: string }> },
) {
  const { stageId } = await params;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_logs")
    .select("payload")
    .eq("stage_id", stageId)
    .eq("action", "practice_case_generated")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ payload: Record<string, unknown> }>();

  if (error || !data) {
    return new Response("Not found", { status: 404 });
  }

  const dataUrl = resolveStoredImageDataUrl(data.payload);
  if (!dataUrl) {
    return new Response("Not found", { status: 404 });
  }

  if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
    return Response.redirect(dataUrl, 307);
  }

  if (dataUrl.startsWith("/")) {
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
      "cache-control": "private, max-age=300",
    },
  });
}
