import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Traceability anti-regression gate — Vitest binding (E2-S01).
 *
 * Promotes the deterministic NORMA→REGLA→CÓDIGO→DATO→ESTADO gate from a
 * post-commit *advisory* to a *blocking* test in the app suite: when the
 * traceability toolkit is present, `npm run test` (and therefore any pre-merge
 * check) fails if `gate.py` reports a regression.
 *
 * The gate itself lives OUTSIDE this git repo, at
 *   ../../../graphify-out/traceability/gate.py
 * (a sibling of `bess-layout-designer/`, not tracked by it). It re-extracts the
 * spine + recomputes maturity and compares against `baseline.json`; a non-zero
 * exit means a regression (index dropped, a green value lost its source, a
 * citation went dangling, a constant lost its evidence state, or a rule→norma
 * citation degraded to AMBIGUOUS).
 *
 * Because the toolkit is not part of this repo, environments that check out only
 * `bess-layout-designer/` (e.g. CI) will not have `gate.py`. There we SKIP — but
 * loudly and deterministically (clear console warning, never a silent or flaky
 * skip), since the gate stays enforced locally and via the post-commit hook.
 */

// Resolve the toolkit relative to THIS file so the path holds no matter which
// directory Vitest was launched from.
//   src/tests/ → bess-layout-designer/ → "App BESS"/ → graphify-out/traceability
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TRACEABILITY_DIR = path.resolve(HERE, "../../../graphify-out/traceability");
const GATE_PY = path.join(TRACEABILITY_DIR, "gate.py");

function python3Available(): boolean {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const gatePresent = existsSync(GATE_PY);
const pyAvailable = gatePresent && python3Available();
const canRun = gatePresent && pyAvailable;

describe("traceability anti-regression gate", () => {
  it(
    "gate.py reports no NORMA→REGLA→CÓDIGO→DATO→ESTADO regression (exit 0)",
    (ctx) => {
      // Skip when the toolkit isn't reachable — but LOUDLY, never silently.
      // Two reinforcing signals, since Vitest's default reporter shows only
      // counts: (1) ctx.skip(note) attaches the reason to the test so it always
      // reads as "↓ skipped" (never a misleading pass) with the cause shown in
      // verbose/CI/JSON reporters; (2) an in-test console.warn surfaces on
      // stderr under those same reporters. The skip is deterministic (same env →
      // same outcome), so it is never flaky.
      if (!canRun) {
        const why = !gatePresent
          ? `traceability toolkit not found at ${GATE_PY} (expected when only ` +
            `the app repo is checked out, e.g. CI)`
          : "python3 is not available on PATH";
        console.warn(
          `[traceability.gate] SKIPPED — ${why}. The deterministic ` +
            `anti-regression gate is enforced locally and via the post-commit hook.`,
        );
        ctx.skip(`traceability gate not runnable here — ${why}`);
        return;
      }

      let stdout = "";
      try {
        stdout = execFileSync("python3", ["gate.py"], {
          cwd: TRACEABILITY_DIR,
          encoding: "utf-8",
          timeout: 120_000,
        });
      } catch (err) {
        const e = err as { status?: number; stdout?: string; stderr?: string };
        const out = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
        throw new Error(
          `Traceability gate FAILED (exit ${e.status ?? "?"}). A regression was ` +
            `detected — fix it, or if the change is deliberate accept it with ` +
            `\`python3 gate.py --update-baseline\` (only with D-d / troncal ` +
            `authorization).\n\n${out}`,
        );
      }
      expect(stdout).toContain("Sin regresiones");
    },
    120_000,
  );
});
