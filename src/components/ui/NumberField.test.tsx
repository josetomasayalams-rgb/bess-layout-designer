import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NumberField } from "./NumberField";

afterEach(cleanup);

describe("NumberField", () => {
  it("shows the committed value when not editing", () => {
    render(<NumberField value={4} onChange={vi.fn()} aria-label="ha" />);
    expect((screen.getByLabelText("ha") as HTMLInputElement).value).toBe("4");
  });

  it("leaves the field visually empty when cleared (no 0 coercion)", () => {
    render(<NumberField value={4} onChange={vi.fn()} aria-label="ha" />);
    const input = screen.getByLabelText("ha") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
  });

  it("typing 1 after clearing yields 1, not 01", () => {
    const onChange = vi.fn();
    render(<NumberField value={4} onChange={onChange} aria-label="ha" />);
    const input = screen.getByLabelText("ha") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.change(input, { target: { value: "1" } });
    expect(input.value).toBe("1");
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("accepts multi-digit entry like 15", () => {
    const onChange = vi.fn();
    render(<NumberField value={4} onChange={onChange} aria-label="ha" />);
    const input = screen.getByLabelText("ha") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "15" } });
    expect(input.value).toBe("15");
    expect(onChange).toHaveBeenLastCalledWith(15);
  });

  it("does not call onChange while the field is empty/invalid", () => {
    const onChange = vi.fn();
    render(<NumberField value={4} onChange={onChange} aria-label="ha" />);
    const input = screen.getByLabelText("ha");
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps and falls back to the previous value on blur when emptied", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <NumberField
        value={4}
        onChange={onChange}
        onCommit={onCommit}
        min={1}
        aria-label="ha"
      />
    );
    const input = screen.getByLabelText("ha") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input.value).toBe("4");
    expect(onCommit).toHaveBeenLastCalledWith(4);
  });

  it("rounds to an integer on blur when integer is set", () => {
    const onCommit = vi.fn();
    render(
      <NumberField
        value={3}
        onChange={vi.fn()}
        onCommit={onCommit}
        integer
        aria-label="vértices"
      />
    );
    const input = screen.getByLabelText("vértices");
    fireEvent.change(input, { target: { value: "5.7" } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenLastCalledWith(6);
  });
});
