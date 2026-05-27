# Phase 14.8 — Performance baseline

## Method

Informative performance benchmarks under
`src/lib/layout/preliminaryLayoutGenerator.perf.test.ts`. Each test
calls `generatePreliminaryLayout` with a realistic input and asserts a
permissive ceiling (≥ 10× expected). Hard thresholds are intentionally
NOT set — they are flaky across hardware. The numbers below are the
order-of-magnitude expectation; CI will only fail on catastrophic
regressions.

## Targets

| Scenario | Containers | PCS | Polygon | Soft expectation | Hard test ceiling |
|----------|------------|-----|---------|------------------|-------------------|
| Small park | 100 | 25 | 2 km × 1 km | < 500 ms | 5 000 ms |
| Large park | 400 | 100 | 4 km × 2 km | < 6 000 ms | 30 000 ms |

The test logs the elapsed time with a `[perf]` prefix so the CI log can
be grepped over time.

## Local baseline (recorded 2026-05-27)

- Branch: `chore/phase-14-testing-hardening`
- Base commit: `cef7ee7` (Phase 13)
- Node: 20.x (CI also uses 20)
- Hardware: developer MacBook (M-series)

| Scenario | Observed (warm cache) |
|----------|------------------------|
| 100 / 25 | ~ a few hundred ms |
| 400 / 100 | ~ several seconds |

These numbers are intentionally vague — the perf test logs precise
values per run. Use them only to spot **order-of-magnitude** drift.

## Promotion to hard thresholds

Deferred to Phase 15 when:

1. CI hardware is stabilised (currently GitHub-hosted runners — fast
   enough for the soft expectations).
2. Coverage threshold promotion lands.
3. A regression budget is agreed with the team.

Until then this file is the canonical reference for "what the layout
generator should feel like".
