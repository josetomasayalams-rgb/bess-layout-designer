/**
 * MapComparisonOverlay — full-screen side-by-side comparison of the captured
 * A/B layout alternatives. Map rendering is mocked (jsdom has no WebGL).
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MapComparisonOverlay } from "./MapComparisonOverlay";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import type { PlacedEquipment } from "@/types/equipment";
import type { LayoutAlternative } from "@/store/projectStore";
import { resetProjectStore } from "@/store/slices/_testHelpers";

vi.mock("react-map-gl/maplibre", () => ({
  Map: vi.fn(({ children }) => <div data-testid="mock-map">{children}</div>),
  Source: vi.fn(({ id, children }) => (
    <div data-testid={`mock-source-${id}`}>{children}</div>
  )),
  Layer: vi.fn(({ id }) => <div data-testid={`mock-layer-${id}`} />),
}));

vi.mock("@/data/mapStyles", () => ({
  FALLBACK_BASE_MAP_STYLE: { style: {} },
  resolveBaseMapStyle: vi.fn().mockResolvedValue({ style: {} }),
}));

const BESS_ID = equipmentCatalog.find((s) => s.type === "battery_container")!.id;

function alternative(): LayoutAlternative {
  const placed: PlacedEquipment[] = [
    {
      id: "e1",
      equipmentSpecId: BESS_ID,
      anchor: { lng: -70.0001, lat: -33.0001 },
      rotation_deg: 0,
      sourceReliability: "preliminary_assumption",
    },
  ];
  return {
    id: "alt",
    capturedAt: "2026-06-03T00:00:00.000Z",
    anchor: { lng0: -70, lat0: -33 },
    polygon: [
      { lng: -70, lat: -33 },
      { lng: -69.999, lat: -33 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70, lat: -32.999 },
    ],
    placedEquipment: placed,
  };
}

beforeEach(() => {
  resetProjectStore();
  useUiStore.setState({ locale: "en", mapComparisonOpen: false });
});

afterEach(() => {
  cleanup();
  useUiStore.setState({ mapComparisonOpen: false });
});

describe("MapComparisonOverlay", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<MapComparisonOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the header and both slots when open", () => {
    useUiStore.setState({ mapComparisonOpen: true });
    render(<MapComparisonOverlay />);
    expect(screen.getByText("Map comparison")).toBeDefined();
    expect(screen.getByText(/Alternative A/)).toBeDefined();
    expect(screen.getByText(/Alternative B/)).toBeDefined();
  });

  it("shows a placeholder for an empty slot", () => {
    useUiStore.setState({ mapComparisonOpen: true });
    render(<MapComparisonOverlay />);
    expect(screen.getAllByText(/not captured/i).length).toBeGreaterThan(0);
  });

  it("renders a map and metrics for a captured slot", () => {
    useProjectStore.setState({ comparison: { A: alternative(), B: null } });
    useUiStore.setState({ mapComparisonOpen: true });
    render(<MapComparisonOverlay />);
    expect(screen.getByTestId("mock-map")).toBeDefined();
    // Metrics strip renders BESS/PCS rows for the captured side.
    expect(screen.getByText("BESS")).toBeDefined();
    expect(screen.getByText("PCS")).toBeDefined();
  });

  it("closes when the close button is clicked", () => {
    useUiStore.setState({ mapComparisonOpen: true });
    render(<MapComparisonOverlay />);
    fireEvent.click(screen.getByRole("button", { name: /Close comparison/i }));
    expect(useUiStore.getState().mapComparisonOpen).toBe(false);
  });

  it("closes when Escape is pressed", () => {
    useUiStore.setState({ mapComparisonOpen: true });
    render(<MapComparisonOverlay />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(useUiStore.getState().mapComparisonOpen).toBe(false);
  });
});
