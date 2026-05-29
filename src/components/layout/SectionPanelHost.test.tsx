import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { SectionPanelHost } from "./SectionPanelHost";

vi.mock("@/components/sidebar/BessParkSummaryPanel", () => ({
  BessParkSummaryPanel: () => <section data-testid="summary-panel" />,
}));

vi.mock("@/components/sidebar/BessModelLibraryPanel", () => ({
  BessModelLibraryPanel: () => <section data-testid="model-library-panel" />,
}));

vi.mock("@/components/sidebar/BessQuickSizingPanel", () => ({
  BessQuickSizingPanel: () => <section data-testid="quick-sizing-panel" />,
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

vi.mock("@/components/sidebar/SmartSiteFitPanel", () => ({
  SmartSiteFitPanel: () => <section data-testid="smart-site-fit-panel" />,
}));

function resetStores() {
  useUiStore.setState({ locale: "en" });
  useProjectStore.setState({
    polygon: [],
    anchor: null,
    placedEquipment: [],
  });
}

describe("SectionPanelHost", () => {
  beforeEach(() => {
    resetStores();
  });

  it("maps equipment panels to the equipment section", () => {
    render(
      <>
        <SectionPanelHost activeSection="equipment" region="primary" />
        <SectionPanelHost activeSection="equipment" region="secondary" />
      </>
    );

    expect(screen.getByTestId("model-library-panel")).toBeDefined();
    expect(screen.getByTestId("equipment-catalog-panel")).toBeDefined();
    // Quick sizing has been relocated out of the equipment section.
    expect(screen.queryByTestId("quick-sizing-panel")).toBeNull();
  });

  it("renders each section shell without remapping ids", () => {
    const sections = ["site", "equipment", "layout", "compliance", "report"] as const;

    for (const section of sections) {
      const { unmount } = render(
        <SectionPanelHost activeSection={section} region="primary" />
      );

      expect(
        screen.getByRole("complementary", {
          name: new RegExp(`${section === "site" ? "Site" : section === "equipment" ? "Equipment" : section === "layout" ? "Layout" : section === "compliance" ? "Compliance" : "Report"} primary panel`),
        })
      ).toBeDefined();

      unmount();
    }
  });

  it("keeps compliance findings and warnings in the compliance section", () => {
    render(
      <>
        <SectionPanelHost activeSection="compliance" region="primary" />
        <SectionPanelHost activeSection="compliance" region="secondary" />
      </>
    );

    expect(screen.getByTestId("regulatory-config-panel")).toBeDefined();
    expect(screen.getByTestId("warnings-panel")).toBeDefined();
    expect(screen.getByTestId("compliance-panel")).toBeDefined();
  });

  it("labels spacing assumptions as an informational view", () => {
    render(<SectionPanelHost activeSection="compliance" region="secondary" />);

    fireEvent.click(screen.getByText("Spacing assumptions"));

    expect(screen.getByText("Informational view")).toBeDefined();
    expect(
      screen.getByText(/not an independent code validation/i)
    ).toBeDefined();
  });

  it("labels advanced checks as a guidance checklist", () => {
    render(<SectionPanelHost activeSection="compliance" region="secondary" />);

    fireEvent.click(screen.getByText("Advanced checks"));

    expect(screen.getByText("Guidance checklist")).toBeDefined();
    expect(
      screen.getByText(/does not run electrical, civil or safety studies/i)
    ).toBeDefined();
  });

  it("maps report output panels to the report section", () => {
    render(
      <>
        <SectionPanelHost activeSection="report" region="primary" />
        <SectionPanelHost activeSection="report" region="secondary" />
      </>
    );

    expect(screen.getByTestId("report-panel")).toBeDefined();
    expect(screen.getByTestId("summary-panel")).toBeDefined();
  });

  it("maps site panels to the site section", () => {
    render(
      <>
        <SectionPanelHost activeSection="site" region="primary" />
        <SectionPanelHost activeSection="site" region="secondary" />
      </>
    );

    fireEvent.click(screen.getByText("Terrain"));

    expect(screen.getByTestId("parametric-terrain-panel")).toBeDefined();
    expect(screen.getByTestId("case-study-panel")).toBeDefined();
  });

  it("maps layout panels to the layout section", () => {
    render(
      <>
        <SectionPanelHost activeSection="layout" region="primary" />
        <SectionPanelHost activeSection="layout" region="secondary" />
      </>
    );

    expect(screen.getByTestId("smart-site-fit-panel")).toBeDefined();
    expect(screen.getByTestId("preliminary-design-panel")).toBeDefined();
    // Quick sizing now lives under Layout, after the container sizing tools.
    expect(screen.getByTestId("quick-sizing-panel")).toBeDefined();
    expect(screen.getByTestId("mv-architecture-panel")).toBeDefined();
    expect(screen.getByTestId("layout-comparison-panel")).toBeDefined();
  });
});
