import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { ReportPreview } from "@/components/report/ReportPreview";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";

// Mock the async modules to avoid canvas and network errors during testing
vi.mock("@/lib/report/captureMap", () => ({
  captureMapImage: vi.fn().mockResolvedValue({
    dataUrl: "data:image/png;base64,mockMapUrl",
    width: 800,
    height: 600,
    capturedAt: new Date().toISOString(),
    view: { zoom: 12, lng: -70.6483, lat: -33.4569, bearing: 0, pitch: 0 },
  }),
}));

vi.mock("@/lib/report/reverseGeocode", () => ({
  reverseGeocode: vi.fn().mockResolvedValue({
    describedPlace: "Diego de Almagro, Atacama, Chile",
    formats: {
      decimal: { lat: -26.3848, lng: -70.0492 },
      dms: { lat: "26°23'05\" S", lng: "70°02'57\" W" },
      utm: { formatted: "19J 395382 7080642" },
    },
    attribution: "© OpenStreetMap contributors",
  }),
  describeLocation: vi.fn().mockImplementation((geocode) => geocode?.describedPlace || "Diego de Almagro, Atacama, Chile"),
}));

vi.mock("@/lib/report/downloadTechnicalReport", () => ({
  downloadTechnicalReportPdf: vi.fn().mockResolvedValue(undefined),
}));

function setupBessDelDesiertoState() {
  // Set UI state to English
  useUiStore.setState({
    locale: "en",
  });

  // Set Regulatory active profile to Chile Utility
  useRegulatoryStore.setState({
    activeProfileId: "chile-sec-rgr-06-2024",
    activeRuleProfileId: "chile-utility-predesign",
  });

  // Reset Project Store and load the case study
  const store = useProjectStore.getState();
  
  // Set up a large terrain polygon to avoid out-of-bounds placing
  const polygon = [
    { lng: -70.06, lat: -26.39 },
    { lng: -70.04, lat: -26.39 },
    { lng: -70.04, lat: -26.37 },
    { lng: -70.06, lat: -26.37 },
  ];
  const anchor = { lng0: -70.06, lat0: -26.39 };

  useProjectStore.setState({
    polygon,
    anchor,
    placedEquipment: [],
    blocks: [],
    conversionStations: [],
    mvFeeders: [],
    mvBuses: [],
    poi: null,
    mainTransformer: null,
  });

  // Load the BESS del Desierto preset configurations (inconsistencies, design targets, PPC, etc.)
  store.loadBessDelDesiertoPresetV12();

  // Lay out the equipment conceptually inside the polygon
  store.insertCaseStudyLayout("bess-del-desierto");
}

describe("E2E Validation & Report Flow for BESS del Desierto Preset", () => {
  beforeEach(() => {
    setupBessDelDesiertoState();
    vi.clearAllMocks();
  });

  it("should load preset, perform compliance checks, and render complete report document viewer", async () => {
    const handleClose = vi.fn();
    render(<ReportPreview isOpen={true} onClose={handleClose} includeGeocoding={true} />);

    // Wait for the async geocoding, map capture, and data assembly to complete
    await waitFor(() => {
      expect(screen.queryByText(/Assembling document preview/i)).toBeNull();
    });

    // 1. Verify Cover Page information
    expect(screen.getByText("BESS PRELIMINARY PREDESIGN · TECHNICAL REPORT")).toBeDefined();
    expect(screen.getByText("BESS preliminary predesign report")).toBeDefined();
    expect(screen.getByText("BESS del Desierto")).toBeDefined();

    // Verify geographical metrics resolved via geocoding
    expect(screen.getByText("Diego de Almagro, Atacama, Chile")).toBeDefined();

    // Verify inventory KPI highlights are correct (200 MW target, 800 MWh usable, 320 containers, 40 PCS)
    expect(screen.getAllByText("200 MW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("800 MWh").length).toBeGreaterThan(0);
    expect(screen.getAllByText("320").length).toBeGreaterThan(0);
    expect(screen.getAllByText("40").length).toBeGreaterThan(0);

    // 2. Verify Left Sidebar table of contents labels (English)
    expect(screen.getByRole("button", { name: /1. Executive Summary/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /2. Site & Location/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /3. BESS Parameters/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /4. Physical Layout/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /5. Electrical Architecture/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /6. Regulatory Validation/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /7. Alerts & Pending Data/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /8. Scope & Exclusions/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Annex: Rules Table/i })).toBeDefined();

    // 3. Navigate through sections and verify content details
    
    // Jump to Section 1: Executive Summary
    const execSummaryBtn = screen.getByRole("button", { name: /1. Executive Summary/i });
    fireEvent.click(execSummaryBtn);
    expect(screen.getByText("Technical Executive Summary")).toBeDefined();
    expect(screen.getAllByText("Targets").length).toBeGreaterThan(0);

    // Jump to Section 2: Site & Location
    const siteLocationBtn = screen.getByRole("button", { name: /2. Site & Location/i });
    fireEvent.click(siteLocationBtn);
    expect(screen.getByText("Site & Location")).toBeDefined();
    expect(screen.getByText("Centroid Coordinates")).toBeDefined();
    expect(screen.getByText("Map View Capture")).toBeDefined();

    // Jump to Section 3: BESS Parameters
    const parametersBtn = screen.getByRole("button", { name: /3. BESS Parameters/i });
    fireEvent.click(parametersBtn);
    expect(screen.getByText("BESS Main Parameters")).toBeDefined();
    expect(screen.getByText("Design Sizing Targets")).toBeDefined();
    expect(screen.getByText("Gross DC BOL Energy:")).toBeDefined();

    // Jump to Section 4: Physical Layout
    const physicalLayoutBtn = screen.getByRole("button", { name: /4. Physical Layout/i });
    fireEvent.click(physicalLayoutBtn);
    expect(screen.getByText("Physical Layout & Equipment Inventory")).toBeDefined();
    expect(screen.getByText("Physical Equipment Inventory")).toBeDefined();
    const layoutSection = document.getElementById("preview-sec-layout") as HTMLElement;
    expect(layoutSection).not.toBeNull();
    expect(within(layoutSection).getByText("Sungrow ST2752UX-US")).toBeDefined();

    // Jump to Section 5: Electrical Architecture
    const electricalArchBtn = screen.getByRole("button", { name: /5. Electrical Architecture/i });
    fireEvent.click(electricalArchBtn);
    expect(screen.getByText("Preliminary Electrical Architecture")).toBeDefined();
    expect(screen.getByText("BESS Logic Blocks:")).toBeDefined();
    expect(screen.getByText("Power Conversion Station Breakdown")).toBeDefined();

    // Jump to Section 6: Regulatory Validation
    const regulatoryBtn = screen.getByRole("button", { name: /6. Regulatory Validation/i });
    fireEvent.click(regulatoryBtn);
    expect(screen.getByText("Regulatory Compliance Assessment")).toBeDefined();
    expect(screen.getByText("Actionable / Violated Rules")).toBeDefined();

    // Jump to Section 7: Alerts & Pending Data
    const alertsBtn = screen.getByRole("button", { name: /7. Alerts & Pending Data/i });
    fireEvent.click(alertsBtn);
    expect(screen.getByText("Project Assumptions & Inconsistencies")).toBeDefined();
    expect(screen.getByText("Document Inconsistencies")).toBeDefined();
    // Verify specific BESS del Desierto inconsistencies are shown in the traceability section
    const traceabilitySection = document.getElementById("preview-sec-traceability") as HTMLElement;
    expect(traceabilitySection).not.toBeNull();
    expect(within(traceabilitySection).getAllByText(/INC-001/i).length).toBeGreaterThan(0);
    expect(within(traceabilitySection).getAllByText(/INC-002/i).length).toBeGreaterThan(0);
    expect(within(traceabilitySection).getAllByText(/INC-003/i).length).toBeGreaterThan(0);

    // Jump to Section 8: Scope & Exclusions
    const scopeBtn = screen.getByRole("button", { name: /8. Scope & Exclusions/i });
    fireEvent.click(scopeBtn);
    expect(screen.getByText("Scope, Exclusions & Next Steps")).toBeDefined();
    expect(screen.getByText("Detail Engineering Exclusions")).toBeDefined();
    expect(screen.getByText("Design Validation Checklist")).toBeDefined();

    // Jump to Annex
    const annexBtn = screen.getByRole("button", { name: /Annex: Rules Table/i });
    fireEvent.click(annexBtn);
    expect(screen.getByText("Annex: Full Compliance Matrix")).toBeDefined();

    // 4. Test PDF download trigger from header
    const downloadBtn = screen.getByRole("button", { name: /Download PDF/i });
    fireEvent.click(downloadBtn);

    const { downloadTechnicalReportPdf } = await import("@/lib/report/downloadTechnicalReport");
    expect(downloadTechnicalReportPdf).toHaveBeenCalledTimes(1);
    expect(downloadTechnicalReportPdf).toHaveBeenCalledWith(expect.objectContaining({
      locale: "en",
      includeGeocoding: true
    }));
  });
});
