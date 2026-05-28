/**
 * MVArchitecturePanel — conceptual electrical notes.
 *
 * Pins:
 *   - renders the collapsible section without crashing.
 *   - the conceptual notes section exists in the DOM.
 *   - key labels for PCS/MV integrated transformer and Sectioning Center
 *     appear once opened.
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MVArchitecturePanel } from "./MVArchitecturePanel";
import { useUiStore } from "@/store/uiStore";
import { resetProjectStore } from "@/store/slices/_testHelpers";

vi.mock("@/components/electrical/SingleLineDiagram", () => ({
  SingleLineDiagram: () => <div data-testid="single-line-diagram" />,
}));

beforeEach(() => {
  resetProjectStore();
  useUiStore.setState({ locale: "en" });
});

afterEach(() => {
  cleanup();
});

describe("MVArchitecturePanel", () => {
  it("renders without crashing", () => {
    render(<MVArchitecturePanel />);
    expect(document.body.querySelector("div")).not.toBeNull();
  });

  it("contains the conceptual notes details element (en)", () => {
    render(<MVArchitecturePanel />);
    const mainSection = document.querySelector("button[aria-expanded]") as HTMLElement | null;
    if (mainSection) fireEvent.click(mainSection);

    const details = document.querySelector("details");
    expect(details).not.toBeNull();
  });

  it("shows PCS/MV station integrated transformer note when notes expanded (en)", () => {
    render(<MVArchitecturePanel />);
    const expandMain = document.querySelector("button[aria-expanded]") as HTMLElement | null;
    if (expandMain) fireEvent.click(expandMain);

    const summary = document.querySelector("details > summary") as HTMLElement | null;
    if (summary) fireEvent.click(summary);

    expect(screen.getByText(/PCS\/MV station \(SC5000UD-MV family\)/i)).toBeDefined();
    expect(screen.getByText(/Integrates power conversion and BT\/MT transformer/i)).toBeDefined();
  });

  it("shows Sectioning Center note when notes expanded (en)", () => {
    render(<MVArchitecturePanel />);
    const expandMain = document.querySelector("button[aria-expanded]") as HTMLElement | null;
    if (expandMain) fireEvent.click(expandMain);

    const summary = document.querySelector("details > summary") as HTMLElement | null;
    if (summary) fireEvent.click(summary);

    expect(screen.getByText(/Sectioning Center/i)).toBeDefined();
    expect(screen.getByText(/Conceptual MV collection zone/i)).toBeDefined();
  });

  it("shows POI/PCC note when notes expanded (en)", () => {
    render(<MVArchitecturePanel />);
    const expandMain = document.querySelector("button[aria-expanded]") as HTMLElement | null;
    if (expandMain) fireEvent.click(expandMain);

    const summary = document.querySelector("details > summary") as HTMLElement | null;
    if (summary) fireEvent.click(summary);

    expect(screen.getByText(/POI \/ PCC/i)).toBeDefined();
    expect(screen.getByText(/Conceptual connection point/i)).toBeDefined();
  });

  it("shows spanish labels when locale is es", () => {
    useUiStore.setState({ locale: "es" });
    render(<MVArchitecturePanel />);
    const expandMain = document.querySelector("button[aria-expanded]") as HTMLElement | null;
    if (expandMain) fireEvent.click(expandMain);

    const summary = document.querySelector("details > summary") as HTMLElement | null;
    if (summary) fireEvent.click(summary);

    expect(screen.getByText(/Arquitectura eléctrica conceptual/i)).toBeDefined();
    expect(screen.getByText(/Estación PCS\/MV/i)).toBeDefined();
  });
});
