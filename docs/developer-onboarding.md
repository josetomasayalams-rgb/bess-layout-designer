# Developer Onboarding Guide

Welcome to the **BESS Layout Designer** developer onboarding guide. This document provides setup instructions, development standards, and local validation steps for contributing to the codebase.

---

## 1. Quick Start

### Prerequisites
*   Node.js (LTS version recommended)
*   npm (v10 or later)

### Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### Development Server
Run the local dev server on `http://localhost:3000`:
```bash
npm run dev
```

### Environment Configuration
Copy `.env.example` to `.env.local` to configure map satellite API credentials if needed:
```bash
cp .env.example .env.local
```
*(Standard OSM/CARTO base layers will run fine without credentials. See [docs/map-providers.md](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/docs/map-providers.md) for keys)*.

---

## 2. Validation & Code Quality

Before proposing any changes, you must validate that the working directory is clean and all tests compile successfully.

Run the following pipeline to check code health:
```bash
npm run lint         # Runs ESLint configuration
npm run typecheck    # Runs tsc compilation checks (noEmit)
npm run test         # Runs Vitest unit tests (491 tests)
npm run build        # Compiles Next.js production build
```

To run a specific test file:
```bash
npx vitest run src/components/map/BessMap.contract.test.tsx
npx vitest run src/tests/e2e/bessDelDesiertoFlow.test.tsx
```

---

## 3. Repository Directory Layout

All application source code resides under `src/`:

```
bess-layout-designer/
├── src/
│   ├── app/            ← Next.js App Router (pages, layout, globals.css)
│   ├── components/     ← React UI components
│   │   ├── layout/     ← AppShell viewport and Rails
│   │   ├── map/        ← BessMap, layers/, hooks/
│   │   ├── report/     ← PDF report sub-modules
│   │   └── sidebar/    ← Sidebar sections (compliance, design tools)
│   ├── data/           ← static Catalogs, default constraints, and disclaimers
│   ├── lib/            ← Pure geometry, electrical sizing, and cable layouts
│   ├── rules/          ← Regulatory validation engine and severity cap logic
│   ├── store/          ← Zustand state composition and slices
│   └── types/          ← shared TypeScript definitions
├── docs/               ← Index of active and archived documentation
└── public/             ← static public assets
```

---

## 4. Key Engineering & Architecture Guards

Every developer must adhere strictly to these constraints:
1.  **No Zustand in UI Hoja:** Dumb/presentational panels under `src/components/sidebar/` must only receive data and callbacks via `props`. Do not import or use stores directly inside them.
2.  **Pure Functions in `src/lib/`:** Do not import React, JSX, or state modules inside pure computational folders (`src/lib/`, `src/rules/`).
3.  **Default constraints editable:** Engineering clearance setbacks must remain paramatrically editable by the user (`src/data/defaultConstraints.ts`). Do not hardcode them in geometry files.
4.  **No direct imports from BessMap.tsx:** Hooks or components inside the map folder must import types or constants from `BessMap.constants.ts` or `BessMap.geometry.ts`, never from the React component file `BessMap.tsx` itself, to prevent circular dependency graphs.
5.  **Evidence Classification:** Technical catalog properties must be marked as `certified_data`, `preliminary_assumption`, or `pending_validation`.
