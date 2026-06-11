# Changelog

All notable changes to **BESS Layout Designer** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The app is a **preliminary BESS predesign tool**. It does not certify
detailed electrical, civil, fire-protection or permitting engineering
(see `docs/exclusions.md`).

---

## [Unreleased]

### Notes

- `v1.0.0` final tag is gated on the human checklist in
  `docs/phases/phase15-release-candidate.md`.

---

## [v1.2 — Fire safety rules close-out] — 2026-06-10

Closes the fire-safety gap in the regulatory catalog using the project extraction
document (EXTRACCION_NFPA_UL_PAPERS_BESS.md, L5 secondary) as evidence.
Evidence class: `inferred` (secondary source — full NFPA 855 standard not licensed).
Maturity index: 18%/23% unchanged (inferred = yellow, not green); fire items move
from `assumption` → `inferred` (from "design guess" to "secondary-backed default").

### Added

- **8 RULE-FIRE entries** (006–013) in `regulatoryRulesCatalog.ts`:
  - RULE-FIRE-006: BESS-to-BESS 3 ft default (conservative 3 m in app)
  - RULE-FIRE-007: BESS-to-buildings 10 ft (3 m)
  - RULE-FIRE-008: BESS-to-property line 10 ft (3 m)
  - RULE-FIRE-009: BESS-to-egress route 10 ft (3 m)
  - RULE-FIRE-010: BESS-to-vegetation/combustibles 10 ft (3 m)
  - RULE-FIRE-011: HMA mandatory >600 kWh (NFPA 855 / IFC 1206)
  - RULE-FIRE-012: Max 50 kWh per ESS group without UL 9540A
  - RULE-FIRE-013: Perimeter fence ≥ 5 ft from BESS
  All evidence: `inferred` citing `INT-NFPA855-UL9540A-Extraction-2026`.
- **`INT-NFPA855-UL9540A-Extraction-2026`** in `documentRegistry.ts`:
  project extraction document (L5 secondary, NFPA 855 / IFC 1206 / UL 9540A).
- **12 fire items in `maturity_inventory.json`**: `assumption` → `inferred`
  (`known_state` + `state_source` citing EXTRACCION §2).

### Notes

- RULE-FIRE-011 has dual evidence: EXTRACCION §2 + UL one-pager (HMA submittal).
- Regulatory catalog: 5 fire rules → 13 fire rules.
- Full NFPA 855 primary standard still not licensed; `documented` (green) status
  for fire items requires purchase. Declared in §25 of E5-S01 informe.

---

## [v1.1 — Basic engineering close-out] — 2026-06-10

Deliberate contract change to the PDF report surface area (golden master updated):
9 → 17 disclaimers. Requires acknowledgment per `pdf-v1.0.test.tsx` design.

### Added

- **8 basic-engineering disclaimers** in the PDF (`ScopeSection`), wired via
  `buildReportData → copyFor(locale).reportIb.disclaimers`:
  `DISC-IB-SCOPE`, `DISC-IB-NODETAIL`, `DISC-IB-NOAPPROVAL`, `DISC-IB-NFPAUL`,
  `DISC-IB-OEM`, `DISC-IB-FIRE`, `DISC-IB-SEP` (FM Global Plan B footnote),
  `DISC-IB-MATURITY` (dual evidence index 18% / 23%).
  Both `en` and `es` locales. Source: `Reporte ing basica.md §8` + E4-S04.
- **HMA warning** (`hma_required_nfpa855`) in `bessValidationEngine`: emits a
  WARNING (not blocking) when placed BESS energy exceeds 600 kWh, per NFPA 855.
  ES localization wired in `compliance/helpers.ts`.
- **RULE-ELEC-018** in `regulatoryRulesCatalog`: documents that PCS 60 Hz
  variants are incompatible with the Chilean 50 Hz grid (RPTD 01 §4).
- **9 CEN/CNE/MINVU rules** updated: 8 `documented` + 1 `inferred` (E4-S03).
- **T6 target_norm fix**: `TRANSFORMER_TO_BESS_*_M` corrected from `"RIC 13"` to
  `"fabricante (OEM-DATASHEET) — sin norma directa"` in `maturity_inventory.json`.

### Changed

- Golden master `GOLDEN_MASTER_DISCLAIMER_IDS`: 9 → 17 entries.
- `defaultConstraints.test.ts`: disclaimer length assertions 9 → 17.
- 7 stale `"0,9 m"` strings updated to `"1,2 m"` across engine/catalog/helpers.

### Known pending (not in this release)

- T5: cable reactance `0.1215 Ω/km` is from a 60 Hz NEXANS datasheet; correct
  value for 50 Hz Chilean grid is ≈ `0.1013 Ω/km`. Fix requires coordinated
  change to `cableVoltageDrop.ts`, its test, `maturity_inventory.json` and
  re-baseline. Deferred.
- RULE-SEA/MMA/MIN environmental rules: still `missing`; candidate for a future
  environmental-rules session (same pattern as E4-S03).

---

## [1.0.0-rc.1] — 2026-05-27

First release candidate for `v1.0.0`. No new product features.
Repository moves from "feature-complete + tested + documented" to
"release-ready candidate" with metadata, hygiene, audits, golden
master, and human-only release path.

### Added

- `package.json` metadata block: `description`, `repository`, `bugs`,
  `homepage`, `keywords`, `engines.{node,npm}`, `license: UNLICENSED`,
  `author` (Phase 15.0).
- GitHub repo hygiene (Phase 15.1):
  - `.github/CODEOWNERS`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.{md,yml}`
  - `.github/dependabot.yml` (weekly npm + GHA; majors ignored for
    engine-heavy deps)
  - `SECURITY.md` (threat model, reporting flow)
  - `.github/workflows/release.yml` (manual-dispatch only, refuses
    to publish)
  - `.github/workflows/pr-validation.yml` (blocks `.env`, `coverage/`,
    > 1 MB binaries)
- v1.0 golden-master regression test
  (`src/tests/golden-masters/pdf-v1.0.{snapshot.ts,test.tsx}`,
  Phase 15.4): pins 11-page sequence, 9 disclaimers, 14 exclusions,
  electrical block presence, engineering checklist.

### Documentation

- `docs/phases/phase15-coherence-audit.md` (Phase 15.2) — code-vs-docs
  cross-check. No P0/P1 findings.
- `docs/phases/phase15-dependency-audit.md` (Phase 15.3) — runtime +
  dev vulnerability triage. 0 high/critical; 2 moderate
  (`postcss` nested under `next`) not exploitable in production.
- `docs/phases/phase15-performance-baseline.md` (Phase 15.5) —
  tooling timings, bundle size, soft budget for post-v1.
- `docs/phases/phase15-accessibility-audit.md` (Phase 15.6) —
  v1 a11y posture (P0=0, P1=0, P2=4 deferred to v1.1).
- `CHANGELOG.md` (this file) + `docs/release-readiness.md` (Phase 15.7).

### Changed

- `package.json` version: **0.1.0 → 1.0.0-rc.1** (Phase 15.8).
  Final `1.0.0` bump and `vX.Y.Z` git tag remain manual,
  human-only — see `docs/phases/phase15-release-candidate.md`.

### Security

- No vulnerabilities are exploitable in production. The two moderate
  PostCSS advisories flagged by `npm audit` apply only to the
  build-time CSS pipeline. The available `npm audit fix --force`
  would catastrophically downgrade Next.js; refused per Phase 15.3
  policy.

### Known limitations carried into v1.0

- The map view uses MapLibre GL JS on an HTML `<canvas>`; the
  rendered map is not directly accessible to screen readers
  (industry-wide canvas limitation). All numerical KPIs are
  available via accessible sidebar panels and the PDF report.
- `prefers-reduced-motion` is not yet honoured for Framer Motion
  transitions (P2 → v1.1).
- No axe-core automated WCAG sweep yet (P2 → v1.1; smoke-level
  a11y guard exists).
- Playwright e2e suite deferred to Phase 14B (separate PR).
- The report is **preliminary**. It does not perform load flow,
  short circuit, RMS/EMT stability, harmonics, grounding grid,
  arc flash, BIL, civil/geotechnical, hydrology, environmental
  permitting, or detailed HV interconnection studies (see
  `docs/exclusions.md` — 14 exclusion IDs pinned by the
  golden-master test).

---

## [0.x] — pre-v1 history (summarised)

The pre-v1 history is split across the merged PRs below. Each PR
landed as an atomic, validated change; per-PR detail lives in the
GitHub PR body and the `docs/phases/` folder.

### PR #7 — Phase 14 (Testing hardening) — merged into `main`

Coverage tooling + CI workflow; centralised fixtures and builders;
gap tests across store slices, regulatory store, report pipeline,
under-tested lib modules, top-priority sidebar panels, map
subcomponents; PDF structural snapshots; a11y smoke; performance
benchmark; Playwright deferred to v1B.

- Tests: 491 → 663.
- Coverage: Statements 68.89 % → 76.66 %, Branches 51.28 % →
  56.58 %, Functions 64.64 % → 74.49 %, Lines 70.95 % → 78.29 %.
- 51 files changed, +3675 / −124.

### PR #6 — Phase 13 (Final documentation) — merged

Documentation consolidation: `docs/README.md`, `docs/exclusions.md`,
`docs/defensibility.md`, `docs/developer-onboarding.md`,
`docs/agent-workflow.md`, plus updates to `docs/architecture.md`,
`docs/report-spec.md`, `docs/regulatory-traceability.md`. Archived
historical phase plans under `docs/phases/`.

- Docs-only PR; no `src/` modifications.

### PR #5 — Phase 12D (BessMap interaction extraction) — merged

`BessMap.tsx` reduced from ~860 to ~614 LOC by extracting
camera (`useMapCamera`), gestures (`useLayoutEditGestures`,
`usePreviewTerrainGestures`, `useRepairZoneFeatures`,
`useSelectionFeatures`), lifecycle (`useMapLifecycle`) and the
interaction router (`useMapInteractionRouter`) into focused hooks.

### PR #4 — Phase 12C (BessMap feature-hooks + layers) — merged

`BessMap.tsx` reduced from ~1772 to ~860 LOC by extracting feature
hooks (`useBaseMapStyle`, `useEquipmentFeatures`,
`usePolygonFeatures`, `useOverlayFeatures`,
`useLayoutInfrastructureFeatures`, `usePreviewTerrainFeatures`,
`useDrawModeHandlers`) and layer modules under
`src/components/map/layers/`. Added `BessMap.contract.test.tsx`,
`BessMap.constants.ts`, `BessMap.geometry.ts`.

### PR #3 — Phase 12B (Store slicing) — merged

`src/store/projectStore.ts` reduced from ~1185 to **32 LOC**
composition root. Per-domain slices extracted to
`src/store/slices/`: `polygonSlice`, `terrainSlice`,
`repairZoneSlice`, `equipmentSlice`, `layoutEditSlice`,
`comparisonSlice`, `lifecycleSlice`. Shared types in
`projectStore.types.ts`; history helpers in `projectStore.history.ts`.
Contract test pins 53 actions + 33 state fields; invariant test
pins history depth + cross-slice isolation.

### Earlier phases — pre-PR-3

Phases 1–11 (MVP scope, regulatory subsystem, electrical topology
validation, UX shell, lint cleanup) are summarised in
`docs/phases/` historical docs and in `docs/architecture.md`.
They predate the per-PR changelog discipline.

---

[Unreleased]: https://github.com/josetomasayalams-rgb/bess-layout-designer/compare/v1.0.0-rc.1...HEAD
[1.0.0-rc.1]: https://github.com/josetomasayalams-rgb/bess-layout-designer/releases/tag/v1.0.0-rc.1
