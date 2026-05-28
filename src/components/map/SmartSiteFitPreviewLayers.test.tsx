import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartSiteFitPreviewLayers } from "./layers/SmartSiteFitPreviewLayers";
import type { FeatureCollection } from "geojson";

afterEach(() => {
  cleanup();
});

// Mock react-map-gl/maplibre components to inspect rendered outputs
vi.mock("react-map-gl/maplibre", () => ({
  Source: vi.fn(({ id, children }) => <div data-testid={`mock-source-${id}`}>{children}</div>),
  Layer: vi.fn(({ id }) => <div data-testid={`mock-layer-${id}`} />),
}));

describe("SmartSiteFitPreviewLayers", () => {
  const emptyFc: FeatureCollection = {
    type: "FeatureCollection",
    features: [],
  };

  const dummyFc: FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
        properties: { id: "test" },
      },
    ],
  };

  it("renders nothing if visible is false", () => {
    const { container } = render(
      <SmartSiteFitPreviewLayers bessFc={dummyFc} pcsFc={dummyFc} visible={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders sources and layers with expected IDs when visible and features exist", () => {
    render(<SmartSiteFitPreviewLayers bessFc={dummyFc} pcsFc={dummyFc} visible={true} />);

    // Sources exist
    expect(screen.getByTestId("mock-source-smart-site-fit-preview-bess-source")).toBeDefined();
    expect(screen.getByTestId("mock-source-smart-site-fit-preview-pcs-source")).toBeDefined();

    // Layers exist
    expect(screen.getByTestId("mock-layer-smart-site-fit-preview-bess-fill")).toBeDefined();
    expect(screen.getByTestId("mock-layer-smart-site-fit-preview-bess-outline")).toBeDefined();
    expect(screen.getByTestId("mock-layer-smart-site-fit-preview-pcs-fill")).toBeDefined();
    expect(screen.getByTestId("mock-layer-smart-site-fit-preview-pcs-outline")).toBeDefined();
  });

  it("does not crash when rendering with empty feature collections", () => {
    render(<SmartSiteFitPreviewLayers bessFc={emptyFc} pcsFc={emptyFc} visible={true} />);

    expect(screen.getByTestId("mock-source-smart-site-fit-preview-bess-source")).toBeDefined();
    expect(screen.getByTestId("mock-source-smart-site-fit-preview-pcs-source")).toBeDefined();
  });
});
