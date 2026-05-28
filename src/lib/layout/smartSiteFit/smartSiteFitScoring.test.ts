import { describe, expect, it } from "vitest";
import {
  scoreCandidate,
  rankSmartSiteFitCandidates,
  selectTopSmartSiteFitAlternatives,
} from "./smartSiteFitScoring";
import type { SmartSiteFitCandidate } from "./smartSiteFitTypes";
import type { LocalPoint, ProjectAnchor } from "@/types/geometry";

describe("SmartSiteFit Scoring", () => {
  const anchor: ProjectAnchor = { lng0: -70, lat0: -33 };
  const square: LocalPoint[] = [
    { x_m: -50, y_m: -50 },
    { x_m: 50, y_m: -50 },
    { x_m: 50, y_m: 50 },
    { x_m: -50, y_m: 50 },
  ];

  const emptyCandidate: SmartSiteFitCandidate = {
    id: "empty",
    strategy: "balanced",
    placedEquipment: [],
    score: {
      total: 0,
      insidePolygon: 0,
      noCollisions: 0,
      boundaryMargin: 0,
      siteUtilization: 0,
      rowRegularity: 0,
      corridorEfficiency: 0,
      ratioCompliance: 0,
    },
    warnings: [],
    assumptions: [],
  };

  it("should score an empty candidate as 0", () => {
    const score = scoreCandidate(emptyCandidate, square, anchor, 4);
    expect(score.total).toBe(0);
  });

  it("should calculate correct breakdown for single placed equipment", () => {
    // Single equipment placed at the centroid (0, 0)
    const candidate: SmartSiteFitCandidate = {
      ...emptyCandidate,
      placedEquipment: [
        {
          id: "item1",
          equipmentSpecId: "sungrow-st2752ux-us",
          anchor: { lng: -70, lat: -33 },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption",
        },
      ],
    };

    const score = scoreCandidate(candidate, square, anchor, 4);
    // Since it's inside, there are no collisions, and margins are large:
    expect(score.insidePolygon).toBe(25);
    expect(score.noCollisions).toBe(25);
    expect(score.boundaryMargin).toBe(10);
    // But ratio is 0 because there's no PCS station (ratio compliance score should be 0)
    expect(score.ratioCompliance).toBe(0);
  });

  it("should rank candidates correctly by score total", () => {
    const candidateA: SmartSiteFitCandidate = {
      ...emptyCandidate,
      id: "candidate-a",
      placedEquipment: [
        {
          id: "item1",
          equipmentSpecId: "sungrow-st2752ux-us",
          anchor: { lng: -70, lat: -33 },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption",
        },
      ],
    };

    const candidateB: SmartSiteFitCandidate = {
      ...emptyCandidate,
      id: "candidate-b",
      placedEquipment: [],
    };

    const ranked = rankSmartSiteFitCandidates([candidateB, candidateA], square, anchor, 4);
    expect(ranked[0].id).toBe("candidate-a");
    expect(ranked[1].id).toBe("candidate-b");
    expect(ranked[0].score.total).toBeGreaterThan(ranked[1].score.total);
  });

  it("should select top alternatives", () => {
    const candidates = [emptyCandidate, emptyCandidate, emptyCandidate];
    const top = selectTopSmartSiteFitAlternatives(candidates, 2);
    expect(top.length).toBe(2);
  });
});
