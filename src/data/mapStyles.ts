import type { StyleSpecification } from "maplibre-gl";
import type { Locale } from "@/lib/i18n";

export type BaseMapStyleId = "standard" | "satellite" | "hybrid";
export type BaseMapProvider = "carto" | "maptiler" | "google";

export type BaseMapStyleConfig = {
  id: BaseMapStyleId;
  mapTilerMapId: string;
  requiresKey: boolean;
};

const mapTilerApiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim();
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

type GoogleSessionResponse = {
  session: string;
  expiry: string;
  tileWidth: number;
  tileHeight: number;
  imageFormat: "jpeg" | "png";
};

export type ResolvedBaseMapStyle = {
  provider: BaseMapProvider;
  style: string | StyleSpecification;
};

const googleSessionCache = new Map<string, Promise<GoogleSessionResponse>>();

const CARTO_STANDARD_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    cartoVoyager: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [
    {
      id: "carto-voyager",
      type: "raster",
      source: "cartoVoyager",
    },
  ],
};

export const FALLBACK_BASE_MAP_STYLE: ResolvedBaseMapStyle = {
  provider: "carto",
  style: CARTO_STANDARD_STYLE,
};

export const BASE_MAP_STYLES: BaseMapStyleConfig[] = [
  {
    id: "standard",
    mapTilerMapId: "streets-v4",
    requiresKey: false,
  },
  {
    id: "satellite",
    mapTilerMapId: "satellite",
    requiresKey: true,
  },
  {
    id: "hybrid",
    mapTilerMapId: "hybrid",
    requiresKey: true,
  },
];

export function hasPremiumMapProvider(): boolean {
  return Boolean(googleMapsApiKey || mapTilerApiKey);
}

export function isBaseMapStyleAvailable(styleId: BaseMapStyleId): boolean {
  const config = BASE_MAP_STYLES.find((style) => style.id === styleId);
  return Boolean(config && (!config.requiresKey || hasPremiumMapProvider()));
}

export async function resolveBaseMapStyle(
  styleId: BaseMapStyleId,
  locale: Locale
): Promise<ResolvedBaseMapStyle> {
  const config =
    BASE_MAP_STYLES.find((style) => style.id === styleId) ?? BASE_MAP_STYLES[0];

  if (googleMapsApiKey && styleId !== "standard") {
    const session = await createGoogleSession(styleId, locale);
    return {
      provider: "google",
      style: getGoogleMapTilesStyle(session, googleMapsApiKey),
    };
  }

  if (mapTilerApiKey) {
    return {
      provider: "maptiler",
      style: `https://api.maptiler.com/maps/${config.mapTilerMapId}/style.json?key=${encodeURIComponent(
        mapTilerApiKey
      )}`,
    };
  }

  return {
    ...FALLBACK_BASE_MAP_STYLE,
  };
}

function googleLocale(locale: Locale) {
  return locale === "es"
    ? { language: "es-419", region: "CL" }
    : { language: "en-US", region: "US" };
}

async function createGoogleSession(
  styleId: BaseMapStyleId,
  locale: Locale
): Promise<GoogleSessionResponse> {
  if (!googleMapsApiKey) {
    throw new Error("Google Maps API key is not configured.");
  }

  const { language, region } = googleLocale(locale);
  const body = {
    mapType: "satellite",
    language,
    region,
    imageFormat: "jpeg",
    scale: "scaleFactor2x",
    highDpi: true,
    ...(styleId === "hybrid"
      ? { layerTypes: ["layerRoadmap"], overlay: false }
      : {}),
  };
  const cacheKey = JSON.stringify(body);

  const cached = googleSessionCache.get(cacheKey);
  if (cached) return cached;

  const request = fetch(
    `https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(
      googleMapsApiKey
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Google Map Tiles session failed: ${response.status}`);
    }
    return (await response.json()) as GoogleSessionResponse;
  });

  googleSessionCache.set(cacheKey, request);
  return request;
}

function getGoogleMapTilesStyle(
  session: GoogleSessionResponse,
  apiKey: string
): StyleSpecification {
  const tileSize = 256;

  return {
    version: 8,
    sources: {
      googleTiles: {
        type: "raster",
        tiles: [
          `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(
            session.session
          )}&key=${encodeURIComponent(apiKey)}`,
        ],
        tileSize,
        minzoom: 0,
        maxzoom: 22,
        attribution: "Google Maps",
      },
    },
    layers: [
      {
        id: "google-map-tiles",
        type: "raster",
        source: "googleTiles",
      },
    ],
  };
}
