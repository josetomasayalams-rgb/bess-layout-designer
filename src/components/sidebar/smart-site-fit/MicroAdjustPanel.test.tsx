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

    expect(screen.getByText(/Capacity and Spacing Adjustments/i)).toBeDefined();

    expect(screen.getByText("BESS - BESS Separation")).toBeDefined();
    expect(screen.getByText("BESS - PCS Separation")).toBeDefined();
    expect(screen.getByText("Boundary Margin (Setback)")).toBeDefined();
    expect(screen.getByText("MV Corridor Width (PCS - PCS)")).toBeDefined();

    // Verify values display
    expect(screen.getAllByText("3m").length).toBe(3); // bessToBess, bessToPcs, pcsToPcs
    expect(screen.getByText("4m")).toBeDefined(); // boundaryMargin
    expect(screen.getByText("Layout shape")).toBeDefined();
  });

  it("renders BESS and PCS count inputs and a design duration group", () => {
    render(
      <MicroAdjustPanel
        {...defaultProps}
        currentBessCount={40}
        currentPcsCount={5}
        currentDurationHours={4}
      />
    );

    expect(screen.getByText("BESS containers")).toBeDefined();
    expect(screen.getByText("PCS/MV stations")).toBeDefined();
    expect(screen.getByText("Design duration")).toBeDefined();

    // Capacity controls are spinbuttons, not sliders, and keep exactly one combobox.
    const spinbuttons = screen.getAllByRole("spinbutton");
    expect(spinbuttons.length).toBe(2);
    expect(screen.getAllByRole("slider").length).toBe(4);
    expect(screen.getAllByRole("combobox").length).toBe(1);

    expect((spinbuttons[0] as HTMLInputElement).value).toBe("40");
    expect((spinbuttons[1] as HTMLInputElement).value).toBe("5");
  });

  it("recomputes suggested PCS when BESS count changes and marks dirty", () => {
    const onUpdateOverrides = vi.fn();
    render(
      <MicroAdjustPanel
        {...defaultProps}
        onUpdateOverrides={onUpdateOverrides}
        currentBessCount={40}
        currentPcsCount={5}
        currentDurationHours={4}
      />
    );

    const bessInput = screen.getAllByRole("spinbutton")[0];
    // 4h => 8:1, so 80 BESS suggests 10 PCS.
    fireEvent.change(bessInput, { target: { value: "80" } });
    expect(onUpdateOverrides).toHaveBeenCalledWith({ bessCount: 80, pcsCount: 10 });
  });

  it("honors a manual PCS count change and warns when the ratio is broken", () => {
    const onUpdateOverrides = vi.fn();
    const { rerender } = render(
      <MicroAdjustPanel
        {...defaultProps}
        onUpdateOverrides={onUpdateOverrides}
        currentBessCount={40}
        currentPcsCount={5}
        currentDurationHours={4}
      />
    );

    const pcsInput = screen.getAllByRole("spinbutton")[1];
    fireEvent.change(pcsInput, { target: { value: "9" } });
    expect(onUpdateOverrides).toHaveBeenCalledWith({ pcsCount: 9 });

    // Reflect the broken ratio through overrides and confirm the warning shows.
    rerender(
      <MicroAdjustPanel
        {...defaultProps}
        onUpdateOverrides={onUpdateOverrides}
        overrides={{ ...defaultProps.overrides, bessCount: 40, pcsCount: 9 }}
        currentDurationHours={4}
      />
    );
    expect(screen.getByText(/Suggested PCS\/MV: 5/i)).toBeDefined();
  });

  it("recomputes the ratio when duration changes", () => {
    const onUpdateOverrides = vi.fn();
    render(
      <MicroAdjustPanel
        {...defaultProps}
        onUpdateOverrides={onUpdateOverrides}
        currentBessCount={40}
        currentPcsCount={5}
        currentDurationHours={4}
      />
    );

    // Switch to 8h => 16:1, so 40 BESS suggests 3 PCS (ceil 2.5).
    fireEvent.click(screen.getByRole("button", { name: /8h \(16:1\)/i }));
    expect(onUpdateOverrides).toHaveBeenCalledWith({ durationHours: 8, pcsCount: 3 });
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

  it("triggers onUpdateOverrides when shape select changes", () => {
    const onUpdateOverrides = vi.fn();
    render(<MicroAdjustPanel {...defaultProps} onUpdateOverrides={onUpdateOverrides} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "two_row_block" } });
    expect(onUpdateOverrides).toHaveBeenCalledWith({ preferredShapeKind: "two_row_block" });
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

