---
name: Feature request
about: Propose a new feature or enhancement.
title: "[feature] "
labels: ["enhancement"]
assignees: ""
---

## Problem

<!-- What is the user trying to do that they cannot today? -->

## Proposed solution

<!-- Sketch the change. Diagrams / mockups welcome. -->

## Alternatives considered

<!-- Other ways to solve this, and why this one. -->

## Impact on scope

- [ ] Stays within "preliminary BESS predesign" boundary
      (see `docs/exclusions.md`)
- [ ] Does NOT promise detailed engineering (load flow, short circuit,
      EMT, arc flash, BIL, grounding grid, civil engineering, etc.)
- [ ] Does NOT promise final regulatory certification

If any box above is unchecked, this request is likely out of scope for
v1.x and should be discussed before implementation begins.

## Data classification (if applicable)

If this introduces new engineering constants, classify each:

- `certified_data` (datasheet / standard) — include source.
- `preliminary_assumption` (editable default) — mark as such in UI.
- `pending_validation` (must be confirmed externally).

## Acceptance criteria

- [ ] Tests added / updated
- [ ] `docs/architecture.md` updated if architecture changes
- [ ] `CHANGELOG.md` entry under `[Unreleased]`
