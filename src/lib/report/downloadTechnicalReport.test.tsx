/**
 * Phase 14.3 — `downloadTechnicalReportPdf` smoke test.
 *
 * The function is a thin orchestrator that:
 *   1. Validates the project (polygon ≥ 3) — throws otherwise.
 *   2. Captures the map (helper covered by `captureMap.test.ts`).
 *   3. Reverse-geocodes if requested (helper covered by
 *      `reverseGeocode.test.ts`).
 *   4. Runs the regulatory validation pipeline (covered by its own
 *      tests in `src/rules/`).
 *   5. Calls `buildReportData()` (covered by `buildReportData.test.ts`).
 *   6. Hands the result to `@react-pdf/renderer` and saves the blob.
 *
 * Trying to exercise step 6 end-to-end requires a full PDF renderer.
 * That is covered structurally by `ReportDocument.snapshot.test.tsx` and
 * by the Phase 14.7 PDF section tests. This file pins the pre-render
 * guard so the documented behaviour ("polygon < 3 → throw") cannot
 * regress.
 */

import { afterEach, describe, expect, it } from "vitest";
import { downloadTechnicalReportPdf } from "./downloadTechnicalReport";
import { useProjectStore } from "@/store/projectStore";

const SNAPSHOT = useProjectStore.getState();

afterEach(() => {
  useProjectStore.setState({
    polygon: SNAPSHOT.polygon,
    anchor: SNAPSHOT.anchor,
    placedEquipment: SNAPSHOT.placedEquipment,
  });
});

describe("downloadTechnicalReportPdf — pre-render guards", () => {
  it("throws when the project has no polygon (es)", async () => {
    useProjectStore.setState({ polygon: [], anchor: null });
    await expect(
      downloadTechnicalReportPdf({ locale: "es" })
    ).rejects.toThrow(/terreno/i);
  });

  it("throws when the project has no polygon (en)", async () => {
    useProjectStore.setState({ polygon: [], anchor: null });
    await expect(
      downloadTechnicalReportPdf({ locale: "en" })
    ).rejects.toThrow(/terrain/i);
  });

  it("throws when the polygon has only 1 vertex", async () => {
    useProjectStore.setState({
      polygon: [{ lng: -70, lat: -33 }],
      anchor: { lng0: -70, lat0: -33 },
    });
    await expect(
      downloadTechnicalReportPdf({ locale: "es" })
    ).rejects.toThrow();
  });
});
