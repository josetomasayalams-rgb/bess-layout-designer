import { computeWarnings } from "@/lib/layout/spacingRules";
import { computeSummary } from "@/lib/layout/summaryCalculations";
import { polygonAreaFromLngLat } from "@/lib/geometry/area";
import { formatNumber as formatMetricNumber } from "@/lib/units/formatUnits";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";

export function formatNumber(value: number, digits = 2): string {
  return formatMetricNumber(value, digits);
}

export function getProjectMetrics(
  polygon: LngLat[],
  placed: PlacedEquipment[],
  anchor: ProjectAnchor | null
) {
  const siteArea = polygonAreaFromLngLat(polygon);
  const summary = computeSummary(placed, siteArea);
  const warnings = computeWarnings(placed, polygon, anchor);
  const errors = warnings.filter((warning) => warning.severity === "error");
  const hasTerrain = polygon.length >= 3;
  const hasLayout = placed.length > 0;
  const energyDensity =
    siteArea && siteArea.area_ha > 0
      ? summary.total_energy_mwh_dc_bol / siteArea.area_ha
      : null;
  const powerDensity =
    siteArea && siteArea.area_ha > 0
      ? summary.total_apparent_power_mva / siteArea.area_ha
      : null;

  return {
    siteArea,
    summary,
    warnings,
    errors,
    hasTerrain,
    hasLayout,
    energyDensity,
    powerDensity,
    status:
      errors.length > 0
        ? "Needs review"
        : hasLayout
          ? "Layout calculated"
          : hasTerrain
            ? "Terrain ready"
            : "Setup required",
  };
}
