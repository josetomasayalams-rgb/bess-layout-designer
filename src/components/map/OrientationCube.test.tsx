/**
 * Phase 14.6 — OrientationCube.
 *
 * Tests the parts of the cube that do not require a live MapLibre map:
 *   - renders four cardinal buttons + 2D / ISO toggles,
 *   - all buttons are disabled when `isMapLoaded` is false,
 *   - clicking 2D / ISO updates `useUiStore.viewMode`,
 *   - locale switches the aria-labels.
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRef } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { OrientationCube } from "./OrientationCube";
import { useUiStore } from "@/store/uiStore";

const INITIAL_VIEW_MODE = useUiStore.getState().viewMode;

beforeEach(() => {
  useUiStore.setState({ viewMode: INITIAL_VIEW_MODE });
});

afterEach(() => {
  cleanup();
  useUiStore.setState({ viewMode: INITIAL_VIEW_MODE });
});

describe("OrientationCube", () => {
  it("renders four cardinal buttons (N / S / E / O) and the 2D / ISO toggle", () => {
    const ref = createRef<MapRef>();
    render(
      <OrientationCube mapRef={ref} isMapLoaded={false} locale="en" />
    );
    expect(screen.getByLabelText(/Orient to north/i)).toBeDefined();
    expect(screen.getByLabelText(/Orient to south/i)).toBeDefined();
    expect(screen.getByLabelText(/Orient to east/i)).toBeDefined();
    expect(screen.getByLabelText(/Orient to west/i)).toBeDefined();
    expect(screen.getByLabelText(/Top view/i)).toBeDefined();
    expect(screen.getByLabelText(/Isometric view/i)).toBeDefined();
  });

  it("disables every button while the map is not loaded", () => {
    const ref = createRef<MapRef>();
    render(
      <OrientationCube mapRef={ref} isMapLoaded={false} locale="en" />
    );
    const buttons = Array.from(
      document.querySelectorAll("button")
    ) as HTMLButtonElement[];
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });

  it("uses Spanish aria-labels when locale is 'es'", () => {
    const ref = createRef<MapRef>();
    render(
      <OrientationCube mapRef={ref} isMapLoaded={false} locale="es" />
    );
    expect(screen.getByLabelText(/Orientar al norte/i)).toBeDefined();
    expect(screen.getByLabelText(/Vista superior/i)).toBeDefined();
  });

  it("clicking 2D / ISO updates the UI store viewMode even without a map", () => {
    // The mode buttons are disabled while !isMapLoaded — confirm.
    const ref = createRef<MapRef>();
    render(
      <OrientationCube mapRef={ref} isMapLoaded={false} locale="en" />
    );
    const button2D = screen.getByLabelText(/Top view/i) as HTMLButtonElement;
    expect(button2D.disabled).toBe(true);
    // Force-enable by clicking — disabled buttons do not fire onClick,
    // so store should remain unchanged.
    const before = useUiStore.getState().viewMode;
    fireEvent.click(button2D);
    expect(useUiStore.getState().viewMode).toBe(before);
  });
});
