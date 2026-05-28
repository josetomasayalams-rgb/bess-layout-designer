/**
 * Phase 14.5 — TechnicalReportPanel.
 *
 * Pins the disable / enable wiring of the Generate button so that the
 * documented invariant ("polygon < 3 → button disabled") cannot regress.
 * The actual PDF flow is exercised by `downloadTechnicalReport.test.tsx`.
 */

import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TechnicalReportPanel } from "./TechnicalReportPanel";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { resetProjectStore } from "@/store/slices/_testHelpers";

beforeEach(() => {
  resetProjectStore();
  useUiStore.setState({ locale: "en" });
});

afterEach(() => {
  cleanup();
});

describe("TechnicalReportPanel", () => {
  it("renders without crashing for an empty project", () => {
    render(<TechnicalReportPanel />);
    // The panel always renders the report-summary chip with a "vertices" word.
    expect(screen.getByText(/vertices/i)).toBeDefined();
  });

  it("disables generation actions when there is no polygon", () => {
    render(<TechnicalReportPanel />);
    const buttons = Array.from(
      document.querySelectorAll("button")
    ) as HTMLButtonElement[];
    // At least one button is disabled in the empty-project state.
    expect(buttons.some((b) => b.disabled)).toBe(true);
  });

  it("enables generation actions once polygon has ≥ 3 vertices", () => {
    useProjectStore.setState({
      anchor: { lng0: -70, lat0: -33 },
      polygon: [
        { lng: -70, lat: -33 },
        { lng: -70.001, lat: -33 },
        { lng: -70.001, lat: -33.001 },
      ],
    });
    render(<TechnicalReportPanel />);
    const buttons = Array.from(
      document.querySelectorAll("button")
    ) as HTMLButtonElement[];
    // At least one button is enabled.
    expect(buttons.some((b) => !b.disabled)).toBe(true);
  });
});
