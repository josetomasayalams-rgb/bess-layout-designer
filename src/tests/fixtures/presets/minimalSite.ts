import { makeAnchor } from "../builders/makeAnchor";
import { makePolygon } from "../builders/makePolygon";
import {
  makePlacedEquipmentRow,
  FIXTURE_BATTERY_SPEC_ID,
} from "../builders/makePlacedEquipment";

/**
 * Smallest realistic site preset — a 200 m × 100 m rectangle with one
 * row of two battery containers. Used by smoke tests where the input
 * shape matters more than the magnitudes.
 */
export function minimalSitePreset() {
  const anchor = makeAnchor();
  const polygon = makePolygon({ anchor });
  const placed = makePlacedEquipmentRow(2, {
    equipmentSpecId: FIXTURE_BATTERY_SPEC_ID,
  });
  return { anchor, polygon, placed };
}
