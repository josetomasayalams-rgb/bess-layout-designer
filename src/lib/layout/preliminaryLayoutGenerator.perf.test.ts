/**
 * Phase 14.8 — Informative performance benchmark for
 * `generatePreliminaryLayout`.
 *
 * Goal: capture an order-of-magnitude baseline that future PRs can
 * compare against. NOT a hard threshold — JSDOM + cold-start JIT make
 * those flaky across hardware.
 *
 * Baseline expectations (recorded in
 * docs/phases/phase14-performance-baseline.md):
 *   - 100 containers / 25 PCS  →  < 500 ms warm-cache
 *   - 400 containers / 100 PCS →  < 2000 ms warm-cache
 *
 * Limits chosen here are deliberately permissive (10× expected) so the
 * benchmark only flags catastrophic regressions, not minor jitter.
 */

import { describe, expect, it } from "vitest";
import { generatePreliminaryLayout } from "./preliminaryLayoutGenerator";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { makeAnchor, makePolygon } from "@/tests/fixtures";

const BESS_SPEC = equipmentCatalog.find((s) => s.type === "battery_container");
const PCS_SPEC = equipmentCatalog.find((s) => s.type === "pcs_mv_station");

describe("generatePreliminaryLayout — perf baseline", () => {
  it("100 containers / 25 PCS finishes within 5 s (informative)", () => {
    if (!BESS_SPEC || !PCS_SPEC) {
      // Catalog shape changed — skip rather than fail.
      return;
    }
    const anchor = makeAnchor();
    const t0 = performance.now();
    const result = generatePreliminaryLayout({
      batteryContainerSpecId: BESS_SPEC.id,
      pcsSpecId: PCS_SPEC.id,
      batteryContainerCount: 100,
      pcsCount: 25,
      containersPerPcs: 4,
      anchor,
      startPoint: { lng: anchor.lng0, lat: anchor.lat0 },
      polygon: makePolygon({ anchor, width_m: 2000, height_m: 1000 }),
      rules: {
        bessToBess_m: 3,
        bessToPropertyLine_m: 5,
        electricalFrontWorkingClearance_m: 0.9,
        transformerToBessRecommended_m: 3,
      },
      fitInsidePolygon: true,
    });
    const elapsed = performance.now() - t0;
    console.log(
      `[perf] generatePreliminaryLayout(100 containers / 25 PCS): ${elapsed.toFixed(1)} ms`
    );
    // Permissive ceiling — only catches order-of-magnitude regressions.
    expect(elapsed).toBeLessThan(5_000);
    expect(["success", "error"]).toContain(result.status);
  });

  it(
    "400 containers / 100 PCS finishes within 30 s (informative)",
    () => {
      if (!BESS_SPEC || !PCS_SPEC) return;
      const anchor = makeAnchor();
      const t0 = performance.now();
      generatePreliminaryLayout({
        batteryContainerSpecId: BESS_SPEC.id,
        pcsSpecId: PCS_SPEC.id,
        batteryContainerCount: 400,
        pcsCount: 100,
        containersPerPcs: 4,
        anchor,
        startPoint: { lng: anchor.lng0, lat: anchor.lat0 },
        polygon: makePolygon({ anchor, width_m: 4000, height_m: 2000 }),
        rules: {
          bessToBess_m: 3,
          bessToPropertyLine_m: 5,
          electricalFrontWorkingClearance_m: 0.9,
          transformerToBessRecommended_m: 3,
        },
        fitInsidePolygon: true,
      });
      const elapsed = performance.now() - t0;
      console.log(
        `[perf] generatePreliminaryLayout(400 containers / 100 PCS): ${elapsed.toFixed(1)} ms`
      );
      expect(elapsed).toBeLessThan(30_000);
    },
    35_000
  );
});
