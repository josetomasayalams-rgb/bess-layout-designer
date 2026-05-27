/**
 * Phase 14.6 — CoordinateSearch.
 *
 * Stateless form input. Tests:
 *   - renders an input and a submit button,
 *   - valid coordinates trigger onSearch with the parsed result,
 *   - invalid coordinates show the invalid message and do not call onSearch,
 *   - out-of-range coordinates show the invalid message,
 *   - aria-invalid flips when invalid.
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoordinateSearch } from "./CoordinateSearch";

afterEach(() => cleanup());

const PROPS = {
  placeholder: "lat, lng",
  submitTitle: "Submit",
  invalidMessage: "Invalid coordinates",
};

describe("CoordinateSearch", () => {
  it("renders the input and submit button", () => {
    render(<CoordinateSearch {...PROPS} onSearch={() => undefined} />);
    expect(screen.getByPlaceholderText(PROPS.placeholder)).toBeDefined();
    expect(screen.getByTitle(PROPS.submitTitle)).toBeDefined();
  });

  it("calls onSearch with parsed coordinates on valid input", () => {
    const onSearch = vi.fn();
    render(<CoordinateSearch {...PROPS} onSearch={onSearch} />);
    const input = screen.getByPlaceholderText(
      PROPS.placeholder
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "-33.45, -70.65" } });
    fireEvent.submit(input.closest("form")!);
    expect(onSearch).toHaveBeenCalledWith({ lat: -33.45, lng: -70.65 });
  });

  it("does not call onSearch and shows error on garbage input", () => {
    const onSearch = vi.fn();
    render(<CoordinateSearch {...PROPS} onSearch={onSearch} />);
    const input = screen.getByPlaceholderText(
      PROPS.placeholder
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "not numbers" } });
    fireEvent.submit(input.closest("form")!);
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByText(PROPS.invalidMessage)).toBeDefined();
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("rejects out-of-range coordinates", () => {
    const onSearch = vi.fn();
    render(<CoordinateSearch {...PROPS} onSearch={onSearch} />);
    const input = screen.getByPlaceholderText(
      PROPS.placeholder
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "200, 400" } });
    fireEvent.submit(input.closest("form")!);
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByText(PROPS.invalidMessage)).toBeDefined();
  });
});
