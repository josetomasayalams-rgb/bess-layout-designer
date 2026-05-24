import { describe, it, expect } from "vitest";
import { cablesForMV33kV, findMVCable, mvCablesCatalog } from "./cables";
import { findDocument } from "@/data/documentRegistry";

describe("mvCablesCatalog", () => {
  it("has at least the four reference cables", () => {
    expect(mvCablesCatalog.length).toBeGreaterThanOrEqual(4);
  });

  it("has unique ids", () => {
    const ids = mvCablesCatalog.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has at least one evidence reference", () => {
    mvCablesCatalog.forEach((c) => {
      expect(c.evidence.length, `${c.id} has no evidence`).toBeGreaterThan(0);
    });
  });

  it("documented evidence points to existing DocumentRegistry entries", () => {
    mvCablesCatalog.forEach((c) => {
      c.evidence.forEach((ev) => {
        if (ev.confidence === "documented") {
          expect(
            findDocument(ev.documentId),
            `${c.id} cites unknown documentId ${ev.documentId}`
          ).toBeDefined();
        }
      });
    });
  });

  it("findMVCable returns the cable when id exists", () => {
    expect(findMVCable("hes-al-xlpe-cws-18-30")).toBeDefined();
  });

  it("findMVCable returns undefined when id is unknown", () => {
    expect(findMVCable("not-a-cable")).toBeUndefined();
  });

  it("cablesForMV33kV returns only entries flagged applicableToMV33kV", () => {
    cablesForMV33kV().forEach((c) =>
      expect(c.applicableToMV33kV).toBe(true)
    );
  });
});
