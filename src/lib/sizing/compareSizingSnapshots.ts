/**
 * compareSizingSnapshots — pure metric-by-metric comparison of two saved
 * sizing snapshots ("predimensionamientos").
 *
 * Returns one `SizingDeltaRow` per metric, in a stable display order, with the
 * absolute delta (A − B), a null-safe percentage delta (relative to B), the
 * direction, and a `preference` hint the UI uses to colour the winning cell.
 * The function never throws and tolerates null metrics (e.g. duration when
 * power is zero).
 */

import type { SizingSnapshot } from "./sizingSnapshot";

export type DeltaDirection = "a_higher" | "b_higher" | "equal" | "na";

export type MetricPreference = "higher_is_better" | "lower_is_better" | "neutral";

export type SizingDeltaRow = {
  /** Machine key matching the snapshot field. */
  key: string;
  labelEn: string;
  labelEs: string;
  /** Display unit, e.g. "MWh", "MVA", "h", "" for counts. */
  unit: string;
  valueA: number | null;
  valueB: number | null;
  /** valueA − valueB; null when either side is null. */
  absoluteDelta: number | null;
  /** (valueA − valueB) / |valueB| × 100; null when B is 0 or either is null. */
  pctDelta: number | null;
  direction: DeltaDirection;
  preference: MetricPreference;
};

type MetricDef = {
  key: keyof SizingSnapshot;
  labelEn: string;
  labelEs: string;
  unit: string;
  preference: MetricPreference;
};

/** Stable display order — energy first, matching UI reading order. */
const METRICS: MetricDef[] = [
  { key: "energyMWh", labelEn: "Energy", labelEs: "Energía", unit: "MWh", preference: "higher_is_better" },
  { key: "powerMW", labelEn: "Power", labelEs: "Potencia", unit: "MVA", preference: "neutral" },
  { key: "bessCount", labelEn: "BESS", labelEs: "BESS", unit: "", preference: "neutral" },
  { key: "pcsCount", labelEn: "PCS", labelEs: "PCS", unit: "", preference: "neutral" },
  { key: "durationHours", labelEn: "Duration", labelEs: "Duración", unit: "h", preference: "neutral" },
  { key: "score", labelEn: "Score", labelEs: "Puntaje", unit: "", preference: "higher_is_better" },
];

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function asNumberOrNull(value: SizingSnapshot[keyof SizingSnapshot]): number | null {
  return typeof value === "number" ? value : null;
}

function directionOf(a: number | null, b: number | null): DeltaDirection {
  if (a === null || b === null) return "na";
  if (a > b) return "a_higher";
  if (b > a) return "b_higher";
  return "equal";
}

export function compareSizingSnapshots(
  a: SizingSnapshot,
  b: SizingSnapshot
): SizingDeltaRow[] {
  return METRICS.map((metric) => {
    const valueA = asNumberOrNull(a[metric.key]);
    const valueB = asNumberOrNull(b[metric.key]);

    const absoluteDelta =
      valueA === null || valueB === null ? null : round(valueA - valueB, 3);
    const pctDelta =
      valueA === null || valueB === null || valueB === 0
        ? null
        : round(((valueA - valueB) / Math.abs(valueB)) * 100, 2);

    return {
      key: metric.key,
      labelEn: metric.labelEn,
      labelEs: metric.labelEs,
      unit: metric.unit,
      valueA,
      valueB,
      absoluteDelta,
      pctDelta,
      direction: directionOf(valueA, valueB),
      preference: metric.preference,
    };
  });
}

/**
 * Which slot "wins" a row given its preference. Returns null for neutral
 * metrics, ties, or rows with a null side.
 */
export function rowWinner(row: SizingDeltaRow): "A" | "B" | null {
  if (row.preference === "neutral") return null;
  if (row.valueA === null || row.valueB === null) return null;
  if (row.valueA === row.valueB) return null;
  const aWins =
    row.preference === "higher_is_better"
      ? row.valueA > row.valueB
      : row.valueA < row.valueB;
  return aWins ? "A" : "B";
}
