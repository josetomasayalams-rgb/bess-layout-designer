/**
 * Phase 15.4 — v1.0 golden-master regression test.
 *
 * Pins the structural signature of the technical PDF report for v1.0
 * (page sequence + disclaimer ids + exclusion ids + metadata fields).
 * Complements but does NOT duplicate `ReportDocument.snapshot.test.tsx`
 * (Phase 12A) and `pdfSections.snapshot.test.tsx` (Phase 14.7).
 *
 * Any structural change to the report surface area will fail this
 * test, forcing the change to be acknowledged in the v1.x CHANGELOG.
 */

import React from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildReportData } from "@/lib/report/buildReportData";
import { ReportDocument } from "@/components/report/ReportDocument";
import {
  GOLDEN_MASTER_INPUT,
  GOLDEN_MASTER_PAGES,
  GOLDEN_MASTER_DISCLAIMER_IDS,
  GOLDEN_MASTER_EXCLUSION_IDS,
} from "./pdf-v1.0.snapshot";

const FROZEN_DATE = new Date("2026-05-27T12:00:00.000Z");

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_DATE);
});

afterAll(() => {
  vi.useRealTimers();
});

describe("PDF v1.0 golden master — TechnicalReportData signature", () => {
  it("metadata block is stable", () => {
    const data = buildReportData(GOLDEN_MASTER_INPUT);
    expect(data.metadata.locale).toBe("es");
    expect(data.metadata.schemaVersion).toBe("1.2");
    expect(data.metadata.projectName).toBe("GOLDEN-MASTER-v1.0");
    expect(data.metadata.appVersion).toBe("1.0.0-rc.1");
    expect(typeof data.metadata.reportId).toBe("string");
    expect(data.metadata.reportId.length).toBeGreaterThan(0);
    expect(typeof data.metadata.disclaimer).toBe("string");
    expect(data.metadata.disclaimer.length).toBeGreaterThan(0);
  });

  it("emits the 9 canonical disclaimers, in order", () => {
    const data = buildReportData(GOLDEN_MASTER_INPUT);
    expect(data.disclaimers.map((d) => d.id)).toEqual(
      [...GOLDEN_MASTER_DISCLAIMER_IDS]
    );
  });

  it("emits all 14 canonical exclusions, in order", () => {
    const data = buildReportData(GOLDEN_MASTER_INPUT);
    expect(data.exclusions.map((e) => e.id)).toEqual(
      [...GOLDEN_MASTER_EXCLUSION_IDS]
    );
  });

  it("electrical block is always present (zeroed when no architecture)", () => {
    const data = buildReportData(GOLDEN_MASTER_INPUT);
    expect(data.electrical.blocks).toBe(0);
    expect(data.electrical.stations).toEqual([]);
    expect(data.electrical.feeders).toEqual([]);
    expect(data.electrical.buses).toEqual([]);
    expect(data.electrical.poi).toBeNull();
    expect(data.electrical.mainTransformer).toBeNull();
  });

  it("preliminary electrical checks block is always present", () => {
    const data = buildReportData(GOLDEN_MASTER_INPUT);
    expect(data.preliminaryElectricalChecks).toBeDefined();
    expect(Array.isArray(data.preliminaryElectricalChecks.checks)).toBe(true);
  });

  it("engineering checklist is non-empty", () => {
    const data = buildReportData(GOLDEN_MASTER_INPUT);
    expect(data.engineeringChecklist.length).toBeGreaterThan(0);
  });
});

describe("PDF v1.0 golden master — Document structure", () => {
  type ChildElement = React.ReactElement<Record<string, unknown>>;

  function getDocumentChildren(): ChildElement[] {
    const data = buildReportData(GOLDEN_MASTER_INPUT);
    const documentElement = ReportDocument({ data }) as React.ReactElement<{
      children: React.ReactNode;
    }>;
    return React.Children.toArray(documentElement.props.children).filter(
      (child): child is ChildElement =>
        typeof child === "object" && child !== null && "type" in child
    );
  }

  function describeChild(
    child: ChildElement
  ): { number?: string; title?: string; kind?: string } {
    const Component = child.type as React.FC<Record<string, unknown>>;
    const rendered = Component(child.props) as React.ReactElement<{
      number?: string;
      title?: string;
    }> | null | undefined;
    if (!rendered || typeof rendered !== "object") return { kind: "unknown" };
    const props = rendered.props ?? {};
    if (typeof props.number === "string" && typeof props.title === "string") {
      return { number: props.number, title: props.title };
    }
    return { kind: "cover" };
  }

  it("renders the canonical v1.0 page sequence (12 pages)", () => {
    const children = getDocumentChildren();
    expect(children.length).toBe(GOLDEN_MASTER_PAGES.length);

    const observed = children.map(describeChild);
    for (let i = 0; i < GOLDEN_MASTER_PAGES.length; i++) {
      const expected = GOLDEN_MASTER_PAGES[i];
      if ("kind" in expected && expected.kind === "cover") {
        expect(observed[i].kind).toBe("cover");
      } else if ("number" in expected) {
        expect(observed[i].number).toBe(expected.number);
        expect(observed[i].title).toBe(expected.title);
      }
    }
  });
});
