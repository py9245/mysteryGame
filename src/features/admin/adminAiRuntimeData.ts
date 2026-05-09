import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DEFAULT_IMAGE_PROVIDER,
  DEFAULT_TEXT_MODEL,
  DEFAULT_TEXT_PROVIDER,
  getAiRuntimeStatus,
  getImageRouteDocumentation,
  getTextRouteDocumentation,
  GOOGLE_IMAGEN_MODEL,
  OPENAI_IMAGE_MODEL,
} from "@/lib/ai/catalog";

export interface AdminAiRuntimeGuide {
  envKeys: string[];
  envConfigured: boolean;
  textRuntime: {
    provider: string;
    model: string;
    route: string;
    transport: string;
    upstreamEndpoint: string;
  };
  imageRuntime: {
    defaultProvider: string;
    providers: Array<{
      provider: string;
      model: string;
      route: string;
      endpoint: string;
      auth: string;
    }>;
  };
  featureBindings: Array<{
    feature: string;
    client: "text" | "image";
    route: string;
    note: string;
  }>;
  notesDocumentPath: string;
  notesExcerpt: string[];
}

export async function buildAdminAiRuntimeGuide(): Promise<AdminAiRuntimeGuide> {
  const runtimeStatus = getAiRuntimeStatus();
  const textDoc = getTextRouteDocumentation();
  const imageDoc = getImageRouteDocumentation();
  const notesPath = join(process.cwd(), "agents/agent-3-ai-admin-content/AI_PROVIDER_NOTES.md");

  return {
    envKeys: runtimeStatus.requiredEnv,
    envConfigured: runtimeStatus.gmsKeyConfigured,
    textRuntime: {
      provider: DEFAULT_TEXT_PROVIDER,
      model: DEFAULT_TEXT_MODEL,
      route: textDoc.route,
      transport: textDoc.transport,
      upstreamEndpoint: textDoc.upstream.endpoint,
    },
    imageRuntime: {
      defaultProvider: DEFAULT_IMAGE_PROVIDER,
      providers: [
        {
          provider: "openai_gpt_image",
          model: OPENAI_IMAGE_MODEL,
          route: imageDoc.route,
          endpoint: imageDoc.providers[0]?.endpoint ?? "",
          auth: imageDoc.providers[0]?.auth ?? "",
        },
        {
          provider: "google_imagen",
          model: GOOGLE_IMAGEN_MODEL,
          route: imageDoc.route,
          endpoint: imageDoc.providers[1]?.endpoint ?? "",
          auth: imageDoc.providers[1]?.auth ?? "",
        },
      ],
    },
    featureBindings: [
      {
        feature: "질문 판정",
        client: "text",
        route: textDoc.route,
        note: "조사실 질문에 대한 공개 응답과 내부 판정 코드를 생성한다.",
      },
      {
        feature: "정답 판정",
        client: "text",
        route: textDoc.route,
        note: "개인 정답 시도의 성공 여부와 수동 검토 필요 여부를 판정한다.",
      },
      {
        feature: "사건 생성",
        client: "text",
        route: textDoc.route,
        note: "운영용 사건 초안, 사건 설명, 키워드 구조를 생성하는 데 사용한다.",
      },
      {
        feature: "힌트 생성",
        client: "text",
        route: textDoc.route,
        note: "스테이지 진행 상황에 맞는 힌트 문안을 생성한다.",
      },
      {
        feature: "사건 이미지 생성",
        client: "image",
        route: imageDoc.route,
        note: "사건 비주얼, 브리핑 이미지, 대표 썸네일 생성에 사용한다.",
      },
    ],
    notesDocumentPath: "/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/AI_PROVIDER_NOTES.md",
    notesExcerpt: await readNotesExcerpt(notesPath),
  };
}

async function readNotesExcerpt(filePath: string): Promise<string[]> {
  const raw = await readFile(filePath, "utf8");

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") || line.startsWith("## "))
    .slice(0, 10);
}
