/**
 * Single-field geographic coordinate parsing.
 *
 * Parses one user-typed coordinate string into a lat/lng pair, using the same
 * flexible "lat, lng" format the map coordinate search accepts: any string
 * containing at least two signed decimal numbers, interpreted as
 * latitude then longitude (e.g. "-33.45, -70.66", "-33.45 -70.66",
 * "-33.45/-70.66"). Returns null when fewer than two numbers are present or
 * either value falls outside the valid lat/lng ranges.
 *
 * Shared by the map's CoordinateSearch and the terrain coordinate-polygon
 * input so both honor an identical single-field format.
 */
export function parseLatLng(
  value: string
): { lat: number; lng: number } | null {
  const matches = value.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;

  const lat = Number(matches[0]);
  const lng = Number(matches[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}
