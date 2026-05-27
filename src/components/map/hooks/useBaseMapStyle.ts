import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import {
  FALLBACK_BASE_MAP_STYLE,
  resolveBaseMapStyle,
  type ResolvedBaseMapStyle,
  type BaseMapStyleId,
} from "@/data/mapStyles";

export function useBaseMapStyle(locale: Locale) {
  const [baseMapStyleId, setBaseMapStyleId] = useState<BaseMapStyleId>("standard");
  const [resolvedBaseMap, setResolvedBaseMap] =
    useState<ResolvedBaseMapStyle>(FALLBACK_BASE_MAP_STYLE);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    resolveBaseMapStyle(baseMapStyleId, locale)
      .then((nextStyle) => {
        if (!isActive) return;
        setResolvedBaseMap(nextStyle);
        setMapError(null);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        const message =
          error instanceof Error ? error.message : "Map style failed to load";
        setMapError(message);
      });

    return () => {
      isActive = false;
    };
  }, [baseMapStyleId, locale]);

  return {
    baseMapStyleId,
    setBaseMapStyleId,
    resolvedBaseMap,
    mapError,
    setMapError,
  };
}
