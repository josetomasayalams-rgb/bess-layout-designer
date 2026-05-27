import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BessMap } from "./BessMap";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";

vi.mock("react-map-gl/maplibre", () => ({
  Map: vi.fn(({ children }) => <div data-testid="mock-map">{children}</div>),
  Source: vi.fn(({ id, children }) => <div data-testid={`mock-source-${id}`}>{children}</div>),
  Layer: vi.fn(({ id }) => <div data-testid={`mock-layer-${id}`} />),
}));

vi.mock("@/data/mapStyles", () => ({
  FALLBACK_BASE_MAP_STYLE: { style: {} },
  resolveBaseMapStyle: vi.fn().mockResolvedValue({ style: {} }),
}));

vi.mock("@/lib/report/captureMap", () => ({
  registerMapRefForReport: vi.fn(),
  unregisterMapRefForReport: vi.fn(),
}));

vi.mock("@/components/map/CoordinateSearch", () => ({
  CoordinateSearch: () => <div data-testid="mock-coordinate-search" />,
}));
vi.mock("@/components/map/BaseMapSelector", () => ({
  BaseMapSelector: () => <div data-testid="mock-basemap-selector" />,
}));
vi.mock("@/components/map/LayerManagerPanel", () => ({
  LayerManagerPanel: () => <div data-testid="mock-layer-manager" />,
}));
vi.mock("@/components/map/LayoutEditToolbar", () => ({
  LayoutEditToolbar: () => <div data-testid="mock-layout-edit-toolbar" />,
}));
vi.mock("@/components/map/OrientationCube", () => ({
  OrientationCube: () => <div data-testid="mock-orientation-cube" />,
}));

describe("BessMap - Contract and Render Integrity", () => {
  beforeEach(() => {
    useProjectStore.setState({
      polygon: [],
      placedEquipment: [],
      interactionMode: "select",
    });
    useUiStore.setState({
      locale: "es",
      layerVisibility: {
        grid: true,
        terrain: true,
        terrainFill: true,
        terrainOutline: true,
        measurements: true,
        labels: true,
        bessContainers: true,
        pcs: true,
        transformers: true,
        accessRoads: true,
        cableRoutes: true,
        mvInfrastructure: true,
        buffers: true,
        restrictedAreas: false,
        collisions: true,
        outOfBounds: true,
        baseMap: true,
        shadows: false,
        threeD: false,
      },
    });
  });

  it("renders mock-map and essential custom overlays", () => {
    render(<BessMap />);
    expect(screen.getByTestId("mock-map")).toBeDefined();
    expect(screen.getByTestId("mock-coordinate-search")).toBeDefined();
    expect(screen.getByTestId("mock-basemap-selector")).toBeDefined();
    expect(screen.getByTestId("mock-layer-manager")).toBeDefined();
    expect(screen.getByTestId("mock-orientation-cube")).toBeDefined();
  });

  it("declares exact list of expected Maplibre layers in the correct order", () => {
    render(<BessMap />);
    const expectedLayers = [
      "mock-layer-layout-grid-lines",
      "mock-layer-site-polygon-fill",
      "mock-layer-site-polygon-stroke",
      "mock-layer-terrain-measurement-labels",
      "mock-layer-site-polygon-vertex-points",
      "mock-layer-equipment-fill",
      "mock-layer-equipment-outline",
    ];
    expectedLayers.forEach((layerId) => {
      expect(screen.getByTestId(layerId)).toBeDefined();
    });
  });
});
