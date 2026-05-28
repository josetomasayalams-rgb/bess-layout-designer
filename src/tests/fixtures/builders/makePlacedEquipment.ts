import type { LngLat } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import { DEFAULT_ANCHOR } from "./makeAnchor";

/**
 * Canonical equipment spec ids that exist in `equipmentCatalog`.
 * Defaults to the Sungrow BESS container used by the BESS del Desierto
 * case study. Used by fixtures and tests so that the placed equipment
 * resolves to a real spec when needed.
 */
export const FIXTURE_BATTERY_SPEC_ID = "sungrow-st2752ux-us";
export const FIXTURE_PCS_SPEC_ID = "sungrow-sc5000ud-mv-us-p3";

let __seq = 0;
function nextId(prefix: string): string {
  __seq += 1;
  return `${prefix}-${__seq.toString(16)}`;
}

/** Reset the internal id counter — tests can call this for deterministic ids. */
export function resetPlacedEquipmentIds(): void {
  __seq = 0;
}

export function makePlacedEquipment(
  overrides: Partial<PlacedEquipment> = {}
): PlacedEquipment {
  const anchor: LngLat = overrides.anchor ?? {
    lng: DEFAULT_ANCHOR.lng0,
    lat: DEFAULT_ANCHOR.lat0,
  };
  return {
    id: overrides.id ?? nextId("eq"),
    equipmentSpecId: overrides.equipmentSpecId ?? FIXTURE_BATTERY_SPEC_ID,
    anchor,
    rotation_deg: overrides.rotation_deg ?? 0,
    sourceReliability: overrides.sourceReliability ?? "certified_data",
    ...(overrides.groupId !== undefined ? { groupId: overrides.groupId } : {}),
    ...(overrides.locked !== undefined ? { locked: overrides.locked } : {}),
    ...(overrides.blockId !== undefined ? { blockId: overrides.blockId } : {}),
    ...(overrides.blockIndex !== undefined
      ? { blockIndex: overrides.blockIndex }
      : {}),
    ...(overrides.templateId !== undefined
      ? { templateId: overrides.templateId }
      : {}),
    ...(overrides.classification !== undefined
      ? { classification: overrides.classification }
      : {}),
  };
}

/** Build N placed equipment items along a row from the anchor. */
export function makePlacedEquipmentRow(
  count: number,
  opts: {
    spacing_lng?: number;
    startAt?: LngLat;
    equipmentSpecId?: string;
  } = {}
): PlacedEquipment[] {
  const spacing = opts.spacing_lng ?? 0.00005; // ~5 m
  const start = opts.startAt ?? {
    lng: DEFAULT_ANCHOR.lng0,
    lat: DEFAULT_ANCHOR.lat0,
  };
  return Array.from({ length: count }, (_unused, i) =>
    makePlacedEquipment({
      equipmentSpecId: opts.equipmentSpecId,
      anchor: { lng: start.lng + spacing * i, lat: start.lat },
    })
  );
}
