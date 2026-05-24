"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import {
  setEastView,
  setIsoView,
  setNorthView,
  setSouthView,
  setTopView,
  setWestView,
  type CameraMap,
  type CompassDirection,
} from "@/lib/map/mapCamera";
import { useUiStore } from "@/store/uiStore";

type OrientationCubeProps = {
  mapRef: RefObject<MapRef | null>;
  isMapLoaded: boolean;
  locale: "en" | "es";
};

type Copy = {
  north: string;
  south: string;
  east: string;
  west: string;
  top: string;
  iso: string;
  heading: string;
};

const COPY: Record<"en" | "es", Copy> = {
  en: {
    north: "Orient to north",
    south: "Orient to south",
    east: "Orient to east",
    west: "Orient to west",
    top: "Top view (2D)",
    iso: "Isometric view",
    heading: "View orientation",
  },
  es: {
    north: "Orientar al norte",
    south: "Orientar al sur",
    east: "Orientar al este",
    west: "Orientar al oeste",
    top: "Vista superior (2D)",
    iso: "Vista isométrica",
    heading: "Orientación de vista",
  },
};

/** Bearing tolerance (deg) for marking a cardinal direction as active. */
const ALIGN_TOLERANCE_DEG = 1.5;

function isBearingNear(bearing: number, target: number): boolean {
  const normalized = ((bearing % 360) + 360) % 360;
  const diff = Math.abs(normalized - target);
  return Math.min(diff, 360 - diff) <= ALIGN_TOLERANCE_DEG;
}

const cardinalBase =
  "absolute flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold leading-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-30";

function cardinalClass(active: boolean, accent: boolean): string {
  if (active) {
    return `${cardinalBase} bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400`;
  }
  return `${cardinalBase} bg-slate-900/80 ${
    accent ? "text-cyan-300" : "text-slate-300"
  } hover:bg-slate-800 hover:text-cyan-100`;
}

function modeClass(active: boolean): string {
  const base =
    "rounded border px-1.5 py-1 text-[10px] font-semibold leading-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-30";
  return active
    ? `${base} border-cyan-400 bg-cyan-500/20 text-cyan-100`
    : `${base} border-slate-700 bg-slate-900/80 text-slate-300 hover:border-cyan-400 hover:text-cyan-100`;
}

/**
 * ViewCube-style orientation control for the map.
 *
 * Shows the live camera orientation (rotating compass needle) and lets the
 * user snap the view to N / S / E / O, a top-down 2D view, or a preliminary
 * isometric tilt. It only drives the camera — never the BESS layout.
 */
export function OrientationCube({
  mapRef,
  isMapLoaded,
  locale,
}: OrientationCubeProps) {
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const copy = COPY[locale];

  // Keep the compass in sync with the live map camera.
  useEffect(() => {
    if (!isMapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const sync = () => {
      setBearing(map.getBearing());
      setPitch(map.getPitch());
    };
    sync();
    map.on("move", sync);
    return () => {
      map.off("move", sync);
    };
  }, [isMapLoaded, mapRef]);

  const runCamera = useCallback(
    (action: (map: CameraMap) => void) => {
      const map = mapRef.current?.getMap();
      if (map) action(map);
    },
    [mapRef]
  );

  const is2D = viewMode === "2d";
  void pitch; // kept in sync from the map but no longer drives the active state
  const activeDirection: CompassDirection | null = isBearingNear(bearing, 0)
    ? "north"
    : isBearingNear(bearing, 90)
      ? "east"
      : isBearingNear(bearing, 180)
        ? "south"
        : isBearingNear(bearing, 270)
          ? "west"
          : null;

  return (
    <div
      role="group"
      aria-label={copy.heading}
      className="flex w-24 flex-col gap-1.5 rounded-lg border border-slate-700 bg-slate-950/85 p-2 shadow-lg backdrop-blur"
    >
      <div className="relative mx-auto h-20 w-20">
        {/* Compass dial */}
        <div className="absolute inset-0 rounded-full border border-slate-700 bg-slate-900/60" />

        {/* Rotating north-seeking needle */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ transform: `rotate(${-bearing}deg)` }}
        >
          <svg width="22" height="48" viewBox="0 0 22 48" aria-hidden="true">
            <polygon points="11,4 15,23 7,23" fill="#22d3ee" />
            <polygon points="11,44 15,25 7,25" fill="#475569" />
            <circle
              cx="11"
              cy="24"
              r="2.6"
              fill="#0f172a"
              stroke="#22d3ee"
              strokeWidth="1"
            />
          </svg>
        </div>

        {/* Cardinal buttons (fixed positions, click to snap the bearing) */}
        <button
          type="button"
          disabled={!isMapLoaded}
          onClick={() => runCamera(setNorthView)}
          className={`${cardinalClass(
            activeDirection === "north",
            true
          )} left-1/2 top-0 -translate-x-1/2`}
          title={copy.north}
          aria-label={copy.north}
          aria-pressed={activeDirection === "north"}
        >
          N
        </button>
        <button
          type="button"
          disabled={!isMapLoaded}
          onClick={() => runCamera(setSouthView)}
          className={`${cardinalClass(
            activeDirection === "south",
            false
          )} bottom-0 left-1/2 -translate-x-1/2`}
          title={copy.south}
          aria-label={copy.south}
          aria-pressed={activeDirection === "south"}
        >
          S
        </button>
        <button
          type="button"
          disabled={!isMapLoaded}
          onClick={() => runCamera(setEastView)}
          className={`${cardinalClass(
            activeDirection === "east",
            false
          )} right-0 top-1/2 -translate-y-1/2`}
          title={copy.east}
          aria-label={copy.east}
          aria-pressed={activeDirection === "east"}
        >
          E
        </button>
        <button
          type="button"
          disabled={!isMapLoaded}
          onClick={() => runCamera(setWestView)}
          className={`${cardinalClass(
            activeDirection === "west",
            false
          )} left-0 top-1/2 -translate-y-1/2`}
          title={copy.west}
          aria-label={copy.west}
          aria-pressed={activeDirection === "west"}
        >
          O
        </button>
      </div>

      {/* View mode buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={!isMapLoaded}
          onClick={() => {
            runCamera(setTopView);
            setViewMode("2d");
          }}
          className={modeClass(is2D)}
          title={copy.top}
          aria-label={copy.top}
          aria-pressed={is2D}
        >
          2D
        </button>
        <button
          type="button"
          disabled={!isMapLoaded}
          onClick={() => {
            runCamera(setIsoView);
            setViewMode("iso");
          }}
          className={modeClass(!is2D)}
          title={copy.iso}
          aria-label={copy.iso}
          aria-pressed={!is2D}
        >
          ISO
        </button>
      </div>
    </div>
  );
}
