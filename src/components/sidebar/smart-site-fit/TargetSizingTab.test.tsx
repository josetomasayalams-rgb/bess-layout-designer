import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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

  it("calls onRunAnalysis when calculate button is clicked", () => {
    const onRunAnalysis = vi.fn();
    render(<TargetSizingTab {...defaultProps} onRunAnalysis={onRunAnalysis} />);

    const button = screen.getByRole("button", { name: /Calculate alternative/i });
    fireEvent.click(button);

    expect(onRunAnalysis).toHaveBeenCalled();
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

    expect(screen.getByText(/Generated Alternative/i)).toBeDefined();
    expect(screen.getAllByText(/Balanced/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Setbacks and Spacing Adjustments/i)).toBeDefined();
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
});
