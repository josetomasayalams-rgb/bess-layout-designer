/**
 * Phase 14.3 — `reverseGeocode` network behaviour.
 *
 * Pins the four documented fetch outcomes (success, HTTP error, network
 * error, malformed JSON) and the cache behaviour. Uses the shared
 * `mockFetch` helper from `src/tests/mocks`.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearReverseGeocodeCache,
  describeLocation,
  reverseGeocode,
} from "./reverseGeocode";
import { makeFetchMock } from "@/tests/mocks/mockFetch";

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  clearReverseGeocodeCache();
});

afterEach(() => {
  (globalThis as { fetch: typeof ORIGINAL_FETCH }).fetch = ORIGINAL_FETCH;
});

describe("reverseGeocode — happy path", () => {
  it("returns parsed address fields", async () => {
    const mock = makeFetchMock({
      kind: "ok",
      body: {
        display_name: "Santiago, RM, Chile",
        address: {
          city: "Santiago",
          state: "Región Metropolitana",
          country: "Chile",
          country_code: "cl",
        },
      },
    });
    (globalThis as { fetch: typeof ORIGINAL_FETCH }).fetch =
      mock as unknown as typeof ORIGINAL_FETCH;

    const result = await reverseGeocode({ lng: -70.65, lat: -33.45 });
    expect(result).not.toBeNull();
    expect(result?.displayName).toBe("Santiago, RM, Chile");
    expect(result?.address.city).toBe("Santiago");
    expect(result?.address.countryCode).toBe("CL");
    expect(result?.attribution).toContain("OpenStreetMap");
    expect(mock).toHaveBeenCalledTimes(1);
  });
});

describe("reverseGeocode — error paths", () => {
  it("returns null on HTTP error and caches the negative result", async () => {
    const mock = makeFetchMock({ kind: "http-error", status: 503 });
    (globalThis as { fetch: typeof ORIGINAL_FETCH }).fetch =
      mock as unknown as typeof ORIGINAL_FETCH;

    const first = await reverseGeocode({ lng: -70.65, lat: -33.45 });
    expect(first).toBeNull();

    // Cache hit -> no second fetch
    const second = await reverseGeocode({ lng: -70.65, lat: -33.45 });
    expect(second).toBeNull();
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("returns null on network error", async () => {
    const mock = makeFetchMock({ kind: "network-error" });
    (globalThis as { fetch: typeof ORIGINAL_FETCH }).fetch =
      mock as unknown as typeof ORIGINAL_FETCH;

    const result = await reverseGeocode({ lng: -70.65, lat: -33.45 });
    expect(result).toBeNull();
  });

  it("returns null on malformed JSON", async () => {
    const mock = makeFetchMock({ kind: "malformed-json" });
    (globalThis as { fetch: typeof ORIGINAL_FETCH }).fetch =
      mock as unknown as typeof ORIGINAL_FETCH;

    const result = await reverseGeocode({ lng: -70.65, lat: -33.45 });
    expect(result).toBeNull();
  });
});

describe("describeLocation", () => {
  it("returns null for null input", () => {
    expect(describeLocation(null)).toBeNull();
  });

  it("prefers city > state > country and joins them with commas", () => {
    expect(
      describeLocation({
        displayName: "ignored",
        attribution: "",
        fetchedAt: new Date().toISOString(),
        address: {
          city: "Santiago",
          state: "RM",
          country: "Chile",
        },
      })
    ).toBe("Santiago, RM, Chile");
  });

  it("falls back to displayName when address parts are missing", () => {
    expect(
      describeLocation({
        displayName: "Somewhere remote",
        attribution: "",
        fetchedAt: new Date().toISOString(),
        address: {},
      })
    ).toBe("Somewhere remote");
  });
});
