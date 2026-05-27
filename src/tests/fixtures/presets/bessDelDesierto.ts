import { bessDelDesiertoCaseStudy } from "@/data/projectCaseStudies/bessDelDesierto";

/**
 * Re-export the real BESS del Desierto case study under the fixtures
 * namespace so test code can import a single barrel. This is the
 * canonical reference dataset for the report and electrical pipeline.
 *
 * Tests that need to mutate it should clone via `structuredClone`.
 */
export function bessDelDesiertoPreset() {
  return bessDelDesiertoCaseStudy;
}
