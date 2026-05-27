import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SizingContainerSection } from "./SizingContainerSection";

describe("SizingContainerSection", () => {
  const defaultProps = {
    batteryContainerSpecId: "bess-sungrow-st2752ux-us",
    setBatteryContainerSpecId: vi.fn(),
    pcsSpecId: "mvskid-sungrow-sc5000ud-mv-desierto",
    setPcsSpecId: vi.fn(),
    batteryContainerCount: 320,
    setBatteryContainerCount: vi.fn(),
    containersPerPcs: 8,
    setContainersPerPcs: vi.fn(),
    safeContainers: 320,
    pcsCount: 40,
    blockCount: 40,
    safePerPcs: 8,
    effectiveColumns: 8,
    effectiveRows: 5,
    emptyCells: 0,
    shapeOptions: [{ columns: 8, rows: 5, shape: "rectangle" }],
    setSelectedColumns: vi.fn(),
    rules: {
      bessToBess_m: 3,
      bessToPropertyLine_m: 10,
    },
    onGenerate: vi.fn(),
    onRegularize: vi.fn(),
    hasTerrainPolygon: true,
    lastToolResult: null,
    isEs: true,
    locale: "es" as const,
  };

  it("renders inputs and triggers changes", () => {
    render(<SizingContainerSection {...defaultProps} />);

    expect(screen.getByText("Dimensionamiento por contenedores")).toBeDefined();

    const countInput = screen.getByLabelText(/N° contenedores BESS/i);
    expect(countInput).toBeDefined();

    fireEvent.change(countInput, { target: { value: "160" } });
    expect(defaultProps.setBatteryContainerCount).toHaveBeenCalledWith(160);

    const ratioInput = screen.getByLabelText(/Contenedores \/ PCS/i);
    expect(ratioInput).toBeDefined();

    fireEvent.change(ratioInput, { target: { value: "4" } });
    expect(defaultProps.setContainersPerPcs).toHaveBeenCalledWith(4);
  });

  it("renders select dropdowns for specs", () => {
    render(<SizingContainerSection {...defaultProps} />);

    const bessSelect = screen.getByLabelText("BESS") as HTMLSelectElement;
    expect(bessSelect).toBeDefined();

    const options = bessSelect.querySelectorAll("option");
    const testValue = options[1]?.value ?? "bess-byd-mc-cube-t";
    fireEvent.change(bessSelect, { target: { value: testValue } });
    expect(defaultProps.setBatteryContainerSpecId).toHaveBeenCalledWith(testValue);
  });

  it("triggers generate and regularize callbacks on button click", () => {
    render(<SizingContainerSection {...defaultProps} />);

    const generateBtn = screen.getByRole("button", { name: /Generar/i });
    fireEvent.click(generateBtn);
    expect(defaultProps.onGenerate).toHaveBeenCalled();

    const regularizeBtn = screen.getByRole("button", { name: /Regularizar/i });
    fireEvent.click(regularizeBtn);
    expect(defaultProps.onRegularize).toHaveBeenCalled();
  });

  it("shows terrain warning if hasTerrainPolygon is false", () => {
    render(<SizingContainerSection {...defaultProps} hasTerrainPolygon={false} />);
    expect(
      screen.getByText(/Regularizar requiere un poligono de terreno/i)
    ).toBeDefined();
  });
});
