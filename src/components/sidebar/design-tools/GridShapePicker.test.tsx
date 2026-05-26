import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GridShapePicker } from "./GridShapePicker";

describe("GridShapePicker", () => {
  const shapeOptions = [
    { columns: 4, rows: 2, shape: "rectangle" },
    { columns: 3, rows: 3, shape: "square" },
  ];

  it("renders shape options and triggers callback on click", () => {
    const setSelectedColumns = vi.fn();
    render(
      <GridShapePicker
        blockCount={8}
        safePerPcs={4}
        effectiveColumns={4}
        effectiveRows={2}
        emptyCells={0}
        shapeOptions={shapeOptions}
        setSelectedColumns={setSelectedColumns}
        isEs={true}
        locale="es"
      />
    );

    expect(screen.getByText("Forma de la grilla")).toBeDefined();

    const btnSquare = screen.getByRole("button", { name: /3×3/i });
    expect(btnSquare).toBeDefined();

    fireEvent.click(btnSquare);
    expect(setSelectedColumns).toHaveBeenCalledWith(3);
  });

  it("renders columns input and changes call callback", () => {
    const setSelectedColumns = vi.fn();
    render(
      <GridShapePicker
        blockCount={8}
        safePerPcs={4}
        effectiveColumns={4}
        effectiveRows={2}
        emptyCells={0}
        shapeOptions={shapeOptions}
        setSelectedColumns={setSelectedColumns}
        isEs={true}
        locale="es"
      />
    );

    const input = screen.getByLabelText(/Columnas/i);
    fireEvent.change(input, { target: { value: "5" } });
    expect(setSelectedColumns).toHaveBeenCalledWith(5);
  });

  it("renders empty state message when blockCount is 0", () => {
    render(
      <GridShapePicker
        blockCount={0}
        safePerPcs={4}
        effectiveColumns={0}
        effectiveRows={0}
        emptyCells={0}
        shapeOptions={[]}
        setSelectedColumns={vi.fn()}
        isEs={true}
        locale="es"
      />
    );

    expect(
      screen.getByText(
        "Ingresa al menos un contenedor BESS para ver las formas de grilla."
      )
    ).toBeDefined();
  });
});
