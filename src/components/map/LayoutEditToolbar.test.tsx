/**
 * Phase 14.6 — LayoutEditToolbar.
 *
 * Stateless toolbar with many callbacks. Tests:
 *   - renders without crashing in empty-selection state,
 *   - empty selection disables the edit buttons,
 *   - selecting ≥ 1 movable item enables Rotate / Move,
 *   - clicking a callback wires through to the handler.
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LayoutEditToolbar } from "./LayoutEditToolbar";

afterEach(() => cleanup());

function makeProps(overrides: Partial<Parameters<typeof LayoutEditToolbar>[0]> = {}) {
  const noop = vi.fn();
  return {
    locale: "en" as const,
    selectedCount: 0,
    lockedCount: 0,
    hasDraft: false,
    warningCount: 0,
    errorCount: 0,
    isValidated: false,
    repairMessage: null,
    selectionPointCount: 0,
    onRotateCw: noop,
    onRotateCcw: noop,
    onRotate180: noop,
    onHorizontal: noop,
    onVertical: noop,
    onMoveUp: noop,
    onMoveDown: noop,
    onMoveLeft: noop,
    onMoveRight: noop,
    onToggleLock: noop,
    onRepair: noop,
    onCompact: noop,
    onValidate: noop,
    onRevert: noop,
    onApply: noop,
    onClearSelection: noop,
    ...overrides,
  };
}

describe("LayoutEditToolbar", () => {
  it("renders without crashing in empty-selection state", () => {
    render(<LayoutEditToolbar {...makeProps()} />);
    expect(screen.getByText(/Layout edit/i)).toBeDefined();
    expect(screen.getByText("Smart repair")).toBeDefined();
  });

  it("shows the click-to-select hint when nothing is selected", () => {
    render(<LayoutEditToolbar {...makeProps()} />);
    expect(screen.getByText(/Click an item/i)).toBeDefined();
  });

  it("disables 90° / -90° rotation buttons when nothing is selected", () => {
    render(<LayoutEditToolbar {...makeProps()} />);
    const buttons = Array.from(
      document.querySelectorAll("button")
    ) as HTMLButtonElement[];
    const rotateCw = buttons.find((b) => b.textContent?.includes("90°"));
    expect(rotateCw?.disabled).toBe(true);
  });

  it("enables 90° when there are movable items selected", () => {
    const onRotateCw = vi.fn();
    render(
      <LayoutEditToolbar
        {...makeProps({ selectedCount: 1, lockedCount: 0, onRotateCw })}
      />
    );
    const buttons = Array.from(
      document.querySelectorAll("button")
    ) as HTMLButtonElement[];
    const rotateCw = buttons.find(
      (b) => b.textContent?.trim().endsWith("90°") && !b.textContent.includes("-")
    );
    expect(rotateCw?.disabled).toBe(false);
    fireEvent.click(rotateCw!);
    expect(onRotateCw).toHaveBeenCalledTimes(1);
  });

  it("renders the Spanish edit header when locale is 'es'", () => {
    render(<LayoutEditToolbar {...makeProps({ locale: "es" })} />);
    expect(screen.getByText(/Edición de la disposición/i)).toBeDefined();
  });
});
