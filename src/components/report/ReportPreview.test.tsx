import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportPreview } from "./ReportPreview";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";

// Mock the async assembly modules to avoid canvas and network errors.
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
    attribution: "© OpenStreetMap contributors",
  }),
  describeLocation: vi
    .fn()
    .mockImplementation((g) => g?.describedPlace || "Santiago, RM, Chile"),
}));

vi.mock("@/lib/report/downloadTechnicalReport", () => ({
  downloadTechnicalReportPdf: vi.fn().mockResolvedValue(undefined),
}));

// The preview now renders the real <ReportDocument> inside react-pdf's
// <PDFViewer>. Neither rasterizes in jsdom, so stub both: the document to a
// no-op (also avoids loading the react-pdf font/StyleSheet import chain) and
// the viewer to a marker that proves it mounted with the document as a child.
vi.mock("./ReportDocument", () => ({ ReportDocument: () => null }));
vi.mock("@react-pdf/renderer", () => ({
  PDFViewer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pdf-viewer">{children}</div>
  ),
}));

function resetStores() {
  useUiStore.setState({ locale: "en" });
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

  it("shows the loading state, then renders the PDF viewer", async () => {
    render(
      <ReportPreview isOpen={true} onClose={vi.fn()} includeGeocoding={true} />
    );

    expect(screen.getByText(/Assembling document preview/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.queryByText(/Assembling document preview/i)).toBeNull();
    });

    expect(screen.getByTestId("pdf-viewer")).toBeDefined();
  });

  it("triggers onClose when the close button is clicked", async () => {
    const handleClose = vi.fn();
    render(
      <ReportPreview
        isOpen={true}
        onClose={handleClose}
        includeGeocoding={false}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Assembling document preview/i)).toBeNull();
    });

    fireEvent.click(screen.getByTitle("Close preview (Esc)"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("triggers the technical report PDF download when the download button is clicked", async () => {
    const { downloadTechnicalReportPdf } = await import(
      "@/lib/report/downloadTechnicalReport"
    );

    render(
      <ReportPreview isOpen={true} onClose={vi.fn()} includeGeocoding={false} />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Assembling document preview/i)).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: /Download PDF/i }));
    expect(downloadTechnicalReportPdf).toHaveBeenCalledTimes(1);
  });

  it("renders Spanish chrome when locale is es", async () => {
    useUiStore.setState({ locale: "es" });
    render(
      <ReportPreview isOpen={true} onClose={vi.fn()} includeGeocoding={false} />
    );

    expect(
      screen.getByText("Vista Previa de Reporte Técnico")
    ).toBeDefined();

    await waitFor(() => {
      expect(screen.queryByText(/Generando vista previa/i)).toBeNull();
    });

    expect(screen.getByTestId("pdf-viewer")).toBeDefined();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <ReportPreview isOpen={false} onClose={vi.fn()} includeGeocoding={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});
