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

  it("shows a numeric power from placed PCS/MV when no design target is set", () => {
    useProjectStore.setState({
      placedEquipment: [
        {
          id: "pcs-1",
          equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
          anchor: { lng: -70, lat: -33 },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption",
        },
        {
          id: "pcs-2",
          equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
          anchor: { lng: -70.001, lat: -33 },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption",
        },
      ],
    });

    render(<KPIBar />);
    const region = screen.getByRole("region", { name: "Project KPIs" });
    // Two PCS × 5 MVA = 10 MW (preliminary apparent-power proxy).
    expect(within(region).getByText("10.0")).toBeDefined();
  });

  it("prefers the declared design power target over placed equipment", () => {
    useProjectStore.setState({
      designTargets: { powerMW: { value: 250, unit: "MW", evidence: [] } },
    });

    render(<KPIBar />);
    const region = screen.getByRole("region", { name: "Project KPIs" });
    expect(within(region).getByText("250.0")).toBeDefined();
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
