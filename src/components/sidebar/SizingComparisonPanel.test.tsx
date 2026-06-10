/**
 * SizingComparisonPanel — render + interaction smoke.
 *
 * Pins: empty state, save disabled without an applied result, list renders
 * saved snapshots, selecting two slots shows the comparison table, and the
 * title localizes to Spanish.
 */

import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SizingComparisonPanel } from "./SizingComparisonPanel";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import type { PlacedEquipment } from "@/types/equipment";
import type { SmartSiteFitAppliedMetadata } from "@/store/projectStore.types";
import { resetProjectStore } from "@/store/slices/_testHelpers";

const BESS_ID = equipmentCatalog.find((s) => s.type === "battery_container")!.id;

const APPLIED: SmartSiteFitAppliedMetadata = {
  mode: "target",
  strategy: "balanced",
  score: 75,
  bessCount: 1,
  pcsCount: 0,
  ratio: 0,
  assumptions: [],
  appliedAt: "2026-06-03T00:00:00.000Z",
};

function place(i: number): PlacedEquipment {
  return {
    id: `bess-${i}`,
    equipmentSpecId: BESS_ID,
    anchor: { lng: -70, lat: -33 },
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
  };
}

function applyAndSave(name: string): void {
  useProjectStore.setState({
    placedEquipment: [place(0)],
    smartSiteFitApplied: APPLIED,
  });
  useProjectStore.getState().saveSizingSnapshot(name);
}

beforeEach(() => {
  resetProjectStore();
  useUiStore.setState({ locale: "en" });
});

afterEach(() => {
  cleanup();
});

function openPanel(): void {
  render(<SizingComparisonPanel />);
  fireEvent.click(screen.getByRole("button", { name: /Sizing comparator/i }));
}

describe("SizingComparisonPanel", () => {
  it("renders without crashing and shows the empty state", () => {
    openPanel();
    expect(screen.getByText(/No saved sizing snapshots yet/i)).toBeDefined();
  });

  it("disables Save when no SmartSiteFit result is applied", () => {
    openPanel();
    const save = screen.getByRole("button", { name: /^Save$/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it("enables Save once a result is applied", () => {
    useProjectStore.setState({ placedEquipment: [place(0)], smartSiteFitApplied: APPLIED });
    openPanel();
    const save = screen.getByRole("button", { name: /^Save$/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it("renders one row per saved snapshot", () => {
    applyAndSave("Escenario A");
    applyAndSave("Escenario B");
    openPanel();
    expect(screen.getAllByTestId("sizing-snapshot-row")).toHaveLength(2);
    expect(screen.getByText("Escenario A")).toBeDefined();
  });

  it("shows the comparison table only when both slots are selected", () => {
    applyAndSave("A");
    applyAndSave("B");
    openPanel();

    expect(screen.queryByText(/Not a substitute for detailed engineering/i)).toBeNull();

    const rows = screen.getAllByTestId("sizing-snapshot-row");
    fireEvent.click(within(rows[0]).getByRole("button", { name: "A" }));
    fireEvent.click(within(rows[1]).getByRole("button", { name: "B" }));

    expect(screen.getByText(/Not a substitute for detailed engineering/i)).toBeDefined();
  });

  it("localizes the title to Spanish", () => {
    useUiStore.setState({ locale: "es" });
    render(<SizingComparisonPanel />);
    expect(screen.getByText(/Comparador de predimensionamiento/i)).toBeDefined();
  });
});
