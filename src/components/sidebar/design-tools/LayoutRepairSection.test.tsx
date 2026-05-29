import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LayoutRepairSection } from "./LayoutRepairSection";

describe("LayoutRepairSection", () => {
  const defaultProps = {
    placedCount: 10,
    polygonLength: 4,
    repairZone: [],
    interactionMode: "select",
    lastRepairResult: null,
    terrainFitPreview: {
      result: null,
      draftPlacedEquipment: null,
    },
    onStartDrawingRepairZone: vi.fn(),
    onFinishRepairZone: vi.fn(),
    onClearRepairZone: vi.fn(),
    onRepairLayout: vi.fn(),
    onPreviewFit: vi.fn(),
    onApplyFit: vi.fn(),
    onRevertFit: vi.fn(),
    onShiftLayout: vi.fn(),
    onCenterLayout: vi.fn(),
    isEs: true,
    locale: "es" as const,
  };

  it("renders main controls when placedCount > 0", () => {
    render(<LayoutRepairSection {...defaultProps} />);

    expect(screen.getByText("Reparar layout")).toBeDefined();
    const repairBtn = screen.getByRole("button", { name: /Reparar todo/i });
    expect(repairBtn).toBeDefined();
    expect(repairBtn.getAttribute("disabled")).toBeNull();

    const drawBtn = screen.getByRole("button", { name: /Dibujar zona/i });
    expect(drawBtn).toBeDefined();
  });

  it("disables repair button if placedCount is 0", () => {
    render(<LayoutRepairSection {...defaultProps} placedCount={0} />);

    const repairBtn = screen.getByRole("button", { name: /Reparar todo/i });
    expect(repairBtn.getAttribute("disabled")).toBe("");
  });

  it("triggers callback when repair button is clicked", () => {
    const onRepairLayout = vi.fn();
    render(<LayoutRepairSection {...defaultProps} onRepairLayout={onRepairLayout} />);

    const repairBtn = screen.getByRole("button", { name: /Reparar todo/i });
    fireEvent.click(repairBtn);
    expect(onRepairLayout).toHaveBeenCalled();
  });

  it("triggers draw zone callback when button is clicked", () => {
    const onStartDrawing = vi.fn();
    render(<LayoutRepairSection {...defaultProps} onStartDrawingRepairZone={onStartDrawing} />);

    const drawBtn = screen.getByRole("button", { name: /Dibujar zona/i });
    fireEvent.click(drawBtn);
    expect(onStartDrawing).toHaveBeenCalled();
  });

  it("renders drawing state when interactionMode is draw-repair-zone", () => {
    const onFinish = vi.fn();
    const onCancel = vi.fn();
    render(
      <LayoutRepairSection
        {...defaultProps}
        interactionMode="draw-repair-zone"
        repairZone={[{ lng: 1, lat: 2 }, { lng: 2, lat: 3 }, { lng: 3, lat: 4 }]}
        onFinishRepairZone={onFinish}
        onClearRepairZone={onCancel}
      />
    );

    expect(screen.getByText(/Haz clic en cualquier parte del mapa/i)).toBeDefined();

    const finishBtn = screen.getByRole("button", { name: /Terminar zona/i });
    expect(finishBtn.getAttribute("disabled")).toBeNull();
    fireEvent.click(finishBtn);
    expect(onFinish).toHaveBeenCalled();

    const cancelBtn = screen.getByRole("button", { name: /Cancelar/i });
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });

  it("triggers preview fit callback when smart preview button is clicked", () => {
    const onPreviewFit = vi.fn();
    render(<LayoutRepairSection {...defaultProps} onPreviewFit={onPreviewFit} />);

    const previewBtn = screen.getByRole("button", { name: /Vista previa inteligente/i });
    fireEvent.click(previewBtn);
    expect(onPreviewFit).toHaveBeenCalled();
  });

  it("renders apply and revert buttons when draft fit preview exists", () => {
    const onApply = vi.fn();
    const onRevert = vi.fn();
    render(
      <LayoutRepairSection
        {...defaultProps}
        terrainFitPreview={{
          result: {
            status: "success",
            message: "Ajuste preliminar calculado",
            placed: [],
            candidates: [],
            selected: null,
            cableRoutes: [],
            accessRoads: [],
            diagnostics: {
              equipmentCount: 10,
              movableCount: 10,
              lockedCount: 0,
              batteryContainerCount: 10,
              stationCount: 0,
              insideCount: 10,
              outsideCount: 0,
              collisionCount: 0,
              spacingViolationCount: 0,
              boundaryViolationCount: 0,
              blockedAreaViolationCount: 0,
              centerOffsetM: 0,
              terrainAxisDeg: 0,
              layoutAxisDeg: 0,
              rotationDeltaDeg: 0,
              cableRouteCount: 1,
              accessRoadCount: 0,
              poiHandled: true,
              pccHandled: false,
            },
            summary: {
              movedEquipmentCount: 0,
              reorderedContainerCount: 0,
              repositionedStationCount: 0,
              cableRoutesRecalculated: 0,
              accessRoadsRecalculated: 0,
              warnings: [],
            },
          },
          draftPlacedEquipment: [
            {
              id: "eq-1",
              equipmentSpecId: "bess-1",
              anchor: { lng: 1, lat: 2 },
              rotation_deg: 0,
              sourceReliability: "certified_data",
            },
          ],
        }}
        onApplyFit={onApply}
        onRevertFit={onRevert}
      />
    );

    const applyBtn = screen.getByRole("button", { name: /Aplicar ajuste/i });
    const revertBtn = screen.getByRole("button", { name: /Revertir/i });

    fireEvent.click(applyBtn);
    expect(onApply).toHaveBeenCalled();

    fireEvent.click(revertBtn);
    expect(onRevert).toHaveBeenCalled();
  });

  it("renders repair error diagnostics safely", () => {
    render(
      <LayoutRepairSection
        {...defaultProps}
        lastRepairResult={{
          status: "error",
          message: "Could not place equipment",
          diagnostics: {
            equipmentCount: 0,
            zoneApplied: false,
            movableCount: 0,
            remainingConflicts: 0,
            initialConflicts: 0,
            movedCount: 0,
            maxDisplacementM: 0,
            clusterCount: 0,
            strategy: "none",
          },
        }}
      />
    );

    expect(screen.getByText("No hay equipos colocados para reparar. Coloca o genera equipos primero.")).toBeDefined();
  });

  it("shows the preliminary geometric scope disclaimer", () => {
    render(<LayoutRepairSection {...defaultProps} />);
    expect(
      screen.getByText(/Ajuste geometrico preliminar/i)
    ).toBeDefined();
  });

  it("surfaces the applied strategy and block grouping on success", () => {
    render(
      <LayoutRepairSection
        {...defaultProps}
        lastRepairResult={{
          status: "success",
          message: "Repaired 2 conflict(s): moved 4 item(s).",
          diagnostics: {
            equipmentCount: 8,
            zoneApplied: false,
            movableCount: 8,
            remainingConflicts: 0,
            initialConflicts: 2,
            movedCount: 4,
            maxDisplacementM: 12.5,
            clusterCount: 2,
            strategy: "cluster-rigid",
          },
        }}
      />
    );
    expect(
      screen.getByText(/Se mantuvo la agrupacion por bloques cuando fue posible/i)
    ).toBeDefined();
    expect(screen.getByText(/2 bloque\(s\)/i)).toBeDefined();
  });

  it("reports remaining warnings on a partial repair without promising compliance", () => {
    render(
      <LayoutRepairSection
        {...defaultProps}
        lastRepairResult={{
          status: "partial",
          message: "Reduced conflicts from 5 to 2.",
          diagnostics: {
            equipmentCount: 8,
            zoneApplied: false,
            movableCount: 8,
            remainingConflicts: 2,
            initialConflicts: 5,
            movedCount: 6,
            maxDisplacementM: 30,
            clusterCount: 2,
            strategy: "cluster-recenter",
          },
        }}
      />
    );
    expect(screen.getByText(/Quedan 2 advertencia\(s\) por revisar/i)).toBeDefined();
    // No absolute-compliance language.
    expect(screen.queryByText(/garantizad/i)).toBeNull();
    expect(screen.queryByText(/óptimo/i)).toBeNull();
  });

  it("renders directional shift buttons and center button", () => {
    render(<LayoutRepairSection {...defaultProps} />);

    expect(screen.getByRole("button", { name: /Mover norte/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Mover sur/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Mover oeste/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Mover este/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Centrar layout/i })).toBeDefined();
  });

  it("calls onShiftLayout with correct delta when north button clicked", () => {
    const onShiftLayout = vi.fn();
    render(<LayoutRepairSection {...defaultProps} onShiftLayout={onShiftLayout} />);

    fireEvent.click(screen.getByRole("button", { name: /Mover norte/i }));
    expect(onShiftLayout).toHaveBeenCalledWith(0, 10);
  });

  it("calls onShiftLayout with correct delta when south button clicked", () => {
    const onShiftLayout = vi.fn();
    render(<LayoutRepairSection {...defaultProps} onShiftLayout={onShiftLayout} />);

    fireEvent.click(screen.getByRole("button", { name: /Mover sur/i }));
    expect(onShiftLayout).toHaveBeenCalledWith(0, -10);
  });

  it("calls onShiftLayout with correct delta when east button clicked", () => {
    const onShiftLayout = vi.fn();
    render(<LayoutRepairSection {...defaultProps} onShiftLayout={onShiftLayout} />);

    fireEvent.click(screen.getByRole("button", { name: /Mover este/i }));
    expect(onShiftLayout).toHaveBeenCalledWith(10, 0);
  });

  it("calls onShiftLayout with correct delta when west button clicked", () => {
    const onShiftLayout = vi.fn();
    render(<LayoutRepairSection {...defaultProps} onShiftLayout={onShiftLayout} />);

    fireEvent.click(screen.getByRole("button", { name: /Mover oeste/i }));
    expect(onShiftLayout).toHaveBeenCalledWith(-10, 0);
  });

  it("calls onCenterLayout when center button clicked", () => {
    const onCenterLayout = vi.fn();
    render(<LayoutRepairSection {...defaultProps} onCenterLayout={onCenterLayout} />);

    fireEvent.click(screen.getByRole("button", { name: /Centrar layout/i }));
    expect(onCenterLayout).toHaveBeenCalled();
  });

  it("disables shift buttons when placedCount is 0", () => {
    render(<LayoutRepairSection {...defaultProps} placedCount={0} />);

    expect(screen.getByRole("button", { name: /Mover norte/i }).getAttribute("disabled")).toBe("");
    expect(screen.getByRole("button", { name: /Mover sur/i }).getAttribute("disabled")).toBe("");
  });

  it("disables center button when polygon is not defined", () => {
    render(<LayoutRepairSection {...defaultProps} polygonLength={0} />);

    expect(screen.getByRole("button", { name: /Centrar layout/i }).getAttribute("disabled")).toBe("");
  });
});
