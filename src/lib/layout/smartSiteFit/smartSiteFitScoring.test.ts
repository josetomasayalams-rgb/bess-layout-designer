import { describe, expect, it } from "vitest";
import {
  scoreCandidate,
  rankSmartSiteFitCandidates,
  selectTopSmartSiteFitAlternatives,
  selectDiverseAlternatives,
} from "./smartSiteFitScoring";
import type {
  SmartSiteFitCandidate,
  SmartSiteFitShapeKind,
} from "./smartSiteFitTypes";
import type { LocalPoint, ProjectAnchor } from "@/types/geometry";
import { toLngLat } from "@/lib/geometry/projection";

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
    // No separate PCS station: ratio compliance is neutral/full, because a
    // layout without a PCS is either empty or an integrated architecture
    // (e.g. Tesla Megapack) where no BESS/PCS ratio applies.
    expect(score.ratioCompliance).toBe(10);
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

  // R5-A diversity selector: distinct layout families first, then orientation
  // variants, never padding with duplicates.
  const makeShaped = (
    id: string,
    kind: SmartSiteFitShapeKind,
    total: number,
    rotationDeg = 0
  ): SmartSiteFitCandidate => ({
    ...emptyCandidate,
    id,
    score: { ...emptyCandidate.score, total },
    shape: {
      id,
      kind,
      label: kind,
      description: "",
      rows: 1,
      columns: 1,
      blocks: 1,
      pcsPlacement: "side",
    },
    placedEquipment: [
      {
        id: `${id}-eq`,
        equipmentSpecId: "sungrow-st2752ux-us",
        anchor: { lng: -70, lat: -33 },
        rotation_deg: rotationDeg,
        sourceReliability: "preliminary_assumption",
      },
    ],
  });

  it("selects one representative per shape family first, best leading", () => {
    // Pre-sorted by score desc, as rankSmartSiteFitCandidates would emit.
    const ranked = [
      makeShaped("a1", "compact_grid", 90),
      makeShaped("a2", "compact_grid", 88), // duplicate family + orientation
      makeShaped("b1", "two_row_block", 86),
      makeShaped("c1", "wide_grid", 84),
      makeShaped("d1", "deep_grid", 82),
      makeShaped("a3", "compact_grid", 80, 90), // same family, other orientation
      makeShaped("b2", "two_row_block", 78, 90),
      makeShaped("c2", "wide_grid", 76, 90),
    ];

    const picked = selectDiverseAlternatives(ranked, { limit: 6 });

    expect(picked.length).toBe(6);
    // Global best leads (callers pre-select picked[0]).
    expect(picked[0].id).toBe("a1");
    // First four slots are the four distinct families, best score first.
    expect(picked.slice(0, 4).map((c) => c.shape!.kind)).toEqual([
      "compact_grid",
      "two_row_block",
      "wide_grid",
      "deep_grid",
    ]);
    // The exact duplicate (same family + orientation) is never surfaced.
    expect(picked.some((c) => c.id === "a2")).toBe(false);
    // Remaining slots are filled with distinct orientation variants.
    expect(picked.some((c) => c.id === "a3")).toBe(true);
  });

  it("never pads with duplicates when only one distinct family exists", () => {
    const ranked = Array.from({ length: 10 }).map((_, i) =>
      makeShaped(`x${i}`, "compact_grid", 90 - i)
    );

    const picked = selectDiverseAlternatives(ranked, { limit: 8 });

    // All ten share family + orientation + block count => one representative.
    expect(picked.length).toBe(1);
    expect(picked[0].id).toBe("x0");
  });

  it("should score compact_grid better than single_row on a square terrain due to shapeCompactness", () => {
    // Generate candidates for 32 BESS and 4 PCS
    const pcsCount = 4;
    
    // We mock a single_row candidate and a compact_grid candidate
    // Place all equipment within a large square so insidePolygon is 25 for both
    const singleRowCandidate: SmartSiteFitCandidate = {
      ...emptyCandidate,
      id: "single-row",
      shape: {
        id: "single_row",
        kind: "single_row",
        label: "Fila Única",
        description: "Fila única de contenedores",
        rows: pcsCount,
        columns: 8,
        blocks: pcsCount,
        pcsPlacement: "end",
      },
      placedEquipment: [
        // Placed in a single extremely long row along X
        { id: "pcs1", equipmentSpecId: "sungrow-sc5000ud-mv-us-p3", anchor: { lng: -70.0001, lat: -33 }, rotation_deg: 0, sourceReliability: "preliminary_assumption" as const },
        ...Array.from({ length: 8 }).map((_, i) => ({
          id: `bess-${i}`,
          equipmentSpecId: "sungrow-st2752ux-us",
          anchor: { lng: -70.0001 + 0.0001 * (i + 1), lat: -33 },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption" as const,
        }))
      ]
    };

    const compactGridCandidate: SmartSiteFitCandidate = {
      ...emptyCandidate,
      id: "compact-grid",
      shape: {
        id: "compact_grid",
        kind: "compact_grid",
        label: "Matriz Compacta",
        description: "Matriz compacta",
        rows: 4,
        columns: 8,
        blocks: 1,
        pcsPlacement: "side",
      },
      placedEquipment: [
        // Placed in 4 rows of 8 BESS
        { id: "pcs1", equipmentSpecId: "sungrow-sc5000ud-mv-us-p3", anchor: { lng: -70, lat: -33.0001 }, rotation_deg: 0, sourceReliability: "preliminary_assumption" as const },
        ...Array.from({ length: 8 }).map((_, i) => ({
          id: `bess-${i}`,
          equipmentSpecId: "sungrow-st2752ux-us",
          anchor: { lng: -70 + 0.00002 * (i % 4), lat: -33 + 0.00002 * Math.floor(i / 4) },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption" as const,
        }))
      ]
    };

    // Calculate score
    const scoreSingle = scoreCandidate(singleRowCandidate, square, anchor, 4);
    const scoreCompact = scoreCandidate(compactGridCandidate, square, anchor, 4);

    expect(scoreCompact.shapeCompactness).toBeDefined();
    expect(scoreSingle.shapeCompactness).toBeDefined();
    expect(scoreCompact.shapeCompactness).toBeGreaterThan(scoreSingle.shapeCompactness!);
  });

  it("should reward clustered PCS and penalize a detached PCS wall (pcsIntegration)", () => {
    // Helper: build placed equipment at an exact local position.
    const at = (
      x_m: number,
      y_m: number,
      spec: string,
      blockId: string
    ) => ({
      id: `${spec}-${x_m}-${y_m}`,
      equipmentSpecId: spec,
      anchor: toLngLat({ x_m, y_m }, anchor),
      rotation_deg: 0,
      blockId,
      groupId: blockId,
      sourceReliability: "preliminary_assumption" as const,
    });

    const BESS = "sungrow-st2752ux-us";
    const PCS = "sungrow-sc5000ud-mv-us-p3";

    // Clustered: each PCS sits right next to its own block of BESS.
    const clustered: SmartSiteFitCandidate = {
      ...emptyCandidate,
      id: "clustered",
      placedEquipment: [
        at(-20, 0, BESS, "block-0"),
        at(-10, 0, BESS, "block-0"),
        at(-5, 0, PCS, "block-0"),
        at(10, 0, BESS, "block-1"),
        at(20, 0, BESS, "block-1"),
        at(25, 0, PCS, "block-1"),
      ],
    };

    // Detached "wall": all PCS lined up far from any BESS.
    const wall: SmartSiteFitCandidate = {
      ...emptyCandidate,
      id: "wall",
      placedEquipment: [
        at(-20, 0, BESS, "block-0"),
        at(-10, 0, BESS, "block-0"),
        at(10, 0, BESS, "block-1"),
        at(20, 0, BESS, "block-1"),
        at(-5, 45, PCS, "block-0"),
        at(5, 45, PCS, "block-1"),
      ],
    };

    const scoreClustered = scoreCandidate(clustered, square, anchor, 4);
    const scoreWall = scoreCandidate(wall, square, anchor, 4);

    expect(scoreClustered.pcsIntegration).toBeDefined();
    expect(scoreWall.pcsIntegration).toBeDefined();
    expect(scoreClustered.pcsIntegration!).toBeGreaterThan(scoreWall.pcsIntegration!);
  });

  it("should favor a wide layout on a wide terrain (terrainFit)", () => {
    // Wide terrain: 200m wide x 40m deep.
    const wideTerrain: LocalPoint[] = [
      { x_m: -100, y_m: -20 },
      { x_m: 100, y_m: -20 },
      { x_m: 100, y_m: 20 },
      { x_m: -100, y_m: 20 },
    ];
    const BESS = "sungrow-st2752ux-us";
    const at = (x_m: number, y_m: number) => ({
      id: `b-${x_m}-${y_m}`,
      equipmentSpecId: BESS,
      anchor: toLngLat({ x_m, y_m }, anchor),
      rotation_deg: 0,
      blockId: "block-0",
      groupId: "block-0",
      sourceReliability: "preliminary_assumption" as const,
    });

    // Wide layout (spread along x)
    const wideLayout: SmartSiteFitCandidate = {
      ...emptyCandidate,
      id: "wide",
      shape: {
        id: "wide_grid",
        kind: "wide_grid",
        label: "Matriz Ancha",
        description: "wide",
        rows: 1,
        columns: 6,
        blocks: 1,
        pcsPlacement: "side",
      },
      placedEquipment: [at(-60, 0), at(-36, 0), at(-12, 0), at(12, 0), at(36, 0), at(60, 0)],
    };

    // Deep layout (spread along y)
    const deepLayout: SmartSiteFitCandidate = {
      ...emptyCandidate,
      id: "deep",
      shape: {
        id: "deep_grid",
        kind: "deep_grid",
        label: "Matriz Profunda",
        description: "deep",
        rows: 6,
        columns: 1,
        blocks: 1,
        pcsPlacement: "side",
      },
      placedEquipment: [at(0, -10), at(0, -6), at(0, -2), at(0, 2), at(0, 6), at(0, 10)],
    };

    const scoreWide = scoreCandidate(wideLayout, wideTerrain, anchor, 4);
    const scoreDeep = scoreCandidate(deepLayout, wideTerrain, anchor, 4);

    expect(scoreWide.terrainFit).toBeDefined();
    expect(scoreWide.terrainFit!).toBeGreaterThan(scoreDeep.terrainFit!);
  });
});

