import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GridPreview } from "./GridPreview";

describe("GridPreview", () => {
  it("returns null with invalid columns/rows", () => {
    const { container } = render(<GridPreview columns={0} rows={5} filled={5} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders grid cells with valid columns/rows", () => {
    const { container } = render(<GridPreview columns={3} rows={2} filled={4} />);
    expect(container.firstChild).toBeDefined();
    // Grid has total 6 cells
    const cells = container.querySelectorAll(".aspect-square");
    expect(cells.length).toBe(6);
  });

  it("renders a proportional box for very large grids", () => {
    const { container } = render(<GridPreview columns={50} rows={10} filled={50} />);
    expect(container.querySelector(".border-cyan-500\\/50")).toBeDefined();
  });
});
