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

describe("ParametricTerrainPanel — coordinate polygon", () => {
  it("renders three initial coordinate rows", () => {
    enterCoordinateMode();
    expect(screen.getByLabelText("Latitude 1")).toBeDefined();
    expect(screen.getByLabelText("Latitude 2")).toBeDefined();
    expect(screen.getByLabelText("Latitude 3")).toBeDefined();
    expect(screen.queryByLabelText("Latitude 4")).toBeNull();
  });

  it("adds rows up to a maximum of 15", () => {
    enterCoordinateMode();
    const addBtn = () => screen.getByRole("button", { name: /Add coordinate/i });
    for (let i = 0; i < 20; i += 1) {
      const btn = addBtn();
      if ((btn as HTMLButtonElement).disabled) break;
      fireEvent.click(btn);
    }
    expect(screen.getByLabelText("Latitude 15")).toBeDefined();
    expect(screen.queryByLabelText("Latitude 16")).toBeNull();
    expect((addBtn() as HTMLButtonElement).disabled).toBe(true);
  });

  it("creates a polygon from three valid coordinates and reports success", () => {
    enterCoordinateMode();
    fireEvent.change(screen.getByLabelText("Latitude 1"), { target: { value: "-33.0" } });
    fireEvent.change(screen.getByLabelText("Longitude 1"), { target: { value: "-70.0" } });
    fireEvent.change(screen.getByLabelText("Latitude 2"), { target: { value: "-33.1" } });
    fireEvent.change(screen.getByLabelText("Longitude 2"), { target: { value: "-70.0" } });
    fireEvent.change(screen.getByLabelText("Latitude 3"), { target: { value: "-33.1" } });
    fireEvent.change(screen.getByLabelText("Longitude 3"), { target: { value: "-70.1" } });

    fireEvent.click(screen.getByRole("button", { name: /Create polygon/i }));

    expect(useProjectStore.getState().polygon).toHaveLength(3);
    expect(screen.getByText(/Polygon created from 3 coordinates/i)).toBeDefined();
  });

  it("rejects an out-of-range coordinate with a specific error", () => {
    enterCoordinateMode();
    fireEvent.change(screen.getByLabelText("Latitude 1"), { target: { value: "999" } });
    fireEvent.change(screen.getByLabelText("Longitude 1"), { target: { value: "-70.0" } });
    fireEvent.change(screen.getByLabelText("Latitude 2"), { target: { value: "-33.1" } });
    fireEvent.change(screen.getByLabelText("Longitude 2"), { target: { value: "-70.0" } });
    fireEvent.change(screen.getByLabelText("Latitude 3"), { target: { value: "-33.1" } });
    fireEvent.change(screen.getByLabelText("Longitude 3"), { target: { value: "-70.1" } });

    fireEvent.click(screen.getByRole("button", { name: /Create polygon/i }));

    expect(useProjectStore.getState().polygon).toHaveLength(0);
    expect(screen.getByText(/Invalid coordinate/i)).toBeDefined();
  });

  it("errors when fewer than three valid coordinates are provided", () => {
    enterCoordinateMode();
    fireEvent.change(screen.getByLabelText("Latitude 1"), { target: { value: "-33.0" } });
    fireEvent.change(screen.getByLabelText("Longitude 1"), { target: { value: "-70.0" } });

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
