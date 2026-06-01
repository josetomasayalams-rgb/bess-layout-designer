import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ParametricTerrainPanel } from "./ParametricTerrainPanel";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";

afterEach(cleanup);

beforeEach(() => {
  useUiStore.setState({ locale: "en" });
  useProjectStore.setState({ polygon: [], anchor: null, past: [], future: [] });
});

function enterCoordinateMode() {
  render(<ParametricTerrainPanel />);
  fireEvent.click(screen.getByRole("button", { name: /Coordinate polygon/i }));
}

function coordTextarea() {
  return screen.getByLabelText(/Coordinates \(one per line\)/i);
}

describe("ParametricTerrainPanel — coordinate polygon", () => {
  it("renders a single multi-line coordinate textarea", () => {
    enterCoordinateMode();
    expect(coordTextarea()).toBeDefined();
  });

  it("creates a polygon from multiple pasted lines and reports success", () => {
    enterCoordinateMode();
    fireEvent.change(coordTextarea(), {
      target: { value: "-33.0, -70.0\n-33.1, -70.0\n-33.1, -70.1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create polygon/i }));

    expect(useProjectStore.getState().polygon).toHaveLength(3);
    expect(screen.getByText(/Polygon created from 3 coordinates/i)).toBeDefined();
  });

  it("ignores blank lines between coordinates", () => {
    enterCoordinateMode();
    fireEvent.change(coordTextarea(), {
      target: { value: "-33.0, -70.0\n\n-33.1, -70.0\n   \n-33.1, -70.1\n" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create polygon/i }));

    expect(useProjectStore.getState().polygon).toHaveLength(3);
  });

  it("rejects an out-of-range coordinate with a specific error", () => {
    enterCoordinateMode();
    fireEvent.change(coordTextarea(), {
      target: { value: "999, -70.0\n-33.1, -70.0\n-33.1, -70.1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create polygon/i }));

    expect(useProjectStore.getState().polygon).toHaveLength(0);
    expect(screen.getByText(/Invalid coordinate/i)).toBeDefined();
  });

  it("rejects more than 15 coordinates", () => {
    enterCoordinateMode();
    const lines = Array.from({ length: 16 }, (_, i) => `-33.${i}, -70.0`).join(
      "\n"
    );
    fireEvent.change(coordTextarea(), { target: { value: lines } });

    fireEvent.click(screen.getByRole("button", { name: /Create polygon/i }));

    expect(useProjectStore.getState().polygon).toHaveLength(0);
    expect(screen.getByText(/Maximum 15 coordinates/i)).toBeDefined();
  });

  it("errors when fewer than three valid coordinates are provided", () => {
    enterCoordinateMode();
    fireEvent.change(coordTextarea(), { target: { value: "-33.0, -70.0" } });

    fireEvent.click(screen.getByRole("button", { name: /Create polygon/i }));

    expect(useProjectStore.getState().polygon).toHaveLength(0);
    expect(screen.getByText(/at least 3 valid coordinates/i)).toBeDefined();
  });

  it("keeps the existing free-draw and by-parameters modes available", () => {
    render(<ParametricTerrainPanel />);
    expect(screen.getByRole("button", { name: /Free draw/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /By parameters/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Coordinate polygon/i })).toBeDefined();
  });
});
