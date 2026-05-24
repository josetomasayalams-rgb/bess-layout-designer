import { describe, it, expect } from "vitest";
import {
  activeDocuments,
  documentRef,
  documentRegistry,
  findDocument,
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
});
