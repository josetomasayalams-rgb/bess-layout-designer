import { describe, it, expect } from "vitest";
import { selectSldStages } from "./sldStages";

describe("selectSldStages", () => {
  it("returns the separate-PCS (Sungrow) chain when not integrated", () => {
    const { stages, caption } = selectSldStages(false);
    expect(stages.map((st) => st.title)).toEqual([
      "Contenedor BESS",
      "PCS + trafo",
      "Feeder MT",
      "Barra / secc.",
      "POI",
    ]);
    // Caption must describe the PCS-integrated block transformer, not a Tesla
    // external step-up transformer.
    expect(caption).toContain("transformador BT/MT");
    expect(caption).not.toContain("fabricante / EPC");
  });

  it("returns the integrated (Tesla) chain when integrated", () => {
    const { stages, caption } = selectSldStages(true);
    expect(stages.map((st) => st.title)).toEqual([
      "Unidad integrada",
      "Colector MT",
      "Trafo elevador",
      "Barra / secc.",
      "POI",
    ]);
    // The integrated unit carries its own PCS/inverter…
    expect(stages[0]?.sub).toContain("PCS/inversor");
    // …and the external step-up transformer is explicitly flagged as not modeled.
    expect(stages[2]?.sub).toContain("no mod.");
    expect(caption).toContain("no se modela");
    expect(caption).toContain("fabricante / EPC");
  });

  it("keeps exactly five stages for both architectures (stable diagram geometry)", () => {
    expect(selectSldStages(false).stages).toHaveLength(5);
    expect(selectSldStages(true).stages).toHaveLength(5);
  });

  it("always terminates at the POI and never invents a separate Tesla PCS box", () => {
    for (const isIntegrated of [false, true]) {
      const { stages } = selectSldStages(isIntegrated);
      expect(stages[stages.length - 1]?.title).toBe("POI");
    }
    // The integrated variant must not present a standalone PCS station box.
    const integratedTitles = selectSldStages(true).stages.map((st) => st.title);
    expect(integratedTitles).not.toContain("PCS + trafo");
  });

  it("produces distinct diagrams per architecture", () => {
    expect(selectSldStages(true)).not.toEqual(selectSldStages(false));
  });
});
