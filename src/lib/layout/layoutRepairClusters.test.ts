import { describe, it, expect } from "vitest";
import {
  buildRepairClusters,
  clusterIdByNode,
  multiNodeMovableClusterCount,
  scoreRepairCandidate,
  type ClusterableNode,
  type RepairCandidateMetrics,
} from "./layoutRepairClusters";

function node(
  groupKey: string | null,
  x: number,
  y: number,
  overrides: Partial<ClusterableNode> = {}
): ClusterableNode {
  return {
    groupKey,
    kind: "battery",
    movable: true,
    center: { x_m: x, y_m: y },
    origin: { x_m: x, y_m: y },
    radius_m: 5,
    ...overrides,
  };
}

describe("buildRepairClusters", () => {
  it("groups nodes that share a groupKey into one rigid cluster", () => {
    const nodes = [
      node("block-1", 0, 0),
      node("block-1", 10, 0),
      node("block-2", 100, 0),
    ];
    const clusters = buildRepairClusters(nodes);
    expect(clusters).toHaveLength(2);
    const block1 = clusters.find((c) => c.id === "block-1")!;
    expect(block1.nodeIndices).toEqual([0, 1]);
    expect(block1.bessCount).toBe(2);
    expect(block1.centroid.x_m).toBeCloseTo(5);
  });

  it("treats nodes without a groupKey as singleton clusters", () => {
    const nodes = [node(null, 0, 0), node(null, 50, 0)];
    const clusters = buildRepairClusters(nodes);
    expect(clusters).toHaveLength(2);
    expect(clusters.every((c) => c.nodeIndices.length === 1)).toBe(true);
    expect(clusters.map((c) => c.id).sort()).toEqual(["single:0", "single:1"]);
  });

  it("marks a cluster movable only when every member is movable", () => {
    const nodes = [
      node("block-1", 0, 0, { movable: true }),
      node("block-1", 10, 0, { movable: false }),
    ];
    const clusters = buildRepairClusters(nodes);
    expect(clusters[0].movable).toBe(false);
  });

  it("counts equipment kinds per cluster", () => {
    const nodes = [
      node("block-1", 0, 0, { kind: "battery" }),
      node("block-1", 10, 0, { kind: "battery" }),
      node("block-1", 5, 10, { kind: "pcs" }),
    ];
    const [cluster] = buildRepairClusters(nodes);
    expect(cluster.bessCount).toBe(2);
    expect(cluster.pcsCount).toBe(1);
    expect(cluster.otherCount).toBe(0);
  });
});

describe("clusterIdByNode", () => {
  it("maps each node index to its cluster id", () => {
    const nodes = [node("block-1", 0, 0), node("block-1", 10, 0), node(null, 99, 0)];
    const clusters = buildRepairClusters(nodes);
    const ids = clusterIdByNode(nodes, clusters);
    expect(ids[0]).toBe("block-1");
    expect(ids[1]).toBe("block-1");
    expect(ids[2]).toBe("single:2");
  });
});

describe("multiNodeMovableClusterCount", () => {
  it("counts only movable clusters with two or more members", () => {
    const nodes = [
      node("block-1", 0, 0),
      node("block-1", 10, 0),
      node("block-2", 100, 0, { movable: false }),
      node("block-2", 110, 0, { movable: false }),
      node(null, 200, 0),
    ];
    const clusters = buildRepairClusters(nodes);
    expect(multiNodeMovableClusterCount(clusters)).toBe(1);
  });
});

describe("scoreRepairCandidate", () => {
  const baseMetrics: RepairCandidateMetrics = {
    collisions: 0,
    outsideCount: 0,
    minSpacingViolations: 0,
    boundaryViolations: 0,
    totalDisplacementM: 0,
    avgPcsToBessM: 0,
    movableBboxAreaM2: 0,
    clusterShapePreserved: 1,
  };

  it("prefers the candidate with fewer critical violations", () => {
    const fewerCritical = scoreRepairCandidate({ ...baseMetrics, outsideCount: 0 });
    const moreCritical = scoreRepairCandidate({ ...baseMetrics, outsideCount: 1 });
    expect(fewerCritical.total).toBeGreaterThan(moreCritical.total);
  });

  it("penalizes collisions more than minimum-spacing violations", () => {
    const withCollision = scoreRepairCandidate({ ...baseMetrics, collisions: 1 });
    const withSpacing = scoreRepairCandidate({ ...baseMetrics, minSpacingViolations: 1 });
    expect(withSpacing.total).toBeGreaterThan(withCollision.total);
  });

  it("penalizes larger displacement", () => {
    const small = scoreRepairCandidate({ ...baseMetrics, totalDisplacementM: 1 });
    const large = scoreRepairCandidate({ ...baseMetrics, totalDisplacementM: 1000 });
    expect(small.total).toBeGreaterThan(large.total);
  });

  it("rewards preserving cluster shape", () => {
    const preserved = scoreRepairCandidate({ ...baseMetrics, clusterShapePreserved: 1 });
    const broken = scoreRepairCandidate({ ...baseMetrics, clusterShapePreserved: 0 });
    expect(preserved.total).toBeGreaterThan(broken.total);
  });

  it("penalizes PCS/MV that drift far from their BESS group", () => {
    const near = scoreRepairCandidate({ ...baseMetrics, avgPcsToBessM: 10 });
    const far = scoreRepairCandidate({ ...baseMetrics, avgPcsToBessM: 300 });
    expect(near.total).toBeGreaterThan(far.total);
  });

  it("exposes the raw violation breakdown for diagnostics", () => {
    const score = scoreRepairCandidate({
      ...baseMetrics,
      collisions: 2,
      outsideCount: 1,
      minSpacingViolations: 3,
      boundaryViolations: 4,
    });
    expect(score.collisions).toBe(2);
    expect(score.outsideCount).toBe(1);
    expect(score.minSpacingViolations).toBe(3);
    expect(score.boundaryViolations).toBe(4);
    expect(score.criticalViolations).toBe(3);
  });
});
