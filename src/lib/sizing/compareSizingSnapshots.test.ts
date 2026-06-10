import { describe, expect, it } from "vitest";
import {
  compareSizingSnapshots,
  rowWinner,
  type SizingDeltaRow,
} from "./compareSizingSnapshots";
import type { SizingSnapshot } from "./sizingSnapshot";

const BASE: SizingSnapshot = {
  id: "a",
  name: "A",
  createdAt: "2026-06-03T00:00:00.000Z",
  bessCount: 10,
  pcsCount: 2,
  energyMWh: 27.52,
  powerMW: 10,
  durationHours: 2.752,
  strategy: "balanced",
  mode: "target",
  score: 80,
  classification: "preliminary_assumption",
};

function rowFor(rows: SizingDeltaRow[], key: string): SizingDeltaRow {
  const row = rows.find((r) => r.key === key);
  if (!row) throw new Error(`missing row ${key}`);
  return row;
}

describe("compareSizingSnapshots", () => {
  it("returns zero deltas and equal direction for identical snapshots", () => {
    const rows = compareSizingSnapshots(BASE, BASE);
    for (const row of rows) {
      expect(row.absoluteDelta).toBe(0);
      expect(row.pctDelta).toBe(0);
      expect(row.direction).toBe("equal");
    }
  });

  it("reports a_higher with positive delta when A has more energy", () => {
    const b: SizingSnapshot = { ...BASE, id: "b", energyMWh: 13.76 };
    const row = rowFor(compareSizingSnapshots(BASE, b), "energyMWh");
    expect(row.absoluteDelta).toBe(13.76);
    expect(row.pctDelta).toBe(100);
    expect(row.direction).toBe("a_higher");
  });

  it("reports b_higher with negative delta when A has fewer containers", () => {
    const b: SizingSnapshot = { ...BASE, id: "b", bessCount: 20 };
    const row = rowFor(compareSizingSnapshots(BASE, b), "bessCount");
    expect(row.absoluteDelta).toBe(-10);
    expect(row.direction).toBe("b_higher");
  });

  it("returns null pctDelta when the B base value is zero", () => {
    const a: SizingSnapshot = { ...BASE, powerMW: 5 };
    const b: SizingSnapshot = { ...BASE, id: "b", powerMW: 0 };
    const row = rowFor(compareSizingSnapshots(a, b), "powerMW");
    expect(row.absoluteDelta).toBe(5);
    expect(row.pctDelta).toBeNull();
  });

  it("handles a null duration on one side without throwing", () => {
    const a: SizingSnapshot = { ...BASE, durationHours: null };
    const rows = compareSizingSnapshots(a, BASE);
    const row = rowFor(rows, "durationHours");
    expect(row.absoluteDelta).toBeNull();
    expect(row.pctDelta).toBeNull();
    expect(row.direction).toBe("na");
  });

  it("rounds percentage to two decimals", () => {
    const a: SizingSnapshot = { ...BASE, energyMWh: 7 };
    const b: SizingSnapshot = { ...BASE, id: "b", energyMWh: 3 };
    const row = rowFor(compareSizingSnapshots(a, b), "energyMWh");
    // (7-3)/3*100 = 133.333…
    expect(row.pctDelta).toBe(133.33);
  });

  it("emits rows in a stable order with energy first", () => {
    const rows = compareSizingSnapshots(BASE, BASE);
    expect(rows.map((r) => r.key)).toEqual([
      "energyMWh",
      "powerMW",
      "bessCount",
      "pcsCount",
      "durationHours",
      "score",
    ]);
  });
});

describe("rowWinner", () => {
  it("picks the higher side for higher_is_better metrics", () => {
    const b: SizingSnapshot = { ...BASE, id: "b", score: 60 };
    const row = rowFor(compareSizingSnapshots(BASE, b), "score");
    expect(rowWinner(row)).toBe("A");
  });

  it("returns null for neutral metrics", () => {
    const b: SizingSnapshot = { ...BASE, id: "b", bessCount: 99 };
    const row = rowFor(compareSizingSnapshots(BASE, b), "bessCount");
    expect(rowWinner(row)).toBeNull();
  });

  it("returns null for ties", () => {
    const row = rowFor(compareSizingSnapshots(BASE, BASE), "score");
    expect(rowWinner(row)).toBeNull();
  });
});
