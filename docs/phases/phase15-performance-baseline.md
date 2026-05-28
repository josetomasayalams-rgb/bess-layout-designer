# Phase 15.5 — v1 Release Performance & Bundle Baseline

## Method

All numbers captured 2026-05-27 on `release/phase-15-v1-final` after a
clean `rm -rf .next` rebuild. Hardware: developer MacBook (M-series).
CI hardware (GitHub Actions `ubuntu-latest`) is generally comparable
for these workloads; treat the numbers below as **order-of-magnitude
references**, not as hard thresholds.

CI hard thresholds are intentionally NOT set in this PR — promotion
to blocking gates is deferred to Phase 16 / v1.1 once we have CI-only
observations across several PRs.

## Tooling timings

| Task | Wall-clock | Notes |
|------|-----------|-------|
| `npm run lint` | ~6.4 s | ESLint flat config, `eslint-config-next`. |
| `npm run typecheck` | ~3.9 s | `tsc --noEmit`, TypeScript 5.9.3. |
| `npm run test` | ~13–14 s | Vitest 4.1.6, 670 tests in 105 files. |
| `npm run build` | ~8.9 s | Next.js 16.2.6 (Turbopack) from a clean `.next`. |
| `npm run test:coverage` | ~16–18 s | v8 provider, json-summary + html + lcov. |

## Build output

Next.js 16.2.6 (Turbopack) reports the production build as:

```
Route (app)
┌ ○ /                        (Static, prerendered)
└ ○ /_not-found              (Static)
```

Both routes are statically prerendered. There is no server runtime
beyond Next's static asset serving.

## Bundle baseline

| Path | Size |
|------|------|
| `.next/static` (all static client assets) | **4.0 MB** |
| `.next/static/chunks` | 3.8 MB |
| `.next/server` (prerender artefacts) | 14 MB |
| `.next` total | 20 MB |

### Largest client chunks

| Chunk | Size | Likely contents |
|-------|------|------|
| `0pikn89j22doa.js` | **2.0 MB** | MapLibre GL JS (heaviest single dep). |
| `0p8mjcq7re3sl.js` | **1.0 MB** | `@react-pdf/renderer` + companion (PDF font + style runtime). |
| `07lhk_q6pmm3r.js` | 222 KB | Likely Tailwind + Next runtime + small libs. |
| `05pxe.pkwelhe.js` | 193 KB | Application code (sliced project store + report builder). |
| `03~yq9q893hmn.js` | 110 KB | React + react-dom runtime. |

> Chunk filenames are content-hashed by Turbopack and will change on
> any input change — the **sizes**, not the names, are the regression
> signal.

## Known performance / size risks

| Risk | Mitigation status |
|------|-------------------|
| **MapLibre GL** (2 MB chunk) | Lazy-loaded by the map view; report-only flows do not pay this cost. Not bundled into a non-map route. |
| **`@react-pdf/renderer`** (1 MB chunk) | Loaded only when the user clicks "Generate report"; the PDF renderer is dynamically imported via `downloadTechnicalReportPdf`. |
| **`html2canvas`** | Used only by the optional map-capture path; not on the main render path. |
| **400-container perf test** | Phase 14.8 perf benchmark has a 35 s ceiling. Local observation: well under it. CI may be slower — monitor the `[perf]` log line. |
| **Coverage cost** | Coverage adds ~3–5 s to the test run; non-blocking in CI (Phase 14.0). |

## Soft budget for post-v1 changes

These are **guidelines**, not enforced CI gates:

| Metric | Budget | Rationale |
|--------|--------|-----------|
| `npm run build` wall-clock | ≤ +10 % vs this baseline | Catch accidental SSR regressions / huge new deps. |
| `npm run test` wall-clock | ≤ +10 % vs this baseline | Catch accidental synchronous-network tests / forgot mocks. |
| `.next/static/chunks` total | ≤ +10 % vs 3.8 MB (≤ 4.2 MB) | Catch accidental import of duplicate heavy deps. |
| Largest chunk size | ≤ +10 % vs 2.0 MB (≤ 2.2 MB) | Catch accidental MapLibre fork or full PDF SDK in critical path. |
| Coverage statements | ≥ 75 % | Phase 14 baseline. Drops must be acknowledged. |

A PR that breaks any of these budgets should call it out explicitly in
the PR body and justify the trade-off. None are hard CI failures yet.

## Why hard CI thresholds are deferred

1. CI hardware timings vary 1.5–3× from local; thresholds set on a
   single observation become flaky.
2. Bundle size depends on Turbopack chunking heuristics, which can
   shift between Next.js minor versions.
3. Phase 14.0 explicitly defers coverage threshold promotion to
   Phase 15; performance thresholds inherit the same posture for the
   same reasons.

Revisit in **Phase 16 / v1.1** once we have ≥ 5 CI-only observations
of each metric.
