/**
 * Auditoría documental cross-cutting (Fase 2).
 *
 * Verifica que cualquier EvidenceRef con confidence "documented" presente
 * en el equipmentCatalog (legacy + technical + base) apunta a un
 * DocumentRegistry válido.
 *
 * Si este test falla, la documentación se está citando incorrectamente y
 * el reporte exportable perdería trazabilidad.
 */

import { describe, it, expect } from "vitest";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { findDocument } from "@/data/documentRegistry";
import type { EvidenceRef } from "@/types/evidence";

function gatherEvidence(): EvidenceRef[] {
  const refs: EvidenceRef[] = [];
  for (const spec of equipmentCatalog) {
    // source.evidence
    if (spec.source.evidence) refs.push(...spec.source.evidence);
    // compliance.certifications
    if (spec.compliance?.certifications) {
      refs.push(...spec.compliance.certifications);
    }
    // clearances.* evidence
    if (spec.clearances) {
      const keys: Array<keyof NonNullable<typeof spec.clearances>> = [
        "front_m",
        "back_m",
        "side_m",
        "sameType_m",
        "otherType_m",
        "overhead_m",
        "maintenance_m",
        "fire_m",
      ];
      for (const k of keys) {
        const v = spec.clearances[k];
        if (v) refs.push(...v.evidence);
      }
    }
  }
  return refs;
}

describe("equipmentCatalog audit", () => {
  it("every documented EvidenceRef points to a DocumentRegistry entry", () => {
    const refs = gatherEvidence();
    const broken: string[] = [];

    for (const ref of refs) {
      if (ref.confidence === "documented") {
        if (!findDocument(ref.documentId)) {
          broken.push(`Unknown documentId: "${ref.documentId}"`);
        }
      }
    }

    expect(broken, broken.join("\n")).toEqual([]);
  });

  it("evidence with confidence !== documented uses the sentinel id (__none__) or a registered id", () => {
    const refs = gatherEvidence();
    for (const ref of refs) {
      if (ref.confidence === "documented") continue;
      if (ref.documentId === "__none__") continue;
      // Para 'derived' / 'inferred' / 'assumption' / 'missing' aceptamos
      // documentId si existe en el registry, o '__none__'.
      expect(
        findDocument(ref.documentId),
        `Non-documented ref uses id "${ref.documentId}" that is neither __none__ nor registered`
      ).toBeDefined();
    }
  });

  it("Sungrow ST2752UX-US has evidence and compliance metadata after Phase 2", () => {
    const st = equipmentCatalog.find((s) => s.id === "sungrow-st2752ux-us");
    expect(st).toBeDefined();
    expect(st?.source.evidence?.length).toBeGreaterThan(0);
    expect(st?.compliance?.standards).toContain("UL 9540");
    expect(st?.batteryHierarchy?.cellChemistry).toBe("LFP");
  });

  it("Sungrow SC5000UD-MV-US-P3 has evidence after Phase 2", () => {
    const sc = equipmentCatalog.find(
      (s) => s.id === "sungrow-sc5000ud-mv-us-p3"
    );
    expect(sc).toBeDefined();
    expect(sc?.source.evidence?.length).toBeGreaterThan(0);
  });
});
