import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PreliminaryElectricalSection } from "./PreliminaryElectricalSection";
import type { EvaluatedRuleEntry } from "@/rules/regulatoryProfileEvaluator";

describe("PreliminaryElectricalSection", () => {
  const mockEntries: EvaluatedRuleEntry[] = [
    {
      ruleId: "RULE-ELEC-007",
      category: "electrical",
      title: "Capacidad de corriente del barra de BT",
      description: "description check",
      outcome: "pass",
      severity: "warning",
      declaredSeverity: "warning",
      severityCappedBy: null,
      violations: [],
      evidence: [],
    },
  ];

  it("renders referential message and architecture warning when not populated", () => {
    render(
      <PreliminaryElectricalSection
        entries={mockEntries}
        isEs={true}
        architecturePopulated={false}
      />
    );

    expect(screen.getByText("Validaciones eléctricas preliminares")).toBeDefined();
    expect(screen.getByText(/Estimaciones preliminares de referencia/)).toBeDefined();
    expect(
      screen.getByText("Cargar la arquitectura v1.2 (preset BESS del Desierto o equivalente) para evaluar los 8 checks.")
    ).toBeDefined();
  });

  it("renders electrical checks when architecture is populated", () => {
    render(
      <PreliminaryElectricalSection
        entries={mockEntries}
        isEs={true}
        architecturePopulated={true}
      />
    );

    expect(screen.getByText("Capacidad de corriente del barra de BT")).toBeDefined();
    expect(screen.getByText("RULE-ELEC-007")).toBeDefined();
    expect(screen.getByText(/Sin inconformidades/i)).toBeDefined();
  });
});
