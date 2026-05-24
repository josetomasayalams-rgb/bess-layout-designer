import type { ProjectAnchor, LngLat } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { toLngLat } from "@/lib/geometry/projection";

export type DemoProject = {
  anchor: ProjectAnchor;
  polygon: LngLat[];
  placedEquipment: PlacedEquipment[];
};

const DEMO_ANCHOR: ProjectAnchor = {
  lng0: -70.6483,
  lat0: -33.4569,
};

const BATTERY_SPEC_ID = "sungrow-st2752ux-us";
const PCS_SPEC_ID = "sungrow-sc5000ud-mv-us-p3";

function sourceReliabilityFor(specId: string): PlacedEquipment["sourceReliability"] {
  return (
    equipmentCatalog.find((spec) => spec.id === specId)?.source.reliability ??
    "pending_validation"
  );
}

export function createDemoProject(): DemoProject {
  const polygon = [
    { x_m: -95, y_m: -55 },
    { x_m: 95, y_m: -55 },
    { x_m: 95, y_m: 55 },
    { x_m: -95, y_m: 55 },
  ].map((point) => toLngLat(point, DEMO_ANCHOR));

  const batteryReliability = sourceReliabilityFor(BATTERY_SPEC_ID);
  const pcsReliability = sourceReliabilityFor(PCS_SPEC_ID);

  const batteries: PlacedEquipment[] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 8; col++) {
      batteries.push({
        id: `demo-b${row + 1}-${col + 1}`,
        equipmentSpecId: BATTERY_SPEC_ID,
        anchor: toLngLat(
          { x_m: -54 + col * 15, y_m: -18 + row * 12 },
          DEMO_ANCHOR
        ),
        rotation_deg: 0,
        groupId: "demo-battery-block",
        sourceReliability: batteryReliability,
      });
    }
  }

  const pcs: PlacedEquipment[] = [0, 1].map((index) => ({
    id: `demo-pcs-${index + 1}`,
    equipmentSpecId: PCS_SPEC_ID,
    anchor: toLngLat({ x_m: -42 + index * 28, y_m: 28 }, DEMO_ANCHOR),
    rotation_deg: 0,
    groupId: "demo-pcs-yard",
    sourceReliability: pcsReliability,
  }));

  return {
    anchor: DEMO_ANCHOR,
    polygon,
    placedEquipment: [...batteries, ...pcs],
  };
}
