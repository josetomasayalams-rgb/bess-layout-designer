/**
 * sizingSnapshotSlice — saved sizing snapshots ("predimensionamientos").
 *
 * Owns the list of captured snapshots plus the two-slot selection used by the
 * sizing comparator. A snapshot is captured from the currently APPLIED
 * SmartSiteFit result (`smartSiteFitApplied` + `placedEquipment`); saving with
 * no applied result is a no-op. Snapshots are session-only and deliberately do
 * NOT participate in undo/redo history.
 *
 * Import discipline: imports only external dependencies, `../projectStore.types`,
 * and pure `@/lib/sizing` helpers. It does not import from `../projectStore`.
 */

import { nanoid } from "nanoid";
import type { StoreApi } from "zustand";
import {
  emptySizingCompareSlots,
  type ProjectState,
} from "../projectStore.types";
import { buildSizingSnapshot } from "@/lib/sizing/sizingSnapshot";

export type SizingSnapshotSlice = {
  sizingSnapshots: ProjectState["sizingSnapshots"];
  sizingCompare: ProjectState["sizingCompare"];

  saveSizingSnapshot: ProjectState["saveSizingSnapshot"];
  removeSizingSnapshot: ProjectState["removeSizingSnapshot"];
  renameSizingSnapshot: ProjectState["renameSizingSnapshot"];
  clearSizingSnapshots: ProjectState["clearSizingSnapshots"];
  setSizingCompareSlot: ProjectState["setSizingCompareSlot"];
};

export function createSizingSnapshotSlice(
  set: StoreApi<ProjectState>["setState"]
): SizingSnapshotSlice {
  return {
    sizingSnapshots: [],
    sizingCompare: emptySizingCompareSlots,

    saveSizingSnapshot: (name) =>
      set((state) => {
        const { placedEquipment, smartSiteFitApplied } = state;
        // Source restricted to applied SmartSiteFit results (decision: MVP
        // scope). Reads happen inside the updater so the captured equipment and
        // the snapshot index stay consistent with the committed state.
        if (!smartSiteFitApplied || placedEquipment.length === 0) return {};

        const trimmed = name.trim();
        const finalName =
          trimmed.length > 0
            ? trimmed
            : `Predimensionamiento ${state.sizingSnapshots.length + 1}`;
        const snapshot = buildSizingSnapshot({
          id: nanoid(8),
          name: finalName,
          createdAt: new Date().toISOString(),
          placedEquipment,
          strategy: smartSiteFitApplied.strategy,
          mode: smartSiteFitApplied.mode,
          score: smartSiteFitApplied.score,
        });
        return { sizingSnapshots: [...state.sizingSnapshots, snapshot] };
      }),

    removeSizingSnapshot: (id) =>
      set((state) => ({
        sizingSnapshots: state.sizingSnapshots.filter((s) => s.id !== id),
        sizingCompare: {
          A: state.sizingCompare.A === id ? null : state.sizingCompare.A,
          B: state.sizingCompare.B === id ? null : state.sizingCompare.B,
        },
      })),

    renameSizingSnapshot: (id, name) =>
      set((state) => ({
        sizingSnapshots: state.sizingSnapshots.map((s) =>
          s.id === id ? { ...s, name: name.trim() || s.name } : s
        ),
      })),

    clearSizingSnapshots: () =>
      set({ sizingSnapshots: [], sizingCompare: emptySizingCompareSlots }),

    setSizingCompareSlot: (slot, id) =>
      set((state) => ({
        sizingCompare: { ...state.sizingCompare, [slot]: id },
      })),
  };
}
