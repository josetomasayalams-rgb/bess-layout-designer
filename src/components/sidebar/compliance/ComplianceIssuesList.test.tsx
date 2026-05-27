import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComplianceIssuesList } from "./ComplianceIssuesList";
import type { ValidationIssue } from "@/types/bessLayoutTypes";

describe("ComplianceIssuesList", () => {
  const severityClass = {
    critical: "text-rose-200 border-rose-500/40 bg-rose-500/10",
    warning: "text-amber-200 border-amber-500/40 bg-amber-500/10",
  };

  it("renders a success message when there are no issues", () => {
    render(
      <ComplianceIssuesList
        issues={[]}
        isEs={true}
        locale="es"
        severityClass={severityClass}
      />
    );

    expect(
      screen.getByText("No hay conflictos normativos activos para las reglas implementadas.")
    ).toBeDefined();
  });

  it("renders validation issues list in Spanish", () => {
    const mockIssues: ValidationIssue[] = [
      {
        id: "issue1",
        ruleId: "bess_to_bess_spacing",
        severity: "warning",
        ruleLabel: "Separación BESS a BESS",
        message: "BESS-01 is too close to BESS-02",
        recommendation: "Increase separation",
        basis: "normative",
        source: "engine",
        objectAId: "BESS-01",
        objectBId: "BESS-02",
        measured_m: 1.5,
        required_m: 3.0,
      },
    ];

    render(
      <ComplianceIssuesList
        issues={mockIssues}
        isEs={true}
        locale="es"
        severityClass={severityClass}
      />
    );

    expect(screen.getByText((content) => content.includes("advertencia") && content.includes("Separación BESS a BESS"))).toBeDefined();
    // localizedIssue should localize this:
    expect(screen.getByText(/Separación BESS a BESS/)).toBeDefined();
    expect(screen.getByText(/BESS BESS-0 está a 1,50 m de BESS BESS-0/)).toBeDefined();
    expect(screen.getByText(/Medido 1,50 m \/ requerido 3,00 m/)).toBeDefined();
    expect(screen.getByText(/Acción: Mantener la advertencia/)).toBeDefined();
  });
});
