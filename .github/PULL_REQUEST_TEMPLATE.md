<!-- Phase 15.1 — PR template -->

## Summary

<!-- One paragraph: what does this PR do and why? -->

## Scope

- [ ] No new product features (otherwise: explicit ADR / phase plan)
- [ ] No regulatory / electrical / layout engine semantics changed
- [ ] No `preliminary_assumption` re-classified as `certified_data`
- [ ] No claims expanded beyond preliminary BESS predesign
- [ ] No engineering constants placed in UI components

## Validation

- [ ] `npm run lint` — 0 errors, 0 warnings
- [ ] `npm run typecheck` — clean
- [ ] `npm run test` — passing (note count: __/__)
- [ ] `npm run build` — clean
- [ ] `npm run test:coverage` — no regression vs baseline
- [ ] Manual smoke (if UI changed): map drawing, equipment placement,
      PDF report download all still work locally

## Risks

<!-- Anything reviewers should look at carefully. Edge cases, perf,
     a11y, regulatory phrasing, certification implications, etc. -->

## Documentation

- [ ] `docs/architecture.md` updated if architecture changed
- [ ] `docs/exclusions.md` updated if scope boundaries changed
- [ ] `docs/regulatory-traceability.md` updated if a rule/citation changed
- [ ] `CHANGELOG.md` updated (Unreleased section)

## Related

<!-- Link issues / ADRs / phase plans. -->
