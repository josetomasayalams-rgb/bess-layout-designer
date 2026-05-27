# Phase 14.9 — Playwright deferred to Phase 14B

## Decision

Phase 14.9 (introduce a Playwright e2e suite) is **explicitly deferred**
to a follow-up Phase 14B PR. Phase 14 already shipped:

- Coverage tooling and CI workflow (14.0)
- Centralised fixtures and builders (14.1)
- Store-slice + regulatory-store gap tests (14.2)
- Report-pipeline helper tests (14.3)
- Under-tested lib-module tests (14.4)
- Top-priority sidebar panel tests (14.5)
- Map-subcomponent tests (14.6)
- PDF structural snapshots (14.7)
- Accessibility smoke + performance benchmark (14.8)

That is a substantial, additive-only hardening pass. Installing
Playwright, a browser, and a separate workflow would expand the
dependency footprint and CI surface beyond what Phase 14 was scoped
to deliver.

## Rationale per the Phase 14 plan

The Phase 14 plan ("Playwright queda como opcional 14.9. Solo
implementarlo si el repo queda estable, la suite base pasa, el
tiempo alcanza y no introduce fricción excesiva. Si hay duda,
documentarlo como Fase 14B y no instalarlo.") explicitly allows
deferral. Conditions for deferral that apply here:

1. **Fricción de instalación**: `@playwright/test` ships its own
   browser binaries (~200 MB), needs a separate CI step
   (`playwright install`), and a separate runner config. That is a
   meaningful expansion of the dev-environment footprint for the
   small number of flows that would benefit (1–2).
2. **Cobertura ya alcanzada**: the unit-level coverage of Phase 14.0
   through 14.8 already exceeds the original Phase 14 success
   criteria. Adding e2e on top is a value-add, not a gap.
3. **Flakiness risk**: MapLibre flows tend to be flaky (WebGL +
   tiles + remote map providers). A flaky e2e suite is a tax on
   every PR — better to land it as its own focused change with full
   stability work.

## Scope for Phase 14B (when picked up)

When this is unblocked (e.g. after a UX freeze or a release run),
the Phase 14B PR should:

1. Install `@playwright/test` as a devDependency.
2. Add a `test:e2e` script and a separate
   `.github/workflows/e2e.yml` (so it does not gate normal PR CI).
3. Implement at most 2 flows:
   - **Cold start** → app loads, KPI bar renders.
   - **Load demo project** → demo loads, project summary panel
     shows non-zero KPIs, report-generate button is enabled.
4. NOT exercise MapLibre tile loading or drag/zoom — too flaky.
5. Document run instructions in `docs/developer-onboarding.md`.

## Not in Phase 14B

- Visual / pixel snapshots of the PDF (require Chromium-driven
  rendering + a snapshot store). Documented as deferred in the
  Phase 14.7 commit message; revisit alongside Playwright.
- Full a11y audit with `axe-core` or `jest-axe`. Documented as
  deferred in `phase14-a11y-findings.md`.
