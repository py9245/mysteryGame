import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const TEXT_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1/images/generations";
const GOOGLE_IMAGE_URL =
  "https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict";
const CLAUDE_URL = "https://gms.ssafy.io/gmsapi/api.anthropic.com/v1/messages";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const delimiterIndex = trimmed.indexOf("=");
    if (delimiterIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, delimiterIndex).trim();
    if (process.env[key]) {
      continue;
    }

    let value = trimmed.slice(delimiterIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function ensureEnv() {
  loadEnvFile(join(process.cwd(), ".env"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gmsKey = process.env.GMS_KEY;

  if (!supabaseUrl || !serviceKey || !gmsKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GMS_KEY가 모두 필요합니다.");
  }

  return { supabaseUrl, serviceKey, gmsKey };
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object";
}

function extractJsonObject(text) {
  if (typeof text !== "string") {
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
    const parsed = JSON.parse(candidate.slice(startIndex, endIndex + 1));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry) => typeof entry === "string");
}

async function callText(messages, gmsKey) {
  const response = await fetch(TEXT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gmsKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Text completion failed: ${response.status} ${body.slice(0, 240)}`);
  }

  const raw = await response.json();
  const content = raw?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((entry) => (typeof entry?.text === "string" ? entry.text : "")).join("\n");
  }

  throw new Error("Malformed text completion payload.");
}

async function callClaude(messages, gmsKey) {
  const anthropicMessages = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ role: message.role, content: message.content }));
  const system = messages
    .filter((message) => message.role === "developer" || message.role === "system")
    .map((message) => message.content)
    .join("\n\n")
    .trim();

  const response = await fetch(CLAUDE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": gmsKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5-20251101",
      max_tokens: 1800,
      system: system.length > 0 ? system : undefined,
      messages: anthropicMessages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude completion failed: ${response.status} ${body.slice(0, 240)}`);
  }

  const raw = await response.json();
  const textParts = Array.isArray(raw?.content)
    ? raw.content
        .map((entry) => (entry?.type === "text" && typeof entry?.text === "string" ? entry.text : ""))
        .filter(Boolean)
    : [];

  if (textParts.length === 0) {
    throw new Error("Malformed Claude completion payload.");
  }

  return textParts.join("\n");
}

async function callOpenAiImage(prompt, gmsKey) {
  const response = await fetch(OPENAI_IMAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gmsKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1.5",
      prompt,
      n: 1,
      size: "1024x1024",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI image failed: ${response.status} ${body.slice(0, 240)}`);
  }

  const raw = await response.json();
  return raw?.data?.[0] ?? null;
}

async function callGoogleImage(prompt, gmsKey) {
  const response = await fetch(GOOGLE_IMAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": gmsKey,
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1 },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google image failed: ${response.status} ${body.slice(0, 240)}`);
  }

  const raw = await response.json();
  return raw?.predictions?.[0] ?? null;
}

function mimeTypeToExtension(mimeType) {
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  if (mimeType === "image/svg+xml") {
    return "svg";
  }
  return "bin";
}

function buildFallbackSvg(title, description) {
  const safeTitle = title.replace(/[<&>"]/g, "");
  const safeDescription = description.replace(/[<&>"]/g, "");
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#050816" />
          <stop offset="100%" stop-color="#131a2e" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#bg)" />
      <rect x="76" y="76" width="872" height="872" rx="40" fill="none" stroke="#f8d06c" stroke-opacity="0.18" />
      <text x="112" y="190" fill="#f5f5f5" font-size="56" font-family="Arial, sans-serif" font-weight="700">${safeTitle}</text>
      <foreignObject x="112" y="258" width="800" height="560">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#d6d9e3;font-size:30px;line-height:1.55;font-family:Arial,sans-serif;">${safeDescription}</div>
      </foreignObject>
      <text x="112" y="912" fill="#f8d06c" font-size="24" font-family="Arial, sans-serif">Mystery Time generated fallback visual</text>
    </svg>
  `.trim();
}

async function saveGeneratedImage(caseKey, title, description, imagePayload) {
  await mkdir(join(process.cwd(), "public", "generated-case-images"), { recursive: true });

  if (isRecord(imagePayload) && typeof imagePayload.b64_json === "string" && imagePayload.b64_json.length > 0) {
    const fileName = `${caseKey}.png`;
    await writeFile(
      join(process.cwd(), "public", "generated-case-images", fileName),
      Buffer.from(imagePayload.b64_json, "base64"),
    );
    return `/generated-case-images/${fileName}`;
  }

  if (isRecord(imagePayload) && typeof imagePayload.bytesBase64Encoded === "string" && imagePayload.bytesBase64Encoded.length > 0) {
    const mimeType =
      typeof imagePayload.mimeType === "string"
        ? imagePayload.mimeType
        : isRecord(imagePayload.image) && typeof imagePayload.image.mimeType === "string"
          ? imagePayload.image.mimeType
          : "image/png";
    const extension = mimeTypeToExtension(mimeType);
    const fileName = `${caseKey}.${extension}`;
    await writeFile(
      join(process.cwd(), "public", "generated-case-images", fileName),
      Buffer.from(imagePayload.bytesBase64Encoded, "base64"),
    );
    return `/generated-case-images/${fileName}`;
  }

  const fallbackSvg = buildFallbackSvg(title, description);
  const fileName = `${caseKey}.svg`;
  await writeFile(join(process.cwd(), "public", "generated-case-images", fileName), fallbackSvg, "utf8");
  return `/generated-case-images/${fileName}`;
}

function normalizeHints(caseKey, rawHints) {
  if (!Array.isArray(rawHints)) {
    return [];
  }

  return rawHints
    .filter((hint) => isRecord(hint))
    .map((hint, index) => ({
      hintId:
        typeof hint.hintId === "string" && hint.hintId.trim().length > 0
          ? hint.hintId.trim()
          : `${caseKey}-hint-${index + 1}`,
      order: typeof hint.order === "number" ? hint.order : index + 1,
      triggerType: typeof hint.triggerType === "string" ? hint.triggerType : index < 2 ? "time_elapsed" : "stage_pressure",
      strength: typeof hint.strength === "string" ? hint.strength : index === 0 ? "weak" : index === 1 ? "medium" : "strong",
      publicText: typeof hint.publicText === "string" ? hint.publicText.trim() : "",
      internalNote: typeof hint.internalNote === "string" ? hint.internalNote.trim() : "",
    }))
    .filter((hint) => hint.publicText.length > 0)
    .slice(0, 3);
}

function buildImagePrompt({ title, publicDescription, hints }) {
  return [
    "Cinematic Korean mystery webgame illustration, no text, no collage, no visible murderer.",
    `Scene: ${title}.`,
    `Aftermath setup: ${publicDescription}`,
    `Show only spoiler-safe visible clues inspired by these hint threads: ${hints.map((hint) => hint.publicText).join(", ")}.`,
    "Grounded detective drama lighting, realistic props, atmospheric composition, subtle clue emphasis.",
    "Do not show the act of murder or the culprit's reveal.",
  ].join(" ");
}

async function runStructuredTextFallback(messages, gmsKey) {
  try {
    return await callText(messages, gmsKey);
  } catch {
    return callClaude(messages, gmsKey);
  }
}

async function generateValidatedCase({ gmsKey, stageNumber, attemptLabel, references }) {
  const creationMessages = [
    {
      role: "developer",
      content:
        "너는 미스터리 추리 웹게임 사건 설계자다. 반드시 JSON 객체만 반환한다. 사건은 일상적인 표면 상황에서 시작하지만 숨겨진 인과관계가 드러나는 구조여야 한다. 힌트는 정확히 3개이며 weak -> medium -> strong으로 점점 구체화되어야 한다. 메인 키워드는 4~5개, 추가 키워드는 2~3개다. 이미지 프롬프트는 영어 한 문장으로 작성하고, 현장과 visible clue만 보여주며 스포일러를 피해야 한다.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          stageNumber,
          attemptLabel,
          referencePatterns: [
            "겉보기에는 평범한 만남이나 출근, 행사처럼 보이지만 숨겨진 맥락이 뒤늦게 드러난다.",
            "정답은 인물, 방법, 동기, 결정적 단서가 한 문장으로 연결되어야 한다.",
            "힌트는 같은 말을 반복하지 않고 관찰 범위를 좁혀야 한다.",
            "이미지는 사건 직후의 현장만 보여주고 범행 장면이나 범인의 얼굴은 직접 드러내지 않는다.",
          ],
          referenceExamples: references,
          outputSchema: {
            title: "20자 내외 한국어 제목",
            publicDescription: "2~3문장 공개 설명",
            question: "사건의 전말을 묻는 한 문장",
            truth: "3~5문장 진실",
            requiredKeywords: ["핵심 키워드 4~5개"],
            bonusKeywords: ["추가 키워드 2~3개"],
            acceptedAnswerSummary: "정답 요약 1문장",
            imagePrompt: "영문 이미지 프롬프트 1문장",
            hints: [
              { order: 1, triggerType: "time_elapsed", strength: "weak", publicText: "약한 힌트", internalNote: "운영 메모" },
              { order: 2, triggerType: "time_elapsed", strength: "medium", publicText: "중간 힌트", internalNote: "운영 메모" },
              { order: 3, triggerType: "stage_pressure", strength: "strong", publicText: "강한 힌트", internalNote: "운영 메모" },
            ],
            reviewNotes: "사건 구조 설명 1~2문장",
          },
        },
        null,
        2,
      ),
    },
  ];

  const createdText = await runStructuredTextFallback(creationMessages, gmsKey);
  const created = extractJsonObject(createdText);
  if (!created) {
    throw new Error("Generated case JSON parse failed.");
  }

  const validationMessages = [
    {
      role: "developer",
      content:
        "너는 미스터리 사건 검수자다. 반드시 JSON 객체만 반환한다. 입력 사건을 검수해 한 번에 추리 가능한지, 메인 키워드와 진실이 일치하는지, 힌트 3개가 점층하는지, 이미지 프롬프트가 spoiler-safe인지 확인하고 필요하면 수정한다.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          checklist: [
            "공개 설명만 읽어서는 정답이 드러나지 않아야 한다",
            "truth는 범인/방법/동기/위장 요소가 연결되어야 한다",
            "requiredKeywords는 truth를 복원하는 최소 단위여야 한다",
            "hints는 정확히 3개이며 weak/medium/strong으로 점층해야 한다",
            "imagePrompt는 현장과 visible clue만 보여주고 스포일러를 피해야 한다",
          ],
          candidate: created,
          outputSchema: {
            title: "string",
            publicDescription: "string",
            question: "string",
            truth: "string",
            requiredKeywords: ["string"],
            bonusKeywords: ["string"],
            acceptedAnswerSummary: "string",
            imagePrompt: "string",
            hints: [
              { order: 1, triggerType: "time_elapsed", strength: "weak", publicText: "string", internalNote: "string" },
              { order: 2, triggerType: "time_elapsed", strength: "medium", publicText: "string", internalNote: "string" },
              { order: 3, triggerType: "stage_pressure", strength: "strong", publicText: "string", internalNote: "string" },
            ],
            reviewNotes: "string",
          },
        },
        null,
        2,
      ),
    },
  ];

  const validatedText = await runStructuredTextFallback(validationMessages, gmsKey);
  const validated = extractJsonObject(validatedText) ?? created;
  const caseKey = `generated-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const hints = normalizeHints(caseKey, validated.hints);
  const title = typeof validated.title === "string" && validated.title.trim().length > 0 ? validated.title.trim() : "새로운 사건";
  const publicDescription =
    typeof validated.publicDescription === "string" && validated.publicDescription.trim().length > 0
      ? validated.publicDescription.trim()
      : "현장에는 설명되지 않는 어긋남이 남아 있습니다.";
  const caseFile = {
    id: caseKey,
    key: caseKey,
    stageNumber,
    title,
    publicDescription,
    question:
      typeof validated.question === "string" && validated.question.trim().length > 0
        ? validated.question.trim()
        : "사건의 전말은 무엇인가?",
    truth:
      typeof validated.truth === "string" && validated.truth.trim().length > 0
        ? validated.truth.trim()
        : "진실 정보가 누락되었습니다.",
    requiredKeywords: asStringArray(validated.requiredKeywords).filter((value) => value.trim().length > 0).slice(0, 5),
    bonusKeywords: asStringArray(validated.bonusKeywords).filter((value) => value.trim().length > 0).slice(0, 3),
    acceptedAnswerSummary:
      typeof validated.acceptedAnswerSummary === "string" && validated.acceptedAnswerSummary.trim().length > 0
        ? validated.acceptedAnswerSummary.trim()
        : "",
    hints,
    reviewNotes:
      typeof validated.reviewNotes === "string" && validated.reviewNotes.trim().length > 0
        ? validated.reviewNotes.trim()
        : "GMS 생성/검수 사건",
    status: "approved",
    version: "gms-1.0",
  };

  if (caseFile.requiredKeywords.length < 4 || caseFile.hints.length !== 3) {
    throw new Error(`Generated case failed validation for ${caseKey}`);
  }

  const imagePrompt =
    typeof validated.imagePrompt === "string" && validated.imagePrompt.trim().length > 0
      ? validated.imagePrompt.trim()
      : buildImagePrompt({ title: caseFile.title, publicDescription: caseFile.publicDescription, hints: caseFile.hints });

  return { caseFile, imagePrompt };
}

async function writeGeneratedCaseFiles(caseFile, imageUrl) {
  await mkdir(join(process.cwd(), "data", "generated-cases"), { recursive: true });
  const fileName = `${caseFile.key}.json`;
  await writeFile(
    join(process.cwd(), "data", "generated-cases", fileName),
    JSON.stringify(
      {
        ...caseFile,
        imageUrl,
      },
      null,
      2,
    ),
    "utf8",
  );

  const indexPath = join(process.cwd(), "data", "generated-cases", "index.json");
  let currentIndex = { version: "1.0.0", cases: [] };
  try {
    currentIndex = JSON.parse(await readFile(indexPath, "utf8"));
  } catch {
    currentIndex = { version: "1.0.0", cases: [] };
  }

  const cases = Array.isArray(currentIndex.cases) ? currentIndex.cases : [];
  const nextCases = [
    ...cases.filter((entry) => entry?.id !== caseFile.key),
    {
      id: caseFile.key,
      stageNumber: caseFile.stageNumber,
      file: `./${fileName}`,
    },
  ].sort((left, right) => String(left.id).localeCompare(String(right.id)));

  await writeFile(
    indexPath,
    JSON.stringify(
      {
        version: "1.0.0",
        cases: nextCases,
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function upsertCaseRow(supabase, caseFile, imageUrl, options = {}) {
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from("case_library").upsert(
    {
      case_key: caseFile.key,
      stage_number: caseFile.stageNumber,
      title: caseFile.title,
      public_description: caseFile.publicDescription,
      image_url: imageUrl,
      image_data_url: null,
      question: caseFile.question,
      truth: caseFile.truth,
      required_keywords: caseFile.requiredKeywords,
      bonus_keywords: caseFile.bonusKeywords,
      accepted_answer_summary: caseFile.acceptedAnswerSummary,
      hints: caseFile.hints,
      is_practice_pool: options.isPracticePool === true,
      origin: options.origin ?? "gms_generated",
      review_notes: caseFile.reviewNotes ?? null,
      version: caseFile.version ?? "gms-1.0",
    },
    { onConflict: "case_key" },
  );

  if (error) {
    if (String(error.message || "").includes("case_library")) {
      return false;
    }
    throw new Error(`Failed to upsert case catalog row ${caseFile.key}: ${error.message}`);
  }

  return true;
}

async function seedPracticeCasesIntoSupabase(supabase) {
  if (!supabase) {
    return;
  }

  const indexPath = join(process.cwd(), "data", "cases", "index.json");
  const rawIndex = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = Array.isArray(rawIndex.cases) ? rawIndex.cases.slice(0, 3) : [];

  for (const entry of entries) {
    if (typeof entry?.id !== "string" || typeof entry?.file !== "string") {
      continue;
    }

    const rawCase = JSON.parse(
      await readFile(join(process.cwd(), "data", "cases", entry.file.replace("./", "")), "utf8"),
    );
    const caseFile = {
      ...rawCase,
      key: rawCase.key ?? rawCase.id ?? entry.id,
    };
    await upsertCaseRow(
      supabase,
      caseFile,
      typeof caseFile.imageUrl === "string" && caseFile.imageUrl.length > 0
        ? caseFile.imageUrl
        : `/case-images/${entry.id}.svg`,
      { isPracticePool: true, origin: "seeded_local" },
    );
  }
}

async function generateOneCase({ gmsKey, stageNumber, attemptLabel, references, supabase }) {
  const { caseFile, imagePrompt } = await generateValidatedCase({
    gmsKey,
    stageNumber,
    attemptLabel,
    references,
  });

  let imagePayload = null;
  try {
    imagePayload = await callOpenAiImage(imagePrompt, gmsKey);
  } catch {
    imagePayload = await callGoogleImage(imagePrompt, gmsKey);
  }

  const imageUrl = await saveGeneratedImage(
    caseFile.key,
    caseFile.title,
    caseFile.publicDescription,
    imagePayload,
  );
  await writeGeneratedCaseFiles(caseFile, imageUrl);
  await upsertCaseRow(supabase, caseFile, imageUrl, { origin: "gms_batch" });

  return { caseKey: caseFile.key, title: caseFile.title, imageUrl };
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = [];
  let nextIndex = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(runners);
  return results;
}

async function main() {
  const { supabaseUrl, serviceKey, gmsKey } = ensureEnv();
  const supabaseClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: tableCheckError } = await supabaseClient.from("case_library").select("case_key").limit(1);
  const caseCatalogAvailable = !tableCheckError;
  const supabase = caseCatalogAvailable ? supabaseClient : null;

  if (!caseCatalogAvailable) {
    console.warn("case_library 테이블이 없어 로컬 파일 카탈로그만 갱신합니다. Supabase 반영은 건너뜁니다.");
  }

  await seedPracticeCasesIntoSupabase(supabase);

  const count = Math.max(1, Number.parseInt(process.argv[2] ?? "20", 10) || 20);
  const references = {
    localExamples: [
      await readFile(join(process.cwd(), "..", "사건레퍼런스", "간첩", "내용.txt"), "utf8"),
      await readFile(join(process.cwd(), "..", "사건레퍼런스", "크리스바이올렛", "내용.txt"), "utf8"),
    ].map((value) => value.trim()),
    designIntent: [
      "공개 설명은 표면 상황만 보여주고, 진실은 뒤늦게 드러나는 인과관계여야 한다.",
      "힌트는 3개만 쓰고 약한 관찰 -> 방향 전환 -> 정답 축 고정 순서로 점층해야 한다.",
      "이미지는 사건 직후 현장과 visible clue만 보여주고 범행 장면과 범인 정체는 직접 드러내지 않는다.",
    ],
  };

  const jobs = Array.from({ length: count }, (_, index) => ({
    stageNumber: (index % 3) + 1,
    attemptLabel: `batch-${index + 1}`,
  }));

  const results = await runWithConcurrency(jobs, 4, async (job, index) => {
    const generated = await generateOneCase({
      gmsKey,
      stageNumber: job.stageNumber,
      attemptLabel: job.attemptLabel,
      references,
      supabase,
    });
    console.log(`[${index + 1}/${jobs.length}] ${generated.caseKey} ${generated.title}`);
    return generated;
  });

  console.log(`완료: ${results.length}건 생성`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
