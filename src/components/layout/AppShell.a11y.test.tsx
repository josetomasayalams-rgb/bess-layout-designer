/**
 * Phase 14.8 — Accessibility smoke for AppShell.
 *
 * Light-weight a11y guard that does NOT install jest-axe or any
 * runtime dep (per Phase 14 scope). It walks the rendered DOM and
 * asserts that:
 *
 *   - the shell renders without throwing,
 *   - there is at least one element with role="region" / role="main"
 *     / role="navigation" / `<main>` (a landmark surface),
 *   - every <button> has either text content, an aria-label, or a
 *     title attribute (no orphan icon buttons).
 *
 * Real a11y findings should be triaged into
 * docs/phases/phase14-a11y-findings.md.
 */

import { render, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";
import { useUiStore } from "@/store/uiStore";
import { resetProjectStore } from "@/store/slices/_testHelpers";

// BessMap is a leaf that boots MapLibre / WebGL. Mock it to keep the
// smoke focused on the chrome.
vi.mock("@/components/map/BessMap", () => ({
  BessMap: () => <div data-testid="map-stub" role="region" aria-label="Map" />,
}));

beforeEach(() => {
  resetProjectStore();
  useUiStore.setState({ locale: "en" });
});

afterEach(() => {
  cleanup();
});

describe("AppShell — a11y smoke", () => {
  it("renders without throwing", () => {
    render(<AppShell />);
  });

  it("exposes at least one landmark surface (main / region / nav)", () => {
    const { container } = render(<AppShell />);
    const landmarks = container.querySelectorAll(
      "main, [role=main], [role=region], [role=navigation], nav"
    );
    expect(landmarks.length).toBeGreaterThan(0);
  });

  it("every button has accessible text (text, aria-label or title)", () => {
    const { container } = render(<AppShell />);
    const buttons = Array.from(container.querySelectorAll("button"));
    const orphans = buttons.filter((btn) => {
      const text = btn.textContent?.trim() ?? "";
      const aria = btn.getAttribute("aria-label") ?? "";
      const title = btn.getAttribute("title") ?? "";
      return !text && !aria && !title;
    });
    // If this fails, log the orphan button IDs/classes so the finding
    // can be triaged into docs/phases/phase14-a11y-findings.md.
    if (orphans.length > 0) {
      console.warn(
        `Phase 14.8 a11y finding: ${orphans.length} button(s) without accessible name.`
      );
    }
    expect(orphans.length).toBe(0);
  });
});
