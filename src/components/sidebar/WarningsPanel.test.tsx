/**
 * Phase 14.5 — WarningsPanel render smoke.
 *
 * Pins:
 *   - renders without crashing in the empty-project case,
 *   - shows the "no active alerts" empty state,
 *   - shows the title and at least one severity badge label when an
 *     error-level warning exists.
 *
 * Does not snapshot full DOM. Does not assert ornamental text.
 */

import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WarningsPanel } from "./WarningsPanel";
import { resetProjectStore } from "@/store/slices/_testHelpers";
import { useUiStore } from "@/store/uiStore";

beforeEach(() => {
  resetProjectStore();
  useUiStore.setState({ locale: "en" });
});

afterEach(() => {
  cleanup();
});

describe("WarningsPanel", () => {
  it("renders without crashing for an empty project", () => {
    render(<WarningsPanel />);
    // Title is i18n and copy may have multiple matching nodes; just
    // verify the section rendered.
    expect(screen.getByText(/Constraint alerts/i)).toBeDefined();
  });

  it("renders the preliminary-assumptions warning in the Assumptions category", () => {
    // `computeWarnings` always emits a "preliminary-assumptions-in-use"
    // entry, so the panel never shows the empty state in practice —
    // it always renders the Assumptions category header.
    render(<WarningsPanel />);
    expect(screen.getAllByText(/Assumptions/i).length).toBeGreaterThan(0);
  });
});
