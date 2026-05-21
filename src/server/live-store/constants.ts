import type { RedactedValue } from "@/contracts/view";

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const DEFAULT_TEAM_LABELS = ["Red", "Blue", "Green"] as const;
export const REDACTED_OTHER_PLAYER: RedactedValue = { hidden: true, reason: "other_player" };
export const REDACTED_STAGE_SECRET: RedactedValue = { hidden: true, reason: "stage_secret" };
export const REDACTED_PRIVATE_CHAT: RedactedValue = { hidden: true, reason: "private_chat" };
export const REDACTED_AI_INTERNAL: RedactedValue = { hidden: true, reason: "ai_internal" };
export const INVESTIGATION_LOCK_SECONDS = 60;
export const INVESTIGATION_QUEUE_REENTRY_COOLDOWN_SECONDS = 5;
export const STAGE_BRIEFING_SECONDS = 60;
export const DEFAULT_STAGE_DURATION_SECONDS = 15 * 60;
export const PRIVATE_CHAT_REQUEST_TTL_SECONDS = 15;
export const PRIVATE_CHAT_MIN_SESSION_SECONDS = 30;
export const PRIVATE_CHAT_COOLDOWN_SECONDS = 10;
export const ROOM_PRESENCE_TTL_SECONDS = 60;
export const PRACTICE_GENERATED_CASE_SENTINEL = "__practice_generated__";
export const PRACTICE_GENERATED_CASE_PREFIX = "practice-generated-";
export const AUTO_CASE_SELECTION_SENTINEL = "__auto_case__";
export const CASE_REPLENISH_THRESHOLD = 10;
export const CASE_REPLENISH_COUNT = 10;
export const CASE_BATCH_GENERATION_CONCURRENCY = 4;
export const CASE_REFERENCE_BLUEPRINTS = [
  {
    name: "간첩형 반전",
    publicSetup:
      "평범하게 출근하던 인물이 공휴일 아침 회사 화장실에서 사망한다.",
    hiddenTruth:
      "피해자는 타국 스파이였고, 지하철역 물품보관소 지령과 대통령 암살 임무, 발각 전 자살 명령이 연결된다.",
    structure:
      "평범한 루틴 -> 국가적 사건 -> 임시공휴일/지하철역/기사 정독 같은 어긋난 단서 -> 지령과 자살의 전말",
    keywords: ["자살", "대통령 암살", "간첩", "발각", "지령"],
  },
  {
    name: "착각형 관계 반전",
    publicSetup:
      "특별한 날 호텔/레스토랑에서 만난 두 사람 중 한 명이 한 시간 뒤 사망한다.",
    hiddenTruth:
      "쌍둥이 대리 만남, 바람, 음식 알레르기, 구급차 지연이 얽혀 고의 살인이 아닌 치명적 착오가 된다.",
    structure:
      "오해되는 관계 -> 대리 참석/쌍둥이 -> 전달되지 않은 위험 정보 -> 지연된 구조로 사망",
    keywords: ["음식 알레르기", "쌍둥이", "착각", "바람"],
  },
] as const;
export const CASE_DIVERSITY_AXES = [
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
] as const;
