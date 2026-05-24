import { describe, it, expect } from "vitest";
import {
  findMainTransformer,
  mainTransformerCatalog,
} from "./mainTransformer";
import { findDocument } from "@/data/documentRegistry";

describe("mainTransformerCatalog", () => {
  it("has at least one referential entry", () => {
    expect(mainTransformerCatalog.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = mainTransformerCatalog.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("documented evidence points to existing DocumentRegistry entries", () => {
    mainTransformerCatalog.forEach((t) => {
      t.evidence.forEach((ev) => {
        if (ev.confidence === "documented") {
          expect(
            findDocument(ev.documentId),
            `${t.id} cites unknown documentId ${ev.documentId}`
          ).toBeDefined();
        }
      });
    });
  });

  it("BESS POI candidates have hvKv >= 33", () => {
    mainTransformerCatalog
      .filter((t) => t.applicableToBESSPOI)
      .forEach((t) => expect(t.windings.hvKv).toBeGreaterThanOrEqual(33));
  });

  it("findMainTransformer returns the entry when id exists", () => {
    expect(findMainTransformer("horizonpower-substation-3w")).toBeDefined();
  });
});
