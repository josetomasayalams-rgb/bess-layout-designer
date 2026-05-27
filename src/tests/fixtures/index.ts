/**
 * Phase 14.1 — Test fixtures barrel.
 *
 * Centralised builders + presets for the Phase 14 testing-hardening
 * effort. Rules of the road:
 *
 *   - Builders are PURE. They do not touch `useProjectStore` or any
 *     other zustand store. Tests that need a store should call the
 *     real store actions themselves.
 *   - Builders accept `Partial<T>` overrides with sane defaults.
 *   - Types are the REAL repo types — no shadow shapes.
 *   - Presets compose builders into named scenarios.
 *
 * Heavy refactoring of existing tests is intentionally out of scope
 * for this commit. New tests added in 14.2 – 14.8 will consume these
 * fixtures progressively.
 */

export { makeAnchor, DEFAULT_ANCHOR } from "./builders/makeAnchor";
export {
  makePolygon,
  makeRectanglePolygon,
  makeEmptyPolygon,
  type RectanglePolygonInput,
} from "./builders/makePolygon";
export {
  makePlacedEquipment,
  makePlacedEquipmentRow,
  resetPlacedEquipmentIds,
  FIXTURE_BATTERY_SPEC_ID,
  FIXTURE_PCS_SPEC_ID,
} from "./builders/makePlacedEquipment";
export { makeBuildReportDataArgs } from "./builders/makeReportData";
export { makeRegulatoryProfile } from "./builders/makeRegulatoryProfile";

export { minimalSitePreset } from "./presets/minimalSite";
export { bessDelDesiertoPreset } from "./presets/bessDelDesierto";
export { largeSyntheticSitePreset } from "./presets/largeSyntheticSite";
