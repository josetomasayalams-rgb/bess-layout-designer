import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MicroAdjustPanel } from "./MicroAdjustPanel";

afterEach(() => {
  cleanup();
});

describe("MicroAdjustPanel", () => {
  const defaultProps = {
    overrides: {
      bessToBess_m: 3.0,
      bessToPcs_m: 3.0,
      boundaryMargin_m: 4.0,
      pcsToPcs_m: 3.0,
    },
    isDirty: false,
    onUpdateOverrides: vi.fn(),
    onRecalculate: vi.fn(),
    onApply: vi.fn(),
    onDiscard: vi.fn(),
    locale: "en" as const,
  };

  it("renders headers and all four spacing controls with values", () => {
    render(<MicroAdjustPanel {...defaultProps} />);

    expect(screen.getByText(/Setbacks and Spacing Adjustments/i)).toBeDefined();

    expect(screen.getByText("BESS - BESS Separation")).toBeDefined();
    expect(screen.getByText("BESS - PCS Separation")).toBeDefined();
    expect(screen.getByText("Boundary Margin (Setback)")).toBeDefined();
    expect(screen.getByText("MV Corridor Width (PCS - PCS)")).toBeDefined();

    // Verify values display
    expect(screen.getAllByText("3m").length).toBe(3); // bessToBess, bessToPcs, pcsToPcs
    expect(screen.getByText("4m")).toBeDefined(); // boundaryMargin
  });

  it("triggers onUpdateOverrides when sliders change", () => {
    const onUpdateOverrides = vi.fn();
    render(<MicroAdjustPanel {...defaultProps} onUpdateOverrides={onUpdateOverrides} />);

    // Get sliders (using range type)
    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBe(4);

    // Change BESS to BESS separation slider
    fireEvent.change(sliders[0], { target: { value: "5.5" } });
    expect(onUpdateOverrides).toHaveBeenCalledWith({ bessToBess_m: 5.5 });

    // Change Boundary Margin slider
    fireEvent.change(sliders[2], { target: { value: "8.5" } });
    expect(onUpdateOverrides).toHaveBeenCalledWith({ boundaryMargin_m: 8.5 });
  });

  it("disables recalculate button if not dirty, enables it and triggers onRecalculate when dirty", () => {
    const onRecalculate = vi.fn();
    const { rerender } = render(
      <MicroAdjustPanel {...defaultProps} isDirty={false} onRecalculate={onRecalculate} />
    );

    const recalcBtn = screen.getByRole("button", { name: /Recalculate/i });
    expect(recalcBtn.hasAttribute("disabled")).toBe(true);

    // Rerender with isDirty: true
    rerender(
      <MicroAdjustPanel {...defaultProps} isDirty={true} onRecalculate={onRecalculate} />
    );

    expect(recalcBtn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(recalcBtn);
    expect(onRecalculate).toHaveBeenCalled();
  });

  it("calls onApply and onDiscard when their respective buttons are clicked", () => {
    const onApply = vi.fn();
    const onDiscard = vi.fn();

    render(
      <MicroAdjustPanel
        {...defaultProps}
        onApply={onApply}
        onDiscard={onDiscard}
      />
    );

    const applyBtn = screen.getByRole("button", { name: /Apply/i });
    const discardBtn = screen.getByRole("button", { name: /Discard/i });

    fireEvent.click(applyBtn);
    expect(onApply).toHaveBeenCalled();

    fireEvent.click(discardBtn);
    expect(onDiscard).toHaveBeenCalled();
  });
});
