import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegulatoryCompliancePanel } from "./RegulatoryCompliancePanel";

vi.mock("./compliance", () => ({
  ComplianceSummary: () => <div data-testid="compliance-summary" />,
  ComplianceIssuesList: () => <div data-testid="compliance-issues-list" />,
  PreliminaryElectricalSection: () => <div data-testid="preliminary-electrical-section" />,
  CandidateRuleMatrix: () => <div data-testid="candidate-rule-matrix" />,
}));

describe("RegulatoryCompliancePanel", () => {
  it("renders all four compliance presentation sections", () => {
    render(<RegulatoryCompliancePanel />);

    expect(screen.getByTestId("compliance-summary")).toBeDefined();
    expect(screen.getByTestId("compliance-issues-list")).toBeDefined();
    expect(screen.getByTestId("preliminary-electrical-section")).toBeDefined();
    expect(screen.getByTestId("candidate-rule-matrix")).toBeDefined();
  });
});
