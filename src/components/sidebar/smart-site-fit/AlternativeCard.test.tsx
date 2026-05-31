import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlternativeCard } from "./AlternativeCard";
import type { SmartSiteFitCandidate } from "@/lib/layout/smartSiteFit/smartSiteFitTypes";

afterEach(() => {
  cleanup();
});

describe("AlternativeCard", () => {
  const mockCandidate: SmartSiteFitCandidate = {
    id: "candidate-balanced",
    strategy: "balanced",
    placedEquipment: [
      {
        id: "b1",
        equipmentSpecId: "sungrow-st2752ux-us",
        anchor: { lng: -70.6, lat: -33.4 },
        rotation_deg: 90,
        sourceReliability: "preliminary_assumption",
      },
      {
        id: "p1",
        equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
        anchor: { lng: -70.601, lat: -33.401 },
        rotation_deg: 90,
        sourceReliability: "preliminary_assumption",
      },
    ],
    score: {
      total: 95,
      insidePolygon: 25,
      noCollisions: 25,
      boundaryMargin: 15,
      siteUtilization: 10,
      rowRegularity: 10,
      corridorEfficiency: 5,
      ratioCompliance: 5,
      shapeCompactness: 10,
    },
    warnings: [
      { id: "w1", severity: "warning", message: "Warning 1" },
      { id: "w2", severity: "warning", message: "Warning 2" }
    ],
    assumptions: [
      { id: "a1", description: "Assumption 1", value: true, classification: "preliminary_assumption" }
    ],
    shape: {
      id: "compact_grid",
      kind: "compact_grid",
      label: "Matriz Compacta",
      description: "Matriz compacta",
      rows: 4,
      columns: 8,
      blocks: 1,
      pcsPlacement: "side",
    },
  };

  const defaultProps = {
    candidate: mockCandidate,
    isSelected: false,
    onSelect: vi.fn(),
    onApply: vi.fn(),
    locale: "en" as const,
  };

  it("renders strategy label, score, metrics and warnings/assumptions count", () => {
    render(<AlternativeCard {...defaultProps} />);

    // Renders strategy label
    expect(screen.getByText("Balanced")).toBeDefined();

    // Renders score badge
    expect(screen.getByText(/Score: 95\/100/i)).toBeDefined();

    // Renders equipment metrics
    expect(screen.getByText("BESS")).toBeDefined();
    expect(screen.getAllByText("1 u.").length).toBe(2);
    expect(screen.getByText("PCS/MV")).toBeDefined();
    expect(screen.getByText("1:1")).toBeDefined(); // Ratio

    // Renders power/energy/duration
    expect(screen.getByText("5 MW")).toBeDefined(); // 1 PCS * 5 MW
    expect(screen.getByText("2.75 MWh")).toBeDefined(); // 1 BESS * 2.752 MWh rounded
    expect(screen.getByText("0.6h")).toBeDefined(); // 2.752 / 5 rounded

    // Renders shape info
    expect(screen.getByText("Matriz Compacta")).toBeDefined();

    // Renders warnings/assumptions counters
    expect(screen.getByText(/2 warnings/i)).toBeDefined();
    expect(screen.getByText(/1 assumptions/i)).toBeDefined();
  });

  it("triggers onSelect when card is clicked", () => {
    const onSelect = vi.fn();
    render(<AlternativeCard {...defaultProps} onSelect={onSelect} />);

    const card = screen.getByText("Balanced").closest("div");
    if (card) fireEvent.click(card);

    expect(onSelect).toHaveBeenCalled();
  });

  it("renders 'Apply alternative' button and triggers onApply when clicked if selected", () => {
    const onApply = vi.fn();
    render(<AlternativeCard {...defaultProps} isSelected={true} onApply={onApply} />);

    const applyButton = screen.getByRole("button", { name: /Apply alternative/i });
    expect(applyButton).toBeDefined();

    fireEvent.click(applyButton);
    expect(onApply).toHaveBeenCalled();
  });

  it("does not render apply button if not selected", () => {
    render(<AlternativeCard {...defaultProps} isSelected={false} />);

    expect(screen.queryByRole("button", { name: /Apply alternative/i })).toBeNull();
  });

  it("surfaces the external-MV callout for an integrated (Tesla) alternative and dedupes the warning", () => {
    // Integrated units resolve to battery_container in the catalog: pcsCount === 0.
    const integratedCandidate: SmartSiteFitCandidate = {
      ...mockCandidate,
      id: "candidate-integrated",
      placedEquipment: Array.from({ length: 3 }).map((_, idx) => ({
        id: `u-${idx}`,
        equipmentSpecId: "bess-tesla-megapack-2xl-4h",
        anchor: { lng: -70.6 + 0.0001 * idx, lat: -33.4 },
        rotation_deg: 0,
        sourceReliability: "preliminary_assumption" as const,
      })),
      warnings: [
        {
          id: "integrated-external-transformer",
          severity: "info",
          message: "RAW_EXTERNAL_TRANSFORMER_MESSAGE",
        },
        { id: "other", severity: "warning", message: "Other warning" },
      ],
    };

    render(<AlternativeCard {...defaultProps} candidate={integratedCandidate} />);

    // Prominent integrated callout is shown.
    expect(
      screen.getByText(/External MV interface pending validation/i)
    ).toBeDefined();

    // The integrated architecture is labeled, never "0 PCS".
    expect(screen.getAllByText("Integrated").length).toBeGreaterThan(0);
    expect(screen.queryByText(/0 PCS/i)).toBeNull();

    // The dedicated callout replaces the raw external-transformer warning in
    // the generic list, but the warning count still reflects the full set.
    expect(screen.queryByText("RAW_EXTERNAL_TRANSFORMER_MESSAGE")).toBeNull();
    expect(screen.getByText("Other warning")).toBeDefined();
    expect(screen.getByText(/2 warnings/i)).toBeDefined();
  });

  it("renders an SVG schematic preview with one rect per block", () => {
    const { container } = render(<AlternativeCard {...defaultProps} />);

    const previewSvg = container.querySelector('svg[role="img"]');
    expect(previewSvg).not.toBeNull();

    // 1 BESS + 1 PCS footprint → two rects in the schematic.
    const rects = previewSvg?.querySelectorAll("rect");
    expect(rects?.length).toBe(2);
  });

  it("renders ratio and duration correctly for 16h (32:1 ratio) candidate", () => {
    const highRatioCandidate: SmartSiteFitCandidate = {
      ...mockCandidate,
      placedEquipment: [
        { id: "p1", equipmentSpecId: "sungrow-sc5000ud-mv-us-p3", anchor: { lng: -70.6, lat: -33.4 }, rotation_deg: 0, sourceReliability: "preliminary_assumption" },
        ...Array.from({ length: 32 }).map((_, idx) => ({
          id: `b-${idx}`,
          equipmentSpecId: "sungrow-st2752ux-us",
          anchor: { lng: -70.6 + 0.0001 * idx, lat: -33.4 },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption" as const,
        })),
      ],
    };

    render(<AlternativeCard {...defaultProps} candidate={highRatioCandidate} />);

    expect(screen.getByText("32:1")).toBeDefined();
  });
});
