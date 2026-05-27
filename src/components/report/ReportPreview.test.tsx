import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportPreview } from "./ReportPreview";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";

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
    describedPlace: "Santiago, RM, Chile",
    formats: {
      decimal: { lat: -33.4569, lng: -70.6483 },
      dms: { lat: "33°27'25\" S", lng: "70°38'54\" W" },
      utm: { formatted: "19S 346698 6296711" },
    },
    attribution: "© OpenStreetMap contributors",
  }),
  describeLocation: vi.fn().mockImplementation((geocode) => geocode?.describedPlace || "Santiago, RM, Chile"),
}));

vi.mock("@/lib/report/downloadTechnicalReport", () => ({
  downloadTechnicalReportPdf: vi.fn().mockResolvedValue(undefined),
}));

function resetStores() {
  useUiStore.setState({
    locale: "en",
  });
  useProjectStore.setState({
    polygon: [
      { lng: -70.65, lat: -33.46 },
      { lng: -70.64, lat: -33.46 },
      { lng: -70.64, lat: -33.45 },
      { lng: -70.65, lat: -33.45 },
    ],
    anchor: { lng0: -70.65, lat0: -33.46 },
    placedEquipment: [],
    blocks: [],
    conversionStations: [],
    mvFeeders: [],
    mvBuses: [],
    poi: null,
    mainTransformer: null,
  });
}

describe("ReportPreview Component", () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it("should render loading state on open and then display the Cover Page", async () => {
    const handleClose = vi.fn();
    render(<ReportPreview isOpen={true} onClose={handleClose} includeGeocoding={true} />);

    // Assert loading state is visible
    expect(screen.getByText(/Assembling document preview/i)).toBeDefined();

    // Wait for the async compilation to complete
    await waitFor(() => {
      expect(screen.queryByText(/Assembling document preview/i)).toBeNull();
    });

    // Verify main cover page titles
    expect(screen.getByText("BESS PRELIMINARY PREDESIGN · DOSSIER")).toBeDefined();
    expect(screen.getByText("BESS preliminary predesign report")).toBeDefined();
  });

  it("should trigger onClose when close button is clicked", async () => {
    const handleClose = vi.fn();
    render(<ReportPreview isOpen={true} onClose={handleClose} includeGeocoding={false} />);

    await waitFor(() => {
      expect(screen.queryByText(/Assembling document preview/i)).toBeNull();
    });

    const closeBtn = screen.getByTitle("Close preview (Esc)");
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("should switch tabs when clicking the sidebar index navigation", async () => {
    render(<ReportPreview isOpen={true} onClose={vi.fn()} includeGeocoding={false} />);

    await waitFor(() => {
      expect(screen.queryByText(/Assembling document preview/i)).toBeNull();
    });

    // Default active section is Cover Page
    expect(screen.getByText("BESS preliminary predesign report")).toBeDefined();

    // Find and click "1. Executive Summary" sidebar index
    const execSummaryLink = screen.getByRole("button", { name: /1. Executive Summary/i });
    fireEvent.click(execSummaryLink);

    // Verify that the title of the section is visible in detail view
    expect(screen.getByText("Technical Executive Summary")).toBeDefined();

    // Click "Sitio y Ubicación"
    const locationLink = screen.getByRole("button", { name: /2. Site & Location/i });
    fireEvent.click(locationLink);
    expect(screen.getByText("Site & Location")).toBeDefined();
  });

  it("should support Spanish localizations in layout and side index labels", async () => {
    useUiStore.setState({ locale: "es" });
    render(<ReportPreview isOpen={true} onClose={vi.fn()} includeGeocoding={false} />);

    await waitFor(() => {
      expect(screen.queryByText(/Generando vista previa/i)).toBeNull();
    });

    // Check title in Spanish header
    expect(screen.getByText("Vista Previa de Reporte Técnico")).toBeDefined();

    // Check index sidebar buttons
    expect(screen.getByRole("button", { name: /1. Resumen Ejecutivo/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /2. Sitio y Ubicación/i })).toBeDefined();
  });

  it("should render the Fase 9 preliminary electrical checks section in the index", async () => {
    render(<ReportPreview isOpen={true} onClose={vi.fn()} includeGeocoding={false} />);

    await waitFor(() => {
      expect(screen.queryByText(/Assembling document preview/i)).toBeNull();
    });

    // Index entry is always rendered, regardless of preset load state.
    expect(
      screen.getByRole("button", { name: /5b\. Preliminary Electrical Checks/i })
    ).toBeDefined();
  });

  it("should render the Fase 9 preliminary electrical heading in the document body", async () => {
    render(<ReportPreview isOpen={true} onClose={vi.fn()} includeGeocoding={false} />);

    await waitFor(() => {
      expect(screen.queryByText(/Assembling document preview/i)).toBeNull();
    });

    // The h2 of section 5b is always rendered (the preset-empty branch shows
    // an "evaluate the architecture" hint, but the heading is present).
    expect(
      screen.getByRole("heading", { name: /Preliminary Electrical Checks/i })
    ).toBeDefined();
  });

  it("should trigger Technical Report PDF download when download button is clicked", async () => {
    const { downloadTechnicalReportPdf } = await import("@/lib/report/downloadTechnicalReport");

    render(<ReportPreview isOpen={true} onClose={vi.fn()} includeGeocoding={false} />);

    await waitFor(() => {
      expect(screen.queryByText(/Assembling document preview/i)).toBeNull();
    });

    const downloadBtn = screen.getByRole("button", { name: /Download PDF/i });
    fireEvent.click(downloadBtn);

    expect(downloadTechnicalReportPdf).toHaveBeenCalledTimes(1);
  });
});
