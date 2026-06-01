import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Toolbar } from "./Toolbar";
import { useUiStore } from "@/store/uiStore";

afterEach(cleanup);

beforeEach(() => {
  useUiStore.setState({ locale: "en", theme: "dark" });
  document.documentElement.className = "";
});

describe("Toolbar — theme toggle", () => {
  it("renders a theme toggle button in the top bar", () => {
    render(<Toolbar />);
    expect(
      screen.getByRole("button", { name: /Switch to light mode/i })
    ).toBeDefined();
  });

  it("toggles the theme on click without affecting the language control", () => {
    render(<Toolbar />);
    // Language control shows "ES" when locale is "en".
    expect(screen.getByRole("button", { name: "ES" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Switch to light mode/i }));
    expect(useUiStore.getState().theme).toBe("light");

    // Language control still present and unchanged after theme toggle.
    expect(screen.getByRole("button", { name: "ES" })).toBeDefined();
    expect(useUiStore.getState().locale).toBe("en");
  });
});
