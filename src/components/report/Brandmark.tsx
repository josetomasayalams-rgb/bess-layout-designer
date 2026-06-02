/**
 * Brandmark — the app's logo (a disc with an upward-triangle knockout, the
 * mark in `src/app/favicon.ico`) reconstructed as inline vector for the PDF.
 *
 * Rendered as a react-pdf <Svg> so it is crisp at any size and recolorable from
 * the report tokens (no raster asset, no font dependency). Isolated here so a
 * higher-fidelity SVG can replace the geometry later without touching any
 * consumer (cover, running header, future preview).
 *
 * Geometry traced from the favicon: a full disc with a centered equilateral
 * triangle pointing up, knocked out in the paper/mark color.
 */
import { Circle, Path, Svg } from "@react-pdf/renderer";
import { reportTheme } from "./reportTheme";

type BrandmarkProps = {
  /** Rendered square size in pt. */
  size?: number;
  /** Disc fill (default: ink). */
  discColor?: string;
  /** Triangle knockout fill (default: paper). */
  markColor?: string;
};

export function Brandmark({
  size = 24,
  discColor = reportTheme.color.ink,
  markColor = reportTheme.color.paper,
}: BrandmarkProps) {
  return (
    <Svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
      <Circle cx="50" cy="50" r="50" fill={discColor} />
      <Path d="M50 30 L76 70 L24 70 Z" fill={markColor} />
    </Svg>
  );
}
