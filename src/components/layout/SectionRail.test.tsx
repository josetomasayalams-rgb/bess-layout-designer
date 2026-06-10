import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SectionRail, SECTION_RAIL_IDS } from "./SectionRail";
import { useUiStore } from "@/store/uiStore";

describe("SectionRail", () => {
  beforeEach(() => {
    useUiStore.setState({ locale: "es" });
  });

  it("renders the six workflow sections with stable ids", () => {
    render(
      <SectionRail activeSection="site" onSectionChange={vi.fn()} />
    );

    expect(SECTION_RAIL_IDS).toEqual([
      "site",
      "equipment",
      "layout",
      "comparison",
      "compliance",
      "report",
    ]);
    expect(screen.getByRole("button", { name: "1. Sitio" })).toBeDefined();
    expect(screen.getByRole("button", { name: "2. Equipos" })).toBeDefined();
    expect(screen.getByRole("button", { name: "3. Layout" })).toBeDefined();
    expect(screen.getByRole("button", { name: "4. Comparar" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "5. Reglas" })
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "6. Reporte" })).toBeDefined();
  });

  it("calls onSectionChange when a section is clicked", () => {
    const onSectionChange = vi.fn();

    render(
      <SectionRail
        activeSection="site"
        onSectionChange={onSectionChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "6. Reporte" }));

    expect(onSectionChange).toHaveBeenCalledWith("report");
  });
});
