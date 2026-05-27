import { makeAnchor } from "../builders/makeAnchor";
import { makePolygon } from "../builders/makePolygon";
import {
  makePlacedEquipmentRow,
  FIXTURE_BATTERY_SPEC_ID,
} from "../builders/makePlacedEquipment";

/**
 * Larger synthetic site — useful for benchmark / performance tests.
 * Default size: 1 km × 500 m polygon, 50 placed battery containers.
 */
export function largeSyntheticSitePreset(opts: { count?: number } = {}) {
  const anchor = makeAnchor();
  const polygon = makePolygon({
    anchor,
    width_m: 1000,
    height_m: 500,
  });
  const placed = makePlacedEquipmentRow(opts.count ?? 50, {
    equipmentSpecId: FIXTURE_BATTERY_SPEC_ID,
    spacing_lng: 0.00012, // ~12 m
  });
  return { anchor, polygon, placed };
}
