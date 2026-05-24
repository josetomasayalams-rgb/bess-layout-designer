import type { LocalPoint, ProjectAnchor, RotatedRectLocal } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import type { LngLat } from "@/types/geometry";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { defaultConstraints } from "@/data/defaultConstraints";
import { formatLength } from "@/lib/units/formatUnits";
import { toLocal } from "@/lib/geometry/projection";
import {
  rectanglesIntersect,
  allCornersInsidePolygon,
} from "@/lib/geometry/collision";

export type WarningSeverity = "info" | "warn" | "error";
export type WarningCategory =
  | "setup"
  | "geometry"
  | "collision"
  | "assumption"
  | "physical";

export type LayoutWarning = {
  id: string;
  severity: WarningSeverity;
  category?: WarningCategory;
  message: string;
  reliability: "certified_data" | "preliminary_assumption" | "pending_validation";
};

export function placedToRect(
  p: PlacedEquipment,
  anchor: ProjectAnchor
): RotatedRectLocal | null {
  const spec = equipmentCatalog.find((e) => e.id === p.equipmentSpecId);
  if (!spec) return null;
  return {
    center: toLocal(p.anchor, anchor),
    length_m: spec.footprint.length_m,
    width_m: spec.footprint.width_m,
    rotation_deg: p.rotation_deg,
  };
}

export function computeWarnings(
  placed: PlacedEquipment[],
  polygon: LngLat[],
  anchor: ProjectAnchor | null
): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];

  warnings.push({
    id: "preliminary-assumptions-in-use",
    severity: "warn",
    category: "assumption",
    message:
      "Layout uses preliminary editable assumptions for spacing, aisles and setbacks. Validate with manufacturer manuals, UL 9540A, NFPA 855, AHJ, fire engineer and insurer before committing to design.",
    reliability: "preliminary_assumption",
  });

  if (!anchor || placed.length === 0) return warnings;

  const rects = placed
    .map((p) => ({ p, rect: placedToRect(p, anchor) }))
    .filter((x): x is { p: PlacedEquipment; rect: RotatedRectLocal } => x.rect !== null);

  if (polygon.length >= 3) {
    const localPolygon: LocalPoint[] = polygon.map((v) => toLocal(v, anchor));
    for (const { p, rect } of rects) {
      if (!allCornersInsidePolygon(rect, localPolygon)) {
        warnings.push({
          id: `outside-polygon-${p.id}`,
          severity: "error",
          category: "geometry",
          message: `Equipment ${p.id.slice(0, 6)} is outside the site polygon.`,
          reliability: "preliminary_assumption",
        });
      }
    }
  }

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (rectanglesIntersect(rects[i].rect, rects[j].rect)) {
        warnings.push({
          id: `collision-${rects[i].p.id}-${rects[j].p.id}`,
          severity: "error",
          category: "collision",
          message: `Collision detected between equipment ${rects[i].p.id.slice(0, 6)} and ${rects[j].p.id.slice(0, 6)}.`,
          reliability: "certified_data",
        });
      }
    }
  }

  const minSpacing = defaultConstraints.find(
    (c) => c.id === "battery_container_spacing"
  );
  if (minSpacing) {
    warnings.push({
      id: "spacing-not-validated",
      severity: "info",
      category: "physical",
      message: `Default container spacing of ${formatLength(minSpacing.value_m, { digits: 1 })} is an editable preliminary assumption and not a normative requirement. ${minSpacing.notes}`,
      reliability: "preliminary_assumption",
    });
  }

  return warnings;
}
