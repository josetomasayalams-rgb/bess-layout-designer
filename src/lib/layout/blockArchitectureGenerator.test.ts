import { describe, expect, it } from "vitest";
import { generateBlockArchitecture } from "@/lib/layout/blockArchitectureGenerator";
import { computeArchitectureSizing } from "@/lib/sizing/architectureSizing";

function allContainerIds(result: ReturnType<typeof generateBlockArchitecture>) {
  return result.blocks.flatMap((block) => block.containerIds);
}

describe("generateBlockArchitecture — BESS del Desierto scale", () => {
  const sizing = computeArchitectureSizing({
    targetPowerMW: 200,
    targetUsableEnergyMWh: 800,
  });
  const result = generateBlockArchitecture({
    sizing,
    busStartIndex: 5,
    evidence: [
      {
        documentId: "PROJ-BESS-DESIERTO-1129",
        page: 6,
        confidence: "documented",
      },
    ],
  });

  it("generates 40 blocks, 40 stations, 10 feeders and 2 buses", () => {
    expect(result.blocks).toHaveLength(40);
    expect(result.conversionStations).toHaveLength(40);
    expect(result.mvFeeders).toHaveLength(10);
    expect(result.mvBuses).toHaveLength(2);
  });

  it("generates 320 unique container IDs grouped 8:1", () => {
    const ids = allContainerIds(result);
    expect(ids).toHaveLength(320);
    expect(new Set(ids)).toHaveProperty("size", 320);
    expect(result.blocks.every((block) => block.containerIds.length === 8)).toBe(
      true
    );
    expect(result.conversionStations.every(
      (station) => station.associatedContainerIds.length === 8
    )).toBe(true);
  });

  it("assigns four stations to each feeder", () => {
    expect(result.mvFeeders.every((feeder) => feeder.conversionStationIds.length === 4))
      .toBe(true);
    expect(result.mvFeeders[0].conversionStationIds).toEqual([
      "station-pb01",
      "station-pb02",
      "station-pb03",
      "station-pb04",
    ]);
    expect(result.mvFeeders[9].conversionStationIds).toEqual([
      "station-pb37",
      "station-pb38",
      "station-pb39",
      "station-pb40",
    ]);
  });

  it("assigns feeders to BP5 and BP6 buses", () => {
    expect(result.mvBuses.map((bus) => bus.id)).toEqual(["bus-bp5", "bus-bp6"]);
    expect(result.mvBuses[0].feederIds).toEqual([
      "feeder-01",
      "feeder-02",
      "feeder-03",
      "feeder-04",
      "feeder-05",
    ]);
    expect(result.mvBuses[1].feederIds).toEqual([
      "feeder-06",
      "feeder-07",
      "feeder-08",
      "feeder-09",
      "feeder-10",
    ]);
  });

  it("keeps bidirectional station/container references consistent", () => {
    for (let index = 0; index < result.blocks.length; index++) {
      const block = result.blocks[index];
      const station = result.conversionStations[index];
      expect(block.conversionStationId).toBe(station.id);
      expect(station.associatedContainerIds).toEqual(block.containerIds);
      expect(station.mvFeederId).toBe(
        result.mvFeeders[Math.floor(index / 4)].id
      );
    }
  });

  it("reports no empty container slots for a full 320-container architecture", () => {
    expect(result.diagnostics).toMatchObject({
      containers: 320,
      stations: 40,
      feeders: 10,
      mvBuses: 2,
      containersPerStation: 8,
      stationsPerFeeder: 4,
      emptyContainerSlots: 0,
      installedPowerMVA: 200,
    });
  });
});

describe("generateBlockArchitecture — smaller scales", () => {
  it("generates a PMGD-like 9 MW / 36 MWh architecture", () => {
    const sizing = computeArchitectureSizing({
      targetPowerMW: 9,
      targetUsableEnergyMWh: 36,
    });
    const result = generateBlockArchitecture({ sizing });

    expect(result.blocks).toHaveLength(2);
    expect(result.conversionStations).toHaveLength(2);
    expect(result.mvFeeders).toHaveLength(1);
    expect(result.mvBuses).toHaveLength(1);
    expect(allContainerIds(result)).toHaveLength(16);
    expect(result.diagnostics.installedPowerMVA).toBe(10);
  });

  it("generates a 50 MW / 200 MWh mid-scale architecture", () => {
    const sizing = computeArchitectureSizing({
      targetPowerMW: 50,
      targetUsableEnergyMWh: 200,
    });
    const result = generateBlockArchitecture({ sizing });

    expect(result.blocks).toHaveLength(10);
    expect(result.conversionStations).toHaveLength(10);
    expect(result.mvFeeders).toHaveLength(3);
    expect(result.mvBuses).toHaveLength(1);
    expect(allContainerIds(result)).toHaveLength(80);
    expect(result.mvFeeders[2].conversionStationIds).toEqual([
      "station-pb09",
      "station-pb10",
    ]);
  });

  it("supports partial final blocks when energy target is very small", () => {
    const sizing = computeArchitectureSizing({
      targetUsableEnergyMWh: 1,
    });
    const result = generateBlockArchitecture({ sizing });

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].containerIds).toEqual(["container-pb01-c1"]);
    expect(result.diagnostics.emptyContainerSlots).toBe(7);
  });

  it("returns empty arrays for an empty sizing result", () => {
    const sizing = computeArchitectureSizing({});
    const result = generateBlockArchitecture({ sizing });

    expect(result.blocks).toEqual([]);
    expect(result.conversionStations).toEqual([]);
    expect(result.mvFeeders).toEqual([]);
    expect(result.mvBuses).toEqual([]);
  });
});

describe("generateBlockArchitecture — custom IDs and electrical options", () => {
  it("uses custom prefixes and voltage options", () => {
    const sizing = computeArchitectureSizing({
      targetPowerMW: 20,
      targetUsableEnergyMWh: 80,
      stationsPerFeeder: 2,
    });
    const result = generateBlockArchitecture({
      sizing,
      stationPrefix: "CS",
      blockPrefix: "block-cs",
      containerPrefix: "bess-cs",
      feederPrefix: "mvf",
      busPrefix: "MVB",
      collectorVoltageKv: 23,
      lvVoltageKv: 0.69,
      feedersPerBus: 2,
    });

    expect(result.blocks[0].id).toBe("block-cs01");
    expect(result.blocks[0].containerIds[0]).toBe("bess-cs01-c1");
    expect(result.conversionStations[0].id).toBe("station-cs01");
    expect(result.mvFeeders[0].id).toBe("mvf-01");
    expect(result.mvBuses[0].id).toBe("bus-mvb1");
    expect(result.mvFeeders[0].nominalVoltageKv).toBe(23);
    expect(result.conversionStations[0].blockTransformer.lvVoltageKv.value)
      .toBe(0.69);
  });
});
