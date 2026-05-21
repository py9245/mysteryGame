import { randomUUID } from "node:crypto";
import { PRACTICE_GENERATED_CASE_PREFIX, ROOM_CODE_ALPHABET } from "./constants";

export function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isPracticeGeneratedCaseKey(caseKey: string): boolean {
  return caseKey.startsWith(PRACTICE_GENERATED_CASE_PREFIX);
}

export function resolvePracticeGeneratedStageId(caseKey: string): string | null {
  if (!isPracticeGeneratedCaseKey(caseKey)) {
    return null;
  }

  const stageId = caseKey.slice(PRACTICE_GENERATED_CASE_PREFIX.length);
  return isUuidLike(stageId) ? stageId : null;
}

export function generateRoomCode(length = 4): string {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)] ?? "A";
  }
  return result;
}

export function createEntityId(): string {
  return randomUUID();
}
