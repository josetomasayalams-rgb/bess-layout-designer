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

  it("renders approximate power/energy inputs and a design duration group", () => {
    render(
      <MicroAdjustPanel
        {...defaultProps}
        currentBessCount={40}
        currentPcsCount={5}
        currentDurationHours={4}
      />
    );

    expect(screen.getByText(/Approx\. target power/i)).toBeDefined();
    expect(screen.getByText(/Approx\. target energy/i)).toBeDefined();
    expect(screen.getByText("Design duration")).toBeDefined();

    // Capacity controls are now two spinbuttons (MW, MWh), four sliders, one select.
    const spinbuttons = screen.getAllByRole("spinbutton");
    expect(spinbuttons.length).toBe(2);
    expect(screen.getAllByRole("slider").length).toBe(4);
    expect(screen.getAllByRole("combobox").length).toBe(1);

    // Seeded from counts: 5 PCS × 5 MVA = 25 MW; 40 BESS × 2.752 = 110.08 MWh.
    expect((spinbuttons[0] as HTMLInputElement).value).toBe("25");
    expect((spinbuttons[1] as HTMLInputElement).value).toBe("110.08");
  });

  it("shows the derived BESS/PCS counts as an informational result", () => {
    render(
      <MicroAdjustPanel
        {...defaultProps}
        currentBessCount={40}
        currentPcsCount={5}
        currentDurationHours={4}
      />
    );
    expect(screen.getByText(/Estimated equipment/i)).toBeDefined();
    // 40 BESS · 5 PCS/MV derived from 25 MW / 110.08 MWh / 4h.
    expect(screen.getByText(/40 BESS · 5 PCS\/MV/i)).toBeDefined();
  });

  it("auto-adjusts energy and re-derives counts when target power changes", () => {
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

    const powerInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(powerInput, { target: { value: "100" } });
    // Smart sizing: 100 MW × 4h → energy auto-set to 400 MWh.
    // 400 MWh → ceil(400/2.752)=146 BESS; ceil(100/5)=20 PCS.
    expect(onUpdateOverrides).toHaveBeenCalledWith(
      expect.objectContaining({
        targetPowerMW: 100,
        targetEnergyMWh: 400,
        pcsCount: 20,
        bessCount: 146,
      })
    );
  });

  it("shows the automatic energy-from-power note", () => {
    render(<MicroAdjustPanel {...defaultProps} currentDurationHours={4} />);
    expect(
      screen.getByText(/Changing the power auto-adjusts the energy/i)
    ).toBeDefined();
  });

  it("re-derives counts and marks dirty when target energy changes", () => {
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

    const energyInput = screen.getAllByRole("spinbutton")[1];
    fireEvent.change(energyInput, { target: { value: "220.16" } });
    // 220.16 MWh → ceil(220.16/2.752)=80 BESS.
    expect(onUpdateOverrides).toHaveBeenCalledWith(
      expect.objectContaining({ targetEnergyMWh: 220.16, bessCount: 80 })
    );
  });

  it("re-derives counts when duration changes", () => {
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

    fireEvent.click(screen.getByRole("button", { name: /8h \(16:1\)/i }));
    expect(onUpdateOverrides).toHaveBeenCalledWith(
      expect.objectContaining({ durationHours: 8 })
    );
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

