import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ComplianceSummary } from "./ComplianceSummary";
import { exportRegulatoryReport } from "./helpers";
import type { validateBessLayout } from "@/rules/bessValidationEngine";

vi.mock("./helpers", () => ({
  exportRegulatoryReport: vi.fn(),
}));

describe("ComplianceSummary", () => {
  const mockResult = {
    projectStatus: "compliant_with_warnings",
    checkedRules: 12,
    criticalCount: 0,
    warningCount: 2,
    compliantCount: 10,
    issues: [],
    profile: {
      id: "chile_sec_pe",
      name: "Chile SEC",
      baseStandards: [],
      source: "",
    },
  } as unknown as ReturnType<typeof validateBessLayout>;

  const mockProfile = {
    name: "Chile SEC Profile",
    notes: "Notes about Chile SEC",
  };

  const statusCopy = {
    label: "Cumple con advertencias",
    className: "bg-amber-500/10",
  };

  it("renders status, counts and profile notes correctly in Spanish", () => {
    render(
      <ComplianceSummary
        result={mockResult}
        profile={mockProfile}
        isEs={true}
        statusCopy={statusCopy}
        statusLabel="Cumple con advertencias"
      />
    );

    expect(screen.getByText("Cumplimiento normativo")).toBeDefined();
    expect(screen.getByText("Cumple con advertencias")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined(); // Rules count
    expect(screen.getByText("0")).toBeDefined(); // Critical count
    expect(screen.getByText("2")).toBeDefined(); // Warning count
    expect(screen.getByText("10")).toBeDefined(); // Pass count
    expect(screen.getByText("Chile SEC Profile")).toBeDefined();
    expect(screen.getByText("Notes about Chile SEC")).toBeDefined();
    expect(screen.getByText("Exportar reporte")).toBeDefined();
  });

  it("triggers report export on button click", () => {
    render(
      <ComplianceSummary
        result={mockResult}
        profile={mockProfile}
        isEs={true}
        statusCopy={statusCopy}
        statusLabel="Cumple con advertencias"
      />
    );

    const button = screen.getByText("Exportar reporte");
    fireEvent.click(button);
    expect(exportRegulatoryReport).toHaveBeenCalledWith(mockResult);
  });
});
