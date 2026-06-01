import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TargetSizingTab } from "./TargetSizingTab";
import type { SmartSiteFitResult } from "@/lib/layout/smartSiteFit/smartSiteFitTypes";

afterEach(() => {
  cleanup();
});

describe("TargetSizingTab", () => {
  const defaultProps = {
    result: null,
    selectedAlternativeId: null,
    overrides: {},
    isDirty: false,
    onRunAnalysis: vi.fn(),
    onSelectAlternative: vi.fn(),
    onUpdateOverrides: vi.fn(),
    onRecalculate: vi.fn(),
    onApply: vi.fn(),
    onDiscard: vi.fn(),
    locale: "en" as const,
  };

  it("renders target inputs and strategy selector", () => {
    render(<TargetSizingTab {...defaultProps} />);

    expect(screen.getByLabelText(/Target Power/i)).toBeDefined();
    expect(screen.getByLabelText(/Target Energy/i)).toBeDefined();
    expect(screen.getByLabelText(/Design Strategy/i)).toBeDefined();
  });

  it("calls onRunAnalysis when calculate button is clicked", async () => {
    const onRunAnalysis = vi.fn();
    render(<TargetSizingTab {...defaultProps} onRunAnalysis={onRunAnalysis} />);

    const button = screen.getByRole("button", { name: /Calculate alternative/i });
    fireEvent.click(button);

    // The run is deferred by one macrotask so the loading state can paint.
    await waitFor(() => expect(onRunAnalysis).toHaveBeenCalled());
  });

  it("shows a loading indicator while the analysis is deferred", async () => {
    render(<TargetSizingTab {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /Calculate alternative/i }));

    // Loading state paints immediately after submit.
    expect(screen.getByText(/Analyzing layout options/i)).toBeDefined();

    // It clears once the deferred run completes (result stays null here, so the
    // form returns).
    await waitFor(() =>
      expect(screen.queryByText(/Analyzing layout options/i)).toBeNull()
    );
  });

  it("displays results card and micro-adjustment panel if results exist", () => {
    const mockResult: SmartSiteFitResult = {
      success: true,
      candidates: [
        {
          id: "candidate-1",
          strategy: "balanced",
          placedEquipment: [
            {
              id: "eq-1",
              equipmentSpecId: "sungrow-st2752ux-us",
              anchor: { lng: -70, lat: -33 },
              rotation_deg: 0,
              sourceReliability: "preliminary_assumption",
            },
          ],
          score: {
            total: 90,
            insidePolygon: 25,
            noCollisions: 25,
            boundaryMargin: 10,
            siteUtilization: 10,
            rowRegularity: 10,
            corridorEfficiency: 5,
            ratioCompliance: 5,
          },
          warnings: [],
          assumptions: [],
        },
      ],
      selected: null,
      warnings: [],
      assumptions: [],
      fallbackUsed: false,
      message: "Success",
    };

    render(
      <TargetSizingTab
        {...defaultProps}
        result={mockResult}
        selectedAlternativeId="candidate-1"
      />
    );

    expect(screen.getByText(/Layout Alternatives/i)).toBeDefined();
    expect(screen.getAllByText(/Balanced/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Capacity and Spacing Adjustments/i)).toBeDefined();
  });

  it("renders every candidate as a selectable card (grid, not a single card)", () => {
    const makeCandidate = (id: string, kind: "compact_grid" | "wide_grid") => ({
      id,
      strategy: "balanced" as const,
      placedEquipment: [
        {
          id: `${id}-b1`,
          equipmentSpecId: "sungrow-st2752ux-us",
          anchor: { lng: -70, lat: -33 },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption" as const,
        },
      ],
      score: {
        total: 80,
        insidePolygon: 25,
        noCollisions: 25,
        boundaryMargin: 10,
        siteUtilization: 10,
        rowRegularity: 5,
        corridorEfficiency: 3,
        ratioCompliance: 2,
      },
      warnings: [],
      assumptions: [],
      shape: {
        id: kind,
        kind,
        label: kind === "compact_grid" ? "Compact Matrix" : "Wide Grid",
        description: "",
        rows: 1,
        columns: 1,
        blocks: 1,
        pcsPlacement: "side",
      },
    });

    const onSelectAlternative = vi.fn();
    const multiResult: SmartSiteFitResult = {
      success: true,
      candidates: [
        makeCandidate("c-1", "compact_grid"),
        makeCandidate("c-2", "wide_grid"),
      ],
      selected: null,
      warnings: [],
      assumptions: [],
      fallbackUsed: false,
      message: "ok",
    };

    render(
      <TargetSizingTab
        {...defaultProps}
        result={multiResult}
        selectedAlternativeId="c-1"
        onSelectAlternative={onSelectAlternative}
      />
    );

    // Both alternatives are listed, and the count line reflects the grid.
    expect(screen.getByText(/2 alternatives/i)).toBeDefined();
    expect(screen.getAllByText("Compact Matrix").length).toBeGreaterThan(0);
    const wide = screen.getAllByText("Wide Grid");
    expect(wide.length).toBeGreaterThan(0);

    // Clicking anywhere in the second card bubbles to its onSelect handler.
    fireEvent.click(wide[0]);
    expect(onSelectAlternative).toHaveBeenCalledWith("c-2");
  });

  it("lets the target power field be cleared without snapping back to 1", () => {
    render(<TargetSizingTab {...defaultProps} />);

    const power = screen.getByLabelText(/Target Power/i) as HTMLInputElement;
    expect(power.value).toBe("30");

    // Clearing the field leaves it empty (the previous bug forced it to "1").
    fireEvent.change(power, { target: { value: "" } });
    expect(power.value).toBe("");
  });

  it("accepts a freshly typed target power without prepending the old value", () => {
    render(<TargetSizingTab {...defaultProps} />);

    const power = screen.getByLabelText(/Target Power/i) as HTMLInputElement;

    // Clear, then type 228 — must read 228, not 1228.
    fireEvent.change(power, { target: { value: "" } });
    fireEvent.change(power, { target: { value: "228" } });
    expect(power.value).toBe("228");

    // Side-effect preserved: energy = power × default duration (4h) = 912 MWh.
    const energy = screen.getByLabelText(/Target Energy/i) as HTMLInputElement;
    expect(energy.value).toBe("912");
  });

  it("runs the analysis with the typed target values", async () => {
    const onRunAnalysis = vi.fn();
    render(<TargetSizingTab {...defaultProps} onRunAnalysis={onRunAnalysis} />);

    const power = screen.getByLabelText(/Target Power/i) as HTMLInputElement;
    fireEvent.change(power, { target: { value: "" } });
    fireEvent.change(power, { target: { value: "228" } });

    fireEvent.click(screen.getByRole("button", { name: /Calculate alternative/i }));

    await waitFor(() =>
      expect(onRunAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({ targetMW: 228, targetMWh: 912 })
      )
    );
  });

  it("supports choosing 8h and 16h durations and shows corresponding ratios and warnings", () => {
    render(<TargetSizingTab {...defaultProps} />);

    const button8 = screen.getByRole("button", { name: /8h \(16:1\)/i });
    const button16 = screen.getByRole("button", { name: /16h \(32:1\)/i });

    expect(button8).toBeDefined();
    expect(button16).toBeDefined();

    // Select 8h and verify warning note is shown
    fireEvent.click(button8);
    expect(screen.getByText(/The 8h and 16h configurations are calculated/i)).toBeDefined();
  });

  it("renders layout configuration dropdown and supports choosing manual", () => {
    render(<TargetSizingTab {...defaultProps} />);

    const modeSelect = screen.getByLabelText(/Layout Configuration/i) as HTMLSelectElement;
    expect(modeSelect).toBeDefined();
    expect(modeSelect.value).toBe("auto");

    // Switching to manual hides Design Strategy and shows BESS Columns, Block Cols, Orientation
    fireEvent.change(modeSelect, { target: { value: "manual" } });
    expect(modeSelect.value).toBe("manual");
    expect(screen.queryByLabelText(/Design Strategy/i)).toBeNull();
    expect(screen.getByLabelText(/BESS Columns/i)).toBeDefined();
    expect(screen.getByLabelText(/Block Cols/i)).toBeDefined();
    expect(screen.getByLabelText(/Orientation/i)).toBeDefined();
  });

  it("runs manual analysis with columns, blocks and orientation overrides", async () => {
    const onRunAnalysis = vi.fn();
    render(<TargetSizingTab {...defaultProps} onRunAnalysis={onRunAnalysis} />);

    const modeSelect = screen.getByLabelText(/Layout Configuration/i) as HTMLSelectElement;
    fireEvent.change(modeSelect, { target: { value: "manual" } });

    // Set columns to 5 and orientation to 30
    const colsInput = screen.getByLabelText(/BESS Columns/i) as HTMLInputElement;
    fireEvent.change(colsInput, { target: { value: "5" } });

    const angleInput = screen.getByLabelText(/Orientation/i) as HTMLInputElement;
    fireEvent.change(angleInput, { target: { value: "30" } });

    const button = screen.getByRole("button", { name: /Calculate alternative/i });
    fireEvent.click(button);

    await waitFor(() =>
      expect(onRunAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          overrides: expect.objectContaining({
            layoutMode: "manual",
            containersWide: 5,
            orientationDeg: 30,
          }),
        })
      )
    );
  });
});

