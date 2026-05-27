# Phase 12 — Monolith De-risking: Architecture Plan

**Status:** Approved design (no code changes yet).
**Author role:** SPARC Architect.
**Scope:** Structural refactor only. Zero new features. Zero domain changes.
**Implementation gate:** `/sparc:coder` MUST NOT be invoked until this document is committed on `main`.

---

## 1. Verified initial state

Captured immediately before this plan was authored. All checks read-only.

| Check | Value |
|---|---|
| Branch | `main` |
| HEAD | `d0bf6d1 Merge pull request #1 from josetomasayalams-rgb/chore/consolidate-phases-1-7` |
| Working tree | clean |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run typecheck` | clean |
| `npm run test` | 474 passed / 474 (70 files) |
| `npm run build` | 4/4 static pages, OK |
| Remote | `origin → https://github.com/josetomasayalams-rgb/bess-layout-designer` |

This is the **baseline** that every Phase 12 commit must continue to satisfy.

---

## 2. Monolith diagnostic

| File | LOC | Exports | Hooks | Nodes | Consumers (inbound imports) |
|---|---:|---:|---:|---:|---:|
| `src/components/map/BessMap.tsx` | **1,827** | 1 (`BessMap`) | 54 | 70 `<Source>`/`<Layer>` | 1 (`AppShell.tsx`) |
| `src/store/projectStore.ts` | **1,185** | 1 store + 7 types | n/a | ~75 actions | **30+** files across components, lib, tests |
| `src/components/report/ReportDocument.tsx` | **1,480** | 1 (`ReportDocument`) | 0 | 187 PDF nodes | 1 (`lib/report/downloadTechnicalReport.tsx`) |
| **Total** | **4,492** | | | | |

**Risk ranking (lowest → highest):** ReportDocument → projectStore → BessMap.

- `ReportDocument` is the easiest target: pure tree, no hooks, single consumer.
- `projectStore` has the **highest blast radius**: any rename or signature drift breaks 30+ files and the e2e fixture.
- `BessMap` has medium structural complexity (54 hooks, gesture-ref coupling) but low blast radius.

---

## 3. Current responsibilities per file

### 3.1 `BessMap.tsx`
- MapLibre container lifecycle (style load, error handling, viewport)
- Base-map provider resolution (standard / satellite / hybrid)
- ~35 memoized `FeatureCollection`s built inline (polygon, polygon line, polygon vertices, preview-terrain × 5, repair-zone × 3, equipment × 3 incl. 3D, buffers, conceptual infrastructure, layout zones × 2, cable corridors × 2, access-road corridors × 2, grid, warning markers, measurement, selection × 3, searched point)
- 70 `<Source>` + `<Layer>` declarations
- 6 interaction modes: `select`, `draw-site`, `place-equipment`, `draw-repair-zone`, `edit-layout`, plus preview-terrain drag/rotate gestures
- Local helpers: `normalizeRotation`, `shortestDeltaDeg`, `INITIAL_VIEW`, `BLANK_BASE_MAP_STYLE`, `LAYOUT_MOVE_STEP_M`
- Gesture refs: `suppressPreviewTerrainClickRef`, `suppressLayoutEditClickRef`, `layoutMoveDrag`

### 3.2 `projectStore.ts`
- Polygon state and actions (draw, vertices, finish, clear, view center)
- Parametric terrain state (preview, move, apply, cancel, fit, revert)
- Repair zone state and actions
- Equipment placement, insertion (manual, BESS array, case study, preliminary tool, regularize), repair, removal, rotation, selection
- Layout edit state (selection, rotation/orientation/move previews, lock, repair preview, compact preview, validate, revert, apply)
- Terrain-fit preview lifecycle
- Comparison slots (A/B capture/clear/restore)
- Mode dispatch and lifecycle (`setMode`, `loadDemoProject`, `resetProject`)
- Undo/redo history (limit 5) with `snapshotOf` / `recordHistory` helpers
- Type exports: `InteractionMode`, `LayoutEditState`, `TerrainFitPreviewState`, `PreviewTerrainState`, `LayoutAlternative`, `ComparisonSlot`, `ComparisonState`

### 3.3 `ReportDocument.tsx`
- PDF document tree using `@react-pdf/renderer`
- Style sheet `s` (typography, colors, spacing)
- Severity / outcome mapping helpers (`SEVERITY_PILL`, `OUTCOME_LABEL`, `outcomePillStyle`)
- Layout primitives: `SectionPage`, `Table`, `DefGrid`, `AlertCard`
- Chrome: `PageHeader`, `PageFooter`, `CoverPage`
- 10 section pages numbered 1 → 2 → 3 → 4 → 5 → 5b → 6 → 7 → 8 → A1
- Single suspicious vestige: `export const __unused_rect_ref = Rect;` at EOF

---

## 4. Guardrails — what Phase 12 MUST NOT do

| # | Guardrail |
|---|---|
| G1 | **No new product features.** No cable routing v2, no road routing v2, no new equipment classes, no new regulatory rules. |
| G2 | **No semantic changes to `useProjectStore`.** Action keys, parameter shapes, return types, and side-effect ordering are immutable. |
| G3 | **No change to `TechnicalReportData` shape** in `src/lib/report/buildReportData.ts` or its consumers. |
| G4 | **No change to regulatory engine.** `bessValidationEngine`, `regulatoryProfileEvaluator`, `severityCeiling`, `regulatoryRulesCatalog` are out of scope. |
| G5 | **No change to electrical engine.** `topologyValidation` (Phase 8 checks) is out of scope. |
| G6 | **No change to rendered PDF output.** Must remain byte-equivalent (modulo internal `<View>` keys). |
| G7 | **No change to MapLibre version, plugin set, or base-map providers.** |
| G8 | **No change to `package.json`, lockfile, `eslint.config.mjs`, `next.config.ts`, `tsconfig.json`, `vitest.config.*`, or `.gitignore`.** |
| G9 | **No retirement of Phase 11B components.** `compliance/*` and `design-tools/*` extractions stay. |
| G10 | **No mega-PR.** Each subphase is its own branch, its own PR, its own review cycle. |

---

## 5. Approved subphase split

Three sequential subphases, each on its own branch, each landing as its own PR before the next begins.

### Phase 12A — `ReportDocument.tsx` decomposition (lowest risk → first)
- **Branch:** `refactor/phase-12a-report-document-split`
- **Strategy:** pure tree extraction. One file per `SectionPage`.
- **Target shrinkage:** `ReportDocument.tsx` from 1,480 LOC → ~250 LOC.
- **Why first:** zero hooks, one consumer, mechanical move-and-import. Establishes the refactor pattern.

### Phase 12B — `projectStore.ts` slicing (highest risk → second)
- **Branch:** `refactor/phase-12b-project-store-slices`
- **Strategy:** Zustand slice composition. Each functional group becomes a slice; public `useProjectStore` continues to export the combined store with identical action surface.
- **Target shrinkage:** `projectStore.ts` from 1,185 LOC → ~100 LOC composition root.
- **Why second:** 30+ consumers. Doing this after 12A lets the team practice the "preserve public API while moving internals" pattern on a low-stakes target first.
- **Critical guardrail:** an action-contract test that pins every existing signature lands **before** any extraction commit.

### Phase 12C — `BessMap.tsx` extraction (medium risk → third)
- **Branch:** `refactor/phase-12c-bess-map-extraction`
- **Strategy:** extract layer-group subcomponents and per-mode interaction hooks. Shell keeps `<Map>` container, provider plumbing, mode dispatcher.
- **Target shrinkage:** `BessMap.tsx` from 1,827 LOC → ~350 LOC.
- **Why third:** complex memoization graph and gesture refs. Doing it last benefits from the slice pattern from 12B (each layer subscribes to a specific slice instead of the whole store).

---

## 6. New files per subphase

### 6.1 Phase 12A
```
src/components/report/
├── ReportDocument.tsx                    (composition root, ~250 LOC)
├── pdfStyles.ts                          (StyleSheet `s` extracted)
├── pdfPrimitives.tsx                     (SectionPage, Table, DefGrid, AlertCard)
├── pdfSeverityMaps.ts                    (SEVERITY_PILL, OUTCOME_LABEL, outcomePillStyle)
├── pdfChrome.tsx                         (PageHeader, PageFooter)
└── sections/
    ├── CoverPage.tsx
    ├── ExecutiveSection.tsx              (1)
    ├── LocationSection.tsx               (2)
    ├── DesignSection.tsx                 (3)
    ├── LayoutSection.tsx                 (4)
    ├── ElectricalSection.tsx             (5)
    ├── PreliminaryElectricalChecksSection.tsx  (5b)
    ├── RegulatorySection.tsx             (6)
    ├── TraceabilitySection.tsx           (7)
    ├── ScopeSection.tsx                  (8)
    └── RegulatoryAnnexSection.tsx        (A1)
```

### 6.2 Phase 12B
```
src/store/
├── projectStore.ts                       (composition root, ~100 LOC)
├── projectStore.types.ts                 (InteractionMode, LayoutEditState, ProjectSnapshot, ComparisonState, etc.)
├── projectStore.history.ts               (snapshotOf, recordHistory, HISTORY_LIMIT)
└── slices/
    ├── polygonSlice.ts
    ├── terrainSlice.ts                   (preview-terrain + terrain-fit)
    ├── repairZoneSlice.ts
    ├── equipmentSlice.ts
    ├── layoutEditSlice.ts
    ├── comparisonSlice.ts
    └── lifecycleSlice.ts
```

### 6.3 Phase 12C
```
src/components/map/
├── BessMap.tsx                           (composition root, ~350 LOC)
├── BessMap.constants.ts                  (INITIAL_VIEW, BLANK_BASE_MAP_STYLE, LAYOUT_MOVE_STEP_M)
├── BessMap.geometry.ts                   (normalizeRotation, shortestDeltaDeg)
├── hooks/
│   ├── useMapLifecycle.ts
│   ├── useBaseMapStyle.ts
│   ├── usePolygonFeatures.ts
│   ├── usePreviewTerrainFeatures.ts
│   ├── useRepairZoneFeatures.ts
│   ├── useEquipmentFeatures.ts
│   ├── useLayoutFeatures.ts              (layout zones, cable corridors, access-road corridors, buffers, conceptual infra)
│   ├── useSelectionFeatures.ts
│   ├── useGridAndOverlayFeatures.ts
│   ├── usePlacementMode.ts
│   ├── useDrawSiteMode.ts
│   ├── useDrawRepairZoneMode.ts
│   ├── useLayoutEditMode.ts
│   └── usePreviewTerrainGestures.ts
└── layers/
    ├── PolygonLayers.tsx
    ├── PreviewTerrainLayers.tsx
    ├── RepairZoneLayers.tsx
    ├── EquipmentLayers.tsx
    ├── ConceptualInfrastructureLayers.tsx
    ├── SelectionLayers.tsx
    └── OverlayLayers.tsx
```

---

## 7. Regression tests required BEFORE touching code

Every subphase begins with a **test-first commit**. No extraction commit may land before its safety net.

### 7.1 Before Phase 12A — `tests/phase12a/`
1. **PDF render snapshot test** (`ReportDocument.snapshot.test.tsx`)
   - Render `ReportDocument` with the `bessDelDesiertoPresetV12` data.
   - Assert page count and that every `SectionPage.title` string is present in the rendered output.
2. **Section-numbering invariant test**
   - Assert sections render in order `1 → 2 → 3 → 4 → 5 → 5b → 6 → 7 → 8 → A1`.

### 7.2 Before Phase 12B — `tests/phase12b/`
1. **`projectStoreContract.test.ts`** — pin every action: `expect(typeof state.<actionName>).toBe('function')` × 75, plus arity assertions via `Parameters<typeof state.X>[0]`.
2. **History invariant test** — strengthen `projectStore.test.ts`: execute a known action sequence (place 3, undo 2, redo 1), assert state hash.
3. **Slice-isolation test** — calling a polygon action must not mutate equipment state (and vice versa). Catches accidental cross-slice writes during the move.
4. **e2e safety net** — `src/tests/e2e/bessDelDesiertoFlow.test.tsx` remains green at every commit.

### 7.3 Before Phase 12C — `tests/phase12c/`
1. **Layer-order snapshot test** — render `BessMap` headless, snapshot the order and ids of all `<Layer>` elements.
2. **Mode-transition smoke test** — for each `InteractionMode`, assert `BessMap` renders without crashing and that the relevant gesture refs are initialized.
3. **AppShell integration test** — extend `AppShell.test.tsx` to assert `BessMap` renders for each section.

---

## 8. Per-commit acceptance criteria

Every commit in Phase 12 must satisfy **all** gates:

| Gate | Requirement |
|---|---|
| **Lint** | `npm run lint` → 0 errors, 0 warnings |
| **Typecheck** | `npm run typecheck` → clean |
| **Tests** | `npm run test` → ≥ 474 passed; any new tests added in the commit must pass |
| **Build** | `npm run build` → 4/4 static pages |
| **Behavior** | No user-visible behavior change. PDF byte-equivalent. Map UX identical. |
| **Public API** | `useProjectStore` action surface byte-equal. `ReportDocument` props byte-equal. `BessMap` props byte-equal. |
| **Atomicity** | One commit = one logical extraction. No mixing "extract X" with "rename Y". |
| **Message** | `refactor(phase12<X>.<n>): <verb> <thing>` — e.g. `refactor(phase12a.2): extract pdfPrimitives` |
| **Reviewability** | Each commit ≤ ~400 LOC diff where possible. |
| **Reversibility** | Every commit revertible in isolation without breaking the build. |

A commit that fails any gate is **rolled back**, not patched in a follow-up.

---

## 9. Recommended branch order

Three branches, three PRs, in this order. Each PR must be reviewed and merged to `main` before the next branch is created.

### Branch 1: `refactor/phase-12a-report-document-split`
Target commit sequence (~6 commits):
1. `test(phase12a): add ReportDocument page-count and section-order snapshot`
2. `refactor(phase12a.1): extract pdfStyles to dedicated file`
3. `refactor(phase12a.2): extract pdfPrimitives (SectionPage, Table, DefGrid, AlertCard)`
4. `refactor(phase12a.3): extract pdfChrome (PageHeader, PageFooter, CoverPage)`
5. `refactor(phase12a.4): extract 10 SectionPage components to sections/ folder`
6. `chore(phase12a): remove or document __unused_rect_ref`

### Branch 2: `refactor/phase-12b-project-store-slices`
Target commit sequence (~10 commits):
1. `test(phase12b): pin useProjectStore action contract (75 actions)`
2. `test(phase12b): strengthen history (undo/redo) invariant tests`
3. `refactor(phase12b.1): extract projectStore.types.ts`
4. `refactor(phase12b.2): extract projectStore.history.ts`
5. `refactor(phase12b.3): extract polygonSlice`
6. `refactor(phase12b.4): extract terrainSlice (preview-terrain + terrain-fit)`
7. `refactor(phase12b.5): extract repairZoneSlice`
8. `refactor(phase12b.6): extract equipmentSlice`
9. `refactor(phase12b.7): extract layoutEditSlice`
10. `refactor(phase12b.8): extract comparisonSlice`
11. `refactor(phase12b.9): extract lifecycleSlice; projectStore.ts becomes composition root`

### Branch 3: `refactor/phase-12c-bess-map-extraction`
Target commit sequence (~12 commits):
1. `test(phase12c): snapshot BessMap layer order and ids`
2. `test(phase12c): mode-transition smoke tests`
3. `refactor(phase12c.1): extract BessMap.constants and BessMap.geometry`
4. `refactor(phase12c.2): extract useMapLifecycle and useBaseMapStyle hooks`
5. `refactor(phase12c.3): extract feature-collection hooks (polygon, preview-terrain, repair-zone)`
6. `refactor(phase12c.4): extract feature-collection hooks (equipment, layout, selection, overlay)`
7. `refactor(phase12c.5): extract interaction-mode hooks (place, draw-site, draw-repair-zone)`
8. `refactor(phase12c.6): extract layout-edit and preview-terrain gesture hooks`
9. `refactor(phase12c.7): extract PolygonLayers, PreviewTerrainLayers, RepairZoneLayers`
10. `refactor(phase12c.8): extract EquipmentLayers, ConceptualInfrastructureLayers`
11. `refactor(phase12c.9): extract SelectionLayers, OverlayLayers`
12. `chore(phase12c): final BessMap.tsx composition pass; verify LOC ~350`

### Optional branch 4: `docs/phase-12-summary`
After 12A + 12B + 12C have all merged, summarize results and update the module map in `docs/architecture.md`.

---

## 10. Explicit declarations

> **D1.** Phase 12 is **NOT** implemented as a mega-PR.
>
> **D2.** Each subphase (12A, 12B, 12C) has its **own branch**, its **own PR**, and its **own merge cycle** to `main`.
>
> **D3.** `/sparc:coder` MUST NOT be invoked for Phase 12 work until **this document is committed on `main`**.
>
> **D4.** When `/sparc:coder` is invoked for Phase 12A, its first task must be the test-first commit (`test(phase12a): ...`), not extraction.
>
> **D5.** Phase 12 is a **structural refactor only**. New product features (cable routing v2, road routing v2, new regulatory content) belong in a hypothetical Phase 13, planned only after 12A+12B+12C land clean.
>
> **D6.** This document is the canonical reference for Phase 12. Any deviation requires another `/sparc:architect` pass and a revision commit on this file before code may proceed.

---

## Appendix A — Risk matrix per subphase

### 12A
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Shared style sheet `s` becomes a circular import | Low | Medium | Extract `pdfStyles.ts` first; import everywhere |
| `<SectionPage>` numbering drifts | Low | High (user-visible PDF) | Snapshot test before any extraction |
| `__unused_rect_ref` silently breaks tree-shaking | Low | Low | Keep until investigated |

### 12B
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Action signature drift | **High if rushed** | **Critical** | Contract test pinned before any move |
| Ordering changes break undo/redo | Medium | High | Preserve `recordHistory` wrapper; don't inline |
| Cross-slice helper leaks | Medium | Medium | Document slice boundaries; read-cross, write-only-own |
| Zustand devtools labels change | Low | Low | Acceptable; flag in PR |
| Test imports a now-internal helper | Medium | Low | Audit `src/store/*.test.ts`; re-export when needed |

### 12C
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| MapLibre re-render thrash from prop-passed FCs | Medium | High (UX jank) | Keep memoization inside hooks; stable refs to layers |
| Gesture refs decouple from consuming layers | Medium | High | Co-locate ref with its consumer; don't share across files |
| `<Source>` id collisions / layer-order changes | Low | Medium | Snapshot test pinned before any move |
| Loss of single-render-tree benefits | Low | Low | Acceptable if memoization preserved |
| Coordinate-projection drift | Low | High | `lib/geometry/projection.ts` untouched in 12C |

---

## Appendix B — Final reminder

After this document is committed on `main`:

```bash
# Approved next command sequence (manual, by the human reviewer):
git add docs/phase-12-architect-plan.md
git commit -m "docs(phase12): add monolith de-risking architecture plan"
# Then, only after that commit lands:
git checkout -b refactor/phase-12a-report-document-split
# Then, and only then, invoke /sparc:coder for the FIRST commit of 12A (test-first).
```

Do not skip steps. Do not batch. Do not use `/swarm`, `/hive-mind`, or `/sparc:coder` until this file is committed.
