/**
 * Conversión de coordenadas geográficas a formatos profesionales (Fase 11).
 *
 * - **Decimal**: grados decimales (la representación interna del proyecto).
 * - **DMS**: grados, minutos, segundos con hemisferio (ej. 33°27'24.84"S).
 * - **UTM**: zona, banda, easting, northing (WGS84). Implementación basada
 *   en el algoritmo estándar de Karney; precisión suficiente para reporte
 *   preliminar (≤ 1 m). No reemplaza herramientas GIS profesionales para
 *   uso topográfico de detalle.
 *
 * Funciones puras, sin dependencias externas.
 */

import type { LngLat } from "@/types/geometry";

// ──────────────────────────────────────────────────────────────────
// Decimal
// ──────────────────────────────────────────────────────────────────

export function formatDecimal(coord: LngLat, digits = 6): {
  lat: string;
  lng: string;
} {
  return {
    lat: coord.lat.toFixed(digits),
    lng: coord.lng.toFixed(digits),
  };
}

// ──────────────────────────────────────────────────────────────────
// DMS
// ──────────────────────────────────────────────────────────────────

export type DMSValue = {
  degrees: number;
  minutes: number;
  seconds: number;
  hemisphere: "N" | "S" | "E" | "W";
};

function toDMS(value: number, kind: "lat" | "lng"): DMSValue {
  const positive = value >= 0;
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  const hemisphere =
    kind === "lat" ? (positive ? "N" : "S") : positive ? "E" : "W";
  return { degrees, minutes, seconds, hemisphere };
}

export function formatDMS(coord: LngLat, decimals = 2): {
  lat: string;
  lng: string;
  latParts: DMSValue;
  lngParts: DMSValue;
} {
  const latParts = toDMS(coord.lat, "lat");
  const lngParts = toDMS(coord.lng, "lng");
  return {
    lat: `${latParts.degrees}°${String(latParts.minutes).padStart(2, "0")}'${latParts.seconds.toFixed(decimals).padStart(decimals + 3, "0")}"${latParts.hemisphere}`,
    lng: `${lngParts.degrees}°${String(lngParts.minutes).padStart(2, "0")}'${lngParts.seconds.toFixed(decimals).padStart(decimals + 3, "0")}"${lngParts.hemisphere}`,
    latParts,
    lngParts,
  };
}

// ──────────────────────────────────────────────────────────────────
// UTM (WGS84)
// ──────────────────────────────────────────────────────────────────
//
// Implementación basada en las fórmulas estándar de la USGS / NGA.
// Precisión típica < 1 m en el área del cinturón estándar (-80° a +84°).
// No usar en zonas polares (UPS no implementado).

const WGS84_A = 6378137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);
const WGS84_EP2 = WGS84_E2 / (1 - WGS84_E2);
const K0 = 0.9996;

export type UTMValue = {
  zone: number;
  band: string; // letra C..X (sin I ni O)
  easting: number;
  northing: number;
  hemisphere: "N" | "S";
};

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

const UTM_BAND_LETTERS = "CDEFGHJKLMNPQRSTUVWXX";

function utmBand(lat: number): string {
  if (lat < -80 || lat > 84) return "Z"; // polar
  const idx = Math.floor((lat + 80) / 8);
  return UTM_BAND_LETTERS[Math.min(idx, UTM_BAND_LETTERS.length - 1)];
}

export function toUTM(coord: LngLat): UTMValue {
  const lat = coord.lat;
  const lng = coord.lng;
  const zone = Math.floor((lng + 180) / 6) + 1;
  const centralMeridian = deg2rad(zone * 6 - 183);

  const latRad = deg2rad(lat);
  const lngRad = deg2rad(lng);

  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * Math.sin(latRad) ** 2);
  const t = Math.tan(latRad) ** 2;
  const c = WGS84_EP2 * Math.cos(latRad) ** 2;
  const a = Math.cos(latRad) * (lngRad - centralMeridian);

  const m =
    WGS84_A *
    ((1 - WGS84_E2 / 4 - (3 * WGS84_E2 ** 2) / 64 - (5 * WGS84_E2 ** 3) / 256) *
      latRad -
      ((3 * WGS84_E2) / 8 +
        (3 * WGS84_E2 ** 2) / 32 +
        (45 * WGS84_E2 ** 3) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * WGS84_E2 ** 2) / 256 + (45 * WGS84_E2 ** 3) / 1024) *
        Math.sin(4 * latRad) -
      ((35 * WGS84_E2 ** 3) / 3072) * Math.sin(6 * latRad));

  const easting =
    K0 *
      n *
      (a +
        ((1 - t + c) * a ** 3) / 6 +
        ((5 - 18 * t + t ** 2 + 72 * c - 58 * WGS84_EP2) * a ** 5) / 120) +
    500000;

  let northing =
    K0 *
    (m +
      n *
        Math.tan(latRad) *
        ((a ** 2) / 2 +
          ((5 - t + 9 * c + 4 * c ** 2) * a ** 4) / 24 +
          ((61 - 58 * t + t ** 2 + 600 * c - 330 * WGS84_EP2) * a ** 6) / 720));

  const hemisphere: "N" | "S" = lat >= 0 ? "N" : "S";
  if (hemisphere === "S") {
    northing += 10_000_000;
  }

  return {
    zone,
    band: utmBand(lat),
    easting,
    northing,
    hemisphere,
  };
}

export function formatUTM(coord: LngLat): string {
  const utm = toUTM(coord);
  return `${utm.zone}${utm.band} ${Math.round(utm.easting)} mE ${Math.round(utm.northing)} mN`;
}

// ──────────────────────────────────────────────────────────────────
// Bundle de salida
// ──────────────────────────────────────────────────────────────────

export type CoordinateFormatsBundle = {
  decimal: { lat: string; lng: string };
  dms: { lat: string; lng: string };
  utm: { zone: number; band: string; easting: number; northing: number; formatted: string };
};

export function formatCoordinatesBundle(coord: LngLat): CoordinateFormatsBundle {
  const dec = formatDecimal(coord);
  const dms = formatDMS(coord);
  const utm = toUTM(coord);
  return {
    decimal: dec,
    dms: { lat: dms.lat, lng: dms.lng },
    utm: {
      zone: utm.zone,
      band: utm.band,
      easting: Math.round(utm.easting),
      northing: Math.round(utm.northing),
      formatted: formatUTM(coord),
    },
  };
}
