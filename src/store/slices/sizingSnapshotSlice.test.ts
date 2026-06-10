/**
 * sizingSnapshotSlice — save / remove / rename / clear lifecycle plus the
 * two-slot comparison selection. Snapshots are captured only from an applied
 * SmartSiteFit result and never participate in undo history.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import type { PlacedEquipment } from "@/types/equipment";
import type { SmartSiteFitAppliedMetadata } from "@/store/projectStore.types";
import { resetProjectStore } from "./_testHelpers";

const BESS_ID =
  equipmentCatalog.find((s) => s.type === "battery_container")!.id;

const APPLIED: SmartSiteFitAppliedMetadata = {
  mode: "target",
  strategy: "balanced",
  score: 75,
  bessCount: 1,
  pcsCount: 0,
  ratio: 0,
  assumptions: [],
  appliedAt: "2026-06-03T00:00:00.000Z",
};

function place(i: number): PlacedEquipment {
  return {
    id: `bess-${i}`,
    equipmentSpecId: BESS_ID,
    anchor: { lng: -70, lat: -33 },
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
  };
}

function seedApplied(): void {
  useProjectStore.setState({
    placedEquipment: [place(0)],
    smartSiteFitApplied: APPLIED,
  });
}

beforeEach(resetProjectStore);

describe("sizingSnapshotSlice — saveSizingSnapshot", () => {
  it("adds a snapshot with id, name and timestamp when a result is applied", () => {
    seedApplied();
    useProjectStore.getState().saveSizingSnapshot("Base");

    const list = useProjectStore.getState().sizingSnapshots;
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Base");
    expect(typeof list[0].id).toBe("string");
    expect(new Date(list[0].createdAt).toString()).not.toBe("Invalid Date");
  });

  it("is a no-op when no SmartSiteFit result has been applied", () => {
    useProjectStore.setState({ placedEquipment: [place(0)] });
    useProjectStore.getState().saveSizingSnapshot("Ghost");
    expect(useProjectStore.getState().sizingSnapshots).toHaveLength(0);
  });

  it("is a no-op when applied metadata exists but no equipment is placed", () => {
    useProjectStore.setState({ placedEquipment: [], smartSiteFitApplied: APPLIED });
    useProjectStore.getState().saveSizingSnapshot("Empty");
    expect(useProjectStore.getState().sizingSnapshots).toHaveLength(0);
  });

  it("falls back to a generated name when the name is blank", () => {
    seedApplied();
    useProjectStore.getState().saveSizingSnapshot("   ");
    expect(useProjectStore.getState().sizingSnapshots[0].name).toMatch(
      /Predimensionamiento/
    );
  });

  it("accumulates multiple saves in insertion order", () => {
    seedApplied();
    useProjectStore.getState().saveSizingSnapshot("First");
    useProjectStore.getState().saveSizingSnapshot("Second");
    const list = useProjectStore.getState().sizingSnapshots;
    expect(list.map((s) => s.name)).toEqual(["First", "Second"]);
  });

  it("does not push undo history", () => {
    seedApplied();
    useProjectStore.getState().saveSizingSnapshot("Base");
    expect(useProjectStore.getState().past).toHaveLength(0);
  });
});

describe("sizingSnapshotSlice — removeSizingSnapshot", () => {
  it("removes the matching snapshot", () => {
    seedApplied();
    useProjectStore.getState().saveSizingSnapshot("A");
    useProjectStore.getState().saveSizingSnapshot("B");
    const firstId = useProjectStore.getState().sizingSnapshots[0].id;

    useProjectStore.getState().removeSizingSnapshot(firstId);
    const list = useProjectStore.getState().sizingSnapshots;
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("B");
  });

  it("clears a compare slot that referenced the removed id", () => {
    seedApplied();
    useProjectStore.getState().saveSizingSnapshot("A");
    const id = useProjectStore.getState().sizingSnapshots[0].id;
    useProjectStore.getState().setSizingCompareSlot("A", id);

    useProjectStore.getState().removeSizingSnapshot(id);
    expect(useProjectStore.getState().sizingCompare.A).toBeNull();
  });

  it("is silent for an unknown id", () => {
    seedApplied();
    useProjectStore.getState().saveSizingSnapshot("A");
    useProjectStore.getState().removeSizingSnapshot("nope");
    expect(useProjectStore.getState().sizingSnapshots).toHaveLength(1);
  });
});

describe("sizingSnapshotSlice — renameSizingSnapshot", () => {
  it("updates the name of the matching snapshot", () => {
    seedApplied();
    useProjectStore.getState().saveSizingSnapshot("Old");
    const id = useProjectStore.getState().sizingSnapshots[0].id;

    useProjectStore.getState().renameSizingSnapshot(id, "New");
    expect(useProjectStore.getState().sizingSnapshots[0].name).toBe("New");
  });

  it("keeps the previous name when the new name is blank", () => {
    seedApplied();
    useProjectStore.getState().saveSizingSnapshot("Keep");
    const id = useProjectStore.getState().sizingSnapshots[0].id;
    useProjectStore.getState().renameSizingSnapshot(id, "  ");
    expect(useProjectStore.getState().sizingSnapshots[0].name).toBe("Keep");
  });
});

describe("sizingSnapshotSlice — selection and clear", () => {
  it("sets and clears compare slots", () => {
    seedApplied();
    useProjectStore.getState().saveSizingSnapshot("A");
    const id = useProjectStore.getState().sizingSnapshots[0].id;

    useProjectStore.getState().setSizingCompareSlot("B", id);
    expect(useProjectStore.getState().sizingCompare.B).toBe(id);

    useProjectStore.getState().setSizingCompareSlot("B", null);
    expect(useProjectStore.getState().sizingCompare.B).toBeNull();
  });

  it("clears all snapshots and both slots", () => {
    seedApplied();
    useProjectStore.getState().saveSizingSnapshot("A");
    useProjectStore.getState().saveSizingSnapshot("B");
    const [a, b] = useProjectStore.getState().sizingSnapshots;
    useProjectStore.getState().setSizingCompareSlot("A", a.id);
    useProjectStore.getState().setSizingCompareSlot("B", b.id);

    useProjectStore.getState().clearSizingSnapshots();
    const s = useProjectStore.getState();
    expect(s.sizingSnapshots).toHaveLength(0);
    expect(s.sizingCompare.A).toBeNull();
    expect(s.sizingCompare.B).toBeNull();
  });
});
