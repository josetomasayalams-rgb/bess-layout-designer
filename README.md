# BESS Layout Designer

Web app for **preliminary** BESS (Battery Energy Storage System) site layout in Chile. Draw a polygon, place equipment at real scale, generate a sized layout from MW/MWh targets, validate against regulatory profiles, and export a technical PDF report.

This is a conceptual design tool — it does **not** replace detailed electrical, civil, or fire engineering, manufacturer installation manuals, permitting, or interconnection studies.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · MapLibre via `react-map-gl` · Turf.js · Zustand · Zod · Vitest · `@react-pdf/renderer`.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build (catches TS/framework errors)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (single run)
npm run test:watch   # Vitest interactive
```

Run a single test file:

```bash
npx vitest run src/lib/geometry/collision.test.ts
```

## Map credentials (optional)

The standard layer (OpenStreetMap / CARTO) works without credentials. For satellite or hybrid layers, copy `.env.example` to `.env.local` and set one of:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_MAPTILER_API_KEY=...
```

See [`docs/map-providers.md`](docs/map-providers.md) for provider details and limitations.

## What the app does

- **Site polygon**: draw on the map or generate parametrically; computes area in m² and ha.
- **Equipment placement**: manual catalog placement or auto-layout from MW/MWh targets (`PreliminaryDesignToolsPanel`).
- **Validation**: collision detection, clearance zones, out-of-bounds checks, spacing rules, and regulatory profile evaluation (Chile SEC/RIC, NFPA 855, …).
- **Conceptual infrastructure**: cable routes and access roads are computed automatically from placed equipment and rendered on the map.
- **Technical PDF report**: cover, coordinates, map capture, electrical architecture, regulatory matrix, traceability, exclusions. Available in English and Spanish (`TechnicalReportPanel`).
- **Case studies**: real-world preset, e.g. **BESS del Desierto** (200 MW / 800 MWh, Diego de Almagro, Atacama).

## Units

Defaults to `metric_si` — `m`, `m²`, `ha`, `MW`, `MWh`, `kV`, `Hz`, `kg`, `t`, `°C`, `%`. See [`docs/unit-system.md`](docs/unit-system.md).

## Project conventions

- All geometry runs in a flat local (meters) coordinate system anchored at the first polygon vertex.
- Engineering constants live in `src/data/` or `src/rules/`, never inline in UI components.
- Every technical value is classified as `certified_data`, `preliminary_assumption`, or `pending_validation`.
- Tests are colocated next to the file under test (`*.test.ts` / `*.test.tsx`).

See [`CLAUDE.md`](CLAUDE.md) for domain rules and equipment specs, and [`AGENTS.md`](AGENTS.md) for contribution guidelines.
