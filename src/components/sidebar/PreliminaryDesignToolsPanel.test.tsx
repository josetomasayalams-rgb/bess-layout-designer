import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreliminaryDesignToolsPanel } from "./PreliminaryDesignToolsPanel";

vi.mock("./design-tools", () => ({
  SizingContainerSection: () => <div data-testid="sizing-container-section" />,
  LayoutRepairSection: () => <div data-testid="layout-repair-section" />,
}));

describe("PreliminaryDesignToolsPanel", () => {
  it("renders both sizing and Reparación Inteligente panels after expanding headers", () => {
    render(<PreliminaryDesignToolsPanel />);

    fireEvent.click(screen.getByText("Sizing by containers"));
    fireEvent.click(screen.getByText("Reparación Inteligente"));

    expect(screen.getByTestId("sizing-container-section")).toBeDefined();
    expect(screen.getByTestId("layout-repair-section")).toBeDefined();
  });
});
