/**
 * Reverse geocoding contra Nominatim (OpenStreetMap) — opcional, con fallback.
 *
 * Política:
 *   - Sin API key.
 *   - Timeout duro a 5 s (no bloquea el reporte si el servicio falla).
 *   - Cache en memoria por sesión para evitar exceder el rate limit de 1 req/s.
 *   - Atribución OSM obligatoria: el reporte muestra "© OpenStreetMap contributors".
 *
 * Si la llamada falla por cualquier motivo (timeout, CORS, red, status no-2xx)
 * la función devuelve `null` y el reporte muestra sólo las coordenadas.
 */

import type { LngLat } from "@/types/geometry";

export type ReverseGeocodeResult = {
  /** "Comuna, Región, País" cuando hay datos. */
  displayName: string;
  /** Componentes individuales por si la UI los quiere mostrar separados. */
  address: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    state?: string;
    region?: string;
    county?: string;
    country?: string;
    countryCode?: string;
  };
  /** Atribución obligatoria por términos de uso de Nominatim. */
  attribution: string;
  /** Cuándo se obtuvo (ISO date). */
  fetchedAt: string;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const REQUEST_TIMEOUT_MS = 5000;
const ATTRIBUTION = "© OpenStreetMap contributors via Nominatim";

const cache = new Map<string, ReverseGeocodeResult | null>();

function cacheKey(coord: LngLat): string {
  // Redondear a 4 decimales (~11 m) para coalescing de coordenadas muy cercanas.
  return `${coord.lat.toFixed(4)},${coord.lng.toFixed(4)}`;
}

export async function reverseGeocode(
  coord: LngLat,
  options?: { signal?: AbortSignal; locale?: string }
): Promise<ReverseGeocodeResult | null> {
  const key = cacheKey(coord);
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(coord.lat));
  url.searchParams.set("lon", String(coord.lng));
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Si el caller provee su propio signal, lo encadenamos.
  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Accept-Language": options?.locale ?? "es,en;q=0.8",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) {
      cache.set(key, null);
      return null;
    }
    const data = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const address = data.address ?? {};
    const result: ReverseGeocodeResult = {
      displayName: data.display_name ?? "",
      address: {
        city: address.city,
        town: address.town,
        village: address.village,
        suburb: address.suburb,
        state: address.state,
        region: address.region,
        county: address.county,
        country: address.country,
        countryCode: address.country_code?.toUpperCase(),
      },
      attribution: ATTRIBUTION,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(key, result);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    // No re-lanzar: el caller espera null cuando falla.
    void error;
    cache.set(key, null);
    return null;
  }
}

export function clearReverseGeocodeCache(): void {
  cache.clear();
}

/**
 * Devuelve un string legible "Lugar, Región, País" priorizando lo más útil
 * para un reporte de ingeniería. Devuelve null si no hay datos.
 */
export function describeLocation(result: ReverseGeocodeResult | null): string | null {
  if (!result) return null;
  const a = result.address;
  const place = a.city ?? a.town ?? a.village ?? a.suburb ?? a.county;
  const region = a.state ?? a.region;
  const country = a.country;
  const parts = [place, region, country].filter(
    (x): x is string => Boolean(x && x.trim().length > 0)
  );
  return parts.length > 0 ? parts.join(", ") : result.displayName || null;
}
