/**
 * Phase 14.3 — `fetch` mock helpers.
 *
 * Minimal swappable global.fetch used by `reverseGeocode` tests. Each
 * helper returns a function ready to be assigned to `global.fetch` (or
 * `globalThis.fetch`). Tests should restore the original after.
 */

import { vi } from "vitest";

export type FetchScenario =
  | { kind: "ok"; body: unknown; status?: number }
  | { kind: "http-error"; status: number }
  | { kind: "network-error"; message?: string }
  | { kind: "malformed-json" }
  | { kind: "abort" };

export function makeFetchMock(scenario: FetchScenario) {
  return vi.fn(async (_input: unknown, init?: { signal?: AbortSignal }) => {
    if (scenario.kind === "abort") {
      // Simulate the fetch being aborted: throw an AbortError-like exception.
      if (init?.signal && !init.signal.aborted) {
        // Wait one tick so callers attaching an abort listener have time.
        await Promise.resolve();
      }
      throw new DOMException("aborted", "AbortError");
    }

    if (scenario.kind === "network-error") {
      throw new Error(scenario.message ?? "network failure");
    }

    if (scenario.kind === "http-error") {
      return {
        ok: false,
        status: scenario.status,
        json: async () => ({}),
      } as Response;
    }

    if (scenario.kind === "malformed-json") {
      return {
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("invalid JSON");
        },
      } as unknown as Response;
    }

    // ok
    return {
      ok: true,
      status: scenario.status ?? 200,
      json: async () => scenario.body,
    } as unknown as Response;
  });
}

export function withFetch<T>(
  fn: ReturnType<typeof makeFetchMock>,
  callback: () => Promise<T>
): Promise<T> {
  const original = globalThis.fetch;
  (globalThis as { fetch: unknown }).fetch = fn;
  return callback().finally(() => {
    (globalThis as { fetch: unknown }).fetch = original;
  });
}
