import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CandidateRuleMatrix } from "./CandidateRuleMatrix";
import type { RegulatoryEvaluationResult } from "@/rules/regulatoryProfileEvaluator";

describe("CandidateRuleMatrix", () => {
  const mockEvaluation: RegulatoryEvaluationResult = {
    profileId: "chile-utility-predesign",
    profileName: "Chile Utility Predesign",
    evaluatedAt: "2026-05-26T00:00:00.000Z",
    rules: [
      {
        ruleId: "RULE-PHYS-001",
        category: "physical_layout",
        title: "Distancia BESS a deslinde",
        description: "description",
        outcome: "pass",
        severity: "warning",
        declaredSeverity: "warning",
        severityCappedBy: null,
        violations: [],
        evidence: [],
      },
      {
        ruleId: "RULE-PHYS-002",
        category: "physical_layout",
        title: "Distancia BESS a BESS",
        description: "description BESS",
        outcome: "violation",
        severity: "warning",
        declaredSeverity: "blocking",
        severityCappedBy: {
          from: "blocking",
          by: "document_level",
          detail: "Capped because of rule profile constraints",
        },
        violations: [{ message: "Distancia insuficiente" }],
        evidence: [
          {
            documentId: "NFPA-855-2023",
            confidence: "documented",
            page: 45,
            section: "4.3.1",
          },
        ],
      },
    ],
    byCategory: {
      physical_layout: [
        {
          ruleId: "RULE-PHYS-001",
          category: "physical_layout",
          title: "Distancia BESS a deslinde",
          description: "description",
          outcome: "pass",
          severity: "warning",
          declaredSeverity: "warning",
          severityCappedBy: null,
          violations: [],
          evidence: [],
        },
        {
          ruleId: "RULE-PHYS-002",
          category: "physical_layout",
          title: "Distancia BESS a BESS",
          description: "description BESS",
          outcome: "violation",
          severity: "warning",
          declaredSeverity: "blocking",
          severityCappedBy: {
            from: "blocking",
            by: "document_level",
            detail: "Capped because of rule profile constraints",
          },
          violations: [{ message: "Distancia insuficiente" }],
          evidence: [
            {
              documentId: "NFPA-855-2023",
              confidence: "documented",
              page: 45,
              section: "4.3.1",
            },
          ],
        },
      ],
      electrical: [],
      regulatory_sec: [],
      regulatory_cne_cen: [],
      regulatory_territorial: [],
      regulatory_environmental: [],
      regulatory_fire_safety: [],
      engineering_detail: [],
      manufacturerSpecificRules: [],
    },
    totals: {
      pass: 1,
      violation: 1,
      manualCheck: 0,
      pending: 0,
      notEvaluable: 0,
      outOfScope: 0,
      blockingViolations: 0,
      warningViolations: 1,
    },
    documentRegistryRefs: ["NFPA-855-2023"],
  };

  it("renders heading and correct counts in Spanish", () => {
    const setActiveRuleProfileId = vi.fn();

    render(
      <CandidateRuleMatrix
        ruleEvaluation={mockEvaluation}
        activeRuleProfileId="chile-utility-predesign"
        setActiveRuleProfileId={setActiveRuleProfileId}
        isEs={true}
      />
    );

    expect(screen.getByText("Diagnóstico normativo inteligente")).toBeDefined();
    expect(screen.getByText("2 reglas")).toBeDefined();
    expect(screen.getAllByText("Sin inconf.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Inconformid.").length).toBeGreaterThanOrEqual(1);
  });

  it("renders mock rules, violations and citations/capping", () => {
    const setActiveRuleProfileId = vi.fn();

    render(
      <CandidateRuleMatrix
        ruleEvaluation={mockEvaluation}
        activeRuleProfileId="chile-utility-predesign"
        setActiveRuleProfileId={setActiveRuleProfileId}
        isEs={true}
      />
    );

    // Expand the passed criteria accordion
    const passedBtn = screen.getByRole("button", { name: /criterios evaluados sin/i });
    fireEvent.click(passedBtn);

    // Rule title
    expect(screen.getByText("Distancia BESS a deslinde")).toBeDefined();
    // Rule outcome count tile
    expect(screen.getAllByText("Sin inconf.").length).toBeGreaterThanOrEqual(1);

    // Violation message
    expect(screen.getByText("· Distancia insuficiente")).toBeDefined();

    // Cite display
    expect(screen.getByText("NFPA-855-2023 · p.45 · 4.3.1")).toBeDefined();

    // Severity Capped display
    expect(screen.getByText(/Severidad limitada/)).toBeDefined();
    expect(screen.getByText("Bloqueante")).toBeDefined();
    expect(screen.getByText("Advertencia")).toBeDefined();
    expect(screen.getByText(/nivel documental/)).toBeDefined();
    expect(screen.getByText("Capped because of rule profile constraints")).toBeDefined();
  });

  it("triggers callback when changing rule profile selector", () => {
    const setActiveRuleProfileId = vi.fn();

    render(
      <CandidateRuleMatrix
        ruleEvaluation={mockEvaluation}
        activeRuleProfileId="chile-utility-predesign"
        setActiveRuleProfileId={setActiveRuleProfileId}
        isEs={true}
      />
    );

    const select = screen.getByLabelText(/Perfil de reglas/i);
    fireEvent.change(select, { target: { value: "chile-pmgd-predesign" } });

    expect(setActiveRuleProfileId).toHaveBeenCalledWith("chile-pmgd-predesign");
  });
});
