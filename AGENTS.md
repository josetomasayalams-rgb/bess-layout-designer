# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js BESS layout designer. App routes and global styles live in `src/app/`. Reusable UI is in `src/components/`, Zustand stores in `src/store/`, domain types in `src/types/`, equipment/model catalogs in `src/data/`, regulatory validation in `src/rules/`, and pure calculations, geometry, layout, i18n, and export helpers in `src/lib/`. Static assets belong in `public/`. Tests are colocated with implementation files as `*.test.ts` or `*.test.tsx`.

## Build, Test, and Development Commands

Run commands from `bess-layout-designer/`.

- `npm run dev`: start the Next.js dev server, usually at `http://localhost:3000`.
- `npm run build`: create a production build and catch framework errors.
- `npm run start`: serve the built app locally after `npm run build`.
- `npm run lint`: run ESLint using the project config.
- `npm run typecheck`: run `tsc --noEmit`.
- `npm run test`: run Vitest once.
- `npm run test:watch`: run Vitest interactively during development.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Prefer the `@/` alias for imports from `src`. Match existing formatting: two-space indentation, double quotes, semicolons, and explicit exported types for shared domain models. Name components in `PascalCase` (`BessMap.tsx`), stores as descriptive camelCase modules (`projectStore.ts`), and utilities by domain (`summaryCalculations.ts`, `collision.ts`). Keep UI state in stores and pure business logic in `src/lib/` for testability.

## Testing Guidelines

Vitest runs in `jsdom` and matches `src/**/*.test.ts` and `src/**/*.test.tsx`. Add focused tests beside changed calculation, geometry, layout, and validation code. Prefer deterministic fixtures and assert domain outcomes: distances, areas, generated summaries, warning lists, and compliance messages. Before a PR, run `npm run test`, `npm run lint`, and `npm run typecheck`.

## Commit & Pull Request Guidelines

Git history currently only contains the initial Create Next App commit, so use clear imperative subjects such as `Add spacing validation tests` or `Fix BESS summary totals`. Pull requests should include a concise description, tests run, linked issue or context, and screenshots or recordings for UI changes. Explicitly call out changes to regulatory assumptions, exported JSON shape, or BESS model data.

## Agent-Specific Notes

This project uses Next.js 16 and React 19. Verify framework-specific API assumptions against installed dependencies when possible. Avoid mixing regulatory rules into UI components; keep them in `src/rules/` or pure helpers in `src/lib/`.
