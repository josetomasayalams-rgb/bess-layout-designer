import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportPreview } from "@/components/report/ReportPreview";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { buildReportData } from "@/lib/report/buildReportData";
import { validateBessLayout } from "@/rules/bessValidationEngine";
import { validateElectricalTopology } from "@/lib/electrical/topologyValidation";
import { runRegulatoryEvaluation } from "@/rules/regulatoryProfileEvaluator";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import { getProjectCaseStudy } from "@/data/projectCaseStudies";
import { resolveReportPendingData } from "@/lib/report/resolveReportPendingData";

// Async assembly side-effects are mocked to avoid canvas/network in jsdom.
vi.mock("@/lib/report/captureMap", () => ({
  captureMapImage: vi.fn().mockResolvedValue({
    dataUrl: "data:image/png;base64,mockMapUrl",
    width: 800,
    height: 600,
    capturedAt: new Date().toISOString(),
    view: { zoom: 12, lng: -70.0492, lat: -26.3848, bearing: 0, pitch: 0 },
  }),
}));

vi.mock("@/lib/report/reverseGeocode", () => ({
  reverseGeocode: vi.fn().mockResolvedValue({
    describedPlace: "Diego de Almagro, Atacama, Chile",
    attribution: "© OpenStreetMap contributors",
  }),
  describeLocation: vi
    .fn()
    .mockImplementation((g) => g?.describedPlace || "Diego de Almagro, Atacama, Chile"),
}));

vi.mock("@/lib/report/downloadTechnicalReport", () => ({
  downloadTechnicalReportPdf: vi.fn().mockResolvedValue(undefined),
}));

// The preview renders the real <ReportDocument> inside react-pdf's <PDFViewer>;
// neither rasterizes in jsdom, so stub both (see ReportPreview.test.tsx).
vi.mock("@/components/report/ReportDocument", () => ({
  ReportDocument: () => null,
}));
vi.mock("@react-pdf/renderer", () => ({
  PDFViewer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pdf-viewer">{children}</div>
  ),
}));

function setupBessDelDesiertoState() {
  useUiStore.setState({ locale: "en" });
  useRegulatoryStore.setState({
    activeProfileId: "chile-sec-rgr-06-2024",
    activeRuleProfileId: "chile-utility-predesign",
  });

  const store = useProjectStore.getState();
  useProjectStore.setState({
    polygon: [
      { lng: -70.06, lat: -26.39 },
      { lng: -70.04, lat: -26.39 },
      { lng: -70.04, lat: -26.37 },
      { lng: -70.06, lat: -26.37 },
    ],
    anchor: { lng0: -70.06, lat0: -26.39 },
    placedEquipment: [],
    blocks: [],
    conversionStations: [],
    mvFeeders: [],
    mvBuses: [],
    poi: null,
    mainTransformer: null,
  });

  store.loadBessDelDesiertoPresetV12();
  store.insertCaseStudyLayout("bess-del-desierto");
}

/** Assemble report data the same way the preview/export do (assembleReportData
 *  extraction is deferred; this mirrors that pipeline for the test). */
function assembleReportData() {
  const project = useProjectStore.getState();
  const regulatory = useRegulatoryStore.getState();
  const physicalValidation = validateBessLayout({
    placed: project.placedEquipment,
    polygon: project.polygon,
    anchor: project.anchor,
    profile: getRegulatoryProfile(regulatory.activeProfileId),
    context: regulatory.context,
  });
  const electricalValidation = validateElectricalTopology({
    blocks: project.blocks,
    conversionStations: project.conversionStations,
    mvFeeders: project.mvFeeders,
    mvBuses: project.mvBuses,
    poi: project.poi,
  });
  const regulatoryEvaluation = runRegulatoryEvaluation({
    profileId: regulatory.activeRuleProfileId,
    layoutValidation: physicalValidation,
    electricalValidation,
    blocks: project.blocks,
    conversionStations: project.conversionStations,
    mvFeeders: project.mvFeeders,
    mvBuses: project.mvBuses,
    poi: project.poi,
    inconsistencies: project.inconsistencies,
  });
  const caseStudy = project.selectedCaseStudyId
    ? getProjectCaseStudy(project.selectedCaseStudyId)
    : null;
  const pendingData = resolveReportPendingData(
    project.selectedCaseStudyId,
    caseStudy
  );
  return buildReportData({
    projectName: project.projectName?.trim() || caseStudy?.projectName,
    appVersion: "e2e-test",
    locale: "en",
    polygon: project.polygon,
    anchor: project.anchor,
    placed: project.placedEquipment,
    designTargets: project.designTargets,
    blocks: project.blocks,
    conversionStations: project.conversionStations,
    mvFeeders: project.mvFeeders,
    mvBuses: project.mvBuses,
    poi: project.poi,
    mainTransformer: project.mainTransformer,
    auxiliaryServices: project.auxiliaryServices,
    ppc: project.ppc,
    operationalLimits: project.operationalLimits,
    lossEstimates: project.lossEstimates,
    assumptions: project.assumptionsV2,
    inconsistencies: project.inconsistencies,
    pendingData,
    regulatoryEvaluation,
    caseStudy,
    mapCapture: null,
    geocode: null,
  });
}

describe("E2E Validation & Report Flow for BESS del Desierto Preset", () => {
  beforeEach(() => {
    setupBessDelDesiertoState();
    vi.clearAllMocks();
  });

  it("assembles a report with the preset's real content (KPIs, equipment, inconsistencies, regulatory, exclusions)", () => {
    const data = assembleReportData();

    // Cover / identity
    expect(data.metadata.projectName).toBe("BESS del Desierto");

    // Documented design targets surface as KPIs
    expect(data.reportKpis.poiPowerMW).toBe(200);
    expect(data.reportKpis.commercialEnergyMWh).toBe(800);
    expect(data.reportKpis.containers).toBeGreaterThan(0);
    expect(data.reportKpis.stations).toBeGreaterThan(0);

    // Real equipment from the catalog (Sungrow battery container)
    expect(
      data.equipmentInventory.some((row) => /ST2752UX/i.test(row.model))
    ).toBe(true);

    // Preset inconsistencies are carried through
    const incIds = data.inconsistencies.map((i) => i.id);
    expect(incIds).toEqual(
      expect.arrayContaining(["INC-001", "INC-002", "INC-003"])
    );

    // Regulatory evaluation populated, and engineering exclusions present
    expect(data.regulatoryEvaluation).not.toBeNull();
    expect((data.regulatoryEvaluation?.rules.length ?? 0)).toBeGreaterThan(0);
    expect(data.exclusions.length).toBeGreaterThan(0);
  });

  it("opens the preview viewer and triggers the PDF download from the header", async () => {
    const handleClose = vi.fn();
    render(
      <ReportPreview isOpen={true} onClose={handleClose} includeGeocoding={true} />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Assembling document preview/i)).toBeNull();
    });

    expect(screen.getByTestId("pdf-viewer")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Download PDF/i }));

    const { downloadTechnicalReportPdf } = await import(
      "@/lib/report/downloadTechnicalReport"
    );
    expect(downloadTechnicalReportPdf).toHaveBeenCalledTimes(1);
    expect(downloadTechnicalReportPdf).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en", includeGeocoding: true })
    );
  });
});
