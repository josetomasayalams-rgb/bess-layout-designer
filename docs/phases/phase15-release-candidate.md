# Phase 15.8 — `v1.0.0-rc.1` Release Candidate

## Status

- `package.json#version`: **`1.0.0-rc.1`** (bumped in this commit
  from `0.1.0`).
- `package.json#private`: `true` (unchanged — not publishable to npm).
- `package.json#license`: `UNLICENSED` (unchanged — no LICENSE file
  added; legal posture documented in Phase 15.0 commit).
- Final `v1.0.0` tag: **NOT created** by this PR. Human-only,
  documented below.

## Why this is a "candidate" and not the final tag

1. The CHANGELOG entry for `1.0.0-rc.1` should sit on `main` for at
   least one cooling-off period (e.g. a week) so dependabot can
   surface any post-merge regressions.
2. The PR opened by this branch must be reviewed and merged by a
   human before any tag exists.
3. No GitHub Release, npm publish, or deploy is automated — all are
   manual steps owned by the maintainer.

## Gates verified for rc.1

All checks below were green on the final commit of
`release/phase-15-v1-final`:

| Gate | Result |
|------|--------|
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npm run typecheck` | ✅ clean |
| `npm run test` | ✅ 670/670 passing across 106 files |
| `npm run build` | ✅ clean (Next.js 16.2.6 Turbopack) |
| `npm run test:coverage` | ✅ Statements 76.66 % · Branches 56.58 % · Functions 74.49 % · Lines 78.29 % |
| Golden master (`src/tests/golden-masters/pdf-v1.0.test.tsx`) | ✅ 7/7 |
| BessMap contract (`src/components/map/BessMap.contract.test.tsx`) | ✅ 2/2 |
| `bessDelDesiertoFlow` (`src/tests/e2e/bessDelDesiertoFlow.test.tsx`) | ✅ 1/1 |
| Coherence audit | ✅ P0=0, P1=0 |
| Dependency audit | ✅ 0 high, 0 critical |
| A11y audit | ✅ P0=0, P1=0 |
| Performance baseline | ✅ documented |
| CHANGELOG entry | ✅ `[1.0.0-rc.1] — 2026-05-27` |
| Release readiness checklist | ✅ all required boxes |

## Human-only steps to promote rc.1 → `v1.0.0-rc.1` git tag

> Run these **only after** the PR opened by this branch
> (`release/phase-15-v1-final`) has been reviewed and merged into
> `main`.

```bash
# 1. Sync local main with the merged PR
git checkout main
git pull origin main

# 2. Confirm the version is still 1.0.0-rc.1
node -p "require('./package.json').version"
# expected: 1.0.0-rc.1

# 3. Tag the release candidate
git tag -a v1.0.0-rc.1 -m "BESS Layout Designer 1.0.0-rc.1 — release candidate"

# 4. Push the tag (this triggers nothing automatic; release.yml is
#    manual-dispatch only)
git push origin v1.0.0-rc.1

# 5. (Optional) Trigger the release workflow in dry-run mode from the
#    GitHub UI: Actions → "Release (manual dispatch)" → run with
#    tag=v1.0.0-rc.1, dry_run=true. This re-runs the full validation
#    pipeline and uploads coverage as an artifact; it does NOT create
#    a GitHub release.

# 6. (Optional) Manually create a GitHub Release in the UI from the
#    tag, copying the [1.0.0-rc.1] section of CHANGELOG.md into the
#    body. Mark it as "Pre-release".
```

## Human-only steps to promote rc.1 → `v1.0.0` final tag

**Do NOT** run these steps unless **all** of the following hold:

1. `1.0.0-rc.1` has been on `main` for at least one cooling-off
   period (recommended: 7 days).
2. No P0 / P1 issue has been opened since the rc.1 merge.
3. No reverted commits since the rc.1 merge.
4. `npm audit --omit=dev` still shows 0 high, 0 critical.
5. Dependabot has not raised an unaddressed advisory.

If all five hold:

```bash
# 1. Switch to main and update the version
git checkout main
git pull origin main

# 2. Bump the version in package.json from 1.0.0-rc.1 to 1.0.0 by hand
#    or with the helper:
#    node -e "const p=require('./package.json');p.version='1.0.0';require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2) + '\\n')"

# 3. Promote the CHANGELOG entry: rename the [1.0.0-rc.1] heading to
#    [1.0.0] and update the date. Add a fresh empty [Unreleased]
#    section above it.

# 4. Commit
git checkout -b chore/promote-v1.0.0
git add package.json CHANGELOG.md
git commit -m "chore: promote 1.0.0-rc.1 to 1.0.0"
git push -u origin chore/promote-v1.0.0

# 5. Open a PR titled "Promote 1.0.0-rc.1 → 1.0.0". Merge it after
#    a normal review.

# 6. After merge:
git checkout main
git pull origin main
git tag -a v1.0.0 -m "BESS Layout Designer 1.0.0"
git push origin v1.0.0

# 7. (Optional) Re-run the release workflow in dry-run mode with
#    tag=v1.0.0 to confirm validation.

# 8. (Optional) Manually create the GitHub Release for v1.0.0 from
#    the tag, copying the [1.0.0] section of CHANGELOG.md into the
#    body. Do NOT mark this one as "Pre-release".
```

## Warnings

- **Do not publish to npm.** `package.json#private = true` blocks
  `npm publish`. The project ships as source code only.
- **Do not deploy automatically.** No deployment workflow exists in
  this repo. Hosting is the maintainer's responsibility.
- **Do not promote to `1.0.0` from this PR.** The promotion path
  goes through a separate `chore/promote-v1.0.0` PR per the steps
  above.

## If a P0/P1 issue is found before rc.1 → final

- Open a focused PR with the minimum fix.
- Bump the version: `1.0.0-rc.1 → 1.0.0-rc.2` in
  `package.json` and CHANGELOG.
- Re-run all gates from the Release Readiness Checklist.
- Repeat the rc-tag steps with `v1.0.0-rc.2`.
