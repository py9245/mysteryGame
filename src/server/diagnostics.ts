/**
 * Lightweight backend diagnostics helper.
 *
 * Purely additive. Disabled by default; enable by setting
 * `BACKEND_PERF_LOG=1` in the server environment. While disabled the helper
 * short-circuits to a no-op so it has no measurable cost in production.
 *
 * Usage:
 *
 *   import { perfMark, perfMeasure, withPerfSegment, formatServerTiming } from "@/server/diagnostics";
 *
 *   const t0 = perfMark();
 *   const state = await loadLobbyState(roomId);
 *   perfMeasure("live-store.loadLobbyState", t0);
 *
 *   // or, wrap an async block:
 *   const result = await withPerfSegment("api.room.update", () =>
 *     updateRoomSettingsInStore(input),
 *   );
 *
 *   // Inside a route handler:
 *   return new Response(JSON.stringify(payload), {
 *     headers: { "Server-Timing": formatServerTiming() },
 *   });
 *
 * The buffer is per Node.js process. Routes that want isolated metrics can
 * call `startPerfScope()` / `endPerfScope()` around the segment they care
 * about. When the flag is off, all functions are still safe to call but
 * record nothing.
 */

const ENV_FLAG = "BACKEND_PERF_LOG";

const MAX_ENTRIES = 256;

type PerfEntry = {
  name: string;
  durationMs: number;
  startedAt: number;
};

type PerfScope = {
  entries: PerfEntry[];
};

const globalScope: PerfScope = {
  entries: [],
};

let activeScope: PerfScope = globalScope;

function isEnabled(): boolean {
  const value = process.env[ENV_FLAG];
  return value === "1" || value === "true";
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  const [seconds, nanos] = process.hrtime();
  return seconds * 1000 + nanos / 1_000_000;
}

/**
 * Returns a high-resolution timestamp suitable for passing into
 * {@link perfMeasure}. When diagnostics are disabled the value is still a
 * number (so callers do not need to branch) but {@link perfMeasure} skips
 * recording.
 */
export function perfMark(): number {
  return nowMs();
}

/**
 * Records the elapsed time since {@link perfMark}. When diagnostics are
 * disabled this is a cheap return.
 */
export function perfMeasure(name: string, startedAt: number): number {
  const duration = nowMs() - startedAt;
  if (!isEnabled()) {
    return duration;
  }

  const scope = activeScope;
  if (scope.entries.length >= MAX_ENTRIES) {
    scope.entries.shift();
  }
  scope.entries.push({ name, durationMs: duration, startedAt });
  return duration;
}

/**
 * Convenience wrapper around an async function. Records the duration under
 * `name`. Errors propagate untouched.
 */
export async function withPerfSegment<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const started = perfMark();
  try {
    return await fn();
  } finally {
    perfMeasure(name, started);
  }
}

/**
 * Begin a request-scoped buffer. Callers should pair this with
 * {@link endPerfScope}. While a scope is active, all measurements land in
 * its entry list instead of the global buffer.
 */
export function startPerfScope(): PerfScope {
  const scope: PerfScope = { entries: [] };
  activeScope = scope;
  return scope;
}

/**
 * Restore the global scope and return the recorded entries. Safe to call
 * with the scope returned by {@link startPerfScope}; if the scope does not
 * match the active one we still reset to the global scope to avoid leaks.
 */
export function endPerfScope(scope: PerfScope): PerfEntry[] {
  const recorded = scope.entries.slice();
  activeScope = globalScope;
  return recorded;
}

/**
 * Drain the global scope. Useful for tests or for logging at request end
 * when scopes are not explicitly used.
 */
export function drainPerfEntries(): PerfEntry[] {
  if (!isEnabled()) {
    return [];
  }
  const drained = globalScope.entries.slice();
  globalScope.entries.length = 0;
  return drained;
}

/**
 * Render a list of perf entries into an HTTP `Server-Timing` header value.
 * Empty input produces an empty string so the caller can skip emitting the
 * header.
 */
export function formatServerTiming(entries?: PerfEntry[]): string {
  const source = entries ?? (isEnabled() ? drainPerfEntries() : []);
  if (source.length === 0) {
    return "";
  }

  // Coalesce repeated names by summing durations so the header stays compact
  // even when a helper is called many times in one request.
  const totals = new Map<string, number>();
  for (const entry of source) {
    const previous = totals.get(entry.name) ?? 0;
    totals.set(entry.name, previous + entry.durationMs);
  }

  return Array.from(totals.entries())
    .map(([name, durationMs]) => `${sanitize(name)};dur=${durationMs.toFixed(1)}`)
    .join(", ");
}

function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9_.-]/g, "_");
}

/**
 * Returns `true` when {@link ENV_FLAG} is currently enabled. Useful for
 * tests that want to assert behavior under both modes.
 */
export function isDiagnosticsEnabled(): boolean {
  return isEnabled();
}
