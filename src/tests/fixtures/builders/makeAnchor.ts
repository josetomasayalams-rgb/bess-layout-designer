import type { ProjectAnchor } from "@/types/geometry";

/**
 * Default anchor — Santiago, Chile.
 *
 * Matches `DEFAULT_CONCEPTUAL_LAYOUT_POINT` from
 * `src/store/projectStore.types.ts`. Pure data, no store side effects.
 */
export const DEFAULT_ANCHOR: ProjectAnchor = {
  lng0: -70.6483,
  lat0: -33.4569,
};

/** Build a `ProjectAnchor` for tests with optional overrides. */
export function makeAnchor(overrides: Partial<ProjectAnchor> = {}): ProjectAnchor {
  return { ...DEFAULT_ANCHOR, ...overrides };
}
