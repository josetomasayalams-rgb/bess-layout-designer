# Security Policy

## Threat model

The BESS Layout Designer is a **client-side single-page application**:

- All computation happens in the user's browser.
- There is no server-side data store managed by this project.
- The optional base-map providers (OpenStreetMap, MapTiler, Google
  Maps) and the optional Nominatim reverse-geocoder run on third-party
  infrastructure. Their privacy / availability is theirs to govern.
- The technical PDF report is generated locally by
  `@react-pdf/renderer` and downloaded to the user's machine.

No user account system, telemetry, or analytics is shipped with this
app. The only persistent state is the project JSON the user
explicitly chooses to export and re-import.

## Scope

In scope for this policy:

- Cross-site scripting (XSS) in the rendered UI.
- Dependency vulnerabilities that can be triggered by valid project
  input (e.g. a malicious project JSON imported by a user).
- Supply-chain compromise of `dependencies` in `package.json`.
- Build-time vulnerabilities affecting the production bundle
  (`next build`).
- PDF generation paths that could leak unintended data.

Out of scope:

- Misuse of optional third-party services (Google Maps key, MapTiler
  key) — those are governed by their own terms.
- Engineering correctness of the generated layouts / reports — those
  are explicitly **preliminary** (see `docs/exclusions.md`).
- Issues filed about regulatory or engineering "compliance" — the app
  does not certify compliance.

## What NOT to commit

- API keys (Google Maps, MapTiler, etc.) — use `.env.local`, never
  commit `.env*` files other than `.env.example`.
- Any customer project JSON, even sanitised.
- Any datasheets or third-party documents under restrictive license.

## How to report a vulnerability

**Do NOT open a public GitHub issue.** Instead:

1. Email the maintainer privately. **TODO: security contact** — no
   verified private security email exists for this fork yet. Until
   one is published, send a private direct message to the maintainer
   through GitHub or open a **private security advisory** at
   <https://github.com/josetomasayalams-rgb/bess-layout-designer/security/advisories/new>.
2. Include:
   - Affected version (`package.json#version` and the git SHA).
   - A clear description of the vulnerability.
   - Reproduction steps or a PoC.
   - Your assessment of impact and severity.
3. We will acknowledge receipt within 7 calendar days.
4. We will provide a remediation plan or status update within
   30 calendar days.

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ (planned — currently 1.0.0-rc.x pre-release path) |
| 0.1.x   | ⚠️ pre-release; security fixes will land in v1.x only |

## Disclosure timeline

We follow a coordinated-disclosure model. Once a fix is available,
we publish a CHANGELOG entry under `Security`. Where appropriate,
we will also publish a GitHub Security Advisory.
