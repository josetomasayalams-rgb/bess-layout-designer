import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { AppShell } from "./AppShell";

vi.mock("@/components/map/BessMap", () => ({
  BessMap: () => <div data-testid="bess-map" />,
}));

vi.mock("./Toolbar", () => ({
  Toolbar: () => <div data-testid="toolbar" />,
}));

vi.mock("@/components/sidebar/ConfigurationSidebar", () => ({
  ConfigurationSidebar: () => <aside data-testid="configuration-sidebar" />,
}));

vi.mock("@/components/sidebar/BessParkSummaryPanel", () => ({
  BessParkSummaryPanel: () => <section data-testid="summary-panel" />,
}));

vi.mock("@/components/sidebar/RegulatoryCompliancePanel", () => ({
  RegulatoryCompliancePanel: () => <section data-testid="compliance-panel" />,
}));

vi.mock("@/components/sidebar/TechnicalReportPanel", () => ({
  TechnicalReportPanel: () => <section data-testid="report-panel" />,
}));

vi.mock("@/components/sidebar/WarningsPanel", () => ({
  WarningsPanel: () => <section data-testid="warnings-panel" />,
}));

function resetStores() {
  useUiStore.setState({
    locale: "en",
    leftSidebarCollapsed: false,
    rightSidebarCollapsed: false,
  });
  useProjectStore.setState({
    polygon: [],
    anchor: null,
    placedEquipment: [],
    designTargets: {},
  });
}

describe("AppShell Phase 11A.1 shell surfaces", () => {
  beforeEach(() => {
    resetStores();
  });

  it("renders the shell surfaces without a polygon or layout", () => {
    render(<AppShell />);

    expect(screen.getByTestId("toolbar")).toBeDefined();
    expect(screen.getByRole("region", { name: "Project KPIs" })).toBeDefined();
    expect(screen.getByRole("button", { name: "1. Site" })).toBeDefined();
    expect(screen.getByText("1. Terrain")).toBeDefined();
    expect(screen.getByTestId("configuration-sidebar")).toBeDefined();
    expect(screen.getByTestId("bess-map")).toBeDefined();
    expect(screen.getByTestId("summary-panel")).toBeDefined();
    expect(screen.getByTestId("compliance-panel")).toBeDefined();
    expect(screen.getByTestId("report-panel")).toBeDefined();
    expect(screen.getByTestId("warnings-panel")).toBeDefined();
  });
});
