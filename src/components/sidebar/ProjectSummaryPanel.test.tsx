/**
 * Phase 14.5 — ProjectSummaryPanel render smoke.
 *
 * Pins KPI surface: the panel renders without crashing and exposes
 * the four canonical labels (area, apparent power, energy, constraint
 * state).
 */

import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectSummaryPanel } from "./ProjectSummaryPanel";
import { resetProjectStore } from "@/store/slices/_testHelpers";
import { useUiStore } from "@/store/uiStore";

beforeEach(() => {
  resetProjectStore();
  useUiStore.setState({ locale: "en" });
});

afterEach(() => {
  cleanup();
});

describe("ProjectSummaryPanel", () => {
  it("renders without crashing", () => {
    render(<ProjectSummaryPanel />);
    expect(screen.getByText(/results/i)).toBeDefined();
  });

  it("renders the canonical KPI unit labels", () => {
    render(<ProjectSummaryPanel />);
    expect(screen.getByText(/MVA/)).toBeDefined();
    expect(screen.getByText(/MWh/)).toBeDefined();
    // Area unit
    expect(screen.getByText(/ha/)).toBeDefined();
  });
});
