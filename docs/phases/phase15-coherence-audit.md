# Phase 15.2 — Release Coherence Audit

## Method

Read-only sweep cross-checking code against documentation, comparing
the live source structure (post Phase 12B/C/D/13/14) against published
docs. No file modifications. Findings classified as
**P0 / P1 / P2 / P3**.

- **P0**: blocks the release candidate.
- **P1**: must resolve before final `v1.0.0` tag.
- **P2**: backlog (post-v1).
- **P3**: cosmetic.

## Scope checked

### 1. Code vs `docs/architecture.md`

- ✅ `docs/architecture.md` references `src/store/slices/` and confirms
  `projectStore.ts` as a "Composition Root" of ~32 LOC. Real file is
  32 LOC and slices match (`comparisonSlice`, `equipmentSlice`,
  `layoutEditSlice`, `lifecycleSlice`, `polygonSlice`, `repairZoneSlice`,
  `terrainSlice`).
- ✅ `src/components/map/layers/` exists with
  `EquipmentSelectionOverlayLayers.tsx` and `PolygonTerrainLayers.tsx`,
  matching the Phase 12C/D split.
- ✅ `src/components/map/hooks/` contains the 14 hooks referenced by
  the docs (`useBaseMapStyle`, `useDrawModeHandlers`,
  `useEquipmentFeatures`, `useLayoutEditGestures`,
  `useLayoutInfrastructureFeatures`, `useMapCamera`,
  `useMapInteractionRouter`, `useMapLifecycle`, `useOverlayFeatures`,
  `usePolygonFeatures`, `usePreviewTerrainFeatures`,
  `usePreviewTerrainGestures`, `useRepairZoneFeatures`,
  `useSelectionFeatures`).
- ✅ `src/components/report/` matches the modular `pdf*.tsx` layout
  documented in `report-spec.md`.

### 2. Docs vs `src/data/exclusionRegistry.ts`

Code defines 13 exclusion IDs. Cross-checked against `docs/exclusions.md`:

| Exclusion ID | In code | In docs |
|---|---|---|
| `ex-load-flow` | ✅ | ✅ |
| `ex-short-circuit` | ✅ | ✅ |
| `ex-protections-coordination` | ✅ | ✅ |
| `ex-rms-emt-stability` | ✅ | ✅ |
| `ex-harmonics` | ✅ | ✅ |
| `ex-grounding-grid` | ✅ | ✅ |
| `ex-geotechnical-civil` | ✅ | ✅ |
| `ex-hydrology-drainage` | ✅ | ✅ |
| `ex-detailed-fire-safety` | ✅ | ✅ |
| `ex-environmental-permitting` | ✅ | ✅ |
| `ex-detailed-interconnection-hv` | ✅ | ✅ |
| `ex-arc-flash` | ✅ | ✅ |
| `ex-insulation-coordination` | ✅ | ✅ |
| `ex-power-quality-pcc` | ✅ | ✅ |

**All 14 documented exclusion IDs map 1:1 to `exclusionRegistry`.**

### 3. Regulatory chain

- ✅ `src/rules/regulatoryRulesCatalog.ts` — present.
- ✅ `src/data/documentRegistry.ts` — present.
- ✅ `src/rules/severityCeiling.ts` — present, pinned by Phase 7 tests.
- ✅ `src/rules/regulatoryProfileMetadata.ts` — present, single source
  of truth post Phase 10 cleanup.
- ✅ `docs/regulatory-traceability.md` — present.

### 4. PDF / report

- ✅ `ReportDocument.snapshot.test.tsx` (Phase 12A) pins **11 pages**
  in fixed order: cover + sections 1–8 + 5b + A1. Test still green
  (663/663 after Phase 14).
- ✅ `pdfSections.snapshot.test.tsx` (Phase 14.7) pins per-section
  titles + numbers.
- ✅ Disclaimers (`generalMvp`, `conceptualSizing`,
  `documentTraceability`, etc.) defined in
  `src/lib/report/buildReportData.ts` and referenced in
  `docs/report-spec.md` / `docs/defensibility.md`.

### 5. Store contract

- ✅ `src/store/projectStore.contract.test.ts` pins `EXPECTED_ACTIONS`
  (53 entries) and `EXPECTED_STATE_FIELDS` (33 entries). Tests pass.
- ✅ `projectStore.history-invariants.test.ts` pins history depth and
  cross-slice isolation.

### 6. Phase 14 artefacts present

- ✅ `.github/workflows/ci.yml`
- ✅ `docs/phases/phase14-baseline-coverage.md`
- ✅ `docs/phases/phase14-a11y-findings.md`
- ✅ `docs/phases/phase14-performance-baseline.md`
- ✅ `docs/phases/phase14-playwright-deferred.md`
- ✅ `package.json` exposes `test:coverage`

### 7. Forbidden claim scan

Searched docs for the prohibited engineering claims. Every match found
was in **explicit negative form** (i.e. listed as an EXCLUSION):

- `load flow / flujo de carga` → only in `docs/exclusions.md`,
  `docs/defensibility.md` as excluded.
- `short circuit / cortocircuito` → only as excluded.
- `EMT / RMS` → only as excluded.
- `arc flash / arco electrico` → only as excluded.
- `BIL / insulation coordination` → only as excluded.
- `grounding grid / malla de tierra` → only as excluded.

No document promises detailed electrical engineering, AHJ
certification, or that NFPA / UL / IEC / IEEE are mandatory Chilean
norms. The BESS del Desierto case study is consistently framed as a
reference, not a universal rule.

## Findings

### P0 — Blocking

**None.** ✅

### P1 — High (must resolve before final tag)

**None identified by this audit.** All structural and traceability
checks pass.

### P2 — Medium (backlog)

| ID | Finding | Suggested action |
|----|---------|------------------|
| P2-1 | `docs/` directory contains 4 loose, untracked Phase-11/13 leftovers (`phase11b-completion-summary.md`, `phase11b-refactor-plan.md`, `phase8-electrical-scope.md`, `ux-shell-phase11.md`) — duplicates of files already under `docs/phases/`. | Open follow-up PR `chore(docs): remove pre-phase14 untracked leftovers` to delete the loose copies. NOT a Phase 15 scope item. |
| P2-2 | `SECURITY.md` carries a placeholder `TODO: security contact` because no verified private email exists for this fork. GitHub private security advisories are documented as the alternative channel. | When a security email is provisioned, replace the placeholder. |

### P3 — Cosmetic

| ID | Finding | Suggested action |
|----|---------|------------------|
| P3-1 | `docs/onboarding.md` and `docs/developer-onboarding.md` coexist; could be merged or one redirected. | Optional consolidation in a future docs PR. |
| P3-2 | Some legacy phase docs under `docs/phases/` could be archived into `docs/phases/archived/` to keep the top-level focus on active phase docs. | Optional cleanup. |

## Conclusion

**No P0 or P1 blockers.** Phase 15 is cleared to continue through the
remaining sub-phases (15.3 → 15.8). The two P2 items and two P3 items
are tracked for post-v1 backlog.
