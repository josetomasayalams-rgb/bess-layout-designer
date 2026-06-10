/**
 * sizingSnapshot — a named, timestamped capture of a preliminary sizing
 * ("predimensionamiento") produced by an applied SmartSiteFit result.
 *
 * It is a pure metrics record, NOT a layout: it stores the resolved
 * power/energy/equipment figures plus the SmartSiteFit context (strategy,
 * mode, score) so two snapshots can be compared later. No `PlacedEquipment`
 * is retained — restoring a layout is the job of the A/B layout comparator.
 *
 * Every value is a `preliminary_assumption` (see project data-classification
 * rules) and must be presented as such in the UI.
 */

import type { PlacedEquipment } from "@/types/equipment";
import { summarizePlacedEquipment } from "@/lib/layout/smartSiteFit/smartSiteFitSizing";

export type SizingSnapshot = {
  id: string;
  name: string;
  /** ISO-8601 capture timestamp. */
  createdAt: string;
  // Resolved sizing metrics (architecture-agnostic, from the catalog ratings).
  bessCount: number;
  pcsCount: number;
  /** Battery DC BOL energy, MWh. */
  energyMWh: number;
  /** Installed apparent power proxy, MVA (treated as MW for preliminary use). */
  powerMW: number;
  /** energyMWh / powerMW; null when power is zero. */
  durationHours: number | null;
  // SmartSiteFit context.
  strategy: string;
  mode: string;
  /** SmartSiteFit alternative score (0–100). */
  score: number;
  /** Always preliminary — never a certified design figure. */
  classification: "preliminary_assumption";
};

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export type BuildSizingSnapshotArgs = {
  id: string;
  name: string;
  createdAt: string;
  placedEquipment: PlacedEquipment[];
  strategy: string;
  mode: string;
  score: number;
};

/**
 * Build a `SizingSnapshot` from the currently applied SmartSiteFit layout.
 * Pure: derives energy/power/counts from the catalog via
 * `summarizePlacedEquipment` and carries the SmartSiteFit metadata through.
 */
export function buildSizingSnapshot(args: BuildSizingSnapshotArgs): SizingSnapshot {
  const { bessCount, pcsCount, powerMW, energyMWh } = summarizePlacedEquipment(
    args.placedEquipment
  );
  const durationHours = powerMW > 0 ? round(energyMWh / powerMW, 3) : null;

  return {
    id: args.id,
    name: args.name,
    createdAt: args.createdAt,
    bessCount,
    pcsCount,
    energyMWh: round(energyMWh, 3),
    powerMW: round(powerMW, 3),
    durationHours,
    strategy: args.strategy,
    mode: args.mode,
    score: round(args.score, 1),
    classification: "preliminary_assumption",
  };
}
