# Phase 14.0 — Baseline Coverage

## Metadata

- **Date**: 2026-05-27
- **Branch**: `chore/phase-14-testing-hardening`
- **Base commit (main)**: `cef7ee7` (Merge PR #6 — Phase 13 documentation)
- **Tool**: Vitest 4.1.6 + `@vitest/coverage-v8` 4.1.7
- **Command**: `npm run test:coverage`
- **Test files**: 74 passed (491/491 tests)

## Global summary

| Metric     | Covered / Total | Percent |
|------------|-----------------|---------|
| Statements | 3882 / 5635     | 68.89 % |
| Branches   | 2784 / 5429     | 51.28 % |
| Functions  | 1046 / 1618     | 64.64 % |
| Lines      | 3432 / 4837     | 70.95 % |

> **Thresholds are intentionally absent** (informative only). Promotion of
> coverage thresholds to blocking CI gates is deferred to **Phase 15**.
> Phase 14 only establishes the baseline so regressions become visible.

## Coverage by area (top-level)

| Area                       | Statements | Branches | Notes |
|----------------------------|------------|----------|-------|
| `src/lib/geometry`         | 92.18 %    | 81.48 %  | Mature — keep as reference |
| `src/lib/layout`           | 93.04 %    | 80.22 %  | Mature |
| `src/lib/electrical`       | 88.25 %    | 76.08 %  | Solid |
| `src/rules`                | 94.38 %    | 87.23 %  | Mature |
| `src/data/catalogs`        | 82.35 %    | 52.27 %  | Adapter branches missing |
| `src/data/projectCaseStudies` | 98.46 % | 100 %    | Mature |
| `src/lib/report`           | 72.63 %    | 65.54 %  | `captureMap`, `downloadTechnicalReport`, `reverseGeocode` are gaps |
| `src/lib/sizing`           | 82.57 %    | 71.96 %  | `preliminarySizing` partial |
| `src/lib/terrain`          | 76.11 %    | 64.28 %  | OK |
| `src/lib/units`            | 55.00 %    | 64.51 %  | `conversions` 40 % — gap |
| `src/lib`                  | 38.86 %    | 36.36 %  | `bessArrayGenerator` 0 %, `i18n` 16 % — gaps |
| `src/store`                | 53.24 %    | 35.41 %  | `regulatoryStore` 28 %, `uiStore` 49 % |
| `src/store/slices`         | 39.81 %    | 30.89 %  | Major gap — addressed by 14.2 |
| `src/components/map`       | mixed      | mixed    | `OrientationCube`, `BaseMapSelector`, `CoordinateSearch`, `LayoutEditToolbar`, `LayerManagerPanel` all at 0 % — addressed by 14.6 |
| `src/components/report` PDF modules | mixed | mixed | `pdfPrimitives` 0 %, `pdfElectricalRegulatorySections` 34 %, `pdfChrome` 55 % — addressed by 14.7 |
| `src/components/sidebar`   | mixed      | mixed    | Several panels untested — addressed by 14.5 |

## Key gaps targeted by later Phase 14 sub-phases

| Sub-phase | Target area | Reason |
|-----------|-------------|--------|
| 14.2 | `src/store/slices/*`, `src/store/regulatoryStore` | Most under-tested store surface after Phase 12B extraction |
| 14.3 | `src/lib/report/captureMap`, `downloadTechnicalReport`, `reverseGeocode` | 0 % / 21 % coverage |
| 14.4 | `src/lib/bessArrayGenerator`, `src/lib/i18n`, `src/lib/units/conversions`, `src/lib/layout/repairLayoutToSite`, `src/lib/layout/projectMetrics` | Low or 0 % coverage |
| 14.5 | `WarningsPanel`, `ProjectSummaryPanel`, `EquipmentCatalogPanel`, `TechnicalReportPanel`, `CaseStudyPanel` | Sidebar visibility / interactivity |
| 14.6 | `OrientationCube`, `BaseMapSelector`, `CoordinateSearch`, `LayoutEditToolbar`, `LayerManagerPanel` | 0 % each |
| 14.7 | `pdfChrome`, `pdfProjectSections`, `pdfElectricalRegulatorySections`, `pdfTraceabilityScopeSections`, `pdfPrimitives` | Structural snapshots |

## Excludes

The following are excluded from coverage by design (see `vitest.config.ts`):

- `src/**/*.test.{ts,tsx}` — test files themselves
- `src/**/*.d.ts` — type declarations only
- `src/types/**` — pure type modules
- `src/app/**` — Next.js framework entry points
- `src/tests/**` — fixtures, mocks, helpers
- `**/*.config.*` — config files
- `**/node_modules/**`

## CI integration

The new workflow `.github/workflows/ci.yml` runs lint, typecheck, test, build,
and then coverage as a **non-blocking** step (`continue-on-error: true`).
Coverage HTML/LCOV reports are uploaded as an artifact named `coverage-report`
with 14-day retention.
