# Release Readiness Checklist

Single-page checklist that any future release branch must satisfy
before the maintainer cuts a `vX.Y.Z` tag. Phase 15 (this PR) used it
to validate `1.0.0-rc.1`.

## Engineering gates

- [ ] `npm run lint` — 0 errors, 0 warnings
- [ ] `npm run typecheck` — clean
- [ ] `npm run test` — all green (record final count in the PR body)
- [ ] `npm run build` — clean
- [ ] `npm run test:coverage` — coverage HTML / LCOV / json-summary
      generated; no regression vs the most recent
      `docs/phases/phase*-baseline-coverage.md`
- [ ] Golden master test passes
      (`src/tests/golden-masters/pdf-v1.0.test.tsx`)
- [ ] BessMap contract test passes
      (`src/components/map/BessMap.contract.test.tsx`)
- [ ] E2E suite (when enabled, Phase 14B): green or explicitly skipped
      with a documented reason

## Repository hygiene

- [ ] `package.json#version` matches the planned tag (no leading `v`)
- [ ] `package.json#private` is `true`
- [ ] `package.json#license` is `UNLICENSED` (until a formal license
      decision is made)
- [ ] `CHANGELOG.md` has an entry for the version being cut
- [ ] No `console.log` left in `src/**` except intentional benchmark
      `[perf]` lines
- [ ] No `it.only` / `describe.only` in tests
- [ ] No `.env` files committed (only `.env.example`)
- [ ] No files larger than 1 MB introduced
      (`.github/workflows/pr-validation.yml` enforces this)
- [ ] `coverage/` is gitignored and not staged

## Documentation gates

- [ ] `docs/architecture.md` reflects the current source structure
- [ ] `docs/exclusions.md` covers every exclusion id in
      `src/data/exclusionRegistry.ts`
- [ ] `docs/regulatory-traceability.md` matches
      `src/rules/regulatoryRulesCatalog.ts`
- [ ] `docs/report-spec.md` matches the report section sequence
      pinned by the golden master
- [ ] No marketing claims about detailed engineering (load flow,
      short circuit, EMT, arc flash, BIL, grounding grid)
- [ ] Coherence audit (`docs/phases/phase15-coherence-audit.md`)
      reports no P0/P1

## Security gates

- [ ] `SECURITY.md` is present and current
- [ ] `npm audit --omit=dev`: 0 high, 0 critical
- [ ] Any moderate finding is triaged in
      `docs/phases/phase*-dependency-audit.md` with explicit
      "defer / fix / monitor" decision
- [ ] No secret-shaped strings in the diff
      (API keys, tokens, private URLs)
- [ ] Dependabot config (`.github/dependabot.yml`) is active and
      respects the major-version ignore list

## Release plumbing

- [ ] CI workflow (`.github/workflows/ci.yml`) is green on `main`
- [ ] Release workflow (`.github/workflows/release.yml`) is in
      manual-dispatch mode and does NOT auto-publish
- [ ] PR-validation workflow (`.github/workflows/pr-validation.yml`)
      is in place
- [ ] Branch protection on `main` requires CI to pass (manual GitHub
      configuration — not in repo)

## Communication

- [ ] PR body links to:
  - the coherence audit
  - the dependency audit
  - the performance baseline
  - the a11y audit
  - the release-candidate doc
- [ ] PR body lists every P0 / P1 / P2 / P3 finding from this release
- [ ] PR body states explicitly what is NOT being done
      (no tag, no GitHub release, no npm publish, no deploy)
- [ ] PR body includes the human-only commands to tag, per
      `docs/phases/phase15-release-candidate.md`

## When all boxes are checked

- The maintainer reviews the PR.
- The maintainer merges the PR into `main` (merge commit, not squash).
- The maintainer manually runs the commands documented in
  `docs/phases/phase15-release-candidate.md` to bump from rc.1 → 1.0.0
  (when appropriate) and to push the `v1.0.0` tag.
- The maintainer creates the GitHub Release notes from the relevant
  `CHANGELOG.md` section.

**Nothing in this repo will perform any of those last three steps
automatically.**
