# Phase 14.8 — Accessibility findings

## Method

Light-weight smoke test under `src/components/layout/AppShell.a11y.test.tsx`
asserting:

1. AppShell renders without throwing in JSDOM.
2. The page exposes at least one landmark surface (`main`, `[role=main]`,
   `[role=region]`, `[role=navigation]`, or `<nav>`).
3. Every `<button>` has accessible text (text content, `aria-label`, or
   `title`).

We intentionally did **not** install `jest-axe` or `axe-core` —
they bring large peer-dep trees and Phase 14 is additive-only.
Promotion to axe-driven testing is deferred to Phase 15.

## Findings as of branch `chore/phase-14-testing-hardening`

- Smoke passes: 3/3 tests.
- No orphan buttons in `AppShell` chrome.
- BessMap is stubbed in the test (boots WebGL otherwise); the live
  map component's own a11y has NOT been audited here.

## Known unaudited surfaces

| Surface | Why deferred |
|---------|--------------|
| `BessMap.tsx` + sub-hooks | Requires WebGL; will be covered by 14.9 / 14B (Playwright). |
| `OrientationCube` cube buttons | Smoke-tested directly in `OrientationCube.test.tsx` (14.6) — every button has aria-label. |
| PDF preview / report | Rendered by `@react-pdf/renderer`; output is PDF, not DOM. |
| Modal / overlay dialogs | None present in the current shell. |

## Follow-up triage

If new findings appear, append them here in the format:

```
- [yyyy-mm-dd] AppShell — `<area>`: <description>. Severity: minor / serious.
  Suggested fix: …
```
