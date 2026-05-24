import { describe, it, expect } from "vitest";
import { findSwitchgear, mvSwitchgearCatalog } from "./switchgear";
import { findDocument } from "@/data/documentRegistry";

describe("mvSwitchgearCatalog", () => {
  it("has at least one entry", () => {
    expect(mvSwitchgearCatalog.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = mvSwitchgearCatalog.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("entries applicable to 33 kV have maxSystemVoltageKv >= 36", () => {
    mvSwitchgearCatalog
      .filter((s) => s.applicableToBESSMV33kV)
      .forEach((s) => expect(s.maxSystemVoltageKv).toBeGreaterThanOrEqual(36));
  });

  it("documented evidence points to existing DocumentRegistry entries", () => {
    mvSwitchgearCatalog.forEach((s) => {
      s.evidence.forEach((ev) => {
        if (ev.confidence === "documented") {
          expect(
            findDocument(ev.documentId),
            `${s.id} cites unknown documentId ${ev.documentId}`
          ).toBeDefined();
        }
      });
    });
  });

  it("findSwitchgear returns the entry when id exists", () => {
    expect(findSwitchgear("siemens-8da-40p5")).toBeDefined();
  });
});
