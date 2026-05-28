/**
 * Phase 14.3 — `captureMapImage` null/register paths.
 *
 * Full WebGL-backed capture cannot be exercised in JSDOM. These tests
 * pin the documented contract: when no map is registered the helper
 * resolves to `null` rather than throwing, and register / unregister
 * change that branch deterministically.
 *
 * The successful-capture path is intentionally exercised at the system
 * level (manual + Playwright deferred) — the unit boundary here only
 * guards the fallback that the report depends on.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  captureMapImage,
  registerMapRefForReport,
  unregisterMapRefForReport,
} from "./captureMap";

afterEach(() => {
  unregisterMapRefForReport();
});

describe("captureMapImage — null branches", () => {
  it("resolves to null when no map is registered", async () => {
    const result = await captureMapImage();
    expect(result).toBeNull();
  });

  it("resolves to null when the registered ref points to null", async () => {
    registerMapRefForReport({ current: null });
    const result = await captureMapImage();
    expect(result).toBeNull();
  });

  it("respects unregister", async () => {
    registerMapRefForReport({ current: null });
    unregisterMapRefForReport();
    const result = await captureMapImage();
    expect(result).toBeNull();
  });
});
