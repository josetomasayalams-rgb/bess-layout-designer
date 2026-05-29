import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TerrainSizingTab } from "./TerrainSizingTab";
import type { SmartSiteFitResult } from "@/lib/layout/smartSiteFit/smartSiteFitTypes";

afterEach(() => {
  cleanup();
});

describe("TerrainSizingTab", () => {
  const defaultProps = {
    hasPolygon: false,
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

  it("renders empty state warning if there is no polygon", () => {
    render(<TerrainSizingTab {...defaultProps} hasPolygon={false} />);

    expect(
      screen.getByText(/Please draw a terrain polygon on the map/i)
    ).toBeDefined();
  });

  it("allows clicking 'Analyze terrain' if polygon is present", () => {
    const onRunAnalysis = vi.fn();
    render(
      <TerrainSizingTab
        {...defaultProps}
        hasPolygon={true}
        onRunAnalysis={onRunAnalysis}
      />
    );

    // Should render defaults and analyze button
    expect(screen.getByText(/Default Equipment/i)).toBeDefined();
    expect(screen.getByText(/Design Duration/i)).toBeDefined();

    const button = screen.getByRole("button", { name: /Analyze terrain/i });
    fireEvent.click(button);

    expect(onRunAnalysis).toHaveBeenCalledWith({
      mode: "terrain",
      durationHours: 4,
      strategy: "balanced",
    });
  });

  it("renders alternative cards and calls onSelectAlternative when one is clicked", () => {
    const mockResult: SmartSiteFitResult = {
      success: true,
      candidates: [
        {
          id: "cand-max",
          strategy: "max_capacity",
          placedEquipment: [],
          score: {
            total: 85,
            insidePolygon: 25,
            noCollisions: 25,
            boundaryMargin: 10,
            siteUtilization: 10,
            rowRegularity: 5,
            corridorEfficiency: 5,
            ratioCompliance: 5,
          },
          warnings: [],
          assumptions: [],
        },
        {
          id: "cand-bal",
          strategy: "balanced",
          placedEquipment: [],
          score: {
            total: 92,
            insidePolygon: 25,
            noCollisions: 25,
            boundaryMargin: 10,
            siteUtilization: 10,
            rowRegularity: 12,
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

    const onSelectAlternative = vi.fn();

    render(
      <TerrainSizingTab
        {...defaultProps}
        hasPolygon={true}
        result={mockResult}
        selectedAlternativeId="cand-bal"
        onSelectAlternative={onSelectAlternative}
      />
    );

    expect(screen.getByText(/Layout Alternatives/i)).toBeDefined();
    expect(screen.getAllByText(/Compact/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Balanced/i).length).toBeGreaterThan(0);

    // Click on compact (max-capacity) candidate to select it
    const maxCard = screen.getAllByText(/Compact/i)[0];
    fireEvent.click(maxCard);

    expect(onSelectAlternative).toHaveBeenCalledWith("cand-max");
  });

  it("supports choosing 8h and 16h durations and shows corresponding ratios and warnings", () => {
    render(<TerrainSizingTab {...defaultProps} hasPolygon={true} />);

    const button8 = screen.getByRole("button", { name: /8h \(16:1\)/i });
    const button16 = screen.getByRole("button", { name: /16h \(32:1\)/i });

    expect(button8).toBeDefined();
    expect(button16).toBeDefined();

    // Select 8h and verify warning note is shown
    fireEvent.click(button8);
    expect(screen.getByText(/The 8h and 16h configurations are calculated/i)).toBeDefined();
  });
});
