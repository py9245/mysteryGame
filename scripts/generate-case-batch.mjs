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
const CASE_REFERENCE_BLUEPRINTS = [
  {
    name: "간첩형 반전",
    publicSetup: "평범하게 출근하던 인물이 공휴일 아침 회사 화장실에서 사망한다.",
    hiddenTruth:
      "타국 스파이, 지하철역 물품보관소 지령, 대통령 암살, 발각 전 자살 명령이 연결된다.",
    structure:
      "평범한 루틴 -> 국가적 사건 -> 임시공휴일/지하철역/기사 정독의 어긋남 -> 지령과 자살의 전말",
    keywords: ["자살", "대통령 암살", "간첩", "발각", "지령"],
  },
  {
    name: "착각형 관계 반전",
    publicSetup: "특별한 날 호텔/레스토랑에서 만난 두 사람 중 한 명이 한 시간 뒤 사망한다.",
    hiddenTruth:
      "쌍둥이 대리 만남, 바람, 음식 알레르기, 구급차 지연이 얽혀 치명적 착오가 된다.",
    structure: "오해되는 관계 -> 대리 참석/쌍둥이 -> 전달되지 않은 위험 정보 -> 지연된 구조로 사망",
    keywords: ["음식 알레르기", "쌍둥이", "착각", "바람"],
  },
];
const CASE_DIVERSITY_AXES = [
  "병원 야간 당직",
  "웨딩홀 리허설",
  "방송국 생방송",
  "미술관 폐관 시간",
  "대학교 연구실",
  "아파트 택배 동선",
  "호텔 조식 뷔페",
  "극장 리허설",
  "수족관 백스테이지",
  "장례식장 조문",
];

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

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callText(messages, gmsKey) {
  const response = await fetchWithTimeout(TEXT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gmsKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      messages,
    }),
  }, 45_000);

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

  const response = await fetchWithTimeout(CLAUDE_URL, {
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
  }, 60_000);

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
  const response = await fetchWithTimeout(OPENAI_IMAGE_URL, {
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
  }, 75_000);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI image failed: ${response.status} ${body.slice(0, 240)}`);
  }

  const raw = await response.json();
  return raw?.data?.[0] ?? null;
}

async function callGoogleImage(prompt, gmsKey) {
  const response = await fetchWithTimeout(GOOGLE_IMAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": gmsKey,
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1 },
    }),
  }, 75_000);

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
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#07080d" />
          <stop offset="55%" stop-color="#15151a" />
          <stop offset="100%" stop-color="#241815" />
        </linearGradient>
        <radialGradient id="lamp" cx="70%" cy="18%" r="45%">
          <stop offset="0%" stop-color="#f8d06c" stop-opacity="0.24" />
          <stop offset="100%" stop-color="#f8d06c" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#bg)" />
      <rect width="1024" height="1024" fill="url(#lamp)" />
      <rect x="96" y="154" width="832" height="548" rx="28" fill="#111217" stroke="#f8d06c" stroke-opacity="0.16" />
      <rect x="160" y="500" width="704" height="258" rx="18" fill="#2c201b" />
      <rect x="212" y="552" width="188" height="124" rx="16" fill="#49312a" opacity="0.88" />
      <rect x="430" y="552" width="164" height="124" rx="16" fill="#3a2826" opacity="0.9" />
      <rect x="620" y="552" width="172" height="124" rx="16" fill="#51342b" opacity="0.85" />
      <circle cx="720" cy="440" r="76" fill="#7f2f2c" opacity="0.56" />
      <rect x="646" y="376" width="212" height="108" rx="22" fill="#18212b" opacity="0.86" />
      <path d="M680 450 752 378 828 448" fill="none" stroke="#9eb8dc" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="270" y="268" width="150" height="106" rx="12" fill="#f3dfbd" opacity="0.82" />
      <rect x="440" y="252" width="180" height="122" rx="14" fill="#d8b985" opacity="0.78" />
      <rect x="638" y="280" width="132" height="94" rx="12" fill="#e8cf9e" opacity="0.72" />
      <path d="M248 804c138-42 338-40 528 4" fill="none" stroke="#f8d06c" stroke-opacity="0.18" stroke-width="4" />
      <rect x="76" y="76" width="872" height="872" rx="40" fill="none" stroke="#f8d06c" stroke-opacity="0.18" />
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
    "High-quality cinematic Korean mystery webgame key visual, single coherent aftermath scene, wide landscape composition inside a square canvas, no text, no letters, no numbers, no UI, no collage, no visible murderer.",
    `Scene: ${title}.`,
    `Aftermath setup visible to players: ${publicDescription}`,
    `Place 2-3 spoiler-safe clue props clearly in the environment: ${hints.map((hint) => hint.publicText).join(", ")}.`,
    "Realistic Korean locations and props, tense stillness, cinematic lens, grounded dramatic lighting, clue-centered foreground, atmospheric background.",
    "Strictly avoid readable text of any kind: no Korean, English, letters, numbers, names, logos, captions, signs, labels, documents, UI, watermarks, or title cards.",
    "If a clue would normally have a label, name tag, note, receipt, phone screen, document, or sign, show it as blank paper, an unreadable blur, a color mark, a folded shape, or a barcode-like abstract block with no legible characters.",
    "Do not show the act of murder, the culprit's reveal, gore, captions, supernatural elements, or solution-revealing symbols.",
  ].join(" ");
}

function buildStrictImagePrompt(rawPrompt, { title, publicDescription, hints }) {
  const basePrompt =
    typeof rawPrompt === "string" && rawPrompt.trim().length > 0
      ? rawPrompt.trim()
      : buildImagePrompt({ title, publicDescription, hints });

  return [
    "Create a polished, text-free, cinematic case-scene image for a Korean mystery webgame.",
    `Case title for context only, do not render as text: ${title}.`,
    `Public scene context: ${publicDescription}`,
    `Core visual brief: ${basePrompt}`,
    "Composition: one coherent aftermath scene, wide horizontal framing, clear foreground clue props, no split panels, no poster layout, no UI mockup.",
    "Absolute negative constraints: no readable text, no fake Korean, no fake English, no letters, no numbers, no name tags, no labels, no signs, no documents with visible writing, no logos, no watermarks.",
    "Represent any label/note/document as blank, blurred, folded, partially hidden, or purely color-coded so there are zero legible characters.",
    "Do not reveal the culprit, murder act, final solution, explicit gore, or supernatural elements.",
  ].join(" ");
}

async function runStructuredTextFallback(messages, gmsKey) {
  try {
    return await callText(messages, gmsKey);
  } catch {
    return callClaude(messages, gmsKey);
  }
}

async function runStructuredJson(messages, gmsKey, label) {
  try {
    const text = await callText(messages, gmsKey);
    const parsed = extractJsonObject(text);
    if (parsed) {
      return parsed;
    }
  } catch {
    // Claude fallback below handles either transport or malformed JSON failures.
  }

  const fallbackText = await callClaude(messages, gmsKey);
  const fallbackParsed = extractJsonObject(fallbackText);
  if (!fallbackParsed) {
    throw new Error(`${label} JSON parse failed.`);
  }

  return fallbackParsed;
}

async function generateValidatedCase({ gmsKey, stageNumber, attemptLabel, references }) {
  const creationMessages = [
    {
      role: "developer",
      content:
        "너는 한국어 미스터리 추리 웹게임 사건 설계자다. 반드시 JSON 객체만 반환한다. 사건은 피의 게임식 라운드 문제처럼 짧은 공개 상황, 이상한 결과, 숨겨진 관계/동기/방식 반전이 있어야 한다. 정답은 범인/방법/동기/결정적 단서가 하나의 인과로 연결되어야 하며 requiredKeywords만으로 판정 가능해야 한다. 힌트는 정확히 3개이며 weak -> medium -> strong으로 점점 구체화한다. 이미지 프롬프트는 영어 한 문장으로 작성하고, 사건 직후 현장과 visible clue만 보여주며 스포일러를 피해야 한다.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          stageNumber,
          attemptLabel,
          referenceBlueprints: CASE_REFERENCE_BLUEPRINTS,
          diversityAxes: CASE_DIVERSITY_AXES,
          referencePatterns: [
            "공개 설명은 2문장 안에서 평범한 행동과 비정상 결과만 제시한다.",
            "진실에는 인물관계 반전 또는 사회적/조직적 배경 반전이 하나 이상 있어야 한다.",
            "레퍼런스는 구조만 참고하고 인물/장소/직업/핵심 트릭은 새롭게 바꾼다.",
            "정답은 인물, 방법, 동기, 결정적 단서가 한 문장으로 연결되어야 한다.",
            "힌트는 같은 말을 반복하지 않고 관찰 범위를 좁혀야 한다.",
            "이미지는 사건 직후의 현장만 보여주고 범행 장면이나 범인의 얼굴은 직접 드러내지 않는다.",
          ],
          forbiddenPatterns: [
            "그냥 독살했다, 그냥 밀었다 같은 단일행위 사건",
            "간첩/출근/카페/물품보관소/자결 명령을 그대로 반복하는 사건",
            "우연/초자연/꿈/기억상실로 해결되는 사건",
            "힌트가 정답을 그대로 말하는 사건",
            "requiredKeywords가 추상어뿐이라 판정이 불가능한 사건",
          ],
          referenceExamples: references,
          outputSchema: {
            title: "20자 내외 한국어 제목",
            publicDescription: "2문장 공개 설명. 정답은 숨기되 이상한 점이 보여야 함",
            question: "사건의 전말을 묻는 한 문장",
            truth: "4~6문장 진실. 인물관계, 방법, 동기, 은폐/착각 장치 포함",
            requiredKeywords: ["핵심 키워드 4~5개. 범인/방법/동기/결정단서 중심"],
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

  const created = await runStructuredJson(creationMessages, gmsKey, "Generated case");

  const validationMessages = [
    {
      role: "developer",
      content:
        "너는 미스터리 사건 검수자다. 반드시 JSON 객체만 반환한다. 입력 사건을 검수해 레퍼런스처럼 공개 상황의 이상함, 숨겨진 인과, requiredKeywords 판정 가능성, 3단계 힌트 점층성, spoiler-safe 이미지 프롬프트를 확인하고 부족하면 직접 수정한다.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          checklist: [
            "공개 설명만 읽어서는 정답이 드러나지 않아야 한다",
            "truth는 범인/방법/동기/위장/착각/배경 반전 요소가 연결되어야 한다",
            "requiredKeywords는 truth를 복원하는 최소 단위여야 한다",
            "hints는 정확히 3개이며 weak/medium/strong으로 점층해야 한다",
            "imagePrompt는 현장과 visible clue만 보여주고 스포일러를 피해야 한다",
            "간첩형/착각형 레퍼런스처럼 마지막에 전말이 납득되어야 한다",
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

  let validated = created;
  try {
    validated = await runStructuredJson(validationMessages, gmsKey, "Validated case");
  } catch {
    validated = created;
  }
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

  const rawImagePrompt =
    typeof validated.imagePrompt === "string" && validated.imagePrompt.trim().length > 0
      ? validated.imagePrompt.trim()
      : buildImagePrompt({ title: caseFile.title, publicDescription: caseFile.publicDescription, hints: caseFile.hints });
  const imagePrompt = buildStrictImagePrompt(rawImagePrompt, {
    title: caseFile.title,
    publicDescription: caseFile.publicDescription,
    hints: caseFile.hints,
  });

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

function toImportIdentifier(prefix, index) {
  return `${prefix}${index}`;
}

async function readCaseIndex(indexPath) {
  try {
    const parsed = JSON.parse(await readFile(indexPath, "utf8"));
    return Array.isArray(parsed.cases) ? parsed.cases : [];
  } catch {
    return [];
  }
}

async function refreshLocalCaseCatalogModule() {
  const seedCases = await readCaseIndex(join(process.cwd(), "data", "cases", "index.json"));
  const generatedCases = await readCaseIndex(join(process.cwd(), "data", "generated-cases", "index.json"));
  const imports = [];
  const entries = [];
  let importIndex = 0;

  for (const entry of seedCases) {
    if (typeof entry?.id !== "string" || typeof entry?.file !== "string") {
      continue;
    }

    const identifier = toImportIdentifier("seedCase", importIndex);
    importIndex += 1;
    const filePath = entry.file.replace(/^\.\//, "");
    imports.push(`import ${identifier} from "../../data/cases/${filePath}";`);
    entries.push(`  { key: ${JSON.stringify(entry.id)}, payload: ${identifier}, isPracticePool: true },`);
  }

  for (const entry of generatedCases) {
    if (typeof entry?.id !== "string" || typeof entry?.file !== "string") {
      continue;
    }

    const identifier = toImportIdentifier("generatedCase", importIndex);
    importIndex += 1;
    const filePath = entry.file.replace(/^\.\//, "");
    imports.push(`import ${identifier} from "../../data/generated-cases/${filePath}";`);
    entries.push(`  { key: ${JSON.stringify(entry.id)}, payload: ${identifier}, isPracticePool: false },`);
  }

  const content = `${imports.join("\n")}

export interface BundledCaseCatalogEntry {
  key: string;
  payload: Record<string, unknown>;
  isPracticePool: boolean;
}

export const BUNDLED_CASE_CATALOG: BundledCaseCatalogEntry[] = [
${entries.join("\n")}
];
`;

  await writeFile(join(process.cwd(), "src", "server", "local-case-catalog.ts"), content, "utf8");
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
  let generatedDefinition = null;
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      generatedDefinition = await generateValidatedCase({
        gmsKey,
        stageNumber,
        attemptLabel: `${attemptLabel}-try-${attempt}`,
        references,
      });
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!generatedDefinition) {
    throw lastError ?? new Error("Case generation failed.");
  }

  const { caseFile, imagePrompt } = generatedDefinition;

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
    try {
      const generated = await generateOneCase({
        gmsKey,
        stageNumber: job.stageNumber,
        attemptLabel: job.attemptLabel,
        references,
        supabase,
      });
      console.log(`[${index + 1}/${jobs.length}] ${generated.caseKey} ${generated.title}`);
      return generated;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${index + 1}/${jobs.length}] 생성 실패: ${message}`);
      return null;
    }
  });

  await refreshLocalCaseCatalogModule();
  const successCount = results.filter(Boolean).length;
  console.log(`완료: ${successCount}/${results.length}건 생성`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
