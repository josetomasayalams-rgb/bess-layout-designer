import { describe, expect, it } from "vitest";
import type { PlacedEquipment } from "@/types/equipment";
import type { ProjectAnchor } from "@/types/geometry";
import {
  equipment3DDetailFeatures,
  equipment3DLabelFeatures,
  equipmentToFeatures,
  gridLineFeatures,
  measurementLabelFeatures,
  polygonToLineFeature,
  regulatoryBufferFeatures,
  warningMarkerFeatures,
  smartSiteFitPreviewFeatures,
} from "@/lib/layout/mapFeatures";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import type { Feature, LineString } from "geojson";

const anchor: ProjectAnchor = { lng0: -70, lat0: -33 };

const placed: PlacedEquipment[] = [
  {
    id: "battery-1",
    equipmentSpecId: "sungrow-st2752ux-us",
    anchor: { lng: -70, lat: -33 },
    rotation_deg: 27,
    sourceReliability: "certified_data",
  },
  {
    id: "pcs-1",
    equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
    anchor: { lng: -69.999, lat: -33 },
    rotation_deg: 0,
    sourceReliability: "certified_data",
  },
];

describe("equipment 3D map features", () => {
  it("marks 3D-capable equipment with height and visual profile metadata", () => {
    const features = equipmentToFeatures(placed, anchor, null);

    expect(features.features).toHaveLength(2);
    expect(features.features[0].properties?.has3D).toBe(true);
    expect(features.features[0].properties?.heightM).toBe(2.6);
    expect(features.features[0].properties?.visualProfile).toBe(
      "sungrow_container_v1"
    );
  });

  it("creates procedural details for Sungrow BESS and PCS profiles", () => {
    const details = equipment3DDetailFeatures(placed, anchor);
    const labels = equipment3DLabelFeatures(placed, anchor);

    expect(details.features.length).toBeGreaterThan(8);
    expect(
      details.features.some(
        (feature) => feature.properties?.equipmentId === "battery-1"
      )
    ).toBe(true);
    expect(
      details.features.some((feature) => feature.properties?.equipmentId === "pcs-1")
    ).toBe(true);
    expect(
      details.features.some(
        (feature) => feature.properties?.detailType === "vent"
      )
    ).toBe(true);
    expect(
      details.features.some(
        (feature) => feature.properties?.detailType === "pcs-transformer-block"
      )
    ).toBe(true);
    expect(labels.features).toHaveLength(0);
  });

  it("resolves the Sungrow visual profile for BESS library models without explicit metadata", () => {
    const libraryPlaced: PlacedEquipment[] = [
      {
        id: "library-bess-1",
        equipmentSpecId: "bess-sungrow-powertitan-st6900ux-4h",
        anchor: { lng: -70, lat: -33 },
        rotation_deg: 0,
        sourceReliability: "certified_data",
      },
    ];

    const features = equipmentToFeatures(libraryPlaced, anchor, null);
    const details = equipment3DDetailFeatures(libraryPlaced, anchor);
    const labels = equipment3DLabelFeatures(libraryPlaced, anchor);

    expect(features.features[0].properties?.has3D).toBe(true);
    expect(features.features[0].properties?.visualProfile).toBe(
      "sungrow_container_v1"
    );
    expect(details.features.length).toBeGreaterThan(8);
    expect(labels.features).toHaveLength(0);
  });
});

describe("polygonToLineFeature", () => {
  it("closes the ring when there are three or more vertices", () => {
    const result = polygonToLineFeature([
      { lng: 0, lat: 0 },
      { lng: 1, lat: 0 },
      { lng: 1, lat: 1 },
    ]);
    const feature = result.features[0] as Feature<LineString>;
    const coords = feature.geometry.coordinates;
    expect(coords).toHaveLength(4);
    expect(coords[0]).toEqual(coords[coords.length - 1]);
  });

  it("leaves a 1-2 vertex polyline open (work in progress)", () => {
    const single = polygonToLineFeature([{ lng: 0, lat: 0 }]);
    const pair = polygonToLineFeature([
      { lng: 0, lat: 0 },
      { lng: 1, lat: 0 },
    ]);
    expect(
      (single.features[0] as Feature<LineString>).geometry.coordinates
    ).toHaveLength(1);
    expect(
      (pair.features[0] as Feature<LineString>).geometry.coordinates
    ).toHaveLength(2);
  });
});

describe("auxiliary map layers", () => {
  it("generates grid lines and terrain measurement labels without changing data", () => {
    const polygon = [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70.001, lat: -32.999 },
    ];

    expect(gridLineFeatures({ polygon, placed: [], anchor }).features.length).toBeGreaterThan(0);
    expect(measurementLabelFeatures(polygon, anchor).features).toHaveLength(4);
  });

  it("creates visual warning markers from existing layout warnings", () => {
    const markers = warningMarkerFeatures(
      [
        {
          id: "outside-polygon-battery-1",
          severity: "error",
          message: "",
          reliability: "preliminary_assumption",
        },
        {
          id: "collision-battery-1-pcs-1",
          severity: "error",
          message: "",
          reliability: "certified_data",
        },
      ],
      placed
    );

    expect(markers.features).toHaveLength(2);
    expect(markers.features.map((item) => item.properties?.warningType)).toEqual([
      "outOfBounds",
      "collision",
    ]);
  });
});

describe("regulatoryBufferFeatures", () => {
  it("generates buffers for battery containers and PCS stations using profile rules", () => {
    const profile = getRegulatoryProfile("ifc-2024-nfpa-855-conservative");
    const result = regulatoryBufferFeatures(placed, anchor, profile!);

    expect(result.features.length).toBeGreaterThan(0);

    const batteryBuffers = result.features.filter((f) => f.properties?.equipmentId === "battery-1");
    expect(batteryBuffers).toHaveLength(2);
    expect(batteryBuffers.map(b => b.properties?.bufferType)).toContain("normative_separation");
    expect(batteryBuffers.map(b => b.properties?.bufferType)).toContain("maintenance_aisle");

    const pcsBuffers = result.features.filter((f) => f.properties?.equipmentId === "pcs-1");
    expect(pcsBuffers).toHaveLength(1);
    expect(pcsBuffers[0].properties?.bufferType).toBe("normative_separation");
    expect(pcsBuffers[0].properties?.value_m).toBe(profile!.rules.electricalFrontWorkingClearance_m);
  });
});

describe("smartSiteFitPreviewFeatures", () => {
  it("handles null/undefined/empty inputs without throwing", () => {
    const emptyResult = smartSiteFitPreviewFeatures(null, anchor);
    expect(emptyResult.bessFeatures.features).toHaveLength(0);
    expect(emptyResult.pcsFeatures.features).toHaveLength(0);

    const emptyResult2 = smartSiteFitPreviewFeatures(undefined, null);
    expect(emptyResult2.bessFeatures.features).toHaveLength(0);
    expect(emptyResult2.pcsFeatures.features).toHaveLength(0);
  });

  it("converts a valid alternative into BESS and PCS polygon FeatureCollections with metadata", () => {
    const mockAlternative = {
      id: "alt-1",
      strategy: "balanced" as const,
      placedEquipment: [
        {
          id: "bess-1",
          equipmentSpecId: "sungrow-st2752ux-us",
          anchor: { lng: -70.0, lat: -33.0 },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption" as const,
        },
        {
          id: "pcs-1",
          equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
          anchor: { lng: -70.001, lat: -33.0 },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption" as const,
        },
      ],
      score: {
        total: 90,
        insidePolygon: 25,
        noCollisions: 25,
        boundaryMargin: 10,
        siteUtilization: 10,
        rowRegularity: 10,
        corridorEfficiency: 5,
        ratioCompliance: 5,
      },
      warnings: [],
      assumptions: [],
    };

    const result = smartSiteFitPreviewFeatures(mockAlternative, anchor);

    expect(result.bessFeatures.features).toHaveLength(1);
    expect(result.pcsFeatures.features).toHaveLength(1);

    // Validate geometry type
    expect(result.bessFeatures.features[0].geometry.type).toBe("Polygon");
    expect(result.pcsFeatures.features[0].geometry.type).toBe("Polygon");

    // Validate metadata
    expect(result.bessFeatures.features[0].properties?.isSmartSiteFitPreview).toBe(true);
    expect(result.pcsFeatures.features[0].properties?.isSmartSiteFitPreview).toBe(true);
    expect(result.bessFeatures.features[0].properties?.id).toBe("bess-1");
    expect(result.pcsFeatures.features[0].properties?.id).toBe("pcs-1");
  });

  // --- Adaptive preview (full vs simplified) ---

  function makeGiantAlternative(bessCount: number, pcsCount: number, blocks: number) {
    const placedEquipment: PlacedEquipment[] = [];
    for (let i = 0; i < bessCount; i++) {
      placedEquipment.push({
        id: `bess-${i}`,
        equipmentSpecId: "sungrow-st2752ux-us",
        anchor: { lng: -70 + i * 0.0001, lat: -33 },
        rotation_deg: 0,
        blockId: `block-${i % blocks}`,
        sourceReliability: "preliminary_assumption",
      });
    }
    for (let j = 0; j < pcsCount; j++) {
      placedEquipment.push({
        id: `pcs-${j}`,
        equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
        anchor: { lng: -70 + j * 0.0002, lat: -32.999 },
        rotation_deg: 0,
        blockId: `block-${j}`,
        sourceReliability: "preliminary_assumption",
      });
    }
    return {
      id: "alt-giant",
      strategy: "max_capacity" as const,
      placedEquipment,
      score: {
        total: 80,
        insidePolygon: 25,
        noCollisions: 25,
        boundaryMargin: 10,
        siteUtilization: 10,
        rowRegularity: 5,
        corridorEfficiency: 3,
        ratioCompliance: 2,
      },
      warnings: [],
      assumptions: [],
    };
  }

  it("uses full preview mode when equipment count is below the simplification threshold", () => {
    const alt = makeGiantAlternative(20, 5, 5);
    const result = smartSiteFitPreviewFeatures(alt, anchor);
    expect(result.previewMode).toBe("full");
    // Full mode renders one feature per item.
    expect(result.bessFeatures.features).toHaveLength(20);
    expect(result.pcsFeatures.features).toHaveLength(5);
    expect(result.representedEquipmentCount).toBe(25);
  });

  it("collapses BESS into aggregated block rectangles in simplified mode", () => {
    // Force simplification with a tiny budget instead of building 600+ items.
    const budget = {
      maxCandidateEvaluations: 1200,
      maxExactGeometryChecks: 24,
      maxPreviewFeaturesBeforeSimplification: 10,
      maxRenderedPreviewItems: 1000,
      targetComputeTimeMs: 750,
      hardTimeoutMs: 2500,
      enableProgressiveFallback: true,
    };
    const alt = makeGiantAlternative(80, 8, 4);
    const result = smartSiteFitPreviewFeatures(alt, anchor, budget);

    expect(result.previewMode).toBe("simplified");
    // 80 BESS collapse into 4 block rectangles.
    expect(result.bessFeatures.features).toHaveLength(4);
    // PCS stay individual.
    expect(result.pcsFeatures.features).toHaveLength(8);
    // The full equipment count is still reported for the UI explanation.
    expect(result.representedEquipmentCount).toBe(88);
    expect(result.renderedFeatureCount).toBe(12);
    expect(result.renderedFeatureCount).toBeLessThan(result.representedEquipmentCount);
  });

  it("tags aggregated BESS blocks with representedEquipmentCount in simplified mode", () => {
    const budget = {
      maxCandidateEvaluations: 1200,
      maxExactGeometryChecks: 24,
      maxPreviewFeaturesBeforeSimplification: 10,
      maxRenderedPreviewItems: 1000,
      targetComputeTimeMs: 750,
      hardTimeoutMs: 2500,
      enableProgressiveFallback: true,
    };
    const alt = makeGiantAlternative(40, 4, 2);
    const result = smartSiteFitPreviewFeatures(alt, anchor, budget);

    expect(result.previewMode).toBe("simplified");
    for (const f of result.bessFeatures.features) {
      expect(f.properties?.aggregated).toBe(true);
      expect(f.properties?.previewMode).toBe("simplified");
      // Each block aggregates 40 / 2 = 20 BESS.
      expect(f.properties?.representedEquipmentCount).toBe(20);
    }
  });

  it("never emits a separate transformer feature in either preview mode", () => {
    const budget = {
      maxCandidateEvaluations: 1200,
      maxExactGeometryChecks: 24,
      maxPreviewFeaturesBeforeSimplification: 10,
      maxRenderedPreviewItems: 1000,
      targetComputeTimeMs: 750,
      hardTimeoutMs: 2500,
      enableProgressiveFallback: true,
    };
    const alt = makeGiantAlternative(60, 6, 3);
    const result = smartSiteFitPreviewFeatures(alt, anchor, budget);

    const allTypes = [
      ...result.bessFeatures.features,
      ...result.pcsFeatures.features,
    ].map((f) => f.properties?.type);
    expect(allTypes).not.toContain("transformer");
    for (const t of allTypes) {
      expect(["battery_container", "pcs_mv_station"]).toContain(t);
    }
  });
});
