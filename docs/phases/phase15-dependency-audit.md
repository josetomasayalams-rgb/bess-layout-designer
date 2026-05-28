# Phase 15.3 — Dependency & Security Audit

## Method

- `npm audit --omit=dev --json` and `npm audit --json` — runtime + full
  vulnerability scan.
- `npm outdated --json` — version drift relative to npm registry.
- Captured 2026-05-27 on branch `release/phase-15-v1-final` (HEAD
  after Phase 15.2 commit).

## Vulnerability findings

| Package | Severity | Source | Range | Exploitable here? | Decision |
|---------|----------|--------|-------|-------------------|----------|
| `postcss` (nested under `next`) | **moderate** | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — XSS via unescaped `</style>` in CSS stringify output (CVSS 6.1) | `< 8.5.10` | ❌ **Not exploitable**: we use PostCSS only as a build-time CSS pipeline through Next.js + Tailwind. There is no runtime path that hands user-supplied CSS to `postcss.stringify`. The vulnerability requires a malicious CSS author with `</style>` injection capability, which is not part of our threat model (no user-authored CSS surface). | **Defer** — wait for Next.js to bump its nested postcss in a non-breaking minor. |
| `next` | **moderate** | transitively flagged because of nested `postcss` above. | `9.3.4-canary.0 - 16.3.0-canary.5` | Same as above — only the build pipeline is affected. | **Defer** — `npm audit fix --force` would DOWNGRADE Next from 16.2.6 to 9.3.3 (years old, fully breaking; would destroy the entire app). Unacceptable. |

**Total: 2 moderate, 0 high, 0 critical.** No `npm audit fix` is
applied — the available fix is destructive (major-version downgrade),
and per Phase 15.3 policy we only apply non-breaking fixes for
high/critical findings.

**No `chore(phase15.3b)` commit is needed.**

## Outdated packages

| Package | Current | Latest | Drift | Action |
|---------|---------|--------|-------|--------|
| `@types/node` | 20.19.41 | 25.9.1 | major (20→25) | **Defer** — pin to Node 20 LTS series; matches CI `engines.node`. |
| `eslint` | 9.39.4 | 10.4.0 | major | **Defer** — major bump touches the entire flat-config surface and `eslint-config-next` compatibility. |
| `typescript` | 5.9.3 | 6.0.3 | major | **Defer** — TS 6 is brand new; wait one quarter for the React/Next ecosystem to stabilise. |
| `react` | 19.2.4 | 19.2.6 | patch | **Monitor** — Dependabot weekly will offer this as a PR. |
| `react-dom` | 19.2.4 | 19.2.6 | patch | **Monitor** — same as above. |
| `@types/react` | 19.2.14 | 19.2.15 | patch | **Monitor** — same as above. |
| `lucide-react` | 1.14.0 | 1.16.0 | minor | **Monitor** — Dependabot. |

All major upgrades are explicitly listed in `.github/dependabot.yml`
(Phase 15.1) as `ignore` entries, so they will never be opened as
automated PRs without a human-driven upgrade branch.

## Audit summary

- **Runtime vulnerabilities exploitable in production**: 0
- **Build-pipeline vulnerabilities (not exploitable here)**: 2 moderate
- **High/critical vulnerabilities**: 0
- **Action taken in this PR**: none (documenting only)
- **Action deferred**: monitor postcss / next minor bumps; revisit
  major upgrades in Phase 16 / v1.1 upgrade window.

## Why this is safe for v1.0 RC

1. None of the flagged vulnerabilities can be reached by a malicious
   user of the production app (client-side SPA, no user-controlled
   CSS or PostCSS pipeline at runtime).
2. The vulnerabilities are explicitly listed and triaged — the audit
   trail is the deliverable.
3. The release workflow (`.github/workflows/release.yml`, Phase 15.1)
   runs `npm audit` implicitly via `npm ci`; future advisories will
   surface in CI logs.
4. Dependabot is configured to deliver minor/patch fixes weekly so
   the audit posture stays current without manual sweeps.

## Promotion to "fix now" criteria

A future advisory will be auto-promoted to a `chore(phase15.3b)` style
fix if **all** of:

1. Severity **high** or **critical**.
2. Vulnerability path is reachable from production code (not just
   build tooling).
3. `npm audit fix` resolves it without a `--force` flag (i.e.
   non-breaking semver bump available).

If any condition fails, the finding is recorded here and the upgrade
is deferred until a manual upgrade branch.
