/**
 * projectStore.history — undo/redo history helpers, extracted from
 * `projectStore.ts` in Phase 12B (commit `phase12b.2`).
 *
 * Why this exists
 * ---------------
 * The undo/redo subsystem is invoked in three places inside
 * `projectStore.ts`:
 *   - `recordHistory(state)` is spread into every mutating action that
 *     should be undoable (~20 sites).
 *   - `snapshotOf(state)` is called directly by `undo()` and `redo()`
 *     to push the *current* state onto the opposite stack before
 *     restoring the popped snapshot.
 *   - `HISTORY_LIMIT` caps both `past` and `future` arrays at 5 entries.
 *
 * Pulling them into their own module lets the upcoming slice files
 * (`polygonSlice`, `equipmentSlice`, …) reuse them without depending
 * on the `projectStore.ts` composition root, and lets the eventual
 * `lifecycleSlice` (which owns `undo`/`redo`) own the history stacks
 * cleanly.
 *
 * Public surface preserved
 * ------------------------
 * `HISTORY_LIMIT`, `snapshotOf`, and `recordHistory` are *internal*
 * helpers — never exported from `@/store/projectStore` and not
 * imported by any consumer outside `src/store/`. The relocation is
 * therefore zero-impact on the public API contract pinned by
 * `projectStore.contract.test.ts`.
 *
 * Type-safety strategy
 * --------------------
 * The original helpers were typed against the local `ProjectState`
 * type that still lives in `projectStore.ts` (slicing of the state
 * type itself is postponed to `phase12b.3+`). To avoid a circular
 * dependency back into `projectStore.ts`, the helpers are now typed
 * structurally against:
 *
 *   - `ProjectSnapshot` (already exported by `projectStore.types.ts`),
 *     which is the set of fields `snapshotOf` reads.
 *   - `HistoryStacks` (declared here), which is the `{ past, future }`
 *     pair `recordHistory` reads and writes.
 *
 * `ProjectState` in `projectStore.ts` already extends both of these
 * (it has all `ProjectSnapshot` fields plus `past: ProjectSnapshot[]`
 * and `future: ProjectSnapshot[]`), so every existing call site
 * continues to type-check unchanged.
 *
 * Import discipline
 * -----------------
 * This file imports ONLY from `./projectStore.types`. It does NOT
 * import from `./projectStore` (would create a cycle) and does NOT
 * import `useProjectStore` (would defeat the purpose of extraction).
 */

import type { ProjectSnapshot } from "./projectStore.types";

/** How many undo steps (and redo steps) are remembered. */
export const HISTORY_LIMIT = 5;

/** The undo/redo stacks consumed and produced by `recordHistory`. */
export type HistoryStacks = {
  past: ProjectSnapshot[];
  future: ProjectSnapshot[];
};

/** Build a `ProjectSnapshot` from the undoable subset of any larger state. */
export function snapshotOf(state: ProjectSnapshot): ProjectSnapshot {
  return {
    anchor: state.anchor,
    polygon: state.polygon,
    placedEquipment: state.placedEquipment,
    cableRoutes: state.cableRoutes,
    accessRoads: state.accessRoads,
  };
}

/** Push the current state onto the undo stack and clear the redo stack. */
export function recordHistory(
  state: ProjectSnapshot & HistoryStacks,
): HistoryStacks {
  return {
    past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
    future: [],
  };
}
