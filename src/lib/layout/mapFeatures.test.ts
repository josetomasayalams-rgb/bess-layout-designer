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
} from "@/lib/layout/mapFeatures";
import { getRegulatoryProfile } from "@/rules/bessRegulatoryProfiles";
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
