# BESS Layout Designer - Onboarding & Developer Guide

Welcome to the **BESS Layout Designer** codebase! This application is a preliminary engineering tool for sizing and pre-designing Battery Energy Storage Systems (BESS) utility-scale sites in Chile.

This guide provides the necessary technical context to get you up and running and to maintain the code quality and architectural patterns of the repository.

---

## 1. Project Organization

All source code lives in the `bess-layout-designer/` directory, which is structured as follows:

*   `src/app/`: Next.js App Router configuration, pages, layouts, and global styles (`page.tsx`, `layout.tsx`, `globals.css`).
*   `src/components/`: Reusable React components grouped by functional areas:
    *   `layout/`: App shell, flow step controls, and toolbars.
    *   `map/`: Map interactions, WebGL layers, coordinate search, and overlay rendering.
    *   `sidebar/`: Configuration, sizing, electrical design, and validation panels.
*   `src/data/`: Static catalogs, constant parameters, registries, and document reference databases.
*   `src/lib/`: Pure utility functions for geometry calculations, layouts, unit formatting, export schemas, and reverse geocoding.
*   `src/rules/`: Regulatory validation engine containing profiles (`chile-utility`, `chile-pmgd`) and compliance rules.
*   `src/store/`: Zustand state management stores.
*   `src/types/`: Shared TypeScript type definitions.
*   `docs/`: Design system documentation, map provider configurations, unit systems, and developer guidelines.

---

## 2. Command Reference

Execute all commands from inside the `bess-layout-designer/` directory.

### Development Server
Start the development server with hot-reload at `http://localhost:3000`:
```bash
npm run dev
```

### Build & Compilation
Generate the optimized production bundle. This command also validates framework invariants and catches TypeScript/Next.js compiler errors:
```bash
npm run build
```

### Linting
Validate style guidelines and catch potential bugs:
```bash
npm run lint
```

### Type Checking
Run the TypeScript compiler in dry-run mode:
```bash
npm run typecheck
```

### Unit Tests
Run the entire Vitest test suite once:
```bash
npm run test
```

Or run Vitest in interactive watch mode:
```bash
npm run test:watch
```

To run a single test file (highly recommended during feature edits):
```bash
npx vitest run src/lib/geometry/collision.test.ts
```

---

## 3. Coordinate System & Geometry

All engineering calculations, clearances, collision detection, and layout algorithms operate in **meters** on a flat local coordinate system.

*   **Anchor Point (`ProjectAnchor`)**: Anchor coordinates (`lng0`, `lat0`) represent the origin $(0, 0)$.
*   **Coordinate Conversions**:
    *   `toLocal(p, anchor)`: Converts geographical `LngLat` to a local 2D point `LocalPoint` (`x_m`, `y_m`) using a cosine-corrected equirectangular approximation.
    *   `toLngLat(p, anchor)`: Is the inverse conversion back to longitude/latitude.
*   **Aesthetic Constraint**: The map renders real-world boundaries in `LngLat`, but internal spacing, equipment overlaps, and access rules always evaluate using local distances in meters.

---

## 4. Zustand State Stores

State management is divided into three focused Zustand stores:

1.  **`useProjectStore`** (`src/store/projectStore.ts`):
    *   Owns the site boundary polygon, list of placed equipment, electrical buses, feeders, auxiliary services, and user interaction modes.
2.  **`useUiStore`** (`src/store/uiStore.ts`):
    *   Owns interface locale state (`"en"` vs `"es"`), selected unit system formats, and sidebar panel toggles.
3.  **`useRegulatoryStore`** (`src/store/regulatoryStore.ts`):
    *   Owns the active regulatory profile ID (e.g., `chile-utility`, `chile-pmgd`) evaluated by the compliance engine.

---

## 5. Architectural Invariants (Rules of Gold)

To keep the codebase maintainable and testable, you must respect the following invariants:

*   **No Engineering Constants in UI**: Physical dimensions, clearances, voltage thresholds, and calculations must never be hardcoded inside React components. Keep them in `src/data/` (catalogs) or `src/lib/` (sizing/calculations).
*   **Colocated Unit Tests**: Put your test files (`*.test.ts` or `*.test.tsx`) right next to the module they verify.
*   **Bilingual Capability**: All reporting interfaces, descriptions, exclusions, and disclaimers must support bilingual output by reading the active `locale` parameter.
*   **Equipment Data Classification**: Equipment specs must specify evidence confidence levels:
    *   `certified_data`: Sourced from manufacturer datasheets or certified manuals.
    *   `preliminary_assumption`: General default values for early sizing.
    *   `pending_validation`: Missing parameters requiring validation.
    Never display a preliminary assumption as a certified hard rule.

---

## 6. Developing a New Feature Checklist

When adding a new feature:

1.  **Define Types**: Update or add type definitions under `src/types/`.
2.  **Add Test File**: Create a colocated unit test verifying the calculations/utilities in isolation.
3.  **Implement Logic**: Write pure functions under `src/lib/` or rules under `src/rules/`.
4.  **Integrate Store/UI**: Connect to Zustand stores and build the corresponding sidebar or map controls.
5.  **Validate**: Run `npm run typecheck`, `npm run lint`, and `npm run test`. Ensure all tests pass.
6.  **Verify Production Build**: Run `npm run build` to confirm Next.js compiles the project cleanly.
