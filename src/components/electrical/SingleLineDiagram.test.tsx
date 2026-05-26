import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SingleLineDiagram } from "./SingleLineDiagram";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";

// Reset stores helper
function resetStores() {
  useUiStore.setState({
    locale: "en",
  });
  useProjectStore.setState({
    blocks: [],
    conversionStations: [],
    mvFeeders: [],
    mvBuses: [],
    poi: null,
    mainTransformer: null,
    placedEquipment: [],
  });
}

describe("SingleLineDiagram Component", () => {
  beforeEach(() => {
    resetStores();
  });

  it("renders the empty state placeholder when no BESS equipment is present", () => {
    render(<SingleLineDiagram />);
    
    // Check main title
    expect(screen.getByText("Electrical Single-Line Diagram")).toBeDefined();
    
    // Check watermark empty state text
    expect(
      screen.getByText(/Load the 'BESS del Desierto' preset or insert equipment/i)
    ).toBeDefined();
    
    // Check that preset button is displayed
    expect(
      screen.getByRole("button", { name: /Load BESS del Desierto Preset/i })
    ).toBeDefined();
  });

  it("triggers loadBessDelDesiertoPresetV12 when the load preset button is clicked", () => {
    const loadPresetSpy = vi.fn();
    useProjectStore.setState({
      loadBessDelDesiertoPresetV12: loadPresetSpy,
    });

    render(<SingleLineDiagram />);

    const button = screen.getByRole("button", { name: /Load BESS del Desierto Preset/i });
    fireEvent.click(button);

    expect(loadPresetSpy).toHaveBeenCalledTimes(1);
  });

  it("supports Spanish localizations in the empty state", () => {
    useUiStore.setState({ locale: "es" });
    
    render(<SingleLineDiagram />);
    
    expect(screen.getByText("Diagrama Unifilar Eléctrico")).toBeDefined();
    expect(
      screen.getByText(/Carga el preset 'BESS del Desierto' o inserta equipos/i)
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Cargar Preset BESS del Desierto/i })
    ).toBeDefined();
  });

  it("renders the single line diagram when equipment is loaded", () => {
    // Populate the store as if the preset is loaded
    useProjectStore.setState({
      blocks: [
        { id: "block-1", containerIds: ["c-1", "c-2", "c-3", "c-4"], conversionStationId: "s-1" },
        { id: "block-2", containerIds: ["c-5", "c-6", "c-7", "c-8"], conversionStationId: "s-2" }
      ],
      conversionStations: [
        {
          id: "s-1",
          manufacturer: "Sungrow",
          model: "SC5000UD-MV",
          ratedPowerMVA: { value: 5.0, evidence: [] },
          pcsModules: [{ id: "m-1", manufacturer: "Sungrow", model: "PCS", apparentPowerMVA: 2.5, nominalAcVoltageV: 900 }],
          blockTransformer: { id: "tx-1", ratedPowerMVA: { value: 5.0, evidence: [] }, hvVoltageKv: { value: 33, evidence: [] }, lvVoltageKv: { value: 0.9, evidence: [] }, vectorGroup: "Dy11", cooling: "ONAN" },
          associatedContainerIds: ["c-1", "c-2", "c-3", "c-4"]
        },
        {
          id: "s-2",
          manufacturer: "Sungrow",
          model: "SC5000UD-MV",
          ratedPowerMVA: { value: 5.0, evidence: [] },
          pcsModules: [{ id: "m-2", manufacturer: "Sungrow", model: "PCS", apparentPowerMVA: 2.5, nominalAcVoltageV: 900 }],
          blockTransformer: { id: "tx-2", ratedPowerMVA: { value: 5.0, evidence: [] }, hvVoltageKv: { value: 33, evidence: [] }, lvVoltageKv: { value: 0.9, evidence: [] }, vectorGroup: "Dy11", cooling: "ONAN" },
          associatedContainerIds: ["c-5", "c-6", "c-7", "c-8"]
        }
      ],
      mvFeeders: [
        { id: "feeder-1", nominalVoltageKv: 33, ratedPowerMVA: 20, conversionStationIds: ["s-1", "s-2"], cableRouteIds: [], mvBusId: "bus-1" }
      ],
      mvBuses: [
        { id: "bus-1", name: "BP5", nominalVoltageKv: 33, feederIds: ["feeder-1"] }
      ],
      poi: { id: "poi-1", voltageKv: 33, busName: "BP5/BP6 33 kV", boundary: "mv_33kv" },
      mainTransformer: { id: "main-tx", ratedPowerMVA: { value: 250, evidence: [] }, windings: { hvKv: 220, mv1Kv: 33 }, scope: "external_reference" }
    });

    render(<SingleLineDiagram />);

    // Watermark empty state should NOT be visible
    expect(screen.queryByText(/Load the 'BESS del Desierto' preset/i)).toBeNull();

    // Verify component shows counts in SVG labels
    // 8 BESS containers total (2 blocks * 4 containers per block)
    expect(screen.getByText("8 BESS")).toBeDefined();
    
    // 2 PCS stations total
    expect(screen.getByText("2 PCS")).toBeDefined();

    // Should display the default selected stage details (BESS Battery Bank)
    expect(screen.getByText("BESS Battery Bank")).toBeDefined();
    expect(screen.getByText("Total containers")).toBeDefined();
    expect(screen.getByText("8 x BESS")).toBeDefined();
  });

  it("updates details panel when clicking on different stages in the diagram", () => {
    // Populate the store to avoid the empty state
    useProjectStore.setState({
      blocks: [{ id: "block-1", containerIds: ["c-1"], conversionStationId: "s-1" }],
      conversionStations: [{
        id: "s-1",
        manufacturer: "Sungrow",
        model: "SC5000UD-MV",
        ratedPowerMVA: { value: 5.0, evidence: [] },
        pcsModules: [{ id: "m-1", manufacturer: "Sungrow", model: "PCS", apparentPowerMVA: 2.5, nominalAcVoltageV: 900 }],
        blockTransformer: { id: "tx-1", ratedPowerMVA: { value: 5.0, evidence: [] }, hvVoltageKv: { value: 33, evidence: [] }, lvVoltageKv: { value: 0.9, evidence: [] }, vectorGroup: "Dy11", cooling: "ONAN" },
        associatedContainerIds: ["c-1"]
      }],
      poi: { id: "poi-1", voltageKv: 33, busName: "BP5/BP6 33 kV", boundary: "mv_33kv" }
    });

    const { container } = render(<SingleLineDiagram />);

    // By default, BESS is selected
    expect(screen.getByText("BESS Battery Bank")).toBeDefined();

    // Find and click the PCS converter section target using data structures or query by click target
    // We can simulate clicking the transparent target rectangles. We'll find them using selectors or clicking coordinates.
    // In our SVG:
    // target PCS is y from 90 to 155
    const rects = container.querySelectorAll("rect");
    
    // Let's find the rect with width="160" and height="65" (the invisible target for PCS)
    let pcsTargetRect: SVGRectElement | null = null;
    let transformerTargetRect: SVGRectElement | null = null;
    let feedersTargetRect: SVGRectElement | null = null;
    let busbarTargetRect: SVGRectElement | null = null;
    let poiTargetRect: SVGRectElement | null = null;

    rects.forEach((rect) => {
      const width = rect.getAttribute("width");
      const height = rect.getAttribute("height");
      
      if (width === "160" && height === "65") {
        pcsTargetRect = rect;
      } else if (width === "160" && height === "64") {
        transformerTargetRect = rect;
      } else if (width === "160" && height === "42") {
        feedersTargetRect = rect;
      } else if (width === "270" && height === "30") {
        busbarTargetRect = rect;
      } else if (width === "160" && height === "110") {
        poiTargetRect = rect;
      }
    });

    expect(pcsTargetRect).not.toBeNull();
    fireEvent.click(pcsTargetRect!);
    expect(screen.getByText("Power Conversion System")).toBeDefined();
    expect(screen.getByText("Station rated power")).toBeDefined();

    expect(transformerTargetRect).not.toBeNull();
    fireEvent.click(transformerTargetRect!);
    expect(screen.getByText("Block Transformer")).toBeDefined();
    expect(screen.getByText("Voltage ratio")).toBeDefined();

    expect(feedersTargetRect).not.toBeNull();
    fireEvent.click(feedersTargetRect!);
    expect(screen.getByText("MV Collector Feeders")).toBeDefined();
    expect(screen.getByText("Collector circuits")).toBeDefined();

    expect(busbarTargetRect).not.toBeNull();
    fireEvent.click(busbarTargetRect!);
    expect(screen.getByText("MV Switchgear & Busbar")).toBeDefined();
    expect(screen.getByText("Bus tie coupler")).toBeDefined();

    expect(poiTargetRect).not.toBeNull();
    fireEvent.click(poiTargetRect!);
    expect(screen.getByText("Point of Interconnection")).toBeDefined();
    expect(screen.getByText("Metering boundary")).toBeDefined();
  });
});
