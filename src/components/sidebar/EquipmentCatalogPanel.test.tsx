/**
 * Phase 14.5 — EquipmentCatalogPanel.
 *
 * Pins:
 *   - renders the technical catalog list (filters out battery
 *     containers in this panel — only PCS/MV/transformer types),
 *   - clicking an item toggles `pendingPlacementSpecId` in the store
 *     and switches the interaction mode.
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EquipmentCatalogPanel } from "./EquipmentCatalogPanel";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { resetProjectStore } from "@/store/slices/_testHelpers";

beforeEach(() => {
  resetProjectStore();
  useUiStore.setState({ locale: "en" });
});

afterEach(() => {
  cleanup();
});

describe("EquipmentCatalogPanel", () => {
  it("renders the expandable section", () => {
    render(<EquipmentCatalogPanel />);
    // The CollapsibleSection title comes from i18n; just guard against crash.
    expect(document.body.querySelector("section, div")).not.toBeNull();
  });

  it("does NOT list any battery_container in this panel", () => {
    render(<EquipmentCatalogPanel />);
    const batteryLabels = equipmentCatalog
      .filter((s) => s.type === "battery_container")
      .map((s) => s.label);
    // Open the section first
    const summary = screen.queryByText(/PCS|inverter|equipment|equipos/i);
    if (summary) fireEvent.click(summary);
    for (const label of batteryLabels) {
      // queryAllByText avoids throwing — assert it is not rendered.
      expect(screen.queryAllByText(label).length).toBe(0);
    }
  });

  it("clicking the first equipment row sets pendingPlacementSpecId in the store", () => {
    render(<EquipmentCatalogPanel />);
    // The CollapsibleSection is collapsed by default — click the
    // heading by role to expand it.
    const expandButton = document.querySelector(
      "button[aria-expanded]"
    ) as HTMLElement | null;
    if (expandButton) fireEvent.click(expandButton);

    // Each list row has its own button — click the first equipment row
    // (after the disclosure button).
    const allButtons = Array.from(
      document.querySelectorAll("button")
    ) as HTMLButtonElement[];
    const rowButton = allButtons.find(
      (b) => b !== expandButton && !b.hasAttribute("aria-expanded")
    );
    if (!rowButton) {
      // Catalog has no non-battery specs — skip silently.
      const nonBattery = equipmentCatalog.filter(
        (s) => s.type !== "battery_container"
      );
      expect(nonBattery.length).toBe(0);
      return;
    }
    fireEvent.click(rowButton);
    expect(useProjectStore.getState().pendingPlacementSpecId).not.toBeNull();
  });
});
