import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SmartSiteFitPanel } from "./SmartSiteFitPanel";
import { useUiStore } from "@/store/uiStore";
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
});
