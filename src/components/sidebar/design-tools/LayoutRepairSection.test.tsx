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
          },
        }}
      />
    );

    expect(screen.getByText("No hay equipos colocados para reparar. Coloca o genera equipos primero.")).toBeDefined();
  });
});
