import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { KPIBar } from "./KPIBar";
import { exclusionRegistry } from "@/data/exclusionRegistry";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";

function resetStores() {
  useUiStore.setState({ locale: "en" });
  useProjectStore.setState({
    polygon: [],
    anchor: null,
    placedEquipment: [],
    designTargets: {},
    blocks: [],
    conversionStations: [],
    mvFeeders: [],
    mvBuses: [],
    poi: null,
    auxiliaryServices: null,
    operationalLimits: null,
    ppc: null,
    inconsistencies: [],
  });
}

describe("KPIBar", () => {
  beforeEach(() => {
    resetStores();
  });

  it("renders safe placeholders without project data", () => {
    render(<KPIBar />);

    expect(screen.getByRole("region", { name: "Project KPIs" })).toBeDefined();
    expect(screen.getByText("Power")).toBeDefined();
    expect(screen.getByText("Energy")).toBeDefined();
    expect(screen.getByText("Duration")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Not evaluated")).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
  });

  it("shows the configured exclusion count", () => {
    render(<KPIBar />);

    const region = screen.getByRole("region", { name: "Project KPIs" });
    expect(within(region).getByText("Exclusions")).toBeDefined();
    expect(
      within(region).getByText(String(exclusionRegistry.length))
    ).toBeDefined();
  });
});
