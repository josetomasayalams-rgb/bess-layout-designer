# Agent & Contribution Workflow Guide

This document establishes the collaboration, refactoring, and commit protocols for AI agents and developer tools working in this repository.

---

## 1. Branching & PR Conventions

We execute changes in small, isolated increments:
*   **Base Branch:** All features and refactor paths branch from `main`.
*   **PR Isolation:** Each refactoring phase (e.g., Phase 12A, 12B, 12C, 12D) has its own Pull Request. We verify and merge a PR completely before opening a new branch.
*   **Branch naming:** `refactor/phase-<id>-<name>` or `docs/phase-<id>-<name>`.

---

## 2. Refactoring Protocol: "Scope Guard" & Atomic Commits

When refactoring complex parts of the system (such as stores or maps), you must follow the **Atomic Refactor Loop**:

```
[Main Branch - Green Status]
             │
             ▼
[Create Branch & Run Quality Checks]
             │
             ▼
[For each atomic step]:
  ├── 1. Apply single contiguous edit
  ├── 2. Run lint & typecheck
  ├── 3. Run full test suite & E2E checks
  └── 4. Git commit (atomic, descriptive tag)
             │
             ▼
[Verify final LOC and file boundary checks]
             │
             ▼
[Push to origin & Open Pull Request]
```

### Commit Formatting Rules:
Always suffix commit messages with the phase and step indicators:
*   `refactor(phase12d.1): extract BessMap camera actions hook`
*   `docs(phase13.1): audit and consolidate documentation baseline`

---

## 3. Ruflo MCP Guidance & Swarm Boundaries

The **Ruflo MCP** server is active in the repository environment. Developers and AI agents must follow these rules regarding its usage:

1.  **Guidance Only:** The Ruflo server commands (e.g., `guidance_recommend`, `mcp_status`) are used for reference, task tracking, and architectural advice.
2.  **No Automated Code-Editing Swarms:** If Ruflo suggests spinning up parallel swarms (`swarm_init`, `hive-mind_spawn`) for editing domain-critical logic (such as electrical calculations, spacing boundaries, or Zustand store files), **do not use them**. Parallel Multi-agent editing on raw code invites conflicts.
3.  **Local Tools are the Source of Truth:** Git logs, local diffs, `tsc`, and Vitest results are the ultimate authority for branch correctness. Never bypass local testing in favor of automated agent statuses.

---

## 4. Guarding Domain Boundaries

*   **No Changes to Business Rules:** Do not touch `src/rules/` or electrical engine files inside `src/lib/electrical/` during layout UI refactoring.
*   **PDF Exclusion Warnings are Immutable:** The exclusions page on the PDF is a safety guard and must never be bypassable or commentable.
