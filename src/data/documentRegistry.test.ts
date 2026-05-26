import { describe, it, expect } from "vitest";
import {
  activeDocuments,
  BIBLIOTECA_ACTIVA_ROOT,
  documentRef,
  documentRegistry,
  findDocument,
  isDocumentedLevel,
  resolveDocumentPath,
  type DocumentLevel,
} from "./documentRegistry";

describe("documentRegistry", () => {
  it("has at least 30 entries", () => {
    expect(documentRegistry.length).toBeGreaterThanOrEqual(30);
  });

  it("has unique ids", () => {
    const ids = documentRegistry.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every primary entry has a non-empty path", () => {
    documentRegistry
      .filter((d) => d.isPrimary)
      .forEach((d) => {
        expect(d.path, `${d.id} has empty path`).toBeTruthy();
        expect(d.path.length).toBeGreaterThan(0);
      });
  });

  it("paths are relative to DIRECTRICES_APP_BESS (no leading slash)", () => {
    documentRegistry.forEach((d) => {
      expect(d.path.startsWith("/"), `${d.id} path is absolute`).toBe(false);
      expect(d.path.startsWith("./"), `${d.id} path starts with ./`).toBe(false);
    });
  });

  it("replacedBy references point to existing entries", () => {
    documentRegistry
      .filter((d) => d.replacedBy)
      .forEach((d) => {
        expect(
          documentRegistry.some((other) => other.id === d.replacedBy),
          `${d.id} references unknown replacement ${d.replacedBy}`
        ).toBe(true);
      });
  });

  it("documentRef returns the entry by id", () => {
    const entry = documentRef("SEC-RGR-06-2024");
    expect(entry.title).toContain("RGR");
    expect(entry.source).toBe("sec_rgr");
  });

  it("documentRef throws when id is unknown", () => {
    expect(() => documentRef("UNKNOWN-ID")).toThrow();
  });

  it("findDocument returns undefined when unknown", () => {
    expect(findDocument("UNKNOWN-ID")).toBeUndefined();
  });

  it("activeDocuments excludes replaced entries", () => {
    const active = activeDocuments();
    active.forEach((d) => expect(d.replacedBy).toBeUndefined());
  });

  it("includes the BESS del Desierto report ids referenced by the preset", () => {
    expect(findDocument("PROJ-BESS-DESIERTO-1129")).toBeDefined();
    expect(findDocument("PROJ-BESS-DESIERTO-1092")).toBeDefined();
    expect(findDocument("PROJ-BESS-DESIERTO-2611")).toBeDefined();
  });

  it("includes the Sungrow datasheets referenced by the catalog", () => {
    expect(findDocument("SUNGROW-ST2752UX-V15")).toBeDefined();
    expect(findDocument("SUNGROW-SC5000UD-MV-US")).toBeDefined();
  });

  it("includes the priority Chilean BESS regulatory documents", () => {
    expect(findDocument("SEC-RGR-06-2024")).toBeDefined();
    expect(findDocument("SEC-RPTD-08-2020")).toBeDefined();
    expect(findDocument("SEA-CrAlmEn-DS17-2026")).toBeDefined();
    expect(findDocument("MINVU-DDU-522-BESS")).toBeDefined();
    expect(findDocument("CNE-NTSyCS-RES45-2026")).toBeDefined();
  });

  it("every entry carries a level in the matrix vocabulary", () => {
    const validLevels: DocumentLevel[] = [
      "L1_oem_exact_equipment",
      "L2_oem_same_family",
      "L3_standard_or_official",
      "L4_public_project_or_authority",
      "L5_whitepaper_brochure",
      "L6_inferred_assumption",
      "L7_unverifiable_pending",
    ];
    documentRegistry.forEach((d) => {
      expect(validLevels, `${d.id} has invalid level ${d.level}`).toContain(d.level);
    });
  });

  it("source kind agrees with declared level", () => {
    for (const d of documentRegistry) {
      switch (d.source) {
        case "manufacturer_datasheet":
        case "manufacturer_manual":
          expect(
            d.level === "L1_oem_exact_equipment" || d.level === "L2_oem_same_family",
            `${d.id} manufacturer source must be L1 or L2`
          ).toBe(true);
          break;
        case "manufacturer_whitepaper":
          expect(d.level, `${d.id} whitepaper must be L5`).toBe("L5_whitepaper_brochure");
          break;
        case "project_report":
          expect(d.level, `${d.id} project_report must be L4`).toBe(
            "L4_public_project_or_authority"
          );
          break;
        case "internal_summary":
          expect(d.level, `${d.id} internal_summary must be L7`).toBe(
            "L7_unverifiable_pending"
          );
          break;
        case "third_party_reference":
          expect(
            d.level === "L2_oem_same_family" || d.level === "L5_whitepaper_brochure",
            `${d.id} third_party_reference must be L2 or L5`
          ).toBe(true);
          break;
        case "international_standard":
        case "sec_rgr":
        case "sec_ric":
        case "sec_rptd":
        case "cne":
        case "cen":
        case "minvu":
        case "sea":
        case "mma":
        case "minsal":
        case "law":
        case "decree":
          expect(d.level, `${d.id} normative source must be L3`).toBe(
            "L3_standard_or_official"
          );
          break;
      }
    }
  });

  it("pathActive resolves under the active library root when present", () => {
    for (const d of documentRegistry) {
      const resolved = resolveDocumentPath(d);
      if (d.pathActive) {
        expect(resolved.startsWith(`${BIBLIOTECA_ACTIVA_ROOT}/`)).toBe(true);
        expect(d.pathActive.startsWith("/")).toBe(false);
      } else {
        expect(resolved.startsWith("DIRECTRICES_APP_BESS/")).toBe(true);
      }
    }
  });

  it("at least 80% of primary entries have a pathActive (migration coverage)", () => {
    const primaries = documentRegistry.filter((d) => d.isPrimary);
    const migrated = primaries.filter((d) => !!d.pathActive);
    expect(migrated.length / primaries.length).toBeGreaterThanOrEqual(0.8);
  });

  it("isDocumentedLevel marks only L1 / L2 / L4 as documented-eligible", () => {
    expect(isDocumentedLevel("L1_oem_exact_equipment")).toBe(true);
    expect(isDocumentedLevel("L2_oem_same_family")).toBe(true);
    expect(isDocumentedLevel("L4_public_project_or_authority")).toBe(true);
    expect(isDocumentedLevel("L3_standard_or_official")).toBe(false);
    expect(isDocumentedLevel("L5_whitepaper_brochure")).toBe(false);
    expect(isDocumentedLevel("L6_inferred_assumption")).toBe(false);
    expect(isDocumentedLevel("L7_unverifiable_pending")).toBe(false);
  });
});
