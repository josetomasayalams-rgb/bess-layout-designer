import { describe, expect, it } from "vitest";
import { computeFeederLengthsM } from "@/lib/electrical/feederLengths";
import type { CableRoute } from "@/types/cable";
import type { MVFeeder } from "@/types/electrical";

function mtRoute(id: string, from: string, to: string, length: number): CableRoute {
  return {
    id,
    voltageLevel: "MT",
    fromEntityId: from,
    toEntityId: to,
    path: [
      { x_m: 0, y_m: 0 },
      { x_m: length, y_m: 0 },
    ],
    corridorWidth_m: 1,
    estimatedLength_m: length,
  };
}

const feeder = (id: string, stationIds: string[]): MVFeeder => ({
  id,
  nominalVoltageKv: 34.5,
  conversionStationIds: stationIds,
  cableRouteIds: [],
  mvBusId: "bus-1",
});

describe("computeFeederLengthsM", () => {
  it("sums MT routes whose endpoints touch the feeder's stations", () => {
    const feeders = [feeder("F1", ["st-1", "st-2"]), feeder("F2", ["st-3"])];
    const routes = [
      mtRoute("r1", "st-1", "mvYard", 100),
      mtRoute("r2", "st-2", "mvYard", 150),
      mtRoute("r3", "st-3", "mvYard", 200),
    ];
    expect(computeFeederLengthsM(feeders, routes)).toEqual({ F1: 250, F2: 200 });
  });

  it("ignores non-MT routes", () => {
    const feeders = [feeder("F1", ["st-1"])];
    const routes: CableRoute[] = [
      { ...mtRoute("r1", "st-1", "mvYard", 100), voltageLevel: "BT" },
    ];
    expect(computeFeederLengthsM(feeders, routes)).toEqual({});
  });

  it("assigns a shared route to only the first claiming feeder (no double count)", () => {
    const feeders = [feeder("F1", ["st-1"]), feeder("F2", ["st-1"])];
    const routes = [mtRoute("r1", "st-1", "mvYard", 100)];
    expect(computeFeederLengthsM(feeders, routes)).toEqual({ F1: 100 });
  });

  it("falls back to path geometry when estimatedLength_m is absent", () => {
    const feeders = [feeder("F1", ["st-1"])];
    const route: CableRoute = {
      ...mtRoute("r1", "st-1", "mvYard", 0),
      estimatedLength_m: undefined,
      path: [
        { x_m: 0, y_m: 0 },
        { x_m: 30, y_m: 40 },
      ],
    };
    expect(computeFeederLengthsM(feeders, [route])).toEqual({ F1: 50 });
  });
});
