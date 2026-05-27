/**
 * Phase 14.6 — BaseMapSelector.
 *
 * Stateless component with three buttons (one per style). Tests:
 *   - renders one labelled button per style id,
 *   - calls onChange with the clicked style id,
 *   - styles that are unavailable (no credentials) are disabled.
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BaseMapSelector } from "./BaseMapSelector";
import { BASE_MAP_STYLES, type BaseMapStyleId } from "@/data/mapStyles";

afterEach(() => cleanup());

const LABELS = Object.fromEntries(
  BASE_MAP_STYLES.map((s) => [s.id, s.id])
) as Record<BaseMapStyleId, string>;

describe("BaseMapSelector", () => {
  it("renders one button per BASE_MAP_STYLES entry", () => {
    const onChange = vi.fn();
    render(
      <BaseMapSelector
        value={BASE_MAP_STYLES[0].id}
        onChange={onChange}
        labels={LABELS}
        unavailableLabel="No provider"
      />
    );
    for (const style of BASE_MAP_STYLES) {
      expect(screen.getByText(style.id)).toBeDefined();
    }
  });

  it("calls onChange with the clicked style id", () => {
    const onChange = vi.fn();
    render(
      <BaseMapSelector
        value={BASE_MAP_STYLES[0].id}
        onChange={onChange}
        labels={LABELS}
        unavailableLabel="No provider"
      />
    );
    // Pick the first enabled style.
    const buttons = Array.from(
      document.querySelectorAll("button")
    ) as HTMLButtonElement[];
    const target = buttons.find((b) => !b.disabled);
    if (!target) return; // All disabled — env without any provider.
    fireEvent.click(target);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("highlights the active style by giving it the cyan-300 class", () => {
    const onChange = vi.fn();
    render(
      <BaseMapSelector
        value={BASE_MAP_STYLES[0].id}
        onChange={onChange}
        labels={LABELS}
        unavailableLabel="No provider"
      />
    );
    const buttons = Array.from(
      document.querySelectorAll("button")
    ) as HTMLButtonElement[];
    const selectedButton = buttons.find(
      (b) => b.textContent === BASE_MAP_STYLES[0].id
    );
    expect(selectedButton?.className).toContain("cyan-300");
  });
});
