import { fireEvent, render, screen } from "@testing-library/react";
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

vi.mock("@/components/sidebar/BessParkSummaryPanel", () => ({
  BessParkSummaryPanel: () => <section data-testid="summary-panel" />,
}));

vi.mock("@/components/sidebar/BessModelLibraryPanel", () => ({
  BessModelLibraryPanel: () => <section data-testid="model-library-panel" />,
}));


vi.mock("@/components/sidebar/CaseStudyPanel", () => ({
  CaseStudyPanel: () => <section data-testid="case-study-panel" />,
}));

vi.mock("@/components/sidebar/EquipmentCatalogPanel", () => ({
  EquipmentCatalogPanel: () => <section data-testid="equipment-catalog-panel" />,
}));

vi.mock("@/components/sidebar/LayoutComparisonPanel", () => ({
  LayoutComparisonPanel: () => <section data-testid="layout-comparison-panel" />,
}));

vi.mock("@/components/sidebar/MVArchitecturePanel", () => ({
  MVArchitecturePanel: () => <section data-testid="mv-architecture-panel" />,
}));

vi.mock("@/components/sidebar/ParametricTerrainPanel", () => ({
  ParametricTerrainPanel: () => <section data-testid="parametric-terrain-panel" />,
}));

vi.mock("@/components/sidebar/PreliminaryDesignToolsPanel", () => ({
  PreliminaryDesignToolsPanel: () => (
    <section data-testid="preliminary-design-panel" />
  ),
}));

vi.mock("@/components/sidebar/RegulatoryCompliancePanel", () => ({
  RegulatoryCompliancePanel: () => <section data-testid="compliance-panel" />,
}));

vi.mock("@/components/sidebar/RegulatoryConfigPanel", () => ({
  RegulatoryConfigPanel: () => <section data-testid="regulatory-config-panel" />,
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

describe("AppShell section shell surfaces", () => {
  beforeEach(() => {
    resetStores();
  });

  it("renders the shell surfaces without a polygon or layout", () => {
    render(<AppShell />);

    expect(screen.getByTestId("toolbar")).toBeDefined();
    expect(screen.getByRole("region", { name: "Project KPIs" })).toBeDefined();
    expect(screen.getByRole("button", { name: "1. Site" })).toBeDefined();
    expect(screen.getByText("1. Terrain")).toBeDefined();
    expect(
      screen.getByRole("complementary", { name: "Site primary panel" })
    ).toBeDefined();
    expect(screen.getByTestId("case-study-panel")).toBeDefined();
    expect(screen.getByTestId("bess-map")).toBeDefined();
    expect(screen.queryByTestId("equipment-catalog-panel")).toBeNull();
  });

  it("uses the rail active section to change visible panel groups", () => {
    render(<AppShell />);

    fireEvent.click(screen.getByRole("button", { name: "2. Equipment" }));

    expect(screen.getByTestId("model-library-panel")).toBeDefined();
    expect(screen.getByTestId("equipment-catalog-panel")).toBeDefined();
    expect(screen.queryByTestId("case-study-panel")).toBeNull();
  });

  it("uses the rail active section to navigate to layout, compliance and report sections", () => {
    render(<AppShell />);

    // Navigate to Layout
    fireEvent.click(screen.getByRole("button", { name: "3. Layout" }));
    expect(screen.getByTestId("preliminary-design-panel")).toBeDefined();
    expect(screen.getByTestId("bess-map")).toBeDefined();

    // Navigate to Compliance
    fireEvent.click(screen.getByRole("button", { name: "4. Compliance" }));
    expect(screen.getByTestId("compliance-panel")).toBeDefined();
    expect(screen.getByTestId("bess-map")).toBeDefined();

    // Navigate to Report
    fireEvent.click(screen.getByRole("button", { name: "5. Report" }));
    expect(screen.getByTestId("report-panel")).toBeDefined();
    expect(screen.getByTestId("bess-map")).toBeDefined();
  });

  it("allows collapsing and expanding the top KPI and flow status header", () => {
    render(<AppShell />);

    // Initial state: expanded (displays "Hide top panel" in default English locale)
    const toggleButton = screen.getByRole("button", { name: "Hide top panel" });
    expect(toggleButton.getAttribute("aria-expanded")).toBe("true");

    // Click to collapse
    fireEvent.click(toggleButton);

    // After click: collapsed (displays "Show top panel")
    const collapsedButton = screen.getByRole("button", { name: "Show top panel" });
    expect(collapsedButton.getAttribute("aria-expanded")).toBe("false");

    // Re-expand
    fireEvent.click(collapsedButton);
    const expandedButton = screen.getByRole("button", { name: "Hide top panel" });
    expect(expandedButton.getAttribute("aria-expanded")).toBe("true");
  });
});
