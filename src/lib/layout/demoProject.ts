import type { ProjectAnchor, LngLat } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { toLngLat } from "@/lib/geometry/projection";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import {
  generatePreliminaryLayout,
  type PreliminaryLayoutResult,
} from "@/lib/layout/preliminaryLayoutGenerator";

export type DemoProject = {
  anchor: ProjectAnchor;
  polygon: LngLat[];
  placedEquipment: PlacedEquipment[];
};

export type PublishedDemoProject = DemoProject & {
  projectName: string;
  lastToolResult: PreliminaryLayoutResult;
};

const DEMO_ANCHOR: ProjectAnchor = {
  lng0: -70.6483,
  lat0: -33.4569,
};

/** Published showcase site supplied by the user (four vertices, WGS84). */
const PUBLISHED_DEMO_ANCHOR: ProjectAnchor = {
  lng0: -69.56941554,
  lat0: -22.20541316,
};

const PUBLISHED_DEMO_POLYGON: LngLat[] = [
  { lng: -69.56941554, lat: -22.20541316 },
  { lng: -69.56602, lat: -22.205425 },
  { lng: -69.56602544, lat: -22.20678009 },
  { lng: -69.569421, lat: -22.20676825 },
];

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

/**
 * Shareable showcase state used by the hosted demo URL. It is deliberately
 * generated from the same layout engine as the sizing tool so the published
 * project demonstrates the 320-container / 40-PCS 5x8 terrain-fit workflow.
 */
export function createPublishedDemoProject(): PublishedDemoProject {
  const anchor = PUBLISHED_DEMO_ANCHOR;
  const polygon = PUBLISHED_DEMO_POLYGON;
  const rules = getRegulatoryProfile("chile-sec-rgr-06-2024").rules;
  const lastToolResult = generatePreliminaryLayout({
    batteryContainerSpecId: "sungrow-st2752ux-us",
    pcsSpecId: "sungrow-sc5000ud-mv-us-p3",
    batteryContainerCount: 320,
    pcsCount: 40,
    containersPerPcs: 8,
    blockColumns: 5,
    anchor,
    startPoint: polygon[0],
    polygon,
    rules: {
      bessToBess_m: rules.bessToBess_m,
      bessToPropertyLine_m: rules.bessToPropertyLine_m,
      electricalFrontWorkingClearance_m: rules.electricalFrontWorkingClearance_m,
      transformerToBessRecommended_m: rules.transformerToBessRecommended_m,
    },
    fitInsidePolygon: true,
  });

  if (lastToolResult.status === "error") {
    throw new Error(lastToolResult.message);
  }

  return {
    anchor,
    polygon,
    placedEquipment: lastToolResult.placed,
    projectName: "BESS del Desierto · 200 MW / 880,64 MWh · grilla 5×8",
    lastToolResult,
  };
}
