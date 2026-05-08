import type { IsoTimestamp } from "../contracts/game";

export function nowUtcIso(date = new Date()): IsoTimestamp {
  return date.toISOString();
}

export function addSeconds(
  isoTimestamp: IsoTimestamp,
  seconds: number,
): IsoTimestamp {
  return new Date(Date.parse(isoTimestamp) + seconds * 1000).toISOString();
}

export function diffSeconds(
  fromIso: IsoTimestamp,
  toIso: IsoTimestamp,
): number {
  return Math.max(0, Math.floor((Date.parse(toIso) - Date.parse(fromIso)) / 1000));
}

export function hasExpired(
  expiresAt: IsoTimestamp | null,
  nowIso: IsoTimestamp,
): boolean {
  if (!expiresAt) {
    return false;
  }

  return Date.parse(nowIso) >= Date.parse(expiresAt);
}

export function remainingSeconds(
  endsAt: IsoTimestamp | null,
  nowIso: IsoTimestamp,
): number {
  if (!endsAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((Date.parse(endsAt) - Date.parse(nowIso)) / 1000));
}
