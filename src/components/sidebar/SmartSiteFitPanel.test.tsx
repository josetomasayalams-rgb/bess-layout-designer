import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SmartSiteFitPanel } from "./SmartSiteFitPanel";
import { useUiStore } from "@/store/uiStore";
import { useProjectStore } from "@/store/projectStore";
import { resetProjectStore } from "@/store/slices/_testHelpers";

beforeEach(() => {
  resetProjectStore();
  useUiStore.setState({ locale: "en" });
});

afterEach(() => {
  cleanup();
});

describe("SmartSiteFitPanel", () => {
  it("renders without crashing and displays header and disclaimer", () => {
    render(<SmartSiteFitPanel />);

    // Renders title and subtitle
    expect(screen.getByText(/Smart sizing/i)).toBeDefined();
    expect(screen.getByText(/By target or by terrain/i)).toBeDefined();

    // Expand the CollapsibleSection by clicking its header to render children
    fireEvent.click(screen.getByText(/Smart sizing/i));

    // Renders disclaimer text (in English by default)
    expect(screen.getByText(/Preliminary sizing/i)).toBeDefined();
  });

  it("allows switching between By target and By terrain tabs", () => {
    render(<SmartSiteFitPanel />);

    // Expand the CollapsibleSection by clicking its header
    fireEvent.click(screen.getByText(/Smart sizing/i));

    // Confirm tabs are rendered
    const targetTabBtn = screen.getByText("By target");
    const terrainTabBtn = screen.getByText("By terrain");
    expect(targetTabBtn).toBeDefined();
    expect(terrainTabBtn).toBeDefined();

    // Default tab is "By target" - find inputs
    expect(screen.getByLabelText(/Target Power/i)).toBeDefined();

    // Switch to By terrain
    fireEvent.click(terrainTabBtn);

    // Shows drawing empty state since there is no polygon
    expect(screen.getByText(/Please draw a terrain polygon/i)).toBeDefined();
  });

  it("completes target sizing calculation flow and displays the result", () => {
    // Inject polygon and anchor
    useProjectStore.setState({
      polygon: [
        { lng: -70, lat: -33 },
        { lng: -70.001, lat: -33 },
        { lng: -70.001, lat: -33.001 },
        { lng: -70, lat: -33.001 },
      ],
      anchor: { lng0: -70, lat0: -33 },
    });

    render(<SmartSiteFitPanel />);
    fireEvent.click(screen.getByText(/Smart sizing/i));

    const calcBtn = screen.getByRole("button", { name: /Calculate alternative/i });
    fireEvent.click(calcBtn);

    // The store should now have a calculated result
    const state = useProjectStore.getState();
    expect(state.smartSiteFit.result).not.toBeNull();
    expect(state.smartSiteFit.selectedAlternativeId).not.toBeNull();

    // Alternative card and adjustment panels are displayed
    expect(screen.getByText(/Generated Alternative/i)).toBeDefined();
    expect(screen.getByText(/Setbacks and Spacing Adjustments/i)).toBeDefined();
  });

  it("completes terrain sizing flow when polygon exists and selects alternatives", () => {
    useProjectStore.setState({
      polygon: [
        { lng: -70, lat: -33 },
        { lng: -70.001, lat: -33 },
        { lng: -70.001, lat: -33.001 },
        { lng: -70, lat: -33.001 },
      ],
      anchor: { lng0: -70, lat0: -33 },
    });

    render(<SmartSiteFitPanel />);
    fireEvent.click(screen.getByText(/Smart sizing/i));

    // Switch to terrain tab
    const terrainTabBtn = screen.getByText("By terrain");
    fireEvent.click(terrainTabBtn);

    // Click Analyze terrain
    const analyzeBtn = screen.getByRole("button", { name: /Analyze terrain/i });
    fireEvent.click(analyzeBtn);

    const state = useProjectStore.getState();
    expect(state.smartSiteFit.result).not.toBeNull();
    expect(state.smartSiteFit.selectedAlternativeId).not.toBeNull();

    // Renders up to 3 alternative cards
    expect(screen.getByText(/Layout Alternatives/i)).toBeDefined();
  });
});
