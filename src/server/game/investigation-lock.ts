import type {
  EntityId,
  InvestigationLock,
  IsoTimestamp,
} from "../../contracts/game";
import { addSeconds, hasExpired } from "../time";

// Production-aligned investigation lock constants.
// `LOCK_TTL_SECONDS` matches the value enforced by the live store (60s)
// and the frontend's optimistic countdown. Keep these three in lockstep.
export const LOCK_TTL_SECONDS = 60;
export const REENTRY_COOLDOWN_SECONDS = 5;
export const MAX_QUESTIONS_PER_LOCK = 3;
export const MAX_ANSWER_ATTEMPTS_PER_LOCK = 1;

export type InvestigationLockErrorCode =
  | "LOCK_HELD_BY_OTHER"
  | "LOCK_OWNER_MISMATCH"
  | "COOLDOWN_ACTIVE"
  | "LOCK_ALREADY_RELEASED"
  | "QUESTION_LIMIT_REACHED"
  | "ANSWER_LIMIT_REACHED";

export class InvestigationLockError extends Error {
  constructor(
    public readonly code: InvestigationLockErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "InvestigationLockError";
  }
}

export interface AcquireInvestigationLockInput {
  existingLock: InvestigationLock;
  playerId: EntityId;
  nowIso: IsoTimestamp;
}

export interface ReleaseInvestigationLockInput {
  existingLock: InvestigationLock;
  playerId: EntityId;
  nowIso: IsoTimestamp;
}

export function isLockActive(
  lock: InvestigationLock,
  nowIso: IsoTimestamp,
): boolean {
  return Boolean(lock.lockedByPlayerId && !hasExpired(lock.expiresAt, nowIso));
}

export function expireLockIfNeeded(
  lock: InvestigationLock,
  nowIso: IsoTimestamp,
): InvestigationLock {
  if (!lock.lockedByPlayerId || !hasExpired(lock.expiresAt, nowIso)) {
    return lock;
  }

  return {
    ...lock,
    lockedByPlayerId: null,
    lockedAt: null,
    expiresAt: null,
    lastReleasedByPlayerId: lock.lockedByPlayerId,
    lastReleasedAt: lock.expiresAt,
    version: lock.version + 1,
    updatedAt: nowIso,
  };
}

export function getCooldownEndsAt(
  lock: InvestigationLock,
  playerId: EntityId,
): IsoTimestamp | null {
  if (
    !lock.lastReleasedAt ||
    !lock.lastReleasedByPlayerId ||
    lock.lastReleasedByPlayerId !== playerId
  ) {
    return null;
  }

  return addSeconds(lock.lastReleasedAt, REENTRY_COOLDOWN_SECONDS);
}

export function isInReentryCooldown(
  lock: InvestigationLock,
  playerId: EntityId,
  nowIso: IsoTimestamp,
): boolean {
  const cooldownEndsAt = getCooldownEndsAt(lock, playerId);
  return Boolean(cooldownEndsAt && !hasExpired(cooldownEndsAt, nowIso));
}

/**
 * Select the FIFO head of an investigation queue.
 *
 * Sort key: `queueJoinedAt` ascending; ties broken by stable `playerId` lex order.
 * Entries whose `queueJoinedAt` is null/empty are excluded — they are considered
 * outside the queue.
 *
 * Optional `nowIso` + cooldown filter lets the caller skip entries still under
 * their `queueCooldownEndsAt` window so the same player who just released cannot
 * be auto-admitted before the 5s cooldown elapses.
 */
export interface InvestigationQueueEntry<T = unknown> {
  playerId: EntityId;
  queueJoinedAt: IsoTimestamp | null | undefined;
  queueCooldownEndsAt?: IsoTimestamp | null;
  payload?: T;
}

export function sortInvestigationQueueFifo<T>(
  entries: ReadonlyArray<InvestigationQueueEntry<T>>,
): InvestigationQueueEntry<T>[] {
  return [...entries]
    .filter(
      (entry) =>
        typeof entry.queueJoinedAt === "string" &&
        entry.queueJoinedAt.length > 0,
    )
    .sort((left, right) => {
      const leftTime = Date.parse(left.queueJoinedAt ?? "");
      const rightTime = Date.parse(right.queueJoinedAt ?? "");

      if (
        Number.isFinite(leftTime) &&
        Number.isFinite(rightTime) &&
        leftTime !== rightTime
      ) {
        return leftTime - rightTime;
      }

      return left.playerId.localeCompare(right.playerId);
    });
}

export function selectAdmissibleQueueHead<T>(
  entries: ReadonlyArray<InvestigationQueueEntry<T>>,
  nowIso: IsoTimestamp,
): InvestigationQueueEntry<T> | null {
  const sorted = sortInvestigationQueueFifo(entries);
  for (const entry of sorted) {
    if (
      entry.queueCooldownEndsAt &&
      !hasExpired(entry.queueCooldownEndsAt, nowIso)
    ) {
      continue;
    }
    return entry;
  }
  return null;
}

export function acquireInvestigationLock(
  input: AcquireInvestigationLockInput,
): InvestigationLock {
  const normalizedLock = expireLockIfNeeded(input.existingLock, input.nowIso);

  if (
    normalizedLock.lockedByPlayerId &&
    normalizedLock.lockedByPlayerId !== input.playerId
  ) {
    throw new InvestigationLockError(
      "LOCK_HELD_BY_OTHER",
      `Stage lock is held by ${normalizedLock.lockedByPlayerId}`,
    );
  }

  const cooldownEndsAt = getCooldownEndsAt(normalizedLock, input.playerId);

  if (cooldownEndsAt && !hasExpired(cooldownEndsAt, input.nowIso)) {
    throw new InvestigationLockError(
      "COOLDOWN_ACTIVE",
      `Player ${input.playerId} is on re-entry cooldown`,
    );
  }

  return {
    ...normalizedLock,
    lockedByPlayerId: input.playerId,
    lockedAt: input.nowIso,
    expiresAt: addSeconds(input.nowIso, LOCK_TTL_SECONDS),
    questionCount: 0,
    answerAttemptCount: 0,
    version: normalizedLock.version + 1,
    updatedAt: input.nowIso,
  };
}

function assertLockOwnedByPlayer(
  lock: InvestigationLock,
  playerId: EntityId,
): void {
  if (!lock.lockedByPlayerId) {
    throw new InvestigationLockError(
      "LOCK_ALREADY_RELEASED",
      "Stage lock is already released",
    );
  }

  if (lock.lockedByPlayerId !== playerId) {
    throw new InvestigationLockError(
      "LOCK_OWNER_MISMATCH",
      `Player ${playerId} does not own the current lock`,
    );
  }
}

export function recordQuestionSubmission(
  input: AcquireInvestigationLockInput,
): InvestigationLock {
  const normalizedLock = expireLockIfNeeded(input.existingLock, input.nowIso);
  assertLockOwnedByPlayer(normalizedLock, input.playerId);

  if (normalizedLock.questionCount >= MAX_QUESTIONS_PER_LOCK) {
    throw new InvestigationLockError(
      "QUESTION_LIMIT_REACHED",
      `Stage lock question limit reached: ${MAX_QUESTIONS_PER_LOCK}`,
    );
  }

  return {
    ...normalizedLock,
    questionCount: normalizedLock.questionCount + 1,
    version: normalizedLock.version + 1,
    updatedAt: input.nowIso,
  };
}

export function recordAnswerAttempt(
  input: AcquireInvestigationLockInput,
): InvestigationLock {
  const normalizedLock = expireLockIfNeeded(input.existingLock, input.nowIso);
  assertLockOwnedByPlayer(normalizedLock, input.playerId);

  if (normalizedLock.answerAttemptCount >= MAX_ANSWER_ATTEMPTS_PER_LOCK) {
    throw new InvestigationLockError(
      "ANSWER_LIMIT_REACHED",
      `Stage lock answer attempt limit reached: ${MAX_ANSWER_ATTEMPTS_PER_LOCK}`,
    );
  }

  return {
    ...normalizedLock,
    answerAttemptCount: normalizedLock.answerAttemptCount + 1,
    version: normalizedLock.version + 1,
    updatedAt: input.nowIso,
  };
}

export function releaseInvestigationLock(
  input: ReleaseInvestigationLockInput,
): InvestigationLock {
  const normalizedLock = expireLockIfNeeded(input.existingLock, input.nowIso);
  assertLockOwnedByPlayer(normalizedLock, input.playerId);

  return {
    ...normalizedLock,
    lockedByPlayerId: null,
    lockedAt: null,
    expiresAt: null,
    lastReleasedByPlayerId: input.playerId,
    lastReleasedAt: input.nowIso,
    version: normalizedLock.version + 1,
    updatedAt: input.nowIso,
  };
}
