/**
 * Phase 14.4 — `generateBessArray`.
 *
 * Pre-Phase 14 coverage: 0 %. Module is the bridge between the BESS
 * model library and placed equipment. These tests pin:
 *   - empty result when the model id is unknown,
 *   - quantity respects rows × columns,
 *   - placement count matches the requested quantity (within the
 *     row × column cap),
 *   - rotation_deg is propagated from orientation.
 */

import { describe, expect, it } from "vitest";
import { generateBessArray } from "./bessArrayGenerator";
import { bessModels } from "@/data/bessModels";
import { makeAnchor } from "@/tests/fixtures";

const KNOWN_MODEL_ID = bessModels[0].id;

describe("generateBessArray — guards", () => {
  it("returns an empty array when the modelId is unknown", () => {
    const items = generateBessArray(
      {
        modelId: "definitely-not-a-real-model",
        quantity: 4,
        rows: 2,
        columns: 2,
        separationM: 3,
        orientationDeg: 0,
        startPoint: { lng: -70, lat: -33 },
      },
      makeAnchor()
    );
    expect(items).toEqual([]);
  });
});

describe("generateBessArray — placement", () => {
  it("produces exactly `quantity` placed items when quantity ≤ rows × columns", () => {
    const items = generateBessArray(
      {
        modelId: KNOWN_MODEL_ID,
        quantity: 4,
        rows: 2,
        columns: 2,
        separationM: 3,
        orientationDeg: 0,
        startPoint: { lng: -70, lat: -33 },
      },
      makeAnchor()
    );
    expect(items).toHaveLength(4);
  });

  it("caps placement at rows × columns when quantity exceeds the grid", () => {
    const items = generateBessArray(
      {
        modelId: KNOWN_MODEL_ID,
        quantity: 10,
        rows: 2,
        columns: 3,
        separationM: 3,
        orientationDeg: 0,
        startPoint: { lng: -70, lat: -33 },
      },
      makeAnchor()
    );
    expect(items).toHaveLength(6);
  });

  it("propagates orientation_deg into rotation_deg of each item", () => {
    const items = generateBessArray(
      {
        modelId: KNOWN_MODEL_ID,
        quantity: 2,
        rows: 1,
        columns: 2,
        separationM: 3,
        orientationDeg: 47,
        startPoint: { lng: -70, lat: -33 },
      },
      makeAnchor()
    );
    expect(items.every((item) => item.rotation_deg === 47)).toBe(true);
  });

  it("supports independent rowSpacingM and columnSpacingM", () => {
    // Smoke check: this overload must not throw and must still
    // produce the right number of items.
    const items = generateBessArray(
      {
        modelId: KNOWN_MODEL_ID,
        quantity: 2,
        rows: 1,
        columns: 2,
        separationM: 3,
        rowSpacingM: 1,
        columnSpacingM: 6,
        orientationDeg: 0,
        startPoint: { lng: -70, lat: -33 },
      },
      makeAnchor()
    );
    expect(items).toHaveLength(2);
  });

  it("assigns unique ids to each generated item", () => {
    const items = generateBessArray(
      {
        modelId: KNOWN_MODEL_ID,
        quantity: 3,
        rows: 1,
        columns: 3,
        separationM: 3,
        orientationDeg: 0,
        startPoint: { lng: -70, lat: -33 },
      },
      makeAnchor()
    );
    const ids = new Set(items.map((i) => i.id));
    expect(ids.size).toBe(items.length);
  });
});
