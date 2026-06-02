/**
 * registerReportFonts — registers the self-hosted Inter brand face with
 * `@react-pdf/renderer`.
 *
 * react-pdf renders in its own pipeline (NOT the DOM), so `next/font` is
 * irrelevant here and the brand typeface must be registered explicitly. The
 * latin-subset Inter WOFF files (SIL OFL) live under `public/fonts/` and are
 * served from the app origin at `/fonts/...`.
 *
 * Each weight is registered as its OWN family so the existing role→family
 * mapping in `reportTheme.font` / `reportStyles` keeps working without adding a
 * `fontWeight` to every style. Mono roles intentionally stay on the standard
 * Courier family (Inter ships no monospace).
 *
 * Registration is a module-load side effect (idempotent) and only records font
 * descriptors — no network fetch happens until a PDF is actually rendered, so
 * importing this module is safe in non-rendering contexts (e.g. unit tests).
 */
import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerReportFonts(): void {
  if (registered) return;
  registered = true;

  Font.register({ family: "Inter", src: "/fonts/inter-latin-400-normal.woff" });
  Font.register({
    family: "Inter SemiBold",
    src: "/fonts/inter-latin-600-normal.woff",
  });
  Font.register({
    family: "Inter Bold",
    src: "/fonts/inter-latin-700-normal.woff",
  });
  Font.register({
    family: "Inter Italic",
    src: "/fonts/inter-latin-400-italic.woff",
  });

  // Inter's metrics make react-pdf's default hyphenation too aggressive for
  // short technical labels; disable word-splitting so labels stay intact.
  Font.registerHyphenationCallback((word) => [word]);
}

registerReportFonts();
