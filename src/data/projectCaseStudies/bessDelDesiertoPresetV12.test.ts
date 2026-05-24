import { describe, it, expect } from "vitest";
import {
  BESS_DESIERTO_CONSTANTS,
  bessDelDesiertoPresetV12,
  bessDelDesiertoConversionStations,
  bessDelDesiertoMVFeeders,
  bessDelDesiertoMVBuses,
  bessDelDesiertoPOI,
  bessDelDesiertoMainTransformer,
  bessDelDesiertoAuxiliaryServices,
  bessDelDesiertoPPC,
  bessDelDesiertoOperationalLimits,
  bessDelDesiertoLossEstimates,
  bessDelDesiertoBlocks,
  bessDelDesiertoInconsistencies,
  bessDelDesiertoPendingDataV12,
  bessDelDesiertoDesignTargets,
  getProjectPresetV12,
} from "@/data/projectCaseStudies";
import { findDocument } from "@/data/documentRegistry";

describe("BESS del Desierto preset V12 — quantities", () => {
  it("matches the documented project numbers", () => {
    expect(BESS_DESIERTO_CONSTANTS.POWER_MW).toBe(200);
    expect(BESS_DESIERTO_CONSTANTS.USABLE_ENERGY_COMMERCIAL_MWH).toBe(800);
    expect(BESS_DESIERTO_CONSTANTS.GROSS_ENERGY_MWH).toBeCloseTo(880.80384, 5);
    expect(BESS_DESIERTO_CONSTANTS.USABLE_FACTOR).toBeCloseTo(0.9083, 3);
    expect(BESS_DESIERTO_CONSTANTS.CONTAINER_COUNT).toBe(320);
    expect(BESS_DESIERTO_CONSTANTS.STATION_COUNT).toBe(40);
    expect(BESS_DESIERTO_CONSTANTS.FEEDER_COUNT).toBe(10);
  });

  it("gross energy = container_count × container_energy", () => {
    const computed =
      BESS_DESIERTO_CONSTANTS.CONTAINER_COUNT *
      BESS_DESIERTO_CONSTANTS.CONTAINER_ENERGY_MWH;
    expect(computed).toBeCloseTo(BESS_DESIERTO_CONSTANTS.GROSS_ENERGY_MWH, 5);
  });

  it("station_count = container_count / containers_per_station", () => {
    expect(
      BESS_DESIERTO_CONSTANTS.CONTAINER_COUNT /
        BESS_DESIERTO_CONSTANTS.CONTAINERS_PER_STATION
    ).toBe(BESS_DESIERTO_CONSTANTS.STATION_COUNT);
  });

  it("feeder_count = station_count / stations_per_feeder", () => {
    expect(
      BESS_DESIERTO_CONSTANTS.STATION_COUNT /
        BESS_DESIERTO_CONSTANTS.STATIONS_PER_FEEDER
    ).toBe(BESS_DESIERTO_CONSTANTS.FEEDER_COUNT);
  });
});

describe("design targets", () => {
  it("powerMW is documented from DOC-1129 p.6", () => {
    expect(bessDelDesiertoDesignTargets.powerMW?.value).toBe(200);
    expect(bessDelDesiertoDesignTargets.powerMW?.evidence[0].documentId).toBe(
      "PROJ-BESS-DESIERTO-1129"
    );
    expect(bessDelDesiertoDesignTargets.powerMW?.evidence[0].page).toBe(6);
    expect(bessDelDesiertoDesignTargets.powerMW?.evidence[0].confidence).toBe(
      "documented"
    );
  });

  it("grossEnergyMWh is marked as derived", () => {
    expect(bessDelDesiertoDesignTargets.grossEnergyMWh?.evidence[0].confidence).toBe(
      "derived"
    );
  });

  it("usableFactor is derived = 800/880.80384", () => {
    expect(bessDelDesiertoDesignTargets.usableFactor?.value).toBeCloseTo(
      800 / 880.80384,
      5
    );
  });
});

describe("conversion stations PB01..PB40", () => {
  it("there are exactly 40 stations", () => {
    expect(bessDelDesiertoConversionStations).toHaveLength(40);
  });

  it("station ids follow pattern station-pbNN", () => {
    expect(bessDelDesiertoConversionStations[0].id).toBe("station-pb01");
    expect(bessDelDesiertoConversionStations[39].id).toBe("station-pb40");
  });

  it("each station has 8 associated containers", () => {
    for (const s of bessDelDesiertoConversionStations) {
      expect(s.associatedContainerIds).toHaveLength(8);
    }
  });

  it("each station has 2 PCS modules of 2.5 MVA", () => {
    for (const s of bessDelDesiertoConversionStations) {
      expect(s.pcsModules).toHaveLength(2);
      for (const m of s.pcsModules) {
        expect(m.apparentPowerMVA).toBe(2.5);
      }
    }
  });

  it("each station has 5 MVA rated power documented", () => {
    for (const s of bessDelDesiertoConversionStations) {
      expect(s.ratedPowerMVA.value).toBe(5);
      expect(s.ratedPowerMVA.evidence[0].confidence).toBe("documented");
    }
  });

  it("block transformer references the 0.9 kV LV with INC-002 note", () => {
    const tx = bessDelDesiertoConversionStations[0].blockTransformer;
    expect(tx.lvVoltageKv.value).toBe(0.9);
    expect(tx.lvVoltageKv.evidence[0].note).toMatch(/INC-002/);
  });

  it("total installed power = 200 MVA", () => {
    const total = bessDelDesiertoConversionStations.reduce(
      (s, st) => s + st.ratedPowerMVA.value,
      0
    );
    expect(total).toBe(200);
  });

  it("total associated containers = 320 with unique ids", () => {
    const ids = bessDelDesiertoConversionStations.flatMap(
      (s) => s.associatedContainerIds
    );
    expect(ids).toHaveLength(320);
    expect(new Set(ids).size).toBe(320);
  });

  it("each station references a valid feeder id", () => {
    const feederIds = new Set(bessDelDesiertoMVFeeders.map((f) => f.id));
    for (const s of bessDelDesiertoConversionStations) {
      expect(s.mvFeederId).toBeDefined();
      expect(feederIds.has(s.mvFeederId!)).toBe(true);
    }
  });
});

describe("MV feeders F01..F10", () => {
  it("there are exactly 10 feeders", () => {
    expect(bessDelDesiertoMVFeeders).toHaveLength(10);
  });

  it("each feeder has 4 stations and 20 MVA rating", () => {
    for (const f of bessDelDesiertoMVFeeders) {
      expect(f.conversionStationIds).toHaveLength(4);
      expect(f.ratedPowerMVA).toBe(20);
      expect(f.nominalVoltageKv).toBe(33);
    }
  });

  it("feeders 1..5 attach to BP5, 6..10 to BP6", () => {
    for (let i = 0; i < 10; i++) {
      const expectedBus = i < 5 ? "bus-bp5" : "bus-bp6";
      expect(bessDelDesiertoMVFeeders[i].mvBusId).toBe(expectedBus);
    }
  });

  it("total feeder power = 200 MVA", () => {
    const total = bessDelDesiertoMVFeeders.reduce(
      (s, f) => s + (f.ratedPowerMVA ?? 0),
      0
    );
    expect(total).toBe(200);
  });
});

describe("MV buses BP5 / BP6", () => {
  it("has both buses with 5 feeders each and a bus coupler", () => {
    expect(bessDelDesiertoMVBuses).toHaveLength(2);
    const bp5 = bessDelDesiertoMVBuses.find((b) => b.name === "BP5");
    const bp6 = bessDelDesiertoMVBuses.find((b) => b.name === "BP6");
    expect(bp5?.feederIds).toHaveLength(5);
    expect(bp6?.feederIds).toHaveLength(5);
    expect(bp5?.switchgear?.hasBusCoupler).toBe(true);
    expect(bp6?.switchgear?.hasBusCoupler).toBe(true);
  });
});

describe("POI 33 kV", () => {
  it("is mv_33kv with CT and PT metering", () => {
    expect(bessDelDesiertoPOI.boundary).toBe("mv_33kv");
    expect(bessDelDesiertoPOI.voltageKv).toBe(33);
    expect(bessDelDesiertoPOI.busName).toContain("BP5/BP6");
    expect(bessDelDesiertoPOI.meteringPoints?.length).toBe(2);
    const types = bessDelDesiertoPOI.meteringPoints!.map((m) => m.type).sort();
    expect(types).toEqual(["CT", "PT"]);
  });
});

describe("MainTransformer (external reference)", () => {
  it("is marked external_reference with 220/33/33 and 250 MVA", () => {
    expect(bessDelDesiertoMainTransformer.scope).toBe("external_reference");
    expect(bessDelDesiertoMainTransformer.windings.hvKv).toBe(220);
    expect(bessDelDesiertoMainTransformer.windings.mv1Kv).toBe(33);
    expect(bessDelDesiertoMainTransformer.windings.mv2Kv).toBe(33);
    expect(bessDelDesiertoMainTransformer.ratedPowerMVA.value).toBe(250);
    // The cited value carries an INC-004 note.
    expect(
      bessDelDesiertoMainTransformer.ratedPowerMVA.evidence[0].note
    ).toMatch(/INC-004/);
  });
});

describe("AuxiliaryServices — PMAX", () => {
  it("reproduces PMAX charge / discharge totals", () => {
    expect(bessDelDesiertoAuxiliaryServices.modeSpecific?.discharge?.value).toBe(
      1.563
    );
    expect(bessDelDesiertoAuxiliaryServices.modeSpecific?.charge?.value).toBe(
      1.3493
    );
  });
});

describe("PPC Bluence / Isotrol", () => {
  it("has all control modes enabled", () => {
    const m = bessDelDesiertoPPC.controlModes;
    expect(m.activePower).toBe(true);
    expect(m.reactivePower).toBe(true);
    expect(m.powerFactor).toBe(true);
    expect(m.voltage).toBe(true);
    expect(m.qvDroop).toBe(true);
    expect(m.frequency).toBe(true);
    expect(m.rampRate).toBe(true);
  });

  it("declares Isotrol Bluence", () => {
    expect(bessDelDesiertoPPC.manufacturer).toBe("Isotrol");
    expect(bessDelDesiertoPPC.productName).toBe("Bluence");
  });
});

describe("OperationalLimits", () => {
  it("documents min technical and ramps", () => {
    expect(
      bessDelDesiertoOperationalLimits.minTechnicalDischargeMW?.value
    ).toBeCloseTo(1.2677, 4);
    expect(
      bessDelDesiertoOperationalLimits.minTechnicalChargeMW?.value
    ).toBeCloseTo(-3.8421, 4);
    expect(
      bessDelDesiertoOperationalLimits.inverterRampMWperSec?.value
    ).toBe(5);
  });
});

describe("LossEstimates PMAX MT", () => {
  it("has charge and discharge loss entries", () => {
    expect(bessDelDesiertoLossEstimates).toHaveLength(2);
    const discharge = bessDelDesiertoLossEstimates.find(
      (l) => l.mode === "discharge"
    );
    const charge = bessDelDesiertoLossEstimates.find((l) => l.mode === "charge");
    expect(discharge?.mvLossesMW?.value).toBeCloseTo(3.7772, 4);
    expect(charge?.mvLossesMW?.value).toBeCloseTo(3.6813, 4);
  });
});

describe("BESS blocks", () => {
  it("has 40 blocks with 8 containers each", () => {
    expect(bessDelDesiertoBlocks).toHaveLength(40);
    for (const b of bessDelDesiertoBlocks) {
      expect(b.containerIds).toHaveLength(8);
    }
  });

  it("each block references a valid conversion station", () => {
    const stationIds = new Set(
      bessDelDesiertoConversionStations.map((s) => s.id)
    );
    for (const b of bessDelDesiertoBlocks) {
      expect(stationIds.has(b.conversionStationId)).toBe(true);
    }
  });
});

describe("Document inconsistencies INC-001..INC-004", () => {
  it("has exactly 4 inconsistencies with the documented topics", () => {
    expect(bessDelDesiertoInconsistencies).toHaveLength(4);
    const ids = bessDelDesiertoInconsistencies.map((i) => i.id).sort();
    expect(ids).toEqual(["INC-001", "INC-002", "INC-003", "INC-004"]);
  });

  it("INC-001 resolves to ST2752UX with conflicting values", () => {
    const inc = bessDelDesiertoInconsistencies.find((i) => i.id === "INC-001");
    expect(inc?.resolvedValue).toBe("ST2752UX");
    expect(inc?.conflictingValues).toHaveLength(2);
    expect(
      inc?.conflictingValues.map((c) => c.value).sort()
    ).toEqual(["ST2725UX", "ST2752UX"]);
  });

  it("each conflicting value cites a documented evidence", () => {
    for (const inc of bessDelDesiertoInconsistencies) {
      for (const cv of inc.conflictingValues) {
        expect(cv.evidence.confidence).toBe("documented");
      }
    }
  });
});

describe("Pending data V12 — PEND-D001..PEND-D015", () => {
  it("has 15 items with unique ids", () => {
    expect(bessDelDesiertoPendingDataV12).toHaveLength(15);
    const ids = bessDelDesiertoPendingDataV12.map((p) => p.id);
    expect(new Set(ids).size).toBe(15);
  });

  it("priority enum is one of critical/important/desirable", () => {
    for (const p of bessDelDesiertoPendingDataV12) {
      expect(["critical", "important", "desirable"]).toContain(p.priority);
    }
  });

  it("includes the four critical priority items (PEND-D001/D003/D011/D014)", () => {
    const critical = bessDelDesiertoPendingDataV12
      .filter((p) => p.priority === "critical")
      .map((p) => p.id)
      .sort();
    expect(critical).toEqual([
      "PEND-D001",
      "PEND-D003",
      "PEND-D011",
      "PEND-D014",
    ]);
  });
});

describe("preset bundle audit", () => {
  it("getProjectPresetV12 returns the BESS del Desierto bundle", () => {
    const p = getProjectPresetV12("bess-del-desierto");
    expect(p).toBeDefined();
    expect(p?.caseStudyId).toBe("bess-del-desierto");
  });

  it("returns undefined for unknown id", () => {
    expect(getProjectPresetV12("unknown")).toBeUndefined();
  });

  it("every documented EvidenceRef in the preset points to DocumentRegistry", () => {
    // Recolectar referencias del bundle entero.
    const refs: { documentId: string; confidence: string; where: string }[] = [];

    function visit(obj: unknown, where: string) {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        obj.forEach((v, i) => visit(v, `${where}[${i}]`));
        return;
      }
      const rec = obj as Record<string, unknown>;
      // EvidenceRef shape
      if (
        typeof rec.documentId === "string" &&
        typeof rec.confidence === "string"
      ) {
        refs.push({
          documentId: rec.documentId,
          confidence: rec.confidence,
          where,
        });
      }
      for (const [k, v] of Object.entries(rec)) {
        visit(v, `${where}.${k}`);
      }
    }
    visit(bessDelDesiertoPresetV12, "preset");

    const broken: string[] = [];
    for (const r of refs) {
      if (r.confidence === "documented" && r.documentId !== "__none__") {
        if (!findDocument(r.documentId)) {
          broken.push(`${r.where}: unknown documentId "${r.documentId}"`);
        }
      }
    }
    expect(broken, broken.join("\n")).toEqual([]);
  });
});
